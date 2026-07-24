'use strict';
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
for (const sub of ['photos', 'docs']) {
  fs.mkdirSync(path.join(UPLOAD_ROOT, sub), { recursive: true });
}

function makeStorage(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_ROOT, subdir)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 10).replace(/[^a-zA-Z0-9.]/g, '');
      cb(null, Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext);
    }
  });
}

const ALLOWED = /^image\/(png|jpe?g|webp|gif)$|^application\/pdf$/;
function fileFilter(req, file, cb) {
  if (ALLOWED.test(file.mimetype)) return cb(null, true);
  cb(new Error('Formato de archivo no permitido. Usa imagen o PDF.'));
}

const uploadPhotos = multer({ storage: makeStorage('photos'), fileFilter, limits: { fileSize: 8 * 1024 * 1024, files: 10 } });
const uploadDocs = multer({ storage: makeStorage('docs'), fileFilter, limits: { fileSize: 8 * 1024 * 1024, files: 5 } });

function publicPath(subdir, filename) { return `/uploads/${subdir}/${filename}`; }

module.exports = { uploadPhotos, uploadDocs, publicPath };
