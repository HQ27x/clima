const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const FEEDBACKS_FILE = path.join(DATA_DIR, 'feedbacks.json');

function readJson(file){
  try{ return JSON.parse(fs.readFileSync(file,'utf8')); }catch(e){ return null; }
}

function writeJson(file, obj){
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
}

// Threads
app.get('/threads', (req,res)=>{
  const posts = readJson(POSTS_FILE) || { threads: [] };
  res.json(posts.threads);
});

app.post('/threads', (req,res)=>{
  const { title, body, authorId } = req.body || {};
  if(!title || !body) return res.status(400).json({ error: 'title and body required' });
  const posts = readJson(POSTS_FILE) || { threads: [] };
  const thread = { id: uuidv4(), title, body, authorId: authorId || null, createdAt: Date.now(), comments: [], stars: 0 };
  posts.threads.unshift(thread);
  writeJson(POSTS_FILE, posts);
  res.json(thread);
});

app.get('/threads/:id', (req,res)=>{
  const posts = readJson(POSTS_FILE) || { threads: [] };
  const t = posts.threads.find(x=>x.id === req.params.id);
  if(!t) return res.status(404).json({ error: 'not found' });
  res.json(t);
});

app.post('/threads/:id/comments', (req,res)=>{
  const { authorId, body } = req.body || {};
  if(!body) return res.status(400).json({ error: 'body required' });
  const posts = readJson(POSTS_FILE) || { threads: [] };
  const t = posts.threads.find(x=>x.id === req.params.id);
  if(!t) return res.status(404).json({ error: 'not found' });
  const comment = { id: uuidv4(), authorId: authorId || null, body, createdAt: Date.now() };
  t.comments.push(comment);
  writeJson(POSTS_FILE, posts);
  res.json(comment);
});

app.post('/threads/:id/star', (req,res)=>{
  const { userId } = req.body || {};
  const posts = readJson(POSTS_FILE) || { threads: [] };
  const t = posts.threads.find(x=>x.id === req.params.id);
  if(!t) return res.status(404).json({ error: 'not found' });
  t.stars = (t.stars || 0) + 1;
  writeJson(POSTS_FILE, posts);
  // optionally award a star to the author
  if(t.authorId){
    try{
      const users = readJson(USERS_FILE) || { users: [] };
      const u = users.users.find(x=>x.id === t.authorId);
      if(u){ u.stars = (u.stars || 0) + 1; writeJson(USERS_FILE, users); }
    }catch(e){ /* ignore */ }
  }
  res.json({ stars: t.stars });
});

// Users
app.get('/users', (req,res)=>{
  const users = readJson(USERS_FILE) || { users: [] };
  // compute credibility (simple formula: stars normalized)
  const sorted = users.users.map(u=>({ ...u, credibility: computeCredibility(u) }));
  res.json(sorted);
});

app.post('/users', (req,res)=>{
  const { username, displayName } = req.body || {};
  if(!username) return res.status(400).json({ error: 'username required' });
  const users = readJson(USERS_FILE) || { users: [] };
  const u = { id: uuidv4(), username, displayName: displayName || username, stars: 0 };
  users.users.push(u);
  writeJson(USERS_FILE, users);
  res.json(u);
});

app.post('/users/:id/star', (req,res)=>{
  const users = readJson(USERS_FILE) || { users: [] };
  const u = users.users.find(x=>x.id === req.params.id);
  if(!u) return res.status(404).json({ error: 'user not found' });
  u.stars = (u.stars || 0) + 1;
  writeJson(USERS_FILE, users);
  res.json(u);
});

function computeCredibility(user){
  const stars = user && user.stars ? user.stars : 0;
  // credibility score 0-100, scaled with a soft cap
  const score = Math.min(100, Math.round((Math.log10(stars + 1) / Math.log10(101)) * 100));
  return score;
}

const PORT = process.env.PORT || 4002;
app.listen(PORT, ()=> console.log('Foro backend listening on', PORT));

// Feedback endpoints
app.get('/feedbacks', (req, res) => {
  const fb = readJson(FEEDBACKS_FILE) || { feedbacks: [] };
  // return latest 20 feedbacks
  res.json((fb.feedbacks || []).slice(0, 20));
});

app.post('/feedbacks', (req, res) => {
  const { rating, positive, comment, location } = req.body || {};
  if(typeof rating !== 'number' || rating < 0) return res.status(400).json({ error: 'rating numeric required' });
  const fb = readJson(FEEDBACKS_FILE) || { feedbacks: [] };
  const item = { id: uuidv4(), rating, positive: !!positive, comment: comment || '', location: location || null, createdAt: Date.now() };
  fb.feedbacks.unshift(item);
  writeJson(FEEDBACKS_FILE, fb);
  res.json(item);
});
