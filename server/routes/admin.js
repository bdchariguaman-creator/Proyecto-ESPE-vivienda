'use strict';
const express = require('express');
const fs = require('fs');
const path = require('path');
const { run, get, all, id } = require('../db');
const { requireRole } = require('../middleware/auth');
const { reportCountFor } = require('../helpers');

const router = express.Router();
router.use(requireRole('admin'));

function logAudit(admin, action, target, reason) {
  run('INSERT INTO audit_log (id, admin_id, admin_name, action, target, reason) VALUES (?,?,?,?,?,?)',
    [id('a'), admin.id, admin.name, action, target, reason || 'Sin motivo especificado']);
}

// RF-024: métricas generales del panel, incluidos nuevos registros por período.
router.get('/stats', (req, res) => {
  const users = all('SELECT * FROM users');
  const properties = all('SELECT * FROM properties');
  const reports = all('SELECT * FROM reports');
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recent = users.filter(u => u.created_at && u.created_at.replace(' ', 'T') >= weekAgo).length;
  const landlords = users.filter(u => u.role === 'arrendador');
  res.json({
    totalUsers: users.length,
    verifiedLandlords: landlords.filter(u => u.verified).length,
    totalLandlords: landlords.length,
    activeProperties: properties.filter(p => p.active).length,
    totalProperties: properties.length,
    pendingReports: reports.filter(r => r.status === 'pendiente').length,
    resolvedReports: reports.filter(r => r.status === 'revisado').length,
    totalReports: reports.length,
    students: users.filter(u => u.role === 'estudiante').length,
    recentRegistrations: recent
  });
});

router.get('/pending-landlords', (req, res) => {
  const rows = all(`SELECT * FROM users WHERE role = 'arrendador' AND verified = 0`);
  res.json({
    landlords: rows.map(u => ({
      id: u.id, name: u.name, email: u.email,
      docs: { cedula: !!u.doc_cedula_path, predial: !!u.doc_predial_path },
      docUrls: { cedula: u.doc_cedula_path, predial: u.doc_predial_path }
    }))
  });
});

// RF-021: aprobar o rechazar identidad del arrendador; notifica al usuario al ingresar de nuevo.
router.post('/landlords/:id/verify', (req, res) => {
  const u = get(`SELECT * FROM users WHERE id = ? AND role = 'arrendador'`, [req.params.id]);
  if (!u) return res.status(404).json({ error: 'Arrendador no encontrado.' });
  const approve = !!req.body.approve;
  run(`UPDATE users SET verified = ?, active = ?, verification_result = ?, verification_seen = 0 WHERE id = ?`,
    [approve ? 1 : 0, approve ? 1 : 0, approve ? 'approved' : 'rejected', u.id]);
  run(`UPDATE properties SET verified = ?, active = CASE WHEN ? THEN active ELSE 0 END WHERE owner_id = ?`,
    [approve ? 1 : 0, approve ? 1 : 0, u.id]);
  logAudit(req.user, approve ? 'Aprobó arrendador' : 'Rechazó arrendador', u.name, req.body.reason);
  res.json({ ok: true });
});

// RF-022: gestión de cuentas con motivo y registro de auditoría.
router.get('/users', (req, res) => {
  const rows = all('SELECT * FROM users ORDER BY created_at DESC');
  res.json({ users: rows.map(u => ({ id: u.id, name: u.name, role: u.role, active: !!u.active, verified: !!u.verified })) });
});

router.patch('/users/:id/toggle', (req, res) => {
  const u = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado.' });
  run('UPDATE users SET active = ? WHERE id = ?', [u.active ? 0 : 1, u.id]);
  logAudit(req.user, u.active ? 'Desactivó usuario' : 'Activó usuario', u.name, req.body.reason);
  res.json({ ok: true });
});

