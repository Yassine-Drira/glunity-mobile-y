'use strict';

const reelsService = require('./reels.service');

async function list(req, res, next) {
	try {
		const page = Math.max(0, parseInt(req.query.page, 10) || 0);
		// Default page size 50, clamp between 1 and 200 to prevent expensive queries
		let parsedLimit = parseInt(req.query.limit, 10);
		if (!parsedLimit || parsedLimit < 1) parsedLimit = 50;
		const limit = Math.min(parsedLimit, 200);
		const category = String(req.query.category || 'all').trim().toLowerCase();
		const authorId = req.query.authorId || null;
		const userId = req.user ? req.user._id : null;
		
		const result = await reelsService.getFeed({ userId, page, limit, category, authorId });
		res.status(200).json(result);
	} catch (err) {
		next(err);
	}
}

async function create(req, res, next) {
	try {
		const userId = req.user._id;
		const result = await reelsService.createReel(req.body, userId);
		res.status(201).json({ success: true, data: result });
	} catch (err) {
		next(err);
	}
}

async function update(req, res, next) {
	try {
		const reelId = req.params.id;
		const userId = req.user._id;
		const result = await reelsService.updateReel(reelId, userId, req.body);
		res.status(200).json({ success: true, data: result });
	} catch (err) {
		next(err);
	}
}


async function remove(req, res, next) {
	try {
		const reelId = req.params.id;
		const currentUser = req.user;
		
		await reelsService.deleteReel(reelId, currentUser);
		res.status(200).json({ success: true });
	} catch (err) {
		next(err);
	}
}

async function toggleLike(req, res, next) {
	try {
		const reelId = req.params.id;
		const userId = req.user._id;
		
		const result = await reelsService.toggleLike(reelId, userId);
		res.status(200).json({ success: true, data: result });
	} catch (err) {
		next(err);
	}
}

async function recordView(req, res, next) {
	try {
		const reelId = req.params.id;
		// userId is null for unauthenticated requests; dedup only applies to
		// authenticated users (enforced in the service layer).
		const userId = req.user ? req.user._id : null;
		await reelsService.recordView(reelId, userId);
		res.status(200).json({ success: true });
	} catch (err) {
		next(err);
	}
}

async function recordShare(req, res, next) {
	try {
		const reelId = req.params.id;
		const userId = req.user ? req.user._id : null;
		const result = await reelsService.recordShare(reelId, userId);
		res.status(200).json({ success: true, data: result });
	} catch (err) {
		next(err);
	}
}

async function listComments(req, res, next) {
	try {
		const reelId = req.params.id;
		const page = parseInt(req.query.page, 10) || 0;
		const limit = parseInt(req.query.limit, 10) || 50;
		
		const result = await reelsService.getComments(reelId, { page, limit });
		res.status(200).json(result);
	} catch (err) {
		next(err);
	}
}

async function postComment(req, res, next) {
	try {
		const reelId = req.params.id;
		const userId = req.user._id;
		const { text, parentCommentId } = req.body;
		
		const result = await reelsService.postComment(reelId, userId, text, parentCommentId);
		res.status(201).json({ success: true, data: result });
	} catch (err) {
		next(err);
	}
}

async function updateComment(req, res, next) {
	try {
		const reelId = req.params.id;
		const commentId = req.params.commentId;
		const userId = req.user._id;
		const { text } = req.body;

		const result = await reelsService.updateComment(reelId, commentId, userId, text);
		res.status(200).json({ success: true, data: result });
	} catch (err) {
		next(err);
	}
}

async function removeComment(req, res, next) {
	try {
		const reelId = req.params.id;
		const commentId = req.params.commentId;
		const userId = req.user._id;

		const result = await reelsService.deleteComment(reelId, commentId, userId);
		res.status(200).json(result);
	} catch (err) {
		next(err);
	}
}

async function toggleCommentLike(req, res, next) {
	try {
		const reelId = req.params.id;
		const commentId = req.params.commentId;
		const userId = req.user._id;

		const result = await reelsService.toggleCommentLike(reelId, commentId, userId);
		res.status(200).json({ success: true, data: result });
	} catch (err) {
		next(err);
	}
}

async function listReplies(req, res, next) {
	try {
		const reelId = req.params.id;
		const commentId = req.params.commentId;
		const page = parseInt(req.query.page, 10) || 0;
		const limit = parseInt(req.query.limit, 10) || 50;

		const result = await reelsService.getReplies(reelId, commentId, { page, limit });
		res.status(200).json(result);
	} catch (err) {
		next(err);
	}
}

async function getUploadSignature(req, res, next) {
	try {
		const result = reelsService.getUploadSignature();
		res.status(200).json({ success: true, data: result });
	} catch (err) {
		next(err);
	}
}

async function uploadVideoLocal(req, res, next) {
	try {
		const result = await reelsService.uploadVideoLocal(req.file);
		res.status(201).json({ success: true, data: result });
	} catch (err) {
		next(err);
	}
}

module.exports = {
	list,
	create,
	update,
	remove,
	toggleLike,
	recordView,
	recordShare,
	listComments,
	postComment,
	updateComment,
	deleteComment: removeComment,
	toggleCommentLike,
	listReplies,
	getUploadSignature,
	uploadVideoLocal,
};
