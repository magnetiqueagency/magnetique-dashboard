// ============================================================
// magnetique Dashboard — Auth (JWT)
// ============================================================

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'magnetique-dashboard-dev-secret-change-me';

function createToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

module.exports = { createToken, verifyToken };
