'use strict';

const toReelResponse = (reel, isLiked = false) => {
	if (!reel) return null;
	
	const author = reel.authorId || {};
	return {
		id: reel._id || reel.id,
		author: {
			id: author._id || author.id || null,
			fullName: author.fullName || 'Anonymous',
			avatarUrl: author.avatar?.url || null,
			profileType: author.profileType || null,
		},
		videoUrl: reel.videoUrl,
		thumbnailUrl: reel.thumbnailUrl,
		caption: reel.caption || '',
		duration: reel.duration || 0,
		viewsCount: reel.viewsCount || 0,
		likesCount: reel.likesCount || 0,
		commentsCount: reel.commentsCount || 0,
		sharesCount: reel.sharesCount || 0,
		isLiked: !!isLiked,
		status: reel.status,
		category: reel.category || 'all',
		channelRef: reel.channelRef || null,
		audioTitle: reel.audioTitle || null,
		audioArtist: reel.audioArtist || null,
		audioUrl: reel.audioUrl || null,
		createdAt: reel.createdAt,
	};
};

const toReelListResponse = (reels, likesMap = {}) => {
	return {
		success: true,
		data: reels.map(reel => toReelResponse(reel, !!likesMap[reel._id?.toString()])),
	};
};

const toCommentResponse = (comment) => {
	if (!comment) return null;
	
	const user = comment.userId || {};
	return {
		id: comment._id || comment.id,
		reelId: comment.reelId,
		author: {
			id: user._id || user.id || null,
			fullName: user.fullName || 'Anonymous',
			avatarUrl: user.avatar?.url || null,
		},
		text: comment.text,
		createdAt: comment.createdAt,
	};
};

const toCommentListResponse = (comments) => {
	return {
		success: true,
		data: comments.map(toCommentResponse),
	};
};

module.exports = {
	toReelResponse,
	toReelListResponse,
	toCommentResponse,
	toCommentListResponse,
};
