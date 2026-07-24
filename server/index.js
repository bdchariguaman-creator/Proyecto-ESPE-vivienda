'use strict';
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');

require('./db'); // crea el esquema y la semilla inicial si la base de datos está vacía

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: 'roomiu.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }
}));

// Archivos subidos (fotos de viviendas y documentos de verificación) servidos desde disco.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ---- API REST ----
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/properties/:propertyId/reviews', require('./routes/reviews'));
app.use('/api/landlord', require('./routes/landlord'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/conversations', require('./routes/messages'));
app.use('/api', require('./routes/visits'));
app.use('/api/admin', require('./routes/admin'));

app.use((err, req, res, next) => {
  if (err && err.message) return res.status(400).json({ error: err.message });
  next(err);
});

// ---- Frontend estático ----
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`RoomiU ESPE escuchando en http://localhost:${PORT}`);
});
