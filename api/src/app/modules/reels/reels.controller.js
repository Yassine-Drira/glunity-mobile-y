'use strict';

const reelsService = require('./reels.service');

async function list(req, res, next) {
	try {
		const page = parseInt(req.query.page, 10) || 0;
		const limit = parseInt(req.query.limit, 10) || 10;
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
		const userId = req.user._id;
		
		await reelsService.deleteReel(reelId, userId);
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
		await reelsService.recordView(reelId);
		res.status(200).json({ success: true });
	} catch (err) {
		next(err);
	}
}

async function recordShare(req, res, next) {
	try {
		const reelId = req.params.id;
		const result = await reelsService.recordShare(reelId);
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
		const { text } = req.body;
		
		const result = await reelsService.postComment(reelId, userId, text);
		res.status(201).json({ success: true, data: result });
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
	getUploadSignature,
	uploadVideoLocal,
};
