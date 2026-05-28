'use strict';

const repository = require('./patient-resources.repository');

const SEED_ARTICLES = [
  {
    title: 'What is Celiac Disease?',
    excerpt: 'A comprehensive guide to understanding celiac disease, its symptoms, diagnosis,',
    body: 'Celiac disease is a serious autoimmune disorder that occurs in genetically predisposed people where the ingestion of gluten leads to damage in the small intestine. Learn about symptoms, diagnosis, and living gluten-free.',
    category: 'celiac-disease',
    icon: 'heart-pulse',
    readMinutes: 8,
    isFeatured: true,
    authorName: 'Dr. Amira Ben Ali',
    coverImageUrl: null,
  },
  {
    title: 'Starting a Gluten-Free Diet',
    excerpt: 'Essential steps and practical advice for patients transitioning to a gluten-free',
    body: 'Transitioning to a gluten-free diet requires careful planning and education. This guide covers what foods to avoid, safe alternatives, and how to read labels.',
    category: 'diet-basics',
    icon: 'restaurant-outline',
    readMinutes: 5,
    isFeatured: false,
    authorName: 'Nutritionist Panel',
    coverImageUrl: null,
  },
  {
    title: 'Hidden Sources of Gluten',
    excerpt: 'Essential steps and practical advice for patients transitioning to a gluten-free',
    body: 'Gluten hides in many unexpected products including sauces, medications, and cosmetics. Learn to identify and avoid these hidden sources to stay safe.',
    category: 'safe-foods',
    icon: 'shield-check-outline',
    readMinutes: 5,
    isFeatured: false,
    authorName: 'GlUnity Medical Team',
    coverImageUrl: null,
  },
  {
    title: 'Nutritional Deficiencies in Celiac Patients',
    excerpt: 'Essential steps and practical advice for patients transitioning to a gluten-free',
    body: 'Celiac disease can lead to deficiencies in iron, folate, calcium, and vitamins B12 and D. This article explains how to identify and address these deficiencies.',
    category: 'celiac-disease',
    icon: 'stethoscope',
    readMinutes: 5,
    isFeatured: false,
    authorName: 'Dr. Amira Ben Ali',
    coverImageUrl: null,
  },
  {
    title: 'Dining Out Safely',
    excerpt: 'Essential steps and practical advice for patients transitioning to a gluten-free',
    body: 'Eating out with celiac disease requires preparation and communication. This guide teaches you how to ask the right questions and choose safe restaurants.',
    category: 'lifestyle-tips',
    icon: 'sunny-outline',
    readMinutes: 3,
    isFeatured: false,
    authorName: 'GlUnity Medical Team',
    coverImageUrl: null,
  },
];

const SEED_VIDEOS = [
  {
    title: 'Living with Celiac Disease',
    presenter: 'Dr. Amira Ben Ali',
    thumbnailUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=280&fit=crop',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    durationMinutes: 12,
    category: 'celiac-disease',
  },
  {
    title: 'Gluten-Free Meal Prep',
    presenter: 'Nutritionist Panel',
    thumbnailUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=280&fit=crop',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    durationMinutes: 18,
    category: 'diet-basics',
  },
];

const patientResourcesService = {
  async getHomeData() {
    const [resourceCount, videoCount] = await Promise.all([
      repository.countResources(),
      repository.countVideos(),
    ]);

    // Auto-seed if DB is empty
    if (resourceCount === 0) {
      for (const seed of SEED_ARTICLES) {
        await repository.create(seed);
      }
    }
    if (videoCount === 0) {
      for (const seed of SEED_VIDEOS) {
        await repository.createVideo(seed);
      }
    }

    const [featured, articles, videos] = await Promise.all([
      repository.findFeatured(),
      repository.findMany({ limit: 20 }),
      repository.findVideos({ limit: 10 }),
    ]);

    return { featured, articles, videos };
  },

  async listArticles({ category, limit = 50, skip = 0 } = {}) {
    const items = await repository.findMany({ category, limit, skip });
    return { items };
  },

  async getById(id) {
    const item = await repository.findById(id);
    if (!item) {
      const error = new Error('Resource not found');
      error.status = 404;
      throw error;
    }
    return item;
  },
};

module.exports = patientResourcesService;
