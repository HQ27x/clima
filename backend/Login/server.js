const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Development-friendly CORS: allow requests from browsers (e.g. Live Server :5500)
app.use(cors({
  origin: function(origin, callback){
    // Allow requests with no origin (like curl, Postman) or from any origin in dev
    callback(null, true);
  },
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-demo-secret']
}));
app.use(bodyParser.json());

// Simple request logging for debugging
app.use((req,res,next)=>{
  console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.url}`);
  next();
});

const USERS_FILE = path.join(__dirname, 'users.json');

function readUsers(){
  try{
    const raw = fs.readFileSync(USERS_FILE,'utf8');
    return JSON.parse(raw);
  }catch(e){
    return [];
  }
}

function writeUsers(arr){
  fs.writeFileSync(USERS_FILE, JSON.stringify(arr,null,2),'utf8');
}

// On startup: migrate any user entries that have a clear `pass` field to hashed `hash`.
async function migratePlainPasswords(){
  const users = readUsers();
  let changed = false;
  for(const u of users){
    if(u.pass){
      const h = await bcrypt.hash(u.pass, 10);
      u.hash = h;
      delete u.pass;
      changed = true;
    }
  }
  if(changed) writeUsers(users);
}

// Start server after migration completes
async function start(){
  try{
    await migratePlainPasswords();
    app.listen(PORT, ()=> console.log(`ClimaApp login backend listening on ${PORT}`));
  }catch(err){
    console.error('Error during startup/migration:', err);
    process.exit(1);
  }
}

start();

// POST /api/login
// body: { user: string, pass: string }
app.post('/api/login', async (req,res)=>{
  const { user, pass } = req.body || {};
  if(!user || !pass) return res.status(400).json({ ok:false, error:'Usuario y contraseña requeridos' });
  const users = readUsers();
  const found = users.find(u=>u.user.toLowerCase() === user.toLowerCase());
  if(!found) return res.status(401).json({ ok:false, error:'Usuario o contraseña inválidos' });
  const match = await bcrypt.compare(pass, found.hash);
  if(!match) return res.status(401).json({ ok:false, error:'Usuario o contraseña inválidos' });
  // Demo: respond with basic user info and a simple token (not JWT)
  const token = Buffer.from(`${found.user}:${Date.now()}`).toString('base64');
  res.json({ ok:true, user:{ user:found.user, name: found.name || null }, token });
});

// Demo-only: create user endpoint (protected by a simple header token)
// In production you should remove this or protect it properly, or create users via CLI/migration.
app.post('/api/create-user', async (req,res)=>{
  const secret = req.headers['x-demo-secret'];
  if(!secret || secret !== 'demo-secret-token') return res.status(403).json({ ok:false, error:'Forbidden' });
  const { user, pass, name } = req.body || {};
  if(!user || !pass) return res.status(400).json({ ok:false, error:'user and pass required' });
  const users = readUsers();
  if(users.find(u=>u.user.toLowerCase()===user.toLowerCase())) return res.status(400).json({ ok:false, error:'user exists' });
  const hash = await bcrypt.hash(pass, 10);
  users.push({ user, hash, name: name || null, createdAt: new Date().toISOString() });
  writeUsers(users);
  res.json({ ok:true });
});

// Health
app.get('/api/health', (req,res)=> res.json({ ok:true, time: new Date().toISOString() }));

// (the actual listen happens in start())

/*
Migration notes (commented):

// To migrate to a real database (recommended):
// 1) Choose DB (MongoDB, Postgres, etc.).
// 2) Replace readUsers/writeUsers with async calls to the DB client.
// 3) Store users with fields: { user, hash, name, createdAt }
// 4) Use proper token issuance (JWT) with signing and expiration.
// 5) Remove demo create-user endpoint or protect it with admin-only access.

// Example using MongoDB (pseudocode):
// const { MongoClient } = require('mongodb');
// const client = new MongoClient(MONGO_URL);
// await client.connect();
// const usersCol = client.db('clima').collection('users');
// const found = await usersCol.findOne({ user: user.toLowerCase() });
// ...bcrypt.compare ...

*/
