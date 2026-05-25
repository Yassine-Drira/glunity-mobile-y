'use strict';

require('dotenv').config({ override: true });
const mongoose = require('mongoose');

const Recipe = require('../src/database/models/recipe.model');

const AUTHOR_ID = new mongoose.Types.ObjectId('69dbc332aeeb4dba5ab90324');

const RECIPES = [
  {
    title: 'Gluten-Free Tunisian Brik',
    slug: 'gluten-free-tunisian-brik',
    category: 'tunisian',
    description: 'Crispy gluten-free brik with tuna, egg, and herbs.',
    ingredients: [
      '2 gluten-free warqa sheets',
      '1 can tuna in olive oil',
      '2 eggs',
      '2 tbsp chopped parsley',
      '1 tsp capers',
      'Salt and pepper',
    ],
    steps: [
      'Mix tuna, parsley, and capers in a bowl.',
      'Place filling in warqa sheet and crack one egg in the center.',
      'Fold and seal edges gently.',
      'Fry in hot oil for 2-3 minutes per side until golden.',
    ],
    nutritionInfo: { calories: 320, carbs: 19, protein: 18 },
    photos: ['https://images.unsplash.com/photo-1547592180-85f173990554'],
    videos: [],
  },
  {
    title: 'Quick Chickpea Salad',
    slug: 'quick-chickpea-salad',
    category: 'quick',
    description: 'Fresh chickpea salad with lemon and olive oil.',
    ingredients: [
      '2 cups cooked chickpeas',
      '1 cucumber diced',
      '2 tomatoes diced',
      '1/4 red onion sliced',
      '2 tbsp olive oil',
      'Juice of 1 lemon',
      'Salt and cumin',
    ],
    steps: ['Combine chickpeas and vegetables.', 'Prepare dressing.', 'Mix everything.', 'Serve chilled.'],
    nutritionInfo: { calories: 260, carbs: 29, protein: 10 },
    photos: ['https://images.unsplash.com/photo-1512621776951-a57141f2eefd'],
    videos: [],
  },
  {
    title: 'Easy Gluten-Free Pizza',
    slug: 'easy-gluten-free-pizza',
    category: 'easy',
    description: 'Simple homemade GF pizza.',
    ingredients: ['2 cups gluten-free flour', '1 tsp yeast', '3/4 cup warm water', 'Tomato sauce', '120g mozzarella'],
    steps: ['Prepare dough.', 'Rest 30 min.', 'Add toppings.', 'Bake 220C.'],
    nutritionInfo: { calories: 370, carbs: 35, protein: 14 },
    photos: ['https://images.unsplash.com/photo-1513104890138-7c749659a591'],
    videos: [],
  },
  {
    title: 'Tunisian Ojja with Peppers',
    slug: 'tunisian-ojja-peppers',
    category: 'tunisian',
    description: 'Spicy egg skillet.',
    ingredients: ['4 eggs', '2 tomatoes', '1 pepper', 'garlic', 'harissa'],
    steps: ['Cook sauce', 'Add eggs', 'Finish cooking'],
    nutritionInfo: { calories: 280, carbs: 11, protein: 16 },
    photos: ['https://images.unsplash.com/photo-1482049016688-2d3e1b311543'],
    videos: [],
  },
  {
    title: 'Quick Avocado Tuna Bowl',
    slug: 'quick-avocado-tuna-bowl',
    category: 'quick',
    description: 'Healthy protein bowl.',
    ingredients: ['tuna', 'avocado', 'lettuce'],
    steps: ['Assemble', 'Season', 'Serve'],
    nutritionInfo: { calories: 340, carbs: 9, protein: 24 },
    photos: ['https://images.unsplash.com/photo-1498837167922-ddd27525d352'],
    videos: [],
  },
  {
    title: 'Easy Banana Oat Pancakes',
    slug: 'banana-oat-pancakes',
    category: 'easy',
    description: 'Gluten-free pancakes.',
    ingredients: ['banana', 'oats', 'eggs'],
    steps: ['Blend', 'Cook', 'Serve'],
    nutritionInfo: { calories: 300, carbs: 33, protein: 12 },
    photos: ['https://images.unsplash.com/photo-1528207776546-365bb710ee93'],
    videos: [],
  },
  {
    title: 'Tunisian Lablabi Soup',
    slug: 'tunisian-lablabi-soup',
    category: 'tunisian',
    description: 'Chickpea soup.',
    ingredients: ['chickpeas', 'garlic', 'cumin'],
    steps: ['Cook', 'Simmer', 'Serve'],
    nutritionInfo: { calories: 290, carbs: 34, protein: 11 },
    photos: ['https://images.unsplash.com/photo-1547592166-23ac45744acd'],
    videos: [],
  },
  {
    title: 'Quick Greek Yogurt Parfait',
    slug: 'greek-yogurt-parfait',
    category: 'quick',
    description: 'Protein dessert.',
    ingredients: ['yogurt', 'berries', 'honey'],
    steps: ['Layer', 'Serve'],
    nutritionInfo: { calories: 220, carbs: 18, protein: 15 },
    photos: ['https://images.unsplash.com/photo-1488477181946-6428a0291777'],
    videos: [],
  },
  {
    title: 'Easy Chicken Veggie Tray Bake',
    slug: 'chicken-veggie-tray-bake',
    category: 'easy',
    description: 'One pan meal.',
    ingredients: ['chicken', 'vegetables', 'oil'],
    steps: ['Mix', 'Bake', 'Serve'],
    nutritionInfo: { calories: 360, carbs: 14, protein: 32 },
    photos: ['https://images.unsplash.com/photo-1518492104633-130d0cc84637'],
    videos: [],
  },
  {
    title: 'Tunisian Mechouia Salad',
    slug: 'tunisian-mechouia-salad',
    category: 'tunisian',
    description: 'Roasted veggie salad.',
    ingredients: ['peppers', 'tomatoes', 'oil'],
    steps: ['Roast', 'Chop', 'Mix'],
    nutritionInfo: { calories: 190, carbs: 17, protein: 3 },
    photos: ['https://images.unsplash.com/photo-1515003197210-e0cd71810b5f'],
    videos: [],
  },
];

async function seedRecipes() {
  const mongoUri = String(process.env.MONGO_URI || '')
    .trim()
    .replace(/^['\"]|['\"]$/g, '');
  if (!mongoUri) {
    throw new Error('MONGO_URI is missing.');
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  let inserted = 0;
  let updated = 0;

  for (const recipe of RECIPES) {
    const payload = {
      ...recipe,
      authorId: AUTHOR_ID,
      isPublished: true,
      isFavorite: false,
    };

    const result = await Recipe.updateOne(
      { slug: payload.slug },
      { $set: payload },
      { upsert: true, runValidators: true },
    );

    if (result.upsertedCount > 0) inserted += 1;
    else if (result.modifiedCount > 0 || result.matchedCount > 0) updated += 1;
  }

  const total = await Recipe.countDocuments({ isPublished: true });

  console.log(`Recipes seed complete: inserted=${inserted}, updated=${updated}, totalPublished=${total}`);
}

seedRecipes()
  .catch((err) => {
    console.error('Recipes seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
