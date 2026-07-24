'use strict';
const express = require('express');
const { run } = require('../db');
const { requireAuth, publicUser } = require('../middleware/auth');
const { uploadDocs, publicPath } = require('../upload');

const router = express.Router();

// RF-005: el correo no se puede modificar desde aquí (no se acepta en el body).
router.put('/', requireAuth, (req, res) => {
  const { name, phone, career } = req.body;
  const u = req.user;
  run('UPDATE users SET name = ?, phone = ?, career = ? WHERE id = ?', [
    (name || u.name).trim(), (phone || '').trim(), u.role === 'estudiante' ? (career || u.career) : u.career, u.id
  ]);
  res.json({ ok: true });
});

// Documentos del estudiante para formalizar el contrato (matrícula, récord policial, rol de pagos).
router.post('/docs', requireAuth, uploadDocs.fields([
  { name: 'matricula', maxCount: 1 }, { name: 'record', maxCount: 1 }, { name: 'rolPagos', maxCount: 1 },
  { name: 'cedula', maxCount: 1 }, { name: 'predial', maxCount: 1 }
]), (req, res) => {
  const sets = [], params = [];
  const mapping = {
    matricula: 'doc_matricula_path', record: 'doc_record_path', rolPagos: 'doc_rolpagos_path',
    cedula: 'doc_cedula_path', predial: 'doc_predial_path'
  };
  const allowed = req.user.role === 'arrendador'
    ? ['cedula', 'predial']
    : ['matricula', 'record', 'rolPagos'];
  allowed.forEach(field => {
    if (req.files[field]) {
      sets.push(`${mapping[field]} = ?`);
      params.push(publicPath('docs', req.files[field][0].filename));
    }
  });
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
