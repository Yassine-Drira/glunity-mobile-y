'use strict';

/**
 * Convert a Mongo location doc into the response shape the mobile client
 * expects. Keeps lng/lat flat instead of nested GeoJSON.
 */
function toLocationDto(doc) {
  if (!doc) return null;
  const id = doc._id ? String(doc._id) : doc.id;
  const coords = doc.location?.coordinates || [0, 0];

  return {
    id,
    name: doc.name,
    description: doc.description || '',
    category: doc.category,
    glutenFree: !!doc.glutenFree,
    certified: !!doc.certified,
    contaminationWarning: !!doc.contaminationWarning,
    address: doc.address || '',
    city: doc.city || '',
    country: doc.country || '',
    phone: doc.phone || '',
    priceRange: doc.priceRange || '',
    lng: coords[0],
    lat: coords[1],
    images: (doc.images || []).map((img) => ({
      url: img.url,
      publicId: img.publicId,
    })),
    rating: {
      average: Number(doc.rating?.average || 0),
      count: Number(doc.rating?.count || 0),
    },
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

module.exports = {
  toLocationDto,
  toLocationListResponse(items, total) {
    return {
      success: true,
      data: items.map(toLocationDto),
      meta: { total, count: items.length },
    };
  },
  toLocationResponse(doc) {
    return { success: true, data: toLocationDto(doc) };
  },
};
