'use strict';

const reelsRepository = require('./reels.repository');
const reelsMapper = require('./reels.mapper');
const AppError = require('../../common/errors/app-error');
const env = require('../../config/env');
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

const reelsService = {
	async getFeed({ userId, page = 0, limit = 10, category, authorId }) {
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

	async deleteReel(reelId, userId) {
		const reel = await reelsRepository.findById(reelId);
		if (!reel) {
			throw AppError.notFound('Reel');
		}
		
		const authorIdStr = reel.authorId?._id?.toString() || reel.authorId?.toString();
		if (authorIdStr !== userId.toString()) {
			throw AppError.forbidden('You are not authorized to delete this reel');
		}
		
		await reelsRepository.deleteReel(reelId);
		return { success: true };
	},

	async toggleLike(reelId, userId) {
		const reel = await reelsRepository.findById(reelId);
		if (!reel) {
			throw AppError.notFound('Reel');
		}

		const existingLike = await reelsRepository.findLike(reelId, userId);
		if (existingLike) {
			await reelsRepository.deleteLike(reelId, userId);
			const updatedReel = await reelsRepository.incrementLikes(reelId, -1);
			return { liked: false, likesCount: updatedReel.likesCount };
		} else {
			await reelsRepository.createLike(reelId, userId);
			const updatedReel = await reelsRepository.incrementLikes(reelId, 1);
			return { liked: true, likesCount: updatedReel.likesCount };
		}
	},

	async recordView(reelId) {
		const reel = await reelsRepository.findById(reelId);
		if (!reel) {
			throw AppError.notFound('Reel');
		}
		await reelsRepository.incrementViews(reelId);
		return { success: true };
	},

	async recordShare(reelId) {
		const reel = await reelsRepository.findById(reelId);
		if (!reel) {
			throw AppError.notFound('Reel');
		}
		const updatedReel = await reelsRepository.incrementShares(reelId);
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

	async postComment(reelId, userId, text) {
		const reel = await reelsRepository.findById(reelId);
		if (!reel) {
			throw AppError.notFound('Reel');
		}

		const comment = await reelsRepository.createComment(reelId, userId, text);
		await reelsRepository.incrementComments(reelId, 1);
		
		// Fetch populated comment to build a complete response
		const populatedComments = await reelsRepository.findComments(reelId, { limit: 1, skip: 0 });
		const createdComment = populatedComments.find(c => c._id.toString() === comment._id.toString()) || comment;
		
		return reelsMapper.toCommentResponse(createdComment);
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
