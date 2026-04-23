// ============================================================
// magnetique Dashboard — Server
// ============================================================
// Internes Dashboard für magnetique agency
// Hosted auf dashboard.magnetique.net
// ============================================================

require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');
const { initDB, getUser, getAllUsers, createUser, deleteUser, updatePassword } = require('./db');
const { createToken, verifyToken } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Auth-Middleware
function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login');

  const user = verifyToken(token);
  if (!user) return res.redirect('/login');

  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Nur Admins dürfen das' });
  }
  next();
}

// ---- ROUTES ----

// Login-Seite
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login-Action
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = getUser(username);

  if (!user) {
    return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
  }

  const bcrypt = require('bcryptjs');
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
  }

  const token = createToken({ id: user.id, username: user.username, role: user.role });
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Tage
  });

  res.json({ success: true, user: { username: user.username, role: user.role } });
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Dashboard (geschützt)
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Aktuelle User-Info
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role });
});

// ---- WORKFLOW TRIGGER ----

app.get('/api/workflows', requireAuth, async (req, res) => {
  try {
    const response = await fetch(`${process.env.N8N_BASE_URL}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY }
    });
    const data = await response.json();

    // Nur die relevanten Workflows zurückgeben
    const workflows = (data.data || []).map(wf => ({
      id: wf.id,
      name: wf.name,
      active: wf.active
    }));

    res.json(workflows);
  } catch (err) {
    res.status(500).json({ error: 'n8n nicht erreichbar' });
  }
});

app.post('/api/workflows/:id/trigger', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // n8n Test-Execution starten (Production-Webhook wäre Alternative)
    const response = await fetch(`${process.env.N8N_BASE_URL}/api/v1/executions`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': process.env.N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ workflowId: id })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.message || 'Workflow konnte nicht gestartet werden' });
    }

    const data = await response.json();
    res.json({ success: true, executionId: data.id, message: `Workflow gestartet` });
  } catch (err) {
    res.status(500).json({ error: 'n8n nicht erreichbar: ' + err.message });
  }
});

// Execution-Status abfragen
app.get('/api/executions/:id', requireAuth, async (req, res) => {
  try {
    const response = await fetch(`${process.env.N8N_BASE_URL}/api/v1/executions/${req.params.id}`, {
      headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY }
    });
    const data = await response.json();
    res.json({ status: data.status, finished: data.finished, stoppedAt: data.stoppedAt });
  } catch (err) {
    res.status(500).json({ error: 'Status nicht abrufbar' });
  }
});

// ---- ADMIN: User-Verwaltung ----

app.get('/api/users', requireAuth, requireAdmin, (req, res) => {
  const users = getAllUsers();
  res.json(users.map(u => ({ id: u.id, username: u.username, role: u.role, created_at: u.created_at })));
});

app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
  }

  try {
    const user = createUser(username, password, role || 'user');
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    deleteUser(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/users/:id/password', requireAuth, (req, res) => {
  const targetId = parseInt(req.params.id);

  // Nur eigenes Passwort oder Admin darf ändern
  if (req.user.id !== targetId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }

  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Passwort erforderlich' });

  try {
    updatePassword(targetId, password);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---- SERVER START ----

initDB();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`magnetique Dashboard läuft auf Port ${PORT}`);
});
