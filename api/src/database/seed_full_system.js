'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/user.model');
const Product = require('./models/product.model');
const Event = require('./models/event.model');
const Recipe = require('./models/recipe.model');
const Reel = require('./models/reel.model');
const PatientResource = require('./models/patient-resource.model');

async function seedFullSystem() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // 1. Seed Real Users Across All Profile Types
    console.log('Seeding Users...');
    const usersData = [
      // Admins
      { fullName: 'Super Admin Alpha', email: 'admin1@glu10.com', passwordHash, profileType: 'admin', emailVerified: true, isActive: true },
      { fullName: 'Super Admin Beta', email: 'admin2@glu10.com', passwordHash, profileType: 'admin', emailVerified: true, isActive: true },
      { fullName: 'Super Admin Gamma', email: 'admin3@glu10.com', passwordHash, profileType: 'admin', emailVerified: true, isActive: true },

      // Celiac Patients
      { fullName: 'Claire Moreau', email: 'claire.m@gmail.com', passwordHash, profileType: 'celiac', emailVerified: true, isActive: true, city: 'Bordeaux', points: 450, streakDays: 12 },
      { fullName: 'Thomas Bernard', email: 'thomas.b@gmail.com', passwordHash, profileType: 'celiac', emailVerified: true, isActive: true, city: 'Paris', points: 320, streakDays: 5 },
      { fullName: 'Emma Laurent', email: 'emma.celiac@yahoo.fr', passwordHash, profileType: 'celiac', emailVerified: true, isActive: true, city: 'Lyon', points: 890, streakDays: 28 },
      { fullName: 'Lucas Petit', email: 'lucas.p@outlook.fr', passwordHash, profileType: 'celiac', emailVerified: true, isActive: true, city: 'Nantes', points: 150, streakDays: 3 },
      { fullName: 'Sophie Durand', email: 'sophie.d@gmail.com', passwordHash, profileType: 'celiac', emailVerified: true, isActive: true, city: 'Toulouse', points: 610, streakDays: 14 },

      // Sellers (pro_commerce)
      {
        fullName: 'Boulangerie Bio Célia',
        email: 'contact@celiabio.fr',
        passwordHash,
        profileType: 'pro_commerce',
        emailVerified: true,
        isActive: true,
        city: 'Lyon',
        storeInfo: {
          storeName: 'Boulangerie Bio Célia',
          siret: '84930211400018',
          address: '14 Rue de la République, Lyon',
          phone: '+33478123456',
          isVerified: true,
        },
      },
      {
        fullName: 'Épicerie 100% Sans Gluten Marseille',
        email: 'pro@epiceriesg-marseille.fr',
        passwordHash,
        profileType: 'pro_commerce',
        emailVerified: true,
        isActive: true,
        city: 'Marseille',
        storeInfo: {
          storeName: 'Épicerie 100% Sans Gluten Marseille',
          siret: '91244588900021',
          address: '45 Boulevard Baille, Marseille',
          phone: '+33491987654',
          isVerified: false,
        },
      },

      // Pro Health
      { fullName: 'Dr. Antoine Valois', email: 'antoine.valois@sante-gastro.fr', passwordHash, profileType: 'pro_health', emailVerified: true, isActive: true, city: 'Paris' },
      { fullName: 'Dr. Sophie Martin', email: 'dr.sophie.martin@gastro.fr', passwordHash, profileType: 'pro_health', emailVerified: true, isActive: true, city: 'Bordeaux' },
    ];

    const createdUsers = [];
    for (const u of usersData) {
      const doc = await User.findOneAndUpdate({ email: u.email }, u, { upsert: true, returnDocument: 'after' });
      createdUsers.push(doc);
    }
    console.log(`Created/Updated ${createdUsers.length} Users.`);

    const celiacUser = createdUsers.find((u) => u.profileType === 'celiac');

    // Clean legacy incomplete records
    await Event.deleteMany({ title: { $in: ['Atelier Cuisine & Pâtisserie Sans Gluten', 'Webinaire: Diagnostic & Vie avec la Cœliaquie', 'Rencontre & Dégustation Communautaire Paris'] } });
    await Recipe.deleteMany({ title: { $in: ['Pizza Crust Sans Gluten Inratable', 'Pancakes Moelleux au Lait d\'Amande', 'Gâteau Fondant au Chocolat & Farine de Châtaigne'] } });
    await PatientResource.deleteMany({ title: { $in: ['Guide complet pour débuter un régime Sans Gluten', 'Liste des Additifs Contenant du Gluten Caché (PDF)', 'Comprendre l\'Hérédité de la Maladie Cœliaque'] } });

    // 2. Seed High-Quality Events matching Event Schema
    console.log('Seeding Events with Full Schema...');
    const eventsData = [
      {
        title: 'Atelier Cuisine & Pâtisserie Sans Gluten',
        type: 'class',
        description: 'Apprenez à réussir vos pâtes levées, brioches et pains sans gluten avec un chef spécialisé.',
        startsAt: new Date(Date.now() + 7 * 86400000),
        endsAt: new Date(Date.now() + 7 * 86400000 + 7200000),
        location: {
          name: 'Atelier Gourmand Lyon',
          address: '14 Rue de la République',
          city: 'Lyon',
          country: 'France',
          lat: 45.764,
          lng: 4.835,
        },
        organizer: {
          name: 'Claire Moreau',
          contact: 'claire.m@gmail.com',
          organizerId: celiacUser?._id,
        },
        maxCapacity: 15,
        price: 25,
        currency: 'EUR',
        format: 'presentiel',
        images: [{ url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800' }],
        isPublished: true,
        status: 'active',
        createdBy: celiacUser?._id,
      },
      {
        title: 'Webinaire: Diagnostic & Vie avec la Cœliaquie',
        type: 'webinar',
        description: 'Conférence en ligne animée par le Dr. Antoine Valois sur le diagnostic précoce et le suivi médical.',
        startsAt: new Date(Date.now() + 14 * 86400000),
        endsAt: new Date(Date.now() + 14 * 86400000 + 3600000),
        location: {
          name: 'En ligne (Zoom HD)',
          address: 'Webinaire Virtuel',
          city: 'Paris',
          country: 'France',
        },
        organizer: {
          name: 'Dr. Antoine Valois',
          contact: 'antoine.valois@sante-gastro.fr',
          organizerId: celiacUser?._id,
        },
        format: 'online',
        meetingUrl: 'https://zoom.us/j/glu10webinar',
        maxCapacity: 100,
        price: 0,
        currency: 'EUR',
        images: [{ url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800' }],
        isPublished: true,
        status: 'active',
        createdBy: celiacUser?._id,
      },
      {
        title: 'Rencontre & Dégustation Communautaire Paris',
        type: 'meetup',
        description: 'Rencontre amicale entre cœliaques autour d un buffet pâtissier 100% sécurisé.',
        startsAt: new Date(Date.now() + 21 * 86400000),
        endsAt: new Date(Date.now() + 21 * 86400000 + 10800000),
        location: {
          name: 'Jardin du Luxembourg',
          address: 'Rue de Médicis',
          city: 'Paris',
          country: 'France',
          lat: 48.8462,
          lng: 2.3372,
        },
        organizer: {
          name: 'Thomas Bernard',
          contact: 'thomas.b@gmail.com',
          organizerId: celiacUser?._id,
        },
        maxCapacity: 30,
        price: 0,
        format: 'presentiel',
        images: [{ url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800' }],
        isPublished: true,
        status: 'active',
        createdBy: celiacUser?._id,
      },
    ];

    for (const e of eventsData) {
      await Event.create(e);
    }

    // 3. Seed High-Quality Recipes matching Recipe Schema
    console.log('Seeding Recipes with Full Schema...');
    const recipesData = [
      {
        title: 'Pizza Crust Sans Gluten Inratable',
        slug: 'pizza-crust-sans-gluten-inratable-full',
        category: 'easy',
        description: 'Pâte à pizza croustillante à base de farine de riz et fécule de tapioca.',
        ingredients: [
          '200g farine de riz certifiée AFDIAG',
          '100g fécule de tapioca sans gluten',
          '1 sachet de levure boulangère sans gluten',
          '1 cuillère à soupe d huile d olive',
          '180ml eau tiède',
          '1 pincée de sel',
        ],
        steps: [
          'Délayer la levure sans gluten dans l eau tiède pendant 5 minutes.',
          'Mélanger la farine de riz, la fécule et le sel dans un grand bol.',
          'Verser l eau et l huile d olive, puis pétrir jusqu a obtenir une pâte homogène.',
          'Etaler la pâte sur du papier cuisson et garnir selon vos envies.',
          'Enfourner à 220°C pendant 12 à 15 minutes.',
        ],
        photos: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800'],
        authorId: celiacUser?._id,
        isPublished: true,
      },
      {
        title: 'Pancakes Moelleux au Lait d Amande',
        slug: 'pancakes-moelleux-au-lait-damande-full',
        category: 'quick',
        description: 'Pancakes légers et aérés pour un petit-déjeuner gourmand sans gluten.',
        ingredients: [
          '150g mix farine sans gluten',
          '1 cuillère à café de levure chimique sans gluten',
          '1 œuf bio',
          '200ml lait d amande',
          '1 cuillère à soupe de sirop d agave',
        ],
        steps: [
          'Fouetter l œuf avec le sirop d agave et le lait d amande.',
          'Ajouter la farine sans gluten et la levure en pluie tout en remuant.',
          'Faire chauffer une poêle huilée et verser des petites louches de pâte.',
          'Cuire 2 minutes de chaque côté jusqu a ce qu ils soient dorés.',
        ],
        photos: ['https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800'],
        authorId: celiacUser?._id,
        isPublished: true,
      },
      {
        title: 'Gâteau Fondant au Chocolat & Farine de Châtaigne',
        slug: 'gateau-fondant-chocolat-chataigne-full',
        category: 'easy',
        description: 'Un gâteau fondant au chocolat noir intensément parfumé à la châtaigne.',
        ingredients: [
          '200g chocolat noir 70% sans gluten',
          '100g beurre doux',
          '80g farine de châtaigne bio',
          '3 œufs',
          '60g sucre de canne',
        ],
        steps: [
          'Faire fondre le chocolat et le beurre au bain-marie.',
          'Fouetter les œufs et le sucre jusqu a ce que le mélange blanchisse.',
          'Incorporer le chocolat fondu puis la farine de châtaigne.',
          'Verser dans un moule et cuire 18 minutes à 180°C.',
        ],
        photos: ['https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800'],
        authorId: celiacUser?._id,
        isPublished: true,
      },
    ];

    for (const r of recipesData) {
      await Recipe.create(r);
    }

    // 4. Seed High-Quality Patient Resources matching PatientResource Schema
    console.log('Seeding Patient Resources with Full Schema...');
    const resourcesData = [
      {
        title: 'Comprendre l Hérédité de la Maladie Cœliaque',
        excerpt: 'Les facteurs génétiques HLA-DQ2 et HLA-DQ8 expliquent la transmission familiale.',
        body: 'La maladie cœliaque possède une composante génétique forte. Environ 95% des patients expriment le dimère HLA-DQ2 et la plupart des autres expriment le HLA-DQ8. Cependant, avoir ces gènes ne signifie pas que vous développerez la maladie, d où l importance du bilan sérologique...',
        category: 'celiac-disease',
        icon: 'dna',
        coverImageUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800',
        readMinutes: 6,
        isFeatured: true,
        authorName: 'Dr. Antoine Valois',
        isPublished: true,
      },
      {
        title: 'Liste des Additifs Contenant du Gluten Caché (PDF)',
        excerpt: 'Guide pratique pour repérer l amidon modifié et les liants industriels.',
        body: 'Certains produits transformés contiennent des liants ou épaississants issus du blé. Voici la liste exhaustive des codes E à surveiller lors de vos achats en supermarché...',
        category: 'diet-basics',
        icon: 'file-document-outline',
        coverImageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
        readMinutes: 4,
        isFeatured: false,
        authorName: 'Association Cœliaque',
        isPublished: true,
      },
      {
        title: 'Guide complet pour débuter un régime Sans Gluten',
        excerpt: 'Les règles d or pour aménager votre cuisine et éviter la contamination croisée.',
        body: 'Le premier réflexe lors du diagnostic est de débarrasser la cuisine des sources de contamination : grille-pain dédié, ustensiles en bois séparés, étiquetage clair des placards...',
        category: 'safe-foods',
        icon: 'shield-check-outline',
        coverImageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800',
        readMinutes: 8,
        isFeatured: true,
        authorName: 'Équipe Médicale Glu10',
        isPublished: true,
      },
    ];

    for (const resItem of resourcesData) {
      await PatientResource.create(resItem);
    }

    console.log('Full System Schema Alignment Seeding Completed Successfully.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding schema aligned system:', err);
    process.exit(1);
  }
}

seedFullSystem();
