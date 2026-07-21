'use strict';

const repository = require('./patient-resources.repository');

const SEED_ARTICLES = [
  {
    title: 'What is Celiac Disease?',
    excerpt: 'A comprehensive clinical guide to understanding celiac disease, its symptoms, diagnosis, and medical treatments.',
    body: 'Maladie cœliaque (Celiac Disease) is a serious, hereditary autoimmune disorder where the ingestion of gluten (a protein found in wheat, rye, and barley) leads to damage in the small intestine. When people with celiac disease eat gluten, their immune system responds by damaging the villi—small, finger-like projections lining the small intestine that absorb nutrients. When villi are damaged, the body cannot absorb nutrients properly, leading to malnourishment, bone density loss, neurological symptoms, or infertility.\n\n### Clinical Symptoms:\nSymptoms can vary widely and differ between adults and children. In adults, common symptoms include chronic diarrhea, abdominal pain, bloating, unexplained weight loss, and fatigue. However, more than half of adults with celiac disease have extraintestinal (non-digestive) manifestations, such as iron-deficiency anemia, joint pain, skin rash (dermatitis herreferiformis), or mouth ulcers.\n\n### Diagnosis Path:\n1. Serology Testing: Blood tests search for specific antibodies (tTg-IgA, EMA-IgA). You must continue eating a gluten-containing diet prior to testing to avoid false negatives.\n2. Genetic Testing: HLA-DQ2/HLA-DQ8 testing helps rule out celiac disease if negative.\n3. Endoscopy & Biopsy: A small bowel biopsy remains the gold standard to confirm mucosal damage (Marsh classification).\n\n### Treatment:\nThe only established, life-long treatment is a strict gluten-free diet. Avoiding even trace amounts of cross-contamination is critical for villi healing and long-term health.\n\n**Sources & Scientific References:**\n- World Gastroenterology Organisation (WGO) Global Guidelines on Celiac Disease (2016).\n- American Journal of Gastroenterology Clinical Guidelines for Diagnosis and Management of Celiac Disease (2023).\n- Celiac Disease Foundation (celiac.org).',
    category: 'celiac-disease',
    icon: 'heart-pulse',
    readMinutes: 8,
    isFeatured: true,
    authorName: 'Dr. Amira Ben Ali',
    coverImageUrl: null,
  },
  {
    title: 'Starting a Gluten-Free Diet',
    excerpt: 'Essential steps and practical protocols for patients transitioning to a strict gluten-free lifestyle.',
    body: 'Transitioning to a strict gluten-free diet is the only effective treatment for celiac disease and non-celiac gluten sensitivity. The process goes beyond simply replacing bread; it requires a complete understanding of food processing, labeling laws, and kitchen safety.\n\n### Step 1: Identify Gluten-Containing Grains\nYou must completely avoid:\n- Wheat (including spelt, kamut, farro, and semolina)\n- Rye\n- Barley (including malt flavoring, malt vinegar, and beer)\n- Oats (unless certified gluten-free, due to high cross-contamination in mills)\n\n### Step 2: Read Food Labels\nLook for certified "Gluten-Free" labels. In many regions (including FDA and EU regulations), a product must contain fewer than 20 parts per million (ppm) of gluten to be labeled gluten-free. This threshold is scientifically proven to be safe for the vast majority of celiacs.\n\n### Step 3: Prevent Cross-Contamination at Home\nIf sharing a kitchen with gluten-eaters, take these safety measures:\n- Use separate toasters, colanders, and cutting boards.\n- Thoroughly wash countertops and utensils before preparing gluten-free food.\n- Store gluten-free foods on higher shelves of cupboards to prevent crumbs from falling into them.\n\n**Sources & Scientific References:**\n- Academy of Nutrition and Dietetics: Gluten-Free Nutrition Practice Group.\n- European Society for Paediatric Gastroenterology, Hepatology and Nutrition (ESPGHAN) Diet Guidelines.\n- National Institutes of Health (NIH) Celiac Disease Awareness Campaign.',
    category: 'diet-basics',
    icon: 'restaurant-outline',
    readMinutes: 5,
    isFeatured: false,
    authorName: 'Nutritionist Panel',
    coverImageUrl: null,
  },
  {
    title: 'Hidden Sources of Gluten',
    excerpt: 'Identify unexpected food items, supplements, and cosmetics where gluten is commonly used as a binder.',
    body: 'One of the biggest challenges for celiac patients is identifying "hidden" gluten. Manufacturers frequently use gluten as a binder, stabilizer, or texturizer in items where you would never expect it. Vigilant reading of ingredient lists is essential.\n\n### Common Hidden Food Sources:\n- Sauces & Condiments: Soy sauce (brewed with wheat), teriyaki, salad dressings, and commercially prepared gravies (often thickened with wheat flour).\n- Processed Meats: Sausage, hot dogs, meatballs, and deli meats can contain wheat-based fillers or hydrolyzed wheat protein.\n- Soups: Canned or processed soups often use wheat flour as a thickener.\n- Sweets & Ice Cream: Licorice, chocolates, and ice cream (with mix-ins like cookie dough or malt) frequently contain gluten.\n\n### Non-Food Hidden Sources:\n- Medications & Supplements: Wheat starch is sometimes used as an excipient (binder) in prescription tablets. Always check with your pharmacist.\n- Cosmetics: Lipsticks, lip balms, and toothpastes can be swallowed. Ensure they are gluten-free.\n- Play-Doh: Often made with wheat flour; hands must be washed thoroughly after use to avoid accidental ingestion.\n\n**Sources & Scientific References:**\n- FDA Rule on Gluten-Free Labeling of Fermented and Hydrolyzed Foods (2020).\n- Beyond Celiac: Hidden Gluten Guide.\n- Celiac Disease Center at Columbia University Medical Center.',
    category: 'safe-foods',
    icon: 'shield-check-outline',
    readMinutes: 5,
    isFeatured: false,
    authorName: 'GlUnity Medical Team',
    coverImageUrl: null,
  },
  {
    title: 'Nutritional Deficiencies in Celiac Patients',
    excerpt: 'Understanding intestinal malabsorption, micronutrient deficiency risks, and clinical recovery strategies.',
    body: 'Due to damage to the small intestinal mucosa (villi), newly diagnosed celiac patients frequently suffer from malabsorption. Understanding these deficiencies and working with a clinical dietitian is crucial for recovery.\n\n### Key Nutrients at Risk:\n- Iron: Anemia is one of the most common presentations of adult celiac disease. Iron absorption occurs primarily in the duodenum, which is the segment most severely affected by celiac inflammation.\n- Calcium & Vitamin D: Damage to the villi impairs calcium transport. Chronic malabsorption leads to osteopenia or osteoporosis. Vitamin D is essential for calcium absorption.\n- Folate & Vitamin B12: Deficiencies in these vitamins can cause megaloblastic anemia, neuropathy, and elevated homocysteine levels.\n- Zinc & Magnesium: Essential minerals that are often depleted due to chronic malabsorption and diarrhea.\n- Fiber: Many commercial gluten-free substitute products are highly refined and lack adequate dietary fiber, which can cause constipation.\n\n### Treatment & Recovery:\nFollowing a strict gluten-free diet allows the villi to heal, restoring normal nutrient absorption over 6 to 24 months. During this healing phase, high-quality targeted supplementation is often prescribed by physicians under medical supervision.\n\n**Sources & Scientific References:**\n- World Gastroenterology Organisation (WGO) Clinical Guidelines.\n- Mayo Clinic Proceedings: Nutritional Deficiencies in Celiac Disease (2019).\n- American Journal of Clinical Nutrition.',
    category: 'celiac-disease',
    icon: 'stethoscope',
    readMinutes: 5,
    isFeatured: false,
    authorName: 'Dr. Amira Ben Ali',
    coverImageUrl: null,
  },
  {
    title: 'Dining Out Safely',
    excerpt: 'Practical protocols, staff communication strategies, and cross-contamination prevention guidelines.',
    body: 'Dining out is one of the most stressful social experiences for someone with celiac disease. However, with preparation and direct communication with restaurant staff, you can eat out safely.\n\n### Before You Go:\n- Research: Use trusted celiac apps and directories (like GlUnity) to find establishments with certified gluten-free options or dedicated kitchens.\n- Call Ahead: Call during off-peak hours (e.g., 2 PM to 5 PM) to speak with the manager or head chef about their allergen management protocols.\n\n### At the Restaurant:\n- Be Direct: Clearly state: "I have celiac disease. It is a severe autoimmune medical condition. I cannot have any wheat, barley, or rye, including crumbs or shared cooking oil."\n- Ask Key Questions:\n  - "Is the gluten-free pasta boiled in fresh water or the same water as wheat pasta?"\n  - "Is the gluten-free pizza baked on the same surface or in a separate pan?"\n  - "Are french fries fried in a dedicated fryer, or is the oil shared with breaded items?"\n  - "Are cutting boards and knives cleaned before assembling my plate?"\n\n### High-Risk Foods to Avoid:\n- Salad Bars: High risk of customer cross-contamination (crumbs falling from breadcrumbs bowl).\n- Sushi: Imitation crab (surimi) contains wheat starch; sushi rice is sometimes prepared with grain vinegars.\n\n**Sources & Scientific References:**\n- Gluten-Free Certification Organization (GFCO) Restaurant Guidelines.\n- National Celiac Association Dining Out Safety Manual.\n- Celiac Disease Foundation: Travel and Dining Out Tips.',
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
    const [featured, articles, videos] = await Promise.all([
      repository.findFeatured(),
      repository.findMany({ limit: 20 }),
      repository.findVideos({ limit: 10 }),
    ]);

    return { featured, articles, videos };
  },

  async seedResourcesIfNeeded() {
    try {
      const [resourceCount, videoCount, hasDetailed] = await Promise.all([
        repository.countResources(),
        repository.countVideos(),
        repository.hasDetailedContent(),
      ]);

      if (resourceCount < SEED_ARTICLES.length || !hasDetailed) {
        await repository.clearAll();
        for (const seed of SEED_ARTICLES) {
          await repository.create(seed);
        }
      }

      if (videoCount === 0) {
        for (const seed of SEED_VIDEOS) {
          await repository.createVideo(seed);
        }
      }
    } catch (err) {
      // Log seeding error but don't crash startup
      console.error('Failed to seed patient resources:', err.message);
    }
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

  async recordClick(id) {
    const updated = await repository.incrementClick(id);
    return updated;
  },
};

module.exports = patientResourcesService;
