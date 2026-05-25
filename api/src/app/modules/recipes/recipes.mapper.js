'use strict';

const recipesMapper = {
	toListResponse({ items, pagination }) {
		return {
			success: true,
			data: {
				items,
				pagination,
			},
		};
	},

	toItemResponse(recipe) {
		return {
			success: true,
			data: { recipe },
		};
	},
};

module.exports = recipesMapper;

