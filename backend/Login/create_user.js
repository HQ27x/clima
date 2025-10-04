const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const USERS_FILE = path.join(__dirname, 'users.json');

function readUsers(){
  try{ return JSON.parse(fs.readFileSync(USERS_FILE,'utf8')); }
  catch(e){ return []; }
}

function writeUsers(u){ fs.writeFileSync(USERS_FILE, JSON.stringify(u,null,2),'utf8'); }

async function main(){
  const [,, user, pass, name] = process.argv;
  if(!user || !pass){
    console.log('Uso: node create_user.js user@example.com contraseña "Nombre opcional"');
    process.exit(1);
  }
  const users = readUsers();
  if(users.find(u=>u.user.toLowerCase()===user.toLowerCase())){ console.error('Usuario ya existe'); process.exit(1); }
  const hash = await bcrypt.hash(pass, 10);
  users.push({ user, hash, name: name || null, createdAt: new Date().toISOString() });
  writeUsers(users);
  console.log('Usuario creado:', user);
}

main().catch(err=>{ console.error(err); process.exit(1); });
