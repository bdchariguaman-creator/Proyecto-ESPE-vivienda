'use strict';
const { get, all } = require('./db');

function avgRating(propertyId) {
  const rs = all('SELECT rating FROM reviews WHERE property_id = ?', [propertyId]);
  if (!rs.length) return 0;
  return +(rs.reduce((a, b) => a + b.rating, 0) / rs.length).toFixed(1);
}
function reviewCount(propertyId) {
  return get('SELECT COUNT(*) n FROM reviews WHERE property_id = ?', [propertyId]).n;
}
function ownerAvgRating(ownerId) {
  const rs = all('SELECT rating FROM reviews WHERE owner_id = ?', [ownerId]);
  if (!rs.length) return 0;
  return +(rs.reduce((a, b) => a + b.rating, 0) / rs.length).toFixed(1);
}
function reportCountFor(propertyId, reviewId = null) {
  if (reviewId) return get('SELECT COUNT(*) n FROM reports WHERE review_id = ?', [reviewId]).n;
  return get('SELECT COUNT(*) n FROM reports WHERE property_id = ? AND review_id IS NULL', [propertyId]).n;
}
function hasContact(userId, propertyId) {
  const msg = get('SELECT COUNT(*) n FROM conversations WHERE property_id = ? AND student_id = ?', [propertyId, userId]).n;
  if (msg > 0) return true;
  const visit = get('SELECT COUNT(*) n FROM visits WHERE property_id = ? AND student_id = ?', [propertyId, userId]).n;
  return visit > 0;
}
function propertyPhotos(propertyId) {
  return all('SELECT id, path FROM property_photos WHERE property_id = ? ORDER BY position ASC', [propertyId]);
}
function isFavorite(userId, propertyId) {
  if (!userId) return false;
  return !!get('SELECT 1 FROM favorites WHERE user_id = ? AND property_id = ?', [userId, propertyId]);
}
function serializeProperty(p, viewerId) {
  const owner = get('SELECT id, name, avatar, verified FROM users WHERE id = ?', [p.owner_id]);
  const photoRows = propertyPhotos(p.id);
  return {
    id: p.id, ownerId: p.owner_id, title: p.title, description: p.description, type: p.type,
    price: p.price, distance: p.distance, address: p.address, lat: p.lat, lng: p.lng,
    bedrooms: p.bedrooms, services: JSON.parse(p.services || '[]'),
    active: !!p.active, verified: !!p.verified, createdAt: p.created_at,
    photos: photoRows.map(r => r.path), photoIds: photoRows.map(r => r.id),
    rating: avgRating(p.id), reviewCount: reviewCount(p.id),
    reportFlag: reportCountFor(p.id) >= 2,
    isFavorite: isFavorite(viewerId, p.id),
    owner: owner ? { id: owner.id, name: owner.name, avatar: owner.avatar, verified: !!owner.verified, rating: ownerAvgRating(owner.id) } : null
  };
}

module.exports = { avgRating, reviewCount, ownerAvgRating, reportCountFor, hasContact, propertyPhotos, isFavorite, serializeProperty };
