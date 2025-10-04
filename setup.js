#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🌤️  Configurando Clima App...\n');

// Crear archivo .env si no existe
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  const envContent = `# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id

# Weather API (opcional - para integración futura)
VITE_WEATHER_API_KEY=your-weather-api-key

# App Configuration
VITE_APP_NAME=Clima App
VITE_APP_VERSION=1.0.0`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Archivo .env creado');
} else {
  console.log('ℹ️  Archivo .env ya existe');
}

// Verificar si node_modules existe
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('\n📦 Instalando dependencias...');
  console.log('Ejecuta: npm install');
} else {
  console.log('✅ Dependencias ya instaladas');
}

console.log('\n🎯 Próximos pasos:');
console.log('1. Configura Firebase en src/firebase/config.js');
console.log('2. Ejecuta: npm run dev');
console.log('3. Abre http://localhost:3000');
console.log('\n¡Disfruta tu nueva aplicación de clima! 🌟');
