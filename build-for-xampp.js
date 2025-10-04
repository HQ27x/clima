#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Construyendo aplicación para XAMPP...\n');

try {
  // Construir la aplicación
  console.log('📦 Construyendo aplicación...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Crear archivo .htaccess para XAMPP
  const htaccessContent = `RewriteEngine On
RewriteBase /

# Handle client-side routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [QSA,L]

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>`;

  const htaccessPath = path.join(__dirname, 'dist', '.htaccess');
  fs.writeFileSync(htaccessPath, htaccessContent);
  console.log('✅ Archivo .htaccess creado');

  // Crear archivo de configuración para XAMPP
  const xamppConfig = `<?php
// Configuración para XAMPP
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Redirigir todas las rutas a index.html para SPA
$request = $_SERVER['REQUEST_URI'];
$path = parse_url($request, PHP_URL_PATH);

if (!file_exists(__DIR__ . $path) && !is_dir(__DIR__ . $path)) {
    include __DIR__ . '/index.html';
}
?>`;

  const xamppConfigPath = path.join(__dirname, 'dist', 'index.php');
  fs.writeFileSync(xamppConfigPath, xamppConfig);
  console.log('✅ Archivo index.php creado');

  console.log('\n🎉 ¡Aplicación construida para XAMPP!');
  console.log('\n📋 Instrucciones para XAMPP:');
  console.log('1. Copia la carpeta "dist" a htdocs de XAMPP');
  console.log('2. Renómbrala a "clima-app"');
  console.log('3. Inicia XAMPP (Apache)');
  console.log('4. Ve a http://localhost/clima-app');
  
} catch (error) {
  console.error('❌ Error construyendo la aplicación:', error.message);
  process.exit(1);
}
