'use strict';
// Capa de acceso a datos de RoomiU ESPE.
// Usa el módulo nativo node:sqlite (incluido en Node.js >= 22.5), por lo que
// no requiere compilar ningún binario adicional para tener una base de datos
// relacional real y persistente en disco (archivo roomiu.sqlite).

const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, '..', 'roomiu.sqlite');
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('estudiante','arrendador','admin')),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT DEFAULT '',
  university TEXT,
  career TEXT,
  avatar TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  verified INTEGER NOT NULL DEFAULT 0,
  verification_result TEXT,
  verification_seen INTEGER NOT NULL DEFAULT 1,
  doc_cedula_path TEXT,
  doc_predial_path TEXT,
  doc_matricula_path TEXT,
  doc_record_path TEXT,
  doc_rolpagos_path TEXT,
  searches INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  price REAL NOT NULL,
  distance REAL NOT NULL,
  address TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  services TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS property_photos (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL REFERENCES users(id),
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, property_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  property_title TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  property_id TEXT,
  review_id TEXT,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
  property_title TEXT,
  student_id TEXT NOT NULL REFERENCES users(id),
  landlord_id TEXT NOT NULL REFERENCES users(id),
  unread_for TEXT
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  from_user TEXT NOT NULL,
  text TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  property_id TEXT REFERENCES properties(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'programada'
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  property_id TEXT,
  student_id TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'registrado',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  admin_name TEXT,
  action TEXT NOT NULL,
  target TEXT,
  reason TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_resets (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
db.exec(SCHEMA);

function id(prefix) { return prefix + '_' + crypto.randomBytes(9).toString('hex'); }

function run(sql, params = []) { return db.prepare(sql).run(...params); }
function get(sql, params = []) { return db.prepare(sql).get(...params); }
function all(sql, params = []) { return db.prepare(sql).all(...params); }

// ---- Semilla inicial (solo si la base de datos está vacía) ----
function seedIfEmpty() {
  const count = get('SELECT COUNT(*) AS n FROM users').n;
  if (count > 0) return;

  const hash = (p) => bcrypt.hashSync(p, 10);
  const users = [
    { id: 'u1', role: 'estudiante', name: 'Ana Torres', email: 'estudiante@espe.edu.ec', password: hash('123456'), phone: '0981112223', university: 'Universidad de las Fuerzas Armadas ESPE', career: 'Ingeniería en Software', avatar: 'AT', active: 1, verified: 1, searches: 2, created_at: '2026-05-12 09:00:00' },
    { id: 'u2', role: 'arrendador', name: 'Roberto Suárez', email: 'arrendador@roomiu.ec', password: hash('123456'), phone: '0992223334', avatar: 'RS', active: 1, verified: 1, created_at: '2026-05-15 09:00:00' },
    { id: 'u3', role: 'arrendador', name: 'Carmen López', email: 'carmen@roomiu.ec', password: hash('123456'), phone: '0987654321', avatar: 'CL', active: 1, verified: 0, created_at: '2026-07-16 09:00:00' },
    { id: 'u4', role: 'admin', name: 'Administrador ESPE', email: 'admin@roomiu.ec', password: hash('admin123'), phone: '', avatar: 'AD', active: 1, verified: 1, created_at: '2026-01-10 09:00:00' }
  ];
  const insUser = db.prepare(`INSERT INTO users (id, role, name, email, password_hash, phone, university, career, avatar, active, verified, searches, created_at)
    VALUES (@id, @role, @name, @email, @password, @phone, @university, @career, @avatar, @active, @verified, @searches, @created_at)`);
  users.forEach(u => insUser.run({ university: null, career: null, searches: 0, ...u }));

  const properties = [
    { id: 'p1', owner_id: 'u2', title: 'Habitación individual cerca de ESPE Latacunga', description: 'Habitación segura, amoblada y con ambiente tranquilo para estudiantes. Incluye escritorio, armario, uso de cocina y acceso independiente. Ideal para estudiantes foráneos que buscan cercanía al campus.', type: 'Habitación Individual', price: 120, distance: 0.8, address: 'Barrio San Felipe, Latacunga', lat: -0.931, lng: -78.616, bedrooms: 1, services: JSON.stringify(['WiFi', 'Agua Caliente', 'Luz', 'Cocina', 'Amoblado']), active: 1, verified: 1, created_at: '2026-06-20 10:00:00' },
    { id: 'p2', owner_id: 'u2', title: 'Departamento amoblado - sector La Estación', description: 'Departamento de dos dormitorios con sala, cocina, baño privado e internet. Cercano a paradas de transporte y tiendas.', type: 'Departamento', price: 320, distance: 2.4, address: 'Sector La Estación, Latacunga', lat: -0.925, lng: -78.608, bedrooms: 2, services: JSON.stringify(['WiFi', 'Agua Caliente', 'Luz', 'Lavandería', 'Amoblado']), active: 1, verified: 1, created_at: '2026-06-22 10:00:00' },
    { id: 'p3', owner_id: 'u3', title: 'Cuarto económico - La Vaquería', description: 'Cuarto básico con servicios incluidos. La cuenta del arrendador está pendiente de verificación, por lo tanto se muestra con advertencia.', type: 'Cuarto', price: 150, distance: 1.6, address: 'La Vaquería, Latacunga', lat: -0.940, lng: -78.620, bedrooms: 1, services: JSON.stringify(['WiFi', 'Agua', 'Luz']), active: 1, verified: 0, created_at: '2026-06-25 10:00:00' },
    { id: 'p4', owner_id: 'u2', title: 'Casa compartida - Nueva Vida', description: 'Casa con tres habitaciones disponibles, patio y cocina compartida. Publicación actualmente pausada por disponibilidad.', type: 'Casa', price: 360, distance: 3.2, address: 'Nueva Vida, Latacunga', lat: -0.947, lng: -78.633, bedrooms: 3, services: JSON.stringify(['WiFi', 'Agua Caliente', 'Luz', 'Cocina', 'Lavandería']), active: 0, verified: 1, created_at: '2026-05-30 10:00:00' }
  ];
  const insProp = db.prepare(`INSERT INTO properties (id, owner_id, title, description, type, price, distance, address, lat, lng, bedrooms, services, active, verified, created_at)
    VALUES (@id, @owner_id, @title, @description, @type, @price, @distance, @address, @lat, @lng, @bedrooms, @services, @active, @verified, @created_at)`);
  properties.forEach(p => insProp.run(p));

  const reviews = [
    { id: 'r1', property_id: 'p1', owner_id: 'u2', property_title: 'Habitación individual cerca de ESPE Latacunga', user_id: 'u1', user_name: 'María G.', rating: 5, text: 'Excelente lugar, tranquilo y cerca de la ESPE.', created_at: '2026-06-28 12:00:00' },
    { id: 'r2', property_id: 'p1', owner_id: 'u2', property_title: 'Habitación individual cerca de ESPE Latacunga', user_id: 'u1', user_name: 'Carlos M.', rating: 4, text: 'El arrendador es atento y la zona se siente segura.', created_at: '2026-06-29 12:00:00' },
    { id: 'r3', property_id: 'p2', owner_id: 'u2', property_title: 'Departamento amoblado - sector La Estación', user_id: 'u1', user_name: 'Daniela P.', rating: 5, text: 'Departamento cómodo y con buena conexión a internet.', created_at: '2026-06-30 12:00:00' },
    { id: 'r4', property_id: 'p3', owner_id: 'u3', property_title: 'Cuarto económico - La Vaquería', user_id: 'u1', user_name: 'Luis A.', rating: 3, text: 'Buena opción por precio, pero falta completar verificación.', created_at: '2026-07-01 12:00:00' }
  ];
  const insReview = db.prepare(`INSERT INTO reviews (id, property_id, owner_id, property_title, user_id, user_name, rating, text, created_at)
    VALUES (@id, @property_id, @owner_id, @property_title, @user_id, @user_name, @rating, @text, @created_at)`);
  reviews.forEach(r => insReview.run(r));

  run(`INSERT INTO reports (id, type, property_id, review_id, reporter_id, reason, status, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    ['rep1', 'publicación', 'p3', null, 'u1', 'La publicación no tiene documentación completa del arrendador.', 'pendiente', '2026-07-02 09:00:00']);
  run(`INSERT INTO reports (id, type, property_id, review_id, reporter_id, reason, status, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    ['rep2', 'reseña', 'p1', 'r2', 'u2', 'Comentario duplicado en la publicación.', 'revisado', '2026-06-25 09:00:00']);

  run(`INSERT INTO conversations (id, property_id, property_title, student_id, landlord_id, unread_for) VALUES (?,?,?,?,?,?)`,
    ['c1', 'p1', 'Habitación individual cerca de ESPE Latacunga', 'u1', 'u2', null]);
  const msgs = [
    ['u1', '¿Aún está disponible la habitación? ¿Podría visitarla hoy?', '2026-07-03 17:20:00'],
    ['u2', 'Sí, la habitación sigue disponible. ¿A qué hora le gustaría visitarla?', '2026-07-03 17:25:00'],
    ['u1', 'A las 18h estaría bien para mí.', '2026-07-03 17:29:00'],
    ['u2', 'Perfecto, le espero a las 18h en la dirección indicada.', '2026-07-03 17:31:00']
  ];
  msgs.forEach(([from, text, at]) => run(`INSERT INTO conversation_messages (id, conversation_id, from_user, text, at) VALUES (?,?,?,?,?)`, [id('cm'), 'c1', from, text, at]));

  run(`INSERT INTO visits (id, property_id, student_id, date, time, status) VALUES (?,?,?,?,?,?)`, ['v1', 'p1', 'u1', '2026-07-06', '18:00', 'programada']);
  run(`INSERT INTO payments (id, property_id, student_id, amount, method, status, created_at) VALUES (?,?,?,?,?,?,?)`, ['pay1', 'p1', 'u1', 120, 'Transferencia bancaria', 'registrado', '2026-07-04 09:00:00']);
}
seedIfEmpty();

module.exports = { db, run, get, all, id };
