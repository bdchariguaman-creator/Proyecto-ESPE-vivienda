'use strict';
const express = require('express');
const { all } = require('../db');
const { requireRole } = require('../middleware/auth');
const { ownerAvgRating } = require('../helpers');

const router = express.Router();

// Historial de reseñas del arrendador: se conserva aunque elimine la publicación asociada (RF-010, RF-016).
router.get('/reviews', requireRole('arrendador'), (req, res) => {
  const rs = all('SELECT * FROM reviews WHERE owner_id = ? ORDER BY created_at DESC', [req.user.id]);
  const propertyIds = new Set(all('SELECT id FROM properties WHERE owner_id = ?', [req.user.id]).map(p => p.id));
  res.json({
    rating: ownerAvgRating(req.user.id),
    reviews: rs.map(r => ({
      id: r.id, propertyTitle: r.property_title, userName: r.user_name, rating: r.rating, text: r.text,
      createdAt: r.created_at, propertyDeleted: !r.property_id
    }))
  });
});

module.exports = router;
