'use strict';
const express = require('express');
const { run, id } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// RF-017: cualquier usuario autenticado puede reportar una publicación o una reseña.
router.post('/', requireAuth, (req, res) => {
  const { type, propertyId, reviewId, reason } = req.body;
  if (!['publicación', 'reseña'].includes(type) || !propertyId) return res.status(400).json({ error: 'Datos de reporte incompletos.' });
  run(`INSERT INTO reports (id, type, property_id, review_id, reporter_id, reason) VALUES (?,?,?,?,?,?)`,
    [id('rep'), type, propertyId, reviewId || null, req.user.id, (reason || 'Sin detalle').trim()]);
  res.status(201).json({ ok: true, message: 'Reporte enviado al administrador.' });
});

module.exports = router;
