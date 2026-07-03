'use strict';

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Reel = require('../../../database/models/reel.model');
const ReelLike = require('../../../database/models/reel-like.model');
const ReelComment = require('../../../database/models/reel-comment.model');
const Notification = require('../../../database/models/notification.model');
const Message = require('../../../database/models/message.model');

const reelsRepository = require('./reels.repository');
const reelsMapper = require('./reels.mapper');
const AppError = require('../../common/errors/app-error');
const env = require('../../config/env');
const { computeTrendingScore } = require('./reels.scoring');
const cloudinary = require('cloudinary').v2;
const cloudinaryClient = require('../../integrations/cloudinary/cloudinary.client');

// Make sure cloudinary is configured (config is globally shared if already set by client)
if (env.cloudinary && env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
	cloudinary.config({
		cloud_name: env.cloudinary.cloudName,
		api_key: env.cloudinary.apiKey,
		api_secret: env.cloudinary.apiSecret,
	});
}

function getCloudinaryPublicId(url) {
	if (!url || !url.includes('cloudinary.com')) return null;
	try {
		const parts = url.split(/\/upload\/(?:v\d+\/)?/);
		if (parts.length < 2) return null;
		const pathAndExt = parts[1];
		const publicIdWithExt = pathAndExt.split('?')[0];
		const lastDotIndex = publicIdWithExt.lastIndexOf('.');
		if (lastDotIndex === -1) return publicIdWithExt;
		return publicIdWithExt.substring(0, lastDotIndex);
	} catch (err) {
		console.error('Failed to extract Cloudinary publicId:', err);
		return null;
	}
}

function deleteLocalFile(url) {
	if (!url) return;
	try {
		if (url.includes('/uploads/')) {
			const filename = url.split('/uploads/')[1];
			if (filename) {
				const uploadDir = path.join(__dirname, '..', '..', '..', '..', 'uploads');
				const filePath = path.join(uploadDir, filename);
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
					console.log('[Cleanup] Deleted local file:', filePath);
				}
			}
		}
	} catch (err) {
		console.error('[Cleanup Error] Failed to delete local file:', err);
	}
}

