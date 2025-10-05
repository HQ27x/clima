#!/usr/bin/env node
/* CommonJS variant of the Gemini API server for environments where ESM import/require mismatch occurs. */
const http = require('http');
const { URL } = require('url');

const DEFAULT_PORT = process.env.PORT ? Number(process.env.PORT) : (process.argv[2] ? Number(process.argv[2]) : 8000);
const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyA_ELvchvKFW9ZaqkHYZV8KVTXygshpV8M';

const provider = (process.env.PROVIDER || (process.env.GEMINI_API_KEY ? 'google' : 'local')).toLowerCase();

function clampWords(s, maxWords = 30) {
  const words = s.trim().split(/\s+/);
  if (words.length <= maxWords) return s.trim();
  return words.slice(0, maxWords).join(' ');
}

function generateLocalRecommendation(promptText) {
  const txt = (promptText || '').toLowerCase();
  let minTemp = null, maxTemp = null;
  const between = txt.match(/entre\s+(-?\d{1,2})\s*°?c?\s*(?:y|and)\s*(-?\d{1,2})/i);
  if (between) { minTemp = Number(between[1]); maxTemp = Number(between[2]); }
  else {
    const temps = [...txt.matchAll(/(-?\d{1,2})\s*°?c?/g)].map(m=>Number(m[1]));
    if (temps.length === 1) { minTemp = maxTemp = temps[0]; }
    if (temps.length >= 2) { minTemp = Math.min(...temps); maxTemp = Math.max(...temps); }
  }
  const uvMatch = txt.match(/uv\s*(?:index)?\s*[:=]?\s*(\d{1,2})/i);
  const uv = uvMatch ? Number(uvMatch[1]) : null;
  const windMatch = txt.match(/viento\s*(?:de)?\s*(\d{1,3})\s*(?:km\/h|kmh|kph)?/i) || txt.match(/wind\s*(\d{1,3})/i);
  const wind = windMatch ? Number(windMatch[1]) : null;
  const isRain = /lluv|precip/i.test(txt);
  const isStorm = /tormenta|tormentoso|storm/i.test(txt);
  const isSunny = /sol|solead|clear|cielo claro/i.test(txt);
  const isCold = (maxTemp != null && maxTemp <= 12) || (minTemp != null && minTemp <= 8);
  const isHot = (maxTemp != null && maxTemp >= 28);
  const parts = [];
  if (isStorm || isRain) {
    parts.push('Lleva impermeable y paraguas; evita zonas anegadas.');
  } else if (isHot && isSunny) {
    parts.push('Usa camiseta ligera, gafas de sol y sombrero.');
  } else if (isHot) {
    parts.push('Prefiere ropa fresca y ligera.');
  } else if (isCold) {
    parts.push('Usa una casaca abrigadora y calzado cerrado.');
  } else if (wind != null && wind >= 30) {
    parts.push('Lleva cortaviento: puede estar muy ventoso.');
  } else {
    parts.push('Lleva una prenda ligera por si refresca y revisa el pronóstico.');
  }
  if (uv != null && uv >= 7) {
    parts.push('Aplicar protector solar si estarás mucho tiempo al sol.');
  }
  let result = parts.join(' ');
  result = result.replace(/vístete en capas/gi, '').trim();
  result = clampWords(result, 28);
  if (!result.endsWith('.')) result += '.';
  result += ' Alertify IA, tu aliada para un día sin sorpresas climatológicas.';
  return result;
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

// Global error handlers for better dev debugging
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception in Gemini server (CJS):', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection in Gemini server (CJS):', reason && reason.stack ? reason.stack : reason);
});

async function handlePost(req, res) {
  try {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch (e) { sendJson(res, 400, { error: 'invalid_json', message: 'Request body is not valid JSON' }); return; }

    const datosClima = body.prompt || 'No hay datos de clima.';

    const promptFinal = `**INSTRUCCIONES DE SISTEMA:**\nActúa como \"Alertify\", un asistente de clima para Lima, Perú. Eres amigable, moderno y muy directo. Tu objetivo es dar recomendaciones de ropa y precauciones súper concisas basadas en datos.\n\n**REGLAS ESTRICTAS:**\n1.  **NUNCA uses la frase \"vístete en capas\".** En su lugar, sugiere prendas específicas (ej: \"un polo y una casaca ligera\").\n2.  Tu respuesta debe ser una o dos frases cortas. Máximo 30 palabras en total.\n3.  Usa un tono casual y local (peruano si es posible).\n4.  Menciona el protector solar solo si las temperaturas son altas o la condición es \"cielo claro\".\n5.  Considera la consulta personalizada del usuario sobre si estará “muy caliente,” “muy frío,” “muy ventoso,” “muy mojado,” o con condiciones “muy incómodas” para la ubicación y hora indicada, y adapta tu recomendación de ropa y consejos según esa información.\n6.  Tu respuesta final SIEMPRE debe terminar con la frase exacta: \"Alertify IA, tu aliada para un día sin sorpresas climatológicas.\" sin añadir nada más después.\n\n**TAREA:**\nAnaliza los siguientes datos del clima y genera una recomendación siguiendo todas mis reglas.\n\n**DATOS DEL CLIMA:**\n${datosClima}`;

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
    const payload = { contents: [{ parts: [{ text: promptFinal }] }] };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    if (provider === 'local' || !process.env.GEMINI_API_KEY) {
      const local = generateLocalRecommendation(datosClima);
      sendJson(res, 200, { recomendacion: local, provider: 'local' });
      return;
    }

    let gResp;
    try {
      gResp = await fetch(url, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, signal: controller.signal });
    } catch (err) {
      clearTimeout(timeout);
      sendJson(res, 502, { error: 'fetch_failed', message: String(err) });
      return;
    }
    clearTimeout(timeout);

    let parsed;
    try { parsed = await gResp.json(); } catch (e) { sendJson(res, 502, { error: 'invalid_response', httpStatus: gResp.status, raw: await gResp.text() }); return; }

    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      sendJson(res, 200, { recomendacion: text.trim(), provider: 'google' });
      return;
    }

    sendJson(res, 502, { error: 'unexpected_response', httpStatus: gResp.status, raw: parsed });
  } catch (e) {
    const payload = { error: 'server_error', message: String(e) };
    if (process.env.NODE_ENV !== 'production' && e && e.stack) payload.stack = e.stack;
    sendJson(res, 500, payload);
  }
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  const pathname = u.pathname.replace(/\/+$/, ''); // trim trailing slash

  // Accept both /gemini-api and /gemini-api.php for compatibility
  if (pathname === '/gemini-api' || pathname === '/gemini-api.php') {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); res.end(); return; }
    if (req.method === 'GET') { sendJson(res, 200, { status: 'ok', message: 'gemini-api (node) reachable. Send POST JSON { prompt }' }); return; }
    if (req.method === 'POST') { handlePost(req, res); return; }
    res.writeHead(405, { 'Allow': 'GET,POST,OPTIONS' }); res.end('Method Not Allowed');
    return;
  }

  // For any other path, return simple 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(DEFAULT_PORT, () => {
  console.log(`Gemini API server (CJS) listening on http://localhost:${DEFAULT_PORT}`);
  if (!process.env.GEMINI_API_KEY) console.log('Warning: using embedded API key fallback. Set GEMINI_API_KEY env var to override.');
});
