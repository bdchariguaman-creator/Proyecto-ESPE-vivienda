'use strict';
const express = require('express');
const fs = require('fs');
const path = require('path');
const { db, run, get, all, id } = require('../db');
const { currentUser, requireRole } = require('../middleware/auth');
const { serializeProperty, avgRating } = require('../helpers');
const { uploadPhotos, publicPath } = require('../upload');

const router = express.Router();

function savePhotos(propertyId, files, startPosition = 0) {
  const ins = db.prepare('INSERT INTO property_photos (id, property_id, path, position) VALUES (?,?,?,?)');
  files.forEach((f, i) => ins.run(id('photo'), propertyId, publicPath('photos', f.filename), startPosition + i));
}

// RF-011: búsqueda con filtros combinables (precio, tipo, distancia, servicios, calificación) y orden.
router.get('/', (req, res) => {
  const viewer = currentUser(req);
  const { q = '', min = 0, max = 999999, type = '', dist = 999, rating = 0, services = '', sort = 'relevance' } = req.query;
  const serviceList = services ? services.split(',').filter(Boolean) : [];
  let rows = all('SELECT * FROM properties WHERE active = 1');
  rows = rows.filter(p => {
    const txt = (p.title + ' ' + p.address + ' ' + p.type + ' ' + p.description).toLowerCase();
    const svc = JSON.parse(p.services || '[]');
    return (!q || txt.includes(String(q).toLowerCase()))
      && p.price >= Number(min) && p.price <= Number(max)
      && (!type || p.type === type)
      && p.distance <= Number(dist)
      && avgRating(p.id) >= Number(rating)
      && serviceList.every(s => svc.includes(s));
  });
  let list = rows.map(p => serializeProperty(p, viewer && viewer.id));
  if (sort === 'price') list.sort((a, b) => a.price - b.price);
  else if (sort === 'distance') list.sort((a, b) => a.distance - b.distance);
  else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
  else list.sort((a, b) => (b.rating * 2 - b.distance) - (a.rating * 2 - a.distance));
  res.json({ properties: list });
});

