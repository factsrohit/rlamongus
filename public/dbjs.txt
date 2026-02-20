const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.sqlite');

// Create location table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS locations (
    username TEXT PRIMARY KEY,
    latitude REAL,
    longitude REAL
)`);

module.exports = db;
