'use strict';

const toReviewResponse = (review) => {
	if (!review) return null;
	return {
		id: review._id || review.id,
		userId: review.userId?._id || review.userId,
		user: review.userId && typeof review.userId === 'object' ? {
			fullName: review.userId.fullName,
			avatarUrl: review.userId.avatar?.url || null,
		} : null,
		productId: review.productId,
		recipeId: review.recipeId,
		rating: review.rating,
		comment: review.comment,
		createdAt: review.createdAt,
	};
};

const toReviewListResponse = (reviews) => {
	return {
		success: true,
		data: reviews.map(toReviewResponse),
	};
};

module.exports = {
	toReviewResponse,
	toReviewListResponse,
};
