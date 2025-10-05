const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 4003;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || 'b9887004fb83b6baf80ea22a539cc923';

function mapIcon(main, id) {
  if (!main) return 'cloudy';
  const m = main.toLowerCase();
  if (m.includes('clear')) return 'sunny';
  if (m.includes('cloud')) return 'partly-cloudy';
  if (m.includes('rain') || m.includes('drizzle')) return 'rainy';
  if (m.includes('storm') || m.includes('thunder')) return 'stormy';
  if (m.includes('snow')) return 'cloudy';
  return 'cloudy';
}

function fetchJson(url, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve(parsed);
        } catch (err) {
          reject(new Error('Invalid JSON from upstream: ' + err.message));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

function avg(values) {
  if (!values || values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    // Simple CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    if (url.pathname === '/weather') {
      const lat = url.searchParams.get('lat') || url.searchParams.get('latitude');
      const lon = url.searchParams.get('lng') || url.searchParams.get('lon') || url.searchParams.get('longitude');

      if (!lat || !lon) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing lat and lng parameters' }));
      }

      const owUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=metric&exclude=minutely,hourly,alerts&appid=${OPENWEATHER_API_KEY}`;

      const data = await fetchJson(owUrl, 25000);

      // Build simplified structure used by WeatherInfo.jsx
      const current = data.current || {};
      const daily = Array.isArray(data.daily) ? data.daily : [];

      const mappedCurrent = {
        temperature: typeof current.temp === 'number' ? current.temp : null,
        feelsLike: typeof current.feels_like === 'number' ? current.feels_like : null,
        humidity: current.humidity ?? null,
        windSpeed: current.wind_speed ?? null,
        visibility: typeof current.visibility === 'number' ? Math.round((current.visibility || 0) / 1000) : null,
        pressure: current.pressure ?? null,
        description: current.weather?.[0]?.description ?? null,
        icon: mapIcon(current.weather?.[0]?.main, current.weather?.[0]?.id),
        uvIndex: current.uvi ?? null
      };

      const forecast = daily.slice(1, 6).map(d => ({
        date: new Date(d.dt * 1000).toISOString(),
        day_name: new Date(d.dt * 1000).toLocaleDateString('es-PE', { weekday: 'long' }),
        high: d.temp?.max ?? null,
        low: d.temp?.min ?? null,
        description: d.weather?.[0]?.description ?? null,
        icon: mapIcon(d.weather?.[0]?.main, d.weather?.[0]?.id),
        precipitation: d.rain ?? 0,
        humidity: d.humidity ?? null,
        wind_speed_ms: d.wind_speed ?? null
      }));

      // Provide the older hybrid API shape used by test.py/index.html as well
      const short_term_forecast_5_days = forecast.map(f => ({
        day_name: f.day_name,
        date: f.date.split('T')[0],
        condition: f.description,
        temp_min_celsius: f.low,
        temp_max_celsius: f.high,
        humidity: f.humidity,
        wind_speed_ms: f.wind_speed_ms
      }));

      // Simple aggregated 'ML' prediction (mock) computed from available daily
      const long_term = {
        temperature_celsius: avg(daily.map(d => (d.temp?.day ?? null)).filter(v => v != null)) ?? null,
        humidity_percent: avg(daily.map(d => d.humidity ?? null).filter(v => v != null)) ?? null,
        wind_speed_ms: avg(daily.map(d => d.wind_speed ?? null).filter(v => v != null)) ?? null,
        pressure_kpa: (avg(daily.map(d => d.pressure ?? null).filter(v => v != null)) ?? null) / 10
      };

      const result = {
        current: mappedCurrent,
        forecast,
        short_term_forecast_5_days,
        long_term_ml_prediction_next_month_avg: long_term,
        raw: { fetchedAt: new Date().toISOString() }
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    }

    // Fallback: serve a tiny info page
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body><h2>API de Clima (proxy)</h2><p>Uso: /weather?lat=&lt;lat&gt;&amp;lng=&lt;lng&gt;</p></body></html>`);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    console.error('Server error', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Internal error' }));
  }
});

server.listen(PORT, () => {
  console.log(`Weather proxy listening on http://localhost:${PORT}`);
  console.log('Use /weather?lat=<lat>&lng=<lng>');
});
