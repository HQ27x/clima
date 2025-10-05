const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const PORT = process.env.PORT || 4005;
const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'service-account.json');
const JWT_SECRET = process.env.JWT_SECRET || 'replace-me-with-secure-secret';

try {
  admin.initializeApp({
    credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
  });
} catch (e) {
  console.warn('Warning: could not initialize Firebase Admin. Make sure service account is available at', SERVICE_ACCOUNT_PATH);
}

const db = admin.firestore();

const app = express();
app.use(bodyParser.json());

app.get('/', (req, res) => res.json({ ok: true, msg: 'Auth server running' }));

// Register: create user document with hashed password
app.post('/register', async (req, res) => {
  try {
    const { name, email, password, gender } = req.body;
    if (!name || !email || !password || !gender) return res.status(400).json({ error: 'Missing fields' });

    // Check existing by email
    const usersRef = db.collection('users');
    const q = await usersRef.where('email', '==', email).limit(1).get();
    if (!q.empty) return res.status(409).json({ error: 'email_exists' });

    const hashed = await bcrypt.hash(password, 10);
    const docRef = await usersRef.add({
      displayName: name,
      email,
      gender,
      passwordHash: hashed,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true, id: docRef.id });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ error: 'server_error', details: err.message });
  }
});

// Login: verify password and return JWT
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const usersRef = db.collection('users');
    const q = await usersRef.where('email', '==', email).limit(1).get();
    if (q.empty) return res.status(401).json({ error: 'invalid_credentials' });

    const doc = q.docs[0];
    const data = doc.data();
    const hash = data.passwordHash;
    if (!hash) return res.status(401).json({ error: 'no_password_set' });

    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    const payload = { uid: doc.id, email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({ ok: true, token, profile: { uid: doc.id, displayName: data.displayName, email: data.email, gender: data.gender } });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'server_error', details: err.message });
  }
});

app.listen(PORT, () => console.log(`Auth server listening on ${PORT}`));

module.exports = app;
