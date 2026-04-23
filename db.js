// ============================================================
// magnetique Dashboard — Datenbank (SQLite)
// ============================================================

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'dashboard.db');
let db;

function initDB() {
  const fs = require('fs');
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Admin-User anlegen falls noch nicht vorhanden
  const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('moritz');
  if (!admin) {
    const adminPw = process.env.ADMIN_PASSWORD || 'magnetique2026';
    const hash = bcrypt.hashSync(adminPw, 10);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('moritz', hash, 'admin');
    console.log('Admin-User "moritz" angelegt');
  }
}

function getUser(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getAllUsers() {
  return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
}

function createUser(username, password, role = 'user') {
  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (existing) throw new Error('Benutzername existiert bereits');

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, role);
  return { id: result.lastInsertRowid, username, role };
}

function deleteUser(id) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) throw new Error('User nicht gefunden');
  if (user.role === 'admin') throw new Error('Admin kann nicht gelöscht werden');
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

function updatePassword(id, password) {
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
}

module.exports = { initDB, getUser, getAllUsers, createUser, deleteUser, updatePassword };
