'use strict';
const express = require('express');
const { run } = require('../db');
const { requireAuth, publicUser } = require('../middleware/auth');
const { uploadDocs, publicPath } = require('../upload');

const router = express.Router();

function firstFile(files, fieldName) {
  if (!files) return null;
  const list = Array.isArray(files) ? files : Object.values(files).flat();
  return list.find(file => file && file.fieldname === fieldName) || null;
}

// RF-005: el correo no se puede modificar desde aquí (no se acepta en el body).
router.put('/', requireAuth, (req, res) => {
  const { name, phone, career } = req.body;
  const u = req.user;
  run('UPDATE users SET name = ?, phone = ?, career = ? WHERE id = ?', [
    (name || u.name).trim(), (phone || '').trim(), u.role === 'estudiante' ? (career || u.career) : u.career, u.id
  ]);
  res.json({ ok: true });
});

// Documentos de verificación para arrendadores y documentos de formalización para estudiantes.
router.post('/docs', requireAuth, uploadDocs.any(), (req, res) => {
  const sets = [], params = [];
  const cedula = firstFile(req.files, 'cedula');
  const predial = firstFile(req.files, 'predial');
  const matricula = firstFile(req.files, 'matricula');
  const record = firstFile(req.files, 'record');
  const rolPagos = firstFile(req.files, 'rolPagos');

  if (cedula) { sets.push('doc_cedula_path = ?'); params.push(publicPath('docs', cedula.filename)); }
  if (predial) { sets.push('doc_predial_path = ?'); params.push(publicPath('docs', predial.filename)); }
  if (matricula) { sets.push('doc_matricula_path = ?'); params.push(publicPath('docs', matricula.filename)); }
  if (record) { sets.push('doc_record_path = ?'); params.push(publicPath('docs', record.filename)); }
  if (rolPagos) { sets.push('doc_rolpagos_path = ?'); params.push(publicPath('docs', rolPagos.filename)); }
  if (sets.length) { params.push(req.user.id); run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params); }
  res.json({ ok: true });
});

// Registro de una "búsqueda guardada" (contador mostrado en el panel del estudiante).
router.post('/searches', requireAuth, (req, res) => {
  run('UPDATE users SET searches = searches + 1 WHERE id = ?', [req.user.id]);
  res.json({ ok: true });
});

// Notificación de verificación (RF-021): marcar como vista.
router.post('/verification-seen', requireAuth, (req, res) => {
  run('UPDATE users SET verification_seen = 1 WHERE id = ?', [req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
