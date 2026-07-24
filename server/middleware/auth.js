'use strict';
const { get } = require('../db');

function currentUser(req) {
  if (!req.session || !req.session.userId) return null;
  const u = get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
  if (!u || !u.active) return null;
  return u;
}

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, role: u.role, name: u.name, email: u.email, phone: u.phone,
    university: u.university, career: u.career, avatar: u.avatar,
    active: !!u.active, verified: !!u.verified,
    docs: {
      cedula: !!u.doc_cedula_path, predial: !!u.doc_predial_path,
      matricula: !!u.doc_matricula_path, record: !!u.doc_record_path, rolPagos: !!u.doc_rolpagos_path
    },
    verificationNotice: u.verification_result ? { result: u.verification_result, seen: !!u.verification_seen } : null,
    searches: u.searches, createdAt: u.created_at
  };
}

function requireAuth(req, res, next) {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: 'No autenticado.' });
  req.user = u;
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    const u = currentUser(req);
    if (!u || u.role !== role) return res.status(403).json({ error: 'No tienes permiso para acceder a este recurso.' });
    req.user = u;
    next();
  };
}

module.exports = { currentUser, publicUser, requireAuth, requireRole };