router.delete('/users/:id', (req, res) => {
  const u = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (u.role === 'admin') return res.status(400).json({ error: 'No se puede eliminar una cuenta de administrador.' });

  const photoPaths = [];
  if (u.role === 'arrendador') {
    const photos = all(`SELECT pp.path FROM property_photos pp JOIN properties p ON p.id = pp.property_id WHERE p.owner_id = ?`, [u.id]);
    photos.forEach(ph => photoPaths.push(ph.path));
  }

  // Limpieza de todas las referencias antes de borrar la cuenta (integridad referencial real).
  run('DELETE FROM conversation_messages WHERE conversation_id IN (SELECT id FROM conversations WHERE student_id = ? OR landlord_id = ?)', [u.id, u.id]);
  run('DELETE FROM conversations WHERE student_id = ? OR landlord_id = ?', [u.id, u.id]);
  run('DELETE FROM reviews WHERE owner_id = ? OR user_id = ?', [u.id, u.id]);
  run('DELETE FROM reports WHERE reporter_id = ?', [u.id]);
  run('DELETE FROM favorites WHERE user_id = ?', [u.id]);
  run('DELETE FROM visits WHERE student_id = ? OR property_id IN (SELECT id FROM properties WHERE owner_id = ?)', [u.id, u.id]);
  run('DELETE FROM payments WHERE student_id = ? OR property_id IN (SELECT id FROM properties WHERE owner_id = ?)', [u.id, u.id]);
  run('DELETE FROM password_resets WHERE user_id = ?', [u.id]);
  if (u.role === 'arrendador') run('DELETE FROM properties WHERE owner_id = ?', [u.id]);
  run('DELETE FROM users WHERE id = ?', [u.id]);

  photoPaths.forEach(p => fs.unlink(path.join(__dirname, '..', '..', p.replace(/^\//, '')), () => {}));
  logAudit(req.user, 'Eliminó usuario', u.name, req.body.reason);
  res.json({ ok: true });
});

router.get('/users/:id/docs', (req, res) => {
  const u = get('SELECT doc_cedula_path, doc_predial_path FROM users WHERE id = ?', [req.params.id]);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({ cedula: u.doc_cedula_path, predial: u.doc_predial_path });
});

// RF-023: moderación de reportes (mantener, ocultar o eliminar contenido).
router.get('/reports', (req, res) => {
  const rows = all('SELECT * FROM reports ORDER BY created_at DESC');
  res.json({
    reports: rows.map(r => {
      const p = r.property_id ? get('SELECT title FROM properties WHERE id = ?', [r.property_id]) : null;
      return {
        id: r.id, type: r.type, propertyId: r.property_id, reviewId: r.review_id, reason: r.reason,
        status: r.status, createdAt: r.created_at, propertyTitle: p ? p.title : 'Publicación no disponible',
        reportCount: reportCountFor(r.property_id, r.review_id || null)
      };
    })
  });
});

router.patch('/reports/:id', (req, res) => {
  const r = get('SELECT * FROM reports WHERE id = ?', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'Reporte no encontrado.' });
  const { action, reason } = req.body;
  if (action === 'keep') {
    run(`UPDATE reports SET status = 'revisado' WHERE id = ?`, [r.id]);
    logAudit(req.user, 'Mantuvo contenido reportado', r.property_id || r.review_id, reason || 'Reporte revisado sin acción');
  } else if (action === 'hide') {
    run(`UPDATE reports SET status = 'revisado' WHERE id = ?`, [r.id]);
    if (r.property_id) run('UPDATE properties SET active = 0 WHERE id = ?', [r.property_id]);
    logAudit(req.user, 'Ocultó publicación reportada', r.property_id, reason || 'Reporte revisado');
  } else if (action === 'delete') {
    run(`UPDATE reports SET status = 'revisado' WHERE id = ?`, [r.id]);
    let label = r.property_id;
    if (r.type === 'reseña' && r.review_id) {
      run('DELETE FROM reviews WHERE id = ?', [r.review_id]);
      label = 'reseña ' + r.review_id;
    } else if (r.property_id) {
      const p = get('SELECT title FROM properties WHERE id = ?', [r.property_id]);
      label = p ? p.title : r.property_id;
      const photos = all('SELECT path FROM property_photos WHERE property_id = ?', [r.property_id]);
      run('UPDATE reviews SET property_id = NULL WHERE property_id = ?', [r.property_id]);
      run('DELETE FROM properties WHERE id = ?', [r.property_id]);
      photos.forEach(ph => fs.unlink(path.join(__dirname, '..', '..', ph.path.replace(/^\//, '')), () => {}));
    }
    logAudit(req.user, 'Eliminó contenido reportado', label, reason);
  } else {
    return res.status(400).json({ error: 'Acción inválida.' });
  }
  res.json({ ok: true });
});

router.get('/audit-log', (req, res) => {
  const rows = all('SELECT * FROM audit_log ORDER BY at DESC LIMIT 50');
  res.json({ log: rows.map(a => ({ action: a.action, target: a.target, reason: a.reason, adminName: a.admin_name, at: a.at })) });
});

module.exports = router;
