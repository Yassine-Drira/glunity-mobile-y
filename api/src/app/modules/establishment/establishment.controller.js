const Establishment = require('../../../database/models/establishment.model');

/**
 * Migration helper to ensure all existing registered pro sellers automatically have an Establishment record.
 */
exports.migrateLegacySellerEstablishments = async () => {
  try {
    const User = require('../../../database/models/user.model');
    const sellers = await User.find({
      $or: [
        { role: 'seller' },
        { profileType: { $regex: 'pro', $options: 'i' } },
        { 'storeInfo.storeName': { $exists: true, $ne: '' } },
      ],
    });

    let migratedCount = 0;
    for (const seller of sellers) {
      const existing = await Establishment.findOne({ owner: seller._id });
      if (!existing) {
        const storeInfo = seller.storeInfo || {};
        await Establishment.create({
          owner: seller._id,
          name: storeInfo.storeName || seller.fullName || 'Magasin Sans Gluten',
          category: 'Supermarket',
          description: storeInfo.description || '',
          address: storeInfo.address || '',
          phone: storeInfo.phone || seller.phone || '',
          coverImageUrl: storeInfo.imageUrl || seller.avatar || '',
          openTime: '08:00',
          closeTime: '19:00',
          daysClosed: ['Sunday'],
          coordinates: { latitude: 36.8065, longitude: 10.1815 },
        });
        migratedCount++;
      }
    }
    if (migratedCount > 0) {
      console.log(`[Establishment Migration] Automatically migrated ${migratedCount} legacy pro seller stores to map establishments.`);
    }
  } catch (err) {
    console.error('[Establishment Migration Error]', err.message);
  }
};

/**
 * Get public establishments list for Map and Search
 */
exports.getEstablishments = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const establishments = await Establishment.find(filter)
      .populate('owner', 'fullName email avatar phone')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: establishments,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get single establishment by ID
 */
exports.getEstablishmentById = async (req, res, next) => {
  try {
    const establishment = await Establishment.findById(req.params.id).populate('owner', 'fullName email avatar phone');

    if (!establishment) {
      return res.status(404).json({
        success: false,
        message: 'Établissement non trouvé',
      });
    }

    return res.json({
      success: true,
      data: establishment,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get all establishments owned by current logged in seller (multi-store support)
 */
exports.getMyEstablishments = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const establishments = await Establishment.find({ owner: userId }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: establishments,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Create or update an establishment
 */
exports.upsertEstablishment = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const {
      id,
      name,
      category,
      description,
      address,
      phone,
      openTime,
      closeTime,
      daysClosed,
      latitude,
      longitude,
      coverImageUrl,
      logoUrl,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du magasin est obligatoire',
      });
    }

    const payload = {
      owner: userId,
      name: name.trim(),
      category: category || 'Other',
      description: description ? description.trim() : '',
      address: address ? address.trim() : '',
      phone: phone ? phone.trim() : '',
      openTime: openTime || '08:00',
      closeTime: closeTime || '19:00',
      daysClosed: Array.isArray(daysClosed) ? daysClosed : ['Sunday'],
      coordinates: {
        latitude: typeof latitude === 'number' ? latitude : 36.8065,
        longitude: typeof longitude === 'number' ? longitude : 10.1815,
      },
    };

    if (coverImageUrl) payload.coverImageUrl = coverImageUrl;
    if (logoUrl) payload.logoUrl = logoUrl;

    let establishment;
    if (id) {
      // Update existing store owned by user
      establishment = await Establishment.findOneAndUpdate(
        { _id: id, owner: userId },
        { $set: payload },
        { new: true, runValidators: true }
      );
      if (!establishment) {
        return res.status(404).json({
          success: false,
          message: 'Magasin non trouvé ou non autorisé',
        });
      }
    } else {
      // Create new store for seller
      establishment = await Establishment.create(payload);
    }

    // Sync corresponding Location record for map rendering
    try {
      const Location = require('../../../database/models/location.model');
      let locCat = 'other';
      const c = (establishment.category || '').toLowerCase();
      if (c.includes('restaurant')) locCat = 'restaurant';
      else if (c.includes('bakery') || c.includes('boulangerie')) locCat = 'bakery';
      else if (c.includes('supermarket') || c.includes('grocery') || c.includes('supermarché')) locCat = 'grocery';
      else if (c.includes('pharmacy') || c.includes('pharmacie')) locCat = 'pharmacy';
      else if (c.includes('bio') || c.includes('cafe')) locCat = 'cafe';

      await Location.findOneAndUpdate(
        { $or: [{ establishmentId: establishment._id }, { name: establishment.name, createdBy: userId }] },
        {
          $set: {
            establishmentId: establishment._id,
            name: establishment.name,
            category: locCat,
            description: establishment.description,
            address: establishment.address,
            phone: establishment.phone,
            glutenFree: true,
            certified: establishment.verified || false,
            location: {
              type: 'Point',
              coordinates: [establishment.coordinates.longitude, establishment.coordinates.latitude],
            },
            images: establishment.coverImageUrl ? [{ url: establishment.coverImageUrl }] : [],
            createdBy: userId,
          }
        },
        { upsert: true, new: true }
      );
    } catch (locErr) {
      console.warn('[Location Sync Warning]', locErr.message);
    }

    return res.status(id ? 200 : 201).json({
      success: true,
      message: id ? 'Magasin mis à jour avec succès' : 'Nouveau magasin créé avec succès',
      data: establishment,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete an establishment
 */
exports.deleteEstablishment = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const establishment = await Establishment.findOneAndDelete({ _id: req.params.id, owner: userId });

    if (!establishment) {
      return res.status(404).json({
        success: false,
        message: 'Magasin non trouvé ou non autorisé',
      });
    }

    return res.json({
      success: true,
      message: 'Magasin supprimé avec succès',
    });
  } catch (error) {
    return next(error);
  }
};
