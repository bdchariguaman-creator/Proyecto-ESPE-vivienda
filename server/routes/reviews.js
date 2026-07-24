'use strict';
const express = require('express');
const { run, get, all, id } = require('../db');
const { requireRole } = require('../middleware/auth');
const { hasContact, reportCountFor, ownerAvgRating } = require('../helpers');

const router = express.Router({ mergeParams: true });

router.get('/', (req, res) => {
  const rs = all('SELECT * FROM reviews WHERE property_id = ? ORDER BY created_at DESC', [req.params.propertyId]);
  res.json({
    reviews: rs.map(r => ({
      id: r.id, userName: r.user_name, rating: r.rating, text: r.text, createdAt: r.created_at,
      reportFlag: reportCountFor(req.params.propertyId, r.id) >= 2
    }))
  });
});

// RF-015: solo puede reseñar quien tuvo contacto previo (mensaje o visita) y una reseña por publicación.
router.post('/', requireRole('estudiante'), (req, res) => {
  const p = get('SELECT * FROM properties WHERE id = ?', [req.params.propertyId]);
  if (!p) return res.status(404).json({ error: 'Publicación no encontrada.' });
  const already = get('SELECT 1 FROM reviews WHERE property_id = ? AND user_id = ?', [p.id, req.user.id]);
  if (already) return res.status(409).json({ error: 'Ya registraste una reseña para esta publicación.' });
  if (!hasContact(req.user.id, p.id)) return res.status(403).json({ error: 'Debes contactar al arrendador o programar una visita antes de dejar una reseña.' });
  const { rating, text } = req.body;
  const r = Number(rating);
  if (!r || r < 1 || r > 5) return res.status(400).json({ error: 'Selecciona una calificación entre 1 y 5.' });
  const newId = id('r');
  run(`INSERT INTO reviews (id, property_id, owner_id, property_title, user_id, user_name, rating, text) VALUES (?,?,?,?,?,?,?,?)`,
    [newId, p.id, p.owner_id, p.title, req.user.id, req.user.name, r, (text || 'Sin comentario').trim()]);
  res.status(201).json({ ok: true, message: 'Reseña publicada y promedio actualizado.' });
});

module.exports = router;
