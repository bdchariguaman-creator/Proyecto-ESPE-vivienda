'use strict';
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'roomiu.sqlite');
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
require('./db'); // vuelve a crear el esquema y la semilla
console.log('Base de datos reiniciada con los datos de ejemplo.');