// Propiedades del arrendador autenticado (activas e inactivas).
router.get('/mine', requireRole('arrendador'), (req, res) => {
  const rows = all('SELECT * FROM properties WHERE owner_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json({ properties: rows.map(p => serializeProperty(p, req.user.id)) });
});

// RF-014: listar favoritos guardados (persisten entre sesiones porque viven en la base de datos).
router.get('/favorites/mine', requireRole('estudiante'), (req, res) => {
  const rows = all(`SELECT p.* FROM properties p JOIN favorites f ON f.property_id = p.id WHERE f.user_id = ?`, [req.user.id]);
  res.json({ properties: rows.map(p => serializeProperty(p, req.user.id)) });
});

router.get('/:id', (req, res) => {
  const viewer = currentUser(req);
  const p = get('SELECT * FROM properties WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ error: 'Publicación no encontrada.' });
  res.json({ property: serializeProperty(p, viewer && viewer.id) });
});

// RF-007: publicar vivienda con 2 a 10 fotos reales y ubicación geolocalizada.
router.post('/', requireRole('arrendador'), uploadPhotos.array('photos', 10), (req, res) => {
  const files = req.files || [];
  if (files.length < 2 || files.length > 10) {
    files.forEach(f => fs.unlink(f.path, () => {}));
    return res.status(400).json({ error: 'Debes subir entre 2 y 10 fotos de la vivienda.' });
  }
  const { title, description, type, price, distance, address, bedrooms, lat, lng } = req.body;
  const services = JSON.parse(req.body.services || '[]');
  if (!title || !description || !price || !address || !services.length) {
    files.forEach(f => fs.unlink(f.path, () => {}));
    return res.status(400).json({ error: 'Completa todos los campos obligatorios y selecciona al menos un servicio.' });
  }
  const active = req.user.verified ? 1 : 0;
  const newId = id('p');
  run(`INSERT INTO properties (id, owner_id, title, description, type, price, distance, address, lat, lng, bedrooms, services, active, verified)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [newId, req.user.id, title.trim(), description.trim(), type, Number(price), Number(distance || 0), address.trim(),
      Number(lat), Number(lng), Number(bedrooms || 1), JSON.stringify(services), active, active]);
  savePhotos(newId, files);
  res.status(201).json({
    ok: true,
    message: req.user.verified ? 'Publicación guardada y activa.' : 'Publicación guardada como borrador hasta que se verifique tu cuenta.'
  });
});

// RF-008: editar publicación (todos los campos, incluidas fotos nuevas o eliminadas).
router.put('/:id', requireRole('arrendador'), uploadPhotos.array('photos', 10), (req, res) => {
  const p = get('SELECT * FROM properties WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
  if (!p) return res.status(404).json({ error: 'Publicación no encontrada.' });
  const keepIds = JSON.parse(req.body.keepPhotoIds || '[]');
  const existing = all('SELECT id, path FROM property_photos WHERE property_id = ?', [p.id]);
  const toRemove = existing.filter(ph => !keepIds.includes(ph.id));
  const newFiles = req.files || [];
  const finalCount = keepIds.length + newFiles.length;
  if (finalCount < 2 || finalCount > 10) {
    newFiles.forEach(f => fs.unlink(f.path, () => {}));
    return res.status(400).json({ error: 'La publicación debe mantener entre 2 y 10 fotos.' });
  }
  const { title, description, type, price, distance, address, bedrooms, lat, lng } = req.body;
  const services = JSON.parse(req.body.services || '[]');
  run(`UPDATE properties SET title=?, description=?, type=?, price=?, distance=?, address=?, lat=?, lng=?, bedrooms=?, services=? WHERE id = ?`,
    [title.trim(), description.trim(), type, Number(price), Number(distance || 0), address.trim(), Number(lat), Number(lng), Number(bedrooms || 1), JSON.stringify(services), p.id]);
  toRemove.forEach(ph => { run('DELETE FROM property_photos WHERE id = ?', [ph.id]); fs.unlink(path.join(__dirname, '..', '..', ph.path.replace(/^\//, '')), () => {}); });
  savePhotos(p.id, newFiles, keepIds.length);
  res.json({ ok: true, message: 'Publicación actualizada correctamente.' });
});

// RF-009: activar/desactivar sin eliminar.
router.patch('/:id/toggle', requireRole('arrendador'), (req, res) => {
  const p = get('SELECT * FROM properties WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
  if (!p) return res.status(404).json({ error: 'Publicación no encontrada.' });
  if (!p.active && !req.user.verified) return res.status(403).json({ error: 'Tu cuenta debe estar verificada antes de activar publicaciones.' });
  run('UPDATE properties SET active = ? WHERE id = ?', [p.active ? 0 : 1, p.id]);
  res.json({ ok: true, active: !p.active });
});

// RF-010: eliminación definitiva (con confirmación en el cliente). Las reseñas se conservan (RF-016).
router.delete('/:id', requireRole('arrendador'), (req, res) => {
  const p = get('SELECT * FROM properties WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
  if (!p) return res.status(404).json({ error: 'Publicación no encontrada.' });
  const photos = all('SELECT path FROM property_photos WHERE property_id = ?', [p.id]);
  run('UPDATE reviews SET property_id = NULL WHERE property_id = ?', [p.id]);
  run('DELETE FROM properties WHERE id = ?', [p.id]);
  photos.forEach(ph => fs.unlink(path.join(__dirname, '..', '..', ph.path.replace(/^\//, '')), () => {}));
  res.json({ ok: true });
});

// RF-014: favoritos persistentes.
router.post('/:id/favorite', requireRole('estudiante'), (req, res) => {
  const p = get('SELECT id FROM properties WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ error: 'Publicación no encontrada.' });
  const exists = get('SELECT 1 FROM favorites WHERE user_id = ? AND property_id = ?', [req.user.id, p.id]);
  if (exists) { run('DELETE FROM favorites WHERE user_id = ? AND property_id = ?', [req.user.id, p.id]); res.json({ ok: true, favorite: false }); }
  else { run('INSERT INTO favorites (user_id, property_id) VALUES (?,?)', [req.user.id, p.id]); res.json({ ok: true, favorite: true }); }
});

module.exports = router;
