const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'art-appraisal.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    secret_code TEXT UNIQUE NOT NULL,
    photo_path TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    medium TEXT NOT NULL,
    dimensions TEXT NOT NULL,
    edition_size TEXT,
    provenance TEXT,
    exhibition_history TEXT,
    purchase_price TEXT,
    appraisal TEXT,
    estimate_low TEXT,
    estimate_high TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const insertSubmission = db.prepare(`
  INSERT INTO submissions (secret_code, photo_path, artist_name, title, date, medium, dimensions, edition_size, provenance, exhibition_history, purchase_price)
  VALUES (@secret_code, @photo_path, @artist_name, @title, @date, @medium, @dimensions, @edition_size, @provenance, @exhibition_history, @purchase_price)
`);

const getByCode = db.prepare('SELECT * FROM submissions WHERE secret_code = ?');
const getAll = db.prepare('SELECT * FROM submissions ORDER BY created_at DESC');
const getById = db.prepare('SELECT * FROM submissions WHERE id = ?');
const updateAppraisal = db.prepare('UPDATE submissions SET appraisal = ?, estimate_low = ?, estimate_high = ? WHERE id = ?');
const searchByArtist = db.prepare("SELECT * FROM submissions WHERE artist_name LIKE '%' || ? || '%' ORDER BY created_at DESC");

module.exports = {
  insertSubmission,
  getByCode,
  getAll,
  getById,
  updateAppraisal,
  searchByArtist,
};
