'use strict';
const express = require('express');
const { run, get, id } = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/visits/mine', requireRole('estudiante'), (req, res) => {
  const n = get('SELECT COUNT(*) n FROM visits WHERE student_id = ?', [req.user.id]).n;
  res.json({ count: n });
});

router.post('/visits', requireRole('estudiante'), (req, res) => {
  const { propertyId, date, time } = req.body;
  const p = get('SELECT id FROM properties WHERE id = ?', [propertyId]);
  if (!p) return res.status(404).json({ error: 'Publicación no encontrada.' });
  run('INSERT INTO visits (id, property_id, student_id, date, time) VALUES (?,?,?,?,?)',
    [id('v'), propertyId, req.user.id, date || new Date().toISOString().slice(0, 10), time || '18:00']);
  res.status(201).json({ ok: true, message: 'Visita programada.' });
});

router.post('/payments', requireRole('estudiante'), (req, res) => {
  const { propertyId, amount, method } = req.body;
  const p = get('SELECT id FROM properties WHERE id = ?', [propertyId]);
  if (!p) return res.status(404).json({ error: 'Publicación no encontrada.' });
  run('INSERT INTO payments (id, property_id, student_id, amount, method) VALUES (?,?,?,?,?)',
    [id('pay'), propertyId, req.user.id, Number(amount), method || 'Transferencia bancaria']);
  res.status(201).json({ ok: true, message: 'Pago registrado y comprobante generado.' });
});

module.exports = router;
