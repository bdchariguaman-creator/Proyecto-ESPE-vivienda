'use strict';
const express = require('express');
const { run, get, all, id } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

function otherPartyField(user) { return user.role === 'arrendador' ? 'student_id' : 'landlord_id'; }

// RF-019: listar conversaciones propias con indicador de no leídos.
router.get('/', requireAuth, (req, res) => {
  const field = req.user.role === 'arrendador' ? 'landlord_id' : 'student_id';
  const rows = all(`SELECT * FROM conversations WHERE ${field} = ? ORDER BY id DESC`, [req.user.id]);
  const list = rows.map(c => {
    const otherId = req.user.role === 'arrendador' ? c.student_id : c.landlord_id;
    const other = get('SELECT name FROM users WHERE id = ?', [otherId]);
    const last = get('SELECT text, at FROM conversation_messages WHERE conversation_id = ? ORDER BY at DESC LIMIT 1', [c.id]);
    return {
      id: c.id, propertyTitle: c.property_title, otherName: other ? other.name : 'Usuario',
      lastMessage: last ? last.text : '', lastAt: last ? last.at : null, unread: c.unread_for === req.user.id
    };
  });
  res.json({ conversations: list });
});

router.get('/unread-count', requireAuth, (req, res) => {
  const field = req.user.role === 'arrendador' ? 'landlord_id' : 'student_id';
  const n = get(`SELECT COUNT(*) n FROM conversations WHERE ${field} = ? AND unread_for = ?`, [req.user.id, req.user.id]).n;
  res.json({ unread: n });
});

router.get('/:id', requireAuth, (req, res) => {
  const c = get('SELECT * FROM conversations WHERE id = ?', [req.params.id]);
  if (!c || (c.student_id !== req.user.id && c.landlord_id !== req.user.id)) return res.status(404).json({ error: 'Conversación no encontrada.' });
  if (c.unread_for === req.user.id) run('UPDATE conversations SET unread_for = NULL WHERE id = ?', [c.id]);
  const msgs = all('SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY at ASC', [c.id]);
  const otherId = req.user.role === 'arrendador' ? c.student_id : c.landlord_id;
  const other = get('SELECT name FROM users WHERE id = ?', [otherId]);
  res.json({
    conversation: { id: c.id, propertyId: c.property_id, propertyTitle: c.property_title, otherName: other ? other.name : 'Usuario' },
    messages: msgs.map(m => ({ from: m.from_user, text: m.text, at: m.at, mine: m.from_user === req.user.id }))
  });
});

// RF-018: enviar mensaje directo a un arrendador sin revelar datos externos de contacto.
router.post('/', requireRole('estudiante'), (req, res) => {
  const { propertyId, text } = req.body;
  const p = get('SELECT * FROM properties WHERE id = ?', [propertyId]);
  if (!p) return res.status(404).json({ error: 'Publicación no encontrada.' });
  let c = get('SELECT * FROM conversations WHERE property_id = ? AND student_id = ?', [propertyId, req.user.id]);
  if (!c) {
    const newId = id('c');
    run('INSERT INTO conversations (id, property_id, property_title, student_id, landlord_id) VALUES (?,?,?,?,?)',
      [newId, p.id, p.title, req.user.id, p.owner_id]);
    c = { id: newId };
  }
  if (text && text.trim()) {
    run('INSERT INTO conversation_messages (id, conversation_id, from_user, text) VALUES (?,?,?,?)', [id('cm'), c.id, req.user.id, text.trim()]);
    run('UPDATE conversations SET unread_for = ? WHERE id = ?', [p.owner_id, c.id]);
  }
  res.status(201).json({ ok: true, conversationId: c.id });
});

// RF-019: responder dentro de una conversación existente.
router.post('/:id/messages', requireAuth, (req, res) => {
  const c = get('SELECT * FROM conversations WHERE id = ?', [req.params.id]);
  if (!c || (c.student_id !== req.user.id && c.landlord_id !== req.user.id)) return res.status(404).json({ error: 'Conversación no encontrada.' });
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Escribe un mensaje.' });
  run('INSERT INTO conversation_messages (id, conversation_id, from_user, text) VALUES (?,?,?,?)', [id('cm'), c.id, req.user.id, text]);
  const otherId = req.user.role === 'arrendador' ? c.student_id : c.landlord_id;
  run('UPDATE conversations SET unread_for = ? WHERE id = ?', [otherId, c.id]);
  res.status(201).json({ ok: true });
});

module.exports = router;
