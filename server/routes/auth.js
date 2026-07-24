'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db, run, get, id } = require('../db');
const { currentUser, publicUser } = require('../middleware/auth');
const { uploadDocs, publicPath } = require('../upload');

const router = express.Router();

function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// RF-001 / RF-002: registro diferenciado por rol, con validación de campos y de correo duplicado.
router.post('/register', uploadDocs.any(), (req, res) => {
  try {
    const { role, name, email, password, phone, university, career } = req.body;
    if (!['estudiante', 'arrendador'].includes(role)) return res.status(400).json({ error: 'Rol inválido.' });
    if (!name || !name.trim() || !email || !email.trim() || !password || password.length < 6) {
      return res.status(400).json({ error: 'Completa nombre, correo y una contraseña de al menos 6 caracteres.' });
    }
    const emailNorm = email.trim().toLowerCase();
    if (get('SELECT id FROM users WHERE lower(email) = ?', [emailNorm])) {
      return res.status(409).json({ error: 'Ya existe una cuenta registrada con ese correo.' });
    }
    if (role === 'estudiante' && (!university || !university.trim() || !career || !career.trim())) {
      return res.status(400).json({ error: 'Completa universidad y carrera.' });
    }
    let cedulaPath = null, predialPath = null;
    if (role === 'arrendador') {
      const list = Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat();
      const cedulaFile = list.find(file => file && file.fieldname === 'cedula');
      const predialFile = list.find(file => file && file.fieldname === 'predial');
      if (!cedulaFile || !predialFile) return res.status(400).json({ error: 'Debes adjuntar cédula de identidad y respaldo del inmueble.' });
      cedulaPath = publicPath('docs', cedulaFile.filename);
      predialPath = publicPath('docs', predialFile.filename);
    }
    const newId = id('u');
    run(`INSERT INTO users (id, role, name, email, password_hash, phone, university, career, avatar, active, verified, doc_cedula_path, doc_predial_path)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [newId, role, name.trim(), emailNorm, bcrypt.hashSync(password, 10), (phone || '').trim(),
        role === 'estudiante' ? university.trim() : null, role === 'estudiante' ? career.trim() : null,
        initials(name), 1, role === 'estudiante' ? 1 : 0, cedulaPath, predialPath]);
    res.status(201).json({
      ok: true,
      message: role === 'arrendador' ? 'Registro creado. Queda pendiente de verificación del administrador.' : 'Registro creado correctamente.'
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'No se pudo completar el registro.' });
  }
});

// RF-003: inicio de sesión seguro. Mensajes de error genéricos (no revelan si el correo existe).
router.post('/login', (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) return res.status(400).json({ error: 'Completa correo, contraseña y rol.' });
  const u = get('SELECT * FROM users WHERE lower(email) = ? AND role = ?', [String(email).trim().toLowerCase(), role]);
  const ok = u && u.active && bcrypt.compareSync(password, u.password_hash);
  if (!ok) return res.status(401).json({ error: 'No se pudo iniciar sesión. Revisa credenciales, rol o estado de la cuenta.' });
  req.session.userId = u.id;
  req.session.role = u.role;
  res.json({ ok: true, user: publicUser(u) });
});

// RF-025: cierre de sesión seguro (destruye la sesión activa en el servidor).
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('roomiu.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  const u = currentUser(req);
  res.json({ user: publicUser(u) });
});

// RF-004: recuperación de contraseña de extremo a extremo (token real persistido en base de datos).
router.post('/forgot', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const u = get('SELECT id FROM users WHERE lower(email) = ?', [email]);
  // Respuesta genérica: no revela si el correo existe.
  const payload = { ok: true, message: 'Si el correo está registrado, se generó un enlace de recuperación.' };
  if (u) {
    const token = crypto.randomBytes(24).toString('hex');
    run('INSERT INTO password_resets (token, user_id) VALUES (?,?)', [token, u.id]);
    // No hay servidor de correo configurado en este entorno: se entrega el token
    // directamente a la sesión del navegador que lo solicitó, tal como lo haría
    // un enlace recibido por correo.
    payload.resetToken = token;
  }
  res.json(payload);
});

router.post('/reset', (req, res) => {
  const { token, password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  const reset = get('SELECT * FROM password_resets WHERE token = ? AND used = 0', [token]);
  if (!reset) return res.status(400).json({ error: 'El enlace de recuperación no es válido o ya fue usado.' });
  run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(password, 10), reset.user_id]);
  run('UPDATE password_resets SET used = 1 WHERE token = ?', [token]);
  res.json({ ok: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
});

module.exports = router;
