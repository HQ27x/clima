# Clima - API Proxy

This is a tiny Node.js proxy that calls OpenWeatherMap One Call 3.0 and returns a simplified JSON shape consumed by the Clima frontend components (WeatherInfo.jsx).

Usage

- Install Node.js (>=14) if you don't have it.
- From this folder run:

```bash
npm install
npm start
```

By default the server listens on port 4003. You can change this with `PORT` env var.

Environment variables

- `OPENWEATHER_API_KEY` - set your OpenWeather API key. If not set, a default placeholder key is used (may be rate-limited).
- `PORT` - HTTP port (default 4003)

Endpoints

- `GET /weather?lat=<lat>&lng=<lng>` - returns JSON:

```
{
  current: { temperature, feelsLike, humidity, windSpeed, visibility, pressure, description, icon, uvIndex },
  forecast: [ { date, day_name, high, low, description, icon, precipitation, humidity, wind_speed_ms }, ... ],
  short_term_forecast_5_days: [ { day_name, date, condition, temp_min_celsius, temp_max_celsius, humidity, wind_speed_ms }, ... ],
  long_term_ml_prediction_next_month_avg: { temperature_celsius, humidity_percent, wind_speed_ms, pressure_kpa }
}
```

This format matches the shape used in the project's `backend/API/index.html` and the frontend `WeatherInfo.jsx`.
