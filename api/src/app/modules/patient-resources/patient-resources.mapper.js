'use strict';

const toArticleResponse = (a) => {
  if (!a) return null;
  return {
    id: String(a._id || a.id),
    type: a.type || 'article',
    title: a.title,
    excerpt: a.excerpt,
    body: a.body,
    fileUrl: a.fileUrl || null,
    videoUrl: a.videoUrl || null,
    category: a.category,
    icon: a.icon,
    coverImageUrl: a.coverImageUrl || null,
    readMinutes: a.readMinutes,
    isFeatured: a.isFeatured,
    isPublished: a.isPublished !== undefined ? a.isPublished : true,
    authorName: a.authorName,
    publishedAt: a.publishedAt,
    viewsCount: a.viewsCount || 0,
    clicksCount: a.clicksCount || 0,
  };
};

const toVideoResponse = (v) => {
  if (!v) return null;
  return {
    id: String(v._id || v.id),
    type: 'video',
    title: v.title,
    presenter: v.presenter,
    thumbnailUrl: v.thumbnailUrl,
    videoUrl: v.videoUrl,
    durationMinutes: v.durationMinutes,
    category: v.category,
    isPublished: v.isPublished !== undefined ? v.isPublished : true,
    viewsCount: v.viewsCount || 0,
    clicksCount: v.clicksCount || 0,
  };
};

module.exports = {
  toArticleResponse,
  toArticleListResponse: (items) => ({ success: true, data: items.map(toArticleResponse) }),
  toVideoResponse,
  toHomeResponse: ({ featured, articles, videos }) => ({
    success: true,
    data: {
      featured: toArticleResponse(featured),
      articles: articles.map(toArticleResponse),
      videos: videos.map(toVideoResponse),
    },
  }),
};
