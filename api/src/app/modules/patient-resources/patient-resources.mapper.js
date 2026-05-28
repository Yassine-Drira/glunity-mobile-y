'use strict';

const toArticleResponse = (a) => {
  if (!a) return null;
  return {
    id: String(a._id || a.id),
    title: a.title,
    excerpt: a.excerpt,
    body: a.body,
    category: a.category,
    icon: a.icon,
    coverImageUrl: a.coverImageUrl || null,
    readMinutes: a.readMinutes,
    isFeatured: a.isFeatured,
    authorName: a.authorName,
    publishedAt: a.publishedAt,
  };
};

const toVideoResponse = (v) => {
  if (!v) return null;
  return {
    id: String(v._id || v.id),
    title: v.title,
    presenter: v.presenter,
    thumbnailUrl: v.thumbnailUrl,
    videoUrl: v.videoUrl,
    durationMinutes: v.durationMinutes,
    category: v.category,
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