const reelsService = {
	/**
	 * Recompute and persist the trendingScore for a reel.
	 * Called after every interaction (view, like, comment, share) so the feed
	 * query stays a simple sort with no in-query arithmetic.
	 */
	async recomputeScore(reelId) {
		try {
			const reel = await reelsRepository.findById(reelId);
			if (!reel) return;
			const score = computeTrendingScore(reel);
			await reelsRepository.updateScore(reelId, score);
		} catch (err) {
			// Non-critical — do not bubble up scoring errors to the caller
			console.error('[Scoring] Failed to recompute score for reel', reelId, err);
		}
	},

	async getFeed({ userId, page = 0, limit = 20, category, authorId }) {
		const skip = page * limit;
		const reels = await reelsRepository.findFeed({ limit, skip, category, authorId });
		
		const reelIds = reels.map(r => r._id);
		const likesMap = userId ? await reelsRepository.hasLikedMany(reelIds, userId) : {};
		
		return reelsMapper.toReelListResponse(reels, likesMap);
	},

	async createReel(payload, userId) {
		const reel = await reelsRepository.createReel({
			...payload,
			authorId: userId,
			status: 'ready'
		});

		// Compute initial trendingScore immediately so the reel is never
		// stranded at score=0 in the feed. Fresh videos start with
		// freshnessBoost ~100 which gives them strong initial visibility.
		await this.recomputeScore(reel._id);

		const populatedReel = await reelsRepository.findById(reel._id);
		return reelsMapper.toReelResponse(populatedReel, false);
	},

	async updateReel(reelId, userId, payload) {
		const reel = await reelsRepository.findById(reelId);
		if (!reel) {
			throw AppError.notFound('Reel');
		}
		
		const authorIdStr = reel.authorId?._id?.toString() || reel.authorId?.toString();
		if (authorIdStr !== userId.toString()) {
			throw AppError.forbidden('You are not authorized to update this reel');
		}
		
		const updatedReel = await reelsRepository.updateReel(reelId, payload);
		const liked = await reelsRepository.hasLiked(reelId, userId);
		return reelsMapper.toReelResponse(updatedReel, liked);
	},

	async deleteReel(reelId, currentUser) {
		const reel = await Reel.findById(reelId);
		if (!reel) {
			throw AppError.notFound('Reel');
		}
		
		const authorIdStr = reel.authorId?._id?.toString() || reel.authorId?.toString();
		const isAdmin = currentUser.profileType === 'admin';
		if (authorIdStr !== currentUser._id.toString() && !isAdmin) {
			throw AppError.forbidden('You are not authorized to delete this reel');
		}

		// Cloudinary / local file cleanup
		if (reel.videoUrl) {
			if (reel.videoUrl.includes('cloudinary.com')) {
				try {
					const publicId = getCloudinaryPublicId(reel.videoUrl);
					if (publicId) {
						console.log('[Cloudinary Cleanup] Deleting video:', publicId);
						await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
					}
				} catch (cloudErr) {
					console.error('[Cloudinary Cleanup Error] Failed to delete from Cloudinary:', cloudErr);
				}
			} else {
				deleteLocalFile(reel.videoUrl);
			}
		}

		// Transaction logic to ensure database consistency
		let session = null;
		try {
			session = await mongoose.startSession();
			session.startTransaction();
		} catch (e) {
			session = null; // Fallback for standalone Mongo instance without Replica Set
		}

		try {
			const options = session ? { session } : {};

			// Delete reel
			await Reel.findByIdAndDelete(reelId, options);

			// Delete associated likes
			await ReelLike.deleteMany({ reelId }, options);

			// Delete associated comments
			await ReelComment.deleteMany({ reelId }, options);

			// Delete notifications
			await Notification.deleteMany({
				$or: [
					{ 'metadata.reelId': reelId },
					{ 'metadata.id': reelId }
				]
			}, options);

			// Update shared references in messages
			await Message.updateMany(
				{ 'reelRef.reelId': reelId },
				{ $set: { 'reelRef.isDeleted': true } },
				options
			);

			if (session) {
				await session.commitTransaction();
			}
		} catch (dbErr) {
			if (session) {
				await session.abortTransaction();
			}
			console.error('[Database Delete Error] Rollback executed:', dbErr);
			throw dbErr;
		} finally {
			if (session) {
				session.endSession();
			}
		}

		return { success: true };
	},

	async toggleLike(reelId, userId) {
		const reel = await reelsRepository.findById(reelId);
		if (!reel) {
			throw AppError.notFound('Reel');
		}

		const existingLike = await reelsRepository.findLike(reelId, userId);
		let result;
		if (existingLike) {
			await reelsRepository.deleteLike(reelId, userId);
			const updatedReel = await reelsRepository.incrementLikes(reelId, -1);
			result = { liked: false, likesCount: updatedReel.likesCount };
		} else {
			await reelsRepository.createLike(reelId, userId);
			const updatedReel = await reelsRepository.incrementLikes(reelId, 1);
			result = { liked: true, likesCount: updatedReel.likesCount };
		}

		// Recompute score asynchronously — fire and forget
		this.recomputeScore(reelId);
		return result;
	},

	/**
	 * Record a view for a reel.
	 *
	 * Deduplication rules:
	 * - Authenticated users: only 1 view counted per 24 hours (enforced via
	 *   ReelView TTL collection).
	 * - Anonymous users: every call counts (no identity to deduplicate on).
	 *
	 * @param {string} reelId
	 * @param {string|null} userId  — null for unauthenticated requests
	 */
	async recordView(reelId, userId = null) {
		const reel = await reelsRepository.findById(reelId);
		if (!reel) {
			throw AppError.notFound('Reel');
		}

		// Skip if this user already viewed today
		if (userId) {
			const alreadyViewed = await reelsRepository.hasViewedToday(reelId, userId);
			if (alreadyViewed) {
				return { success: true, counted: false };
			}
			// Record the event — TTL index purges it after 24 h
			await reelsRepository.recordViewEvent(reelId, userId);
		}

		await reelsRepository.incrementViews(reelId);
		// Recompute score asynchronously — fire and forget
		this.recomputeScore(reelId);
		return { success: true, counted: true };
	},

	async recordShare(reelId) {
		const reel = await reelsRepository.findById(reelId);
		if (!reel) {
			throw AppError.notFound('Reel');
		}
		const updatedReel = await reelsRepository.incrementShares(reelId);
		// Recompute score asynchronously — fire and forget
		this.recomputeScore(reelId);
		return { sharesCount: updatedReel.sharesCount || 0 };
	},

	async getComments(reelId, { page = 0, limit = 50 } = {}) {
		const reel = await reelsRepository.findById(reelId);
		if (!reel) {
			throw AppError.notFound('Reel');
		}
		const skip = page * limit;
		const comments = await reelsRepository.findComments(reelId, { limit, skip });
		return reelsMapper.toCommentListResponse(comments);
	},

	async getReplies(reelId, parentCommentId, { page = 0, limit = 50 } = {}) {
		const reel = await reelsRepository.findById(reelId);
		if (!reel) {
			throw AppError.notFound('Reel');
		}
		const skip = page * limit;
		const replies = await reelsRepository.findReplies(reelId, parentCommentId, { limit, skip });
		return reelsMapper.toCommentListResponse(replies);
	},

	async postComment(reelId, userId, text, parentCommentId = null) {
		const reel = await reelsRepository.findById(reelId);
		if (!reel) {
			throw AppError.notFound('Reel');
		}

		const comment = await reelsRepository.createComment(reelId, userId, text, parentCommentId);
		await reelsRepository.incrementComments(reelId, 1);

		if (parentCommentId) {
			// Increment replyCount on the parent comment
			await ReelComment.findByIdAndUpdate(parentCommentId, { $inc: { replyCount: 1 } });
		}

		// Recompute score asynchronously — fire and forget
		this.recomputeScore(reelId);
		
		// Fetch populated comment to build a complete response
		const createdComment = await ReelComment.findById(comment._id)
			.populate('userId', 'fullName avatar')
			.lean();
		
		return reelsMapper.toCommentResponse(createdComment);
	},

	async updateComment(reelId, commentId, userId, text) {
		const comment = await ReelComment.findById(commentId);
		if (!comment) {
			throw AppError.notFound('Comment');
		}
		if (comment.userId.toString() !== userId.toString()) {
			throw AppError.forbidden('You are not authorized to edit this comment');
		}

		const updatedComment = await ReelComment.findByIdAndUpdate(
			commentId,
			{ $set: { text, edited: true } },
			{ new: true }
		).populate('userId', 'fullName avatar').lean();

		return reelsMapper.toCommentResponse(updatedComment);
	},

	async deleteComment(reelId, commentId, userId) {
		const comment = await ReelComment.findById(commentId);
		if (!comment) {
			throw AppError.notFound('Comment');
		}
		if (comment.userId.toString() !== userId.toString()) {
			throw AppError.forbidden('You are not authorized to delete this comment');
		}

		await ReelComment.findByIdAndDelete(commentId);
		await reelsRepository.incrementComments(reelId, -1);

		if (comment.parentCommentId) {
			// Decrement replyCount on parent
			await ReelComment.findByIdAndUpdate(comment.parentCommentId, { $inc: { replyCount: -1 } });
		} else {
			// Delete all replies if this is a parent comment
			const repliesCount = await ReelComment.countDocuments({ parentCommentId: commentId });
			if (repliesCount > 0) {
				await ReelComment.deleteMany({ parentCommentId: commentId });
				await reelsRepository.incrementComments(reelId, -repliesCount);
			}
		}

		return { success: true };
	},

	async toggleCommentLike(reelId, commentId, userId) {
		const comment = await ReelComment.findById(commentId);
		if (!comment) {
			throw AppError.notFound('Comment');
		}

		const isLiked = comment.likedBy.some(id => id.toString() === userId.toString());
		let updatedComment;

		if (isLiked) {
			// Unlike
			updatedComment = await ReelComment.findByIdAndUpdate(
				commentId,
				{
					$pull: { likedBy: userId },
					$inc: { likeCount: -1 }
				},
				{ new: true }
			).populate('userId', 'fullName avatar').lean();
		} else {
			// Like
			updatedComment = await ReelComment.findByIdAndUpdate(
				commentId,
				{
					$addToSet: { likedBy: userId },
					$inc: { likeCount: 1 }
				},
				{ new: true }
			).populate('userId', 'fullName avatar').lean();
		}

		return reelsMapper.toCommentResponse(updatedComment);
	},

	getUploadSignature() {
		// If Cloudinary is configured, generate a signed upload signature
		if (cloudinary.config().cloud_name) {
			const timestamp = Math.round(new Date().getTime() / 1000);
			const folder = 'glunity/reels';
			const eager = 'w_720,h_1280,c_limit,q_auto,f_mp4|w_480,h_854,c_limit,q_auto:low,f_mp4';
			
			const paramsToSign = {
				timestamp,
				folder,
				eager,
			};
			
			const signature = cloudinary.utils.api_sign_request(paramsToSign, env.cloudinary.apiSecret);
			
			return {
				isLocalFallback: false,
				signature,
				timestamp,
				folder,
				eager,
				apiKey: env.cloudinary.apiKey,
				cloudName: env.cloudinary.cloudName,
			};
		}
		
		// Fallback for local development when Cloudinary is not configured
		return {
			isLocalFallback: true,
		};
	},

	async uploadVideoLocal(file) {
		if (!file) {
			throw AppError.badRequest('No file provided for upload');
		}
		
		const opts = {
			resource_type: 'video',
			folder: 'glunity/reels',
			filename: file.originalname,
			mimetype: file.mimetype,
		};
		
		const result = await cloudinaryClient.uploadBuffer(file.buffer, opts);
		
		return {
			videoUrl: result.secure_url || result.url,
			thumbnailUrl: (result.secure_url || result.url).replace(/\.[^.]+$/, '.jpg'),
			duration: 0, // Duration is client-computed or default in fallback
		};
	}
};

module.exports = reelsService;
