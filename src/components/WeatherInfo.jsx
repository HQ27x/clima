import React, { useState, useEffect } from 'react';
import { FiCloud, FiSun, FiCloudRain, FiWind, FiDroplet, FiEye, FiThermometer, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import './WeatherInfo.css';

const WeatherInfo = ({ location, onNext }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modelSource, setModelSource] = useState(null); // 'fusion' | 'local' | 'mock'
  const [geminiRecommendation, setGeminiRecommendation] = useState(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState(null);

  useEffect(() => {
    let aborted = false;

    async function fetchWeather() {
      setLoading(true);
      setError('');
      setModelSource(null);

      // determine coords (prop or saved)
      let lat = location?.lat || location?.latitude || location?.coords?.lat || location?.coords?.latitude;
      let lng = location?.lng || location?.lon || location?.longitude || location?.coords?.lng || location?.coords?.longitude;
      if ((lat == null || lng == null) && typeof window !== 'undefined'){
        try{
          const raw = localStorage.getItem('clima_last_location_v1');
          if(raw){
            const obj = JSON.parse(raw);
            if(obj && typeof obj.latitude === 'number' && typeof obj.longitude === 'number'){
              lat = lat ?? obj.latitude;
              lng = lng ?? obj.longitude;
            }
          }
        }catch(e){ /* ignore */ }
      }

      try{
        let data = null;
        let dataSource = null; // local indicator used synchronously in this function

        // 1) try remote trained API (may be slow)
        if (lat != null && lng != null) {
          try {
            const fusionController = new AbortController();
            const fusionTimeout = setTimeout(() => fusionController.abort(), 35000);
            const fusionUrl = `https://api-fusion-34si.onrender.com/predict/full?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
            const r = await fetch(fusionUrl, { signal: fusionController.signal });
            clearTimeout(fusionTimeout);
            if (r.ok) {
              data = await r.json();
              dataSource = 'fusion';
            } else {
              console.warn('Fusion API responded non-ok', r.status);
            }
          } catch (err) {
            console.warn('Fusion API failed', err && err.message ? err.message : err);
          }
        }

        // 2) try local proxy
        if (!data && lat != null && lng != null) {
          try {
            const localController = new AbortController();
            const localTimeout = setTimeout(() => localController.abort(), 20000);
            const r2 = await fetch(`http://localhost:4003/weather?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`, { signal: localController.signal });
            clearTimeout(localTimeout);
            if (r2.ok) {
              data = await r2.json();
              dataSource = 'local';
            } else {
              console.warn('Local proxy responded non-ok', r2.status);
            }
          } catch (err) {
            console.warn('Local proxy failed', err && err.message ? err.message : err);
          }
        }

        // 3) fallback mock or synthetic per-location data
        if (!data) {
          if (lat != null && lng != null) {
            // deterministic pseudo-random generator based on coords so values change by zone
            const seed = Math.abs(Math.floor((lat * 10000) + (lng * 10000))) % 100000;
            const rand = (n) => (Math.abs((seed * (n + 1)) % 100) / 100);
            const tempBase = Math.round((15 + (rand(1) * 20)) * 10) / 10; // 15-35
            const humidity = Math.round(30 + rand(2) * 70); // 30-100
            const windMs = Math.round((1 + rand(3) * 8) * 10) / 10; // 1-9 m/s
            const visibilityKm = Math.round(3 + rand(4) * 12); // 3-15 km
            const pressureHpa = Math.round(990 + rand(5) * 50); // 990-1040
            const uvi = Math.min(11, Math.max(0, Math.round(rand(6) * 11)));

            dataSource = 'synthetic';
            data = {
              current: {
                temperature: tempBase,
                feelsLike: Math.round((tempBase - (rand(7) * 2)) * 10) / 10,
                humidity,
                windSpeed: windMs * 3.6, // convert m/s to km/h for normalization
                visibility: visibilityKm,
                pressure: pressureHpa,
                description: ['Soleado', 'Parcialmente nublado', 'Nublado', 'Lluvias aisladas'][Math.floor(rand(8) * 4)] || 'Parcialmente nublado',
                icon: ['sunny', 'partly-cloudy', 'cloudy', 'rainy'][Math.floor(rand(9) * 4)] || 'partly-cloudy',
                uvIndex: uvi
              },
              short_term_forecast_5_days: Array.from({ length: 5 }).map((_, i) => ({
                day_name: `día${i + 1}`,
                date: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
                condition: i % 4 === 0 ? 'Soleado' : (i % 3 === 0 ? 'Nublado' : (i % 2 === 0 ? 'Lluvias' : 'Parcial')),
                temp_min_celsius: Math.round((tempBase - 3 + rand(i + 10) * 3) * 10) / 10,
                temp_max_celsius: Math.round((tempBase + 3 + rand(i + 11) * 3) * 10) / 10,
                humidity: Math.round(Math.min(100, humidity + rand(i + 12) * 10)),
                wind_speed_ms: windMs
              }))
            };
          } else {
            dataSource = 'mock';
            data = {
              current: { temperature: 22, feelsLike: 25, humidity: 65, windSpeed: 12, visibility: 10, pressure: 1013, description: 'Parcialmente nublado', icon: 'partly-cloudy', uvIndex: 6 },
              short_term_forecast_5_days: [
                { day_name: 'mañana', date: new Date(Date.now() + 1 * 86400000).toISOString(), condition: 'Soleado', temp_min_celsius: 18, temp_max_celsius: 26, humidity: 60, wind_speed_ms: 3 },
                { day_name: 'día2', date: new Date(Date.now() + 2 * 86400000).toISOString(), condition: 'Lluvia ligera', temp_min_celsius: 16, temp_max_celsius: 24, humidity: 70, wind_speed_ms: 4 },
                { day_name: 'día3', date: new Date(Date.now() + 3 * 86400000).toISOString(), condition: 'Nublado', temp_min_celsius: 20, temp_max_celsius: 28, humidity: 65, wind_speed_ms: 5 },
                { day_name: 'día4', date: new Date(Date.now() + 4 * 86400000).toISOString(), condition: 'Soleado', temp_min_celsius: 22, temp_max_celsius: 30, humidity: 50, wind_speed_ms: 3 },
                { day_name: 'día5', date: new Date(Date.now() + 5 * 86400000).toISOString(), condition: 'Tormenta', temp_min_celsius: 19, temp_max_celsius: 27, humidity: 80, wind_speed_ms: 6 }
              ]
            };
          }
        }

        // At this point we have 'data' and a local 'dataSource'. Use dataSource for further decisions and then persist to state.
        if (dataSource) setModelSource(dataSource);

        if(aborted) return;

        // If fusion returned partial data missing visibility/pressure/uvIndex, try to supplement from local proxy
        try {
          const needsVisibility = !(data?.current && typeof data.current.visibility === 'number');
          const needsPressure = !(data?.current && (typeof data.current.pressure === 'number'));
          const needsUvi = !(data?.current && (typeof data.current.uvi === 'number' || typeof data.current.uvIndex === 'number'));
          if ((dataSource === 'fusion' || needsVisibility || needsPressure || needsUvi) && lat != null && lng != null) {
            try {
              const supCtrl = new AbortController();
              const supTO = setTimeout(() => supCtrl.abort(), 10000);
              const supRes = await fetch(`http://localhost:4003/weather?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`, { signal: supCtrl.signal });
              clearTimeout(supTO);
              if (supRes.ok) {
                const supJson = await supRes.json();
                // Merge current-level fields if missing
                data.current = data.current || {};
                const supCur = supJson.current || {};
                if (typeof supCur.visibility === 'number' && (data.current.visibility == null)) data.current.visibility = supCur.visibility;
                if (typeof supCur.pressure === 'number' && (data.current.pressure == null)) data.current.pressure = supCur.pressure;
                if ((typeof supCur.uvIndex === 'number' || typeof supCur.uvi === 'number') && (data.current.uvi == null && data.current.uvIndex == null)) {
                  const v = supCur.uvIndex ?? supCur.uvi;
                  data.current.uvi = v;
                  data.current.uvIndex = v;
                }
                if (typeof supCur.humidity === 'number' && (data.current.humidity == null)) data.current.humidity = supCur.humidity;
                if (typeof supCur.windSpeed === 'number' && (data.current.windSpeed == null)) data.current.windSpeed = supCur.windSpeed;
              }
            } catch (e) {
              // ignore supplement failures
              console.warn('supplemental local proxy fetch failed', e && e.message ? e.message : e);
            }
          }
        } catch (e) {
          // ignore
        }

        // Normalize current data shape into a consistent object used by the UI
  const rawCur = (data.current ?? data.current_weather ?? data) || {};
        const normalizeWind = (w) => {
          if (w == null) return null;
          // if small value assume m/s, convert to km/h
          if (Math.abs(w) < 15) return Math.round(w * 3.6 * 10) / 10;
          return Math.round(w * 10) / 10; // already km/h or large value
        };

        // Helper estimators for missing values
        const estimateVisibility = (rawCur, data) => {
          try {
            // If provider gives explicit visibility, use it
            if (typeof rawCur.visibility === 'number') return (rawCur.visibility > 1000 ? Math.round(rawCur.visibility / 1000) : Math.round(rawCur.visibility));
            if (typeof rawCur.visibility_km === 'number') return Math.round(rawCur.visibility_km);

            // Use feels-like temperature as sole driver
            const t = rawCur.feelsLike ?? rawCur.feels_like ?? rawCur.temperature ?? (data && data.current && (data.current.feelsLike ?? data.current.temp)) ?? null;
            const temp = (typeof t === 'number') ? t : null;
            const tMin = 5; const tMax = 45; const visMin = 5; const visMax = 30;
            if (temp != null) {
              const clamped = Math.max(tMin, Math.min(tMax, temp));
              const ratio = (clamped - tMin) / (tMax - tMin); // 0..1
              const vis = visMin + ratio * (visMax - visMin);
              return Math.round(Math.max(visMin, Math.min(visMax, vis)));
            }
            // If we can't derive a temperature, return a reasonable default so UI shows something
            return 12;
          } catch (e) { return null; }
        };

        const estimatePressure = (rawCur, data) => {
          try {
            // If explicit pressure provided by provider, use it
            if (typeof rawCur.pressure === 'number') return rawCur.pressure;
            if (typeof rawCur.pressure_hpa === 'number') return rawCur.pressure_hpa;
            if (typeof rawCur.pressure_kpa === 'number') return Math.round(rawCur.pressure_kpa * 10);

            // Use feels-like temperature as sole driver
            const t = rawCur.feelsLike ?? rawCur.feels_like ?? rawCur.temperature ?? (data && data.current && (data.current.feelsLike ?? data.current.temp)) ?? null;
            const temp = (typeof t === 'number') ? t : null;
            const tMin = 5; const tMax = 45; const pMin = 1005; const pMax = 1030;
            if (temp != null) {
              const clamped = Math.max(tMin, Math.min(tMax, temp));
              const ratio = (clamped - tMin) / (tMax - tMin);
              const pres = pMin + ratio * (pMax - pMin);
              return Math.round(Math.max(pMin, Math.min(pMax, pres)));
            }
            return 1013;
          } catch (e) { return 1013; }
        };

        const estimateUvi = (rawCur, data) => {
          try {
            // If provider gives explicit UV, use it
            const explicit = rawCur.uvIndex ?? rawCur.uvi ?? rawCur.uv ?? (data && data.current && (data.current.uvIndex ?? data.current.uvi));
            if (typeof explicit === 'number') return explicit;

            // Use feels-like temperature as sole driver, map linearly to 2..7
            const t = rawCur.feelsLike ?? rawCur.feels_like ?? rawCur.temperature ?? (data && data.current && (data.current.feelsLike ?? data.current.temp)) ?? null;
            const temp = (typeof t === 'number') ? t : null;
            const tMin = 5; const tMax = 45; const uvMin = 2; const uvMax = 7;
            if (temp != null) {
              const clamped = Math.max(tMin, Math.min(tMax, temp));
              const ratio = (clamped - tMin) / (tMax - tMin);
              const uv = uvMin + ratio * (uvMax - uvMin);
              return Math.round(Math.max(uvMin, Math.min(uvMax, uv)));
            }
            return 4;
          } catch (e) { return null; }
        };

        const normalizedCurrent = {
          temperature: rawCur.temperature ?? rawCur.temp ?? rawCur.temp_c ?? rawCur.temp_celsius ?? null,
          feelsLike: rawCur.feelsLike ?? rawCur.feels_like ?? rawCur.apparent_temperature ?? null,
          humidity: rawCur.humidity ?? rawCur.humidity_percent ?? rawCur.relative_humidity ?? null,
          windSpeed: normalizeWind(rawCur.windSpeed ?? rawCur.wind_speed ?? rawCur.wind_speed_ms ?? rawCur.wind_speed_kmh ?? null),
          // visibility/pressure/uv may be missing from some providers — compute fallbacks below
          visibility: (typeof rawCur.visibility === 'number')
            ? (rawCur.visibility > 1000 ? Math.round(rawCur.visibility / 1000) : Math.round(rawCur.visibility))
            : (rawCur.visibility_km ?? null),
          pressure: rawCur.pressure ?? rawCur.pressure_hpa ?? rawCur.pressure_kpa ?? null,
          description: rawCur.description ?? rawCur.condition ?? (rawCur.weather?.[0]?.description) ?? null,
          icon: rawCur.icon ?? rawCur.icon_code ?? null,
          uvIndex: rawCur.uvIndex ?? rawCur.uvi ?? rawCur.uv ?? null
        };

        // If any of the three key metrics are missing, estimate them using heuristics or long-term predictions
        const finalVisibility = (typeof normalizedCurrent.visibility === 'number') ? normalizedCurrent.visibility : estimateVisibility(rawCur, data);
        const visibilityEstimated = normalizedCurrent.visibility == null;

        const finalPressure = (typeof normalizedCurrent.pressure === 'number') ? normalizedCurrent.pressure : estimatePressure(rawCur, data);
        const pressureEstimated = normalizedCurrent.pressure == null;

        const finalUv = (typeof normalizedCurrent.uvIndex === 'number') ? normalizedCurrent.uvIndex : estimateUvi(rawCur, data);
        const uvEstimated = normalizedCurrent.uvIndex == null;

        // assign final values and estimation flags
        normalizedCurrent.visibility = finalVisibility;
        normalizedCurrent.visibilityEstimated = !!visibilityEstimated;
        normalizedCurrent.pressure = finalPressure;
        normalizedCurrent.pressureEstimated = !!pressureEstimated;
        normalizedCurrent.uvIndex = finalUv;
        normalizedCurrent.uvEstimated = !!uvEstimated;

        // Debug: if key fields are missing, log raw source to help diagnose mismatches
        try {
          const missing = [];
          if (normalizedCurrent.visibility == null) missing.push('visibility');
          if (normalizedCurrent.pressure == null) missing.push('pressure');
          if (normalizedCurrent.uvIndex == null) missing.push('uvIndex');
          if (missing.length > 0) {
            console.warn('WeatherInfo: missing fields after normalization:', missing.join(', '), { raw: rawCur, modelSource, dataSample: data?.current });
          }
        } catch (e) { /* ignore logging errors */ }

        // Diagnostic log: show what will be set so we can trace why visibility might not render
        try {
          console.log('WeatherInfo: normalized current ->', {
            visibility: normalizedCurrent.visibility,
            visibilityEstimated: normalizedCurrent.visibilityEstimated,
            feelsLikeRaw: rawCur.feelsLike ?? rawCur.feels_like ?? rawCur.temperature,
            normalizedFeelsLike: normalizedCurrent.feelsLike
          });
        } catch (e) { /* ignore */ }

        setWeatherData(normalizedCurrent);

        const rawForecast = Array.isArray(data.forecast) ? data.forecast : (Array.isArray(data.short_term_forecast_5_days) ? data.short_term_forecast_5_days : (Array.isArray(data.forecast_days) ? data.forecast_days : []));
        const normalized = (rawForecast || []).slice(0,5).map(it => {
          const dateStr = it.date || it.dt || it.datetime || it.day || new Date().toISOString();
          const dt = (() => { try{ return new Date(dateStr); }catch(e){ return new Date(); } })();
          return {
            date: dt,
            high: it.temp_max_celsius ?? it.high ?? it.temp?.max ?? it.max ?? null,
            low: it.temp_min_celsius ?? it.low ?? it.temp?.min ?? it.min ?? null,
            description: it.condition ?? it.description ?? it.weather ?? '',
            humidity: it.humidity ?? it.humidity_percent ?? it.humidity_percentile ?? null,
            // normalize wind: prefer explicit meters/sec key then convert, otherwise accept km/h
            windSpeed: (typeof it.wind_speed_ms === 'number') ? Math.round(it.wind_speed_ms * 3.6 * 10) / 10 : (it.wind_speed_kmh ?? it.wind_speed ?? it.wind_speed_ms ?? null),
            precipitation: it.precipitation ?? it.rain ?? 0,
            icon: it.icon ?? null
          };
        });
        setForecast(normalized);

        // After we have forecast + current data, try to obtain a recommendation from Gemini
        async function callGemini(summary) {
          try {
            // Build a concise summary for the PHP service to expand following its internal rules
            setGeminiLoading(true);
            setGeminiError(null);

            // Try Node server endpoint first, then fall back to PHP endpoint
            // Try a running Node server on localhost first (useful during `npm run dev`),
            // then try relative backend paths (PHP or deployed locations).
            const endpoints = [
              'http://localhost:8000/gemini-api',
              'http://localhost:8000/gemini-api.php',
              '/backend/geminiAI/gemini-api',
              '/backend/geminiAI/gemini-api.php'
            ];
            let resp = null;
            let lastErr = null;
            for (const ep of endpoints) {
              try {
                resp = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: summary }) });
                // if fetch didn't throw, break and use resp (even if non-200 we'll handle it)
                break;
              } catch (err) {
                lastErr = err;
                resp = null;
              }
            }

            if (!resp) throw lastErr || new Error('No endpoint reachable for Gemini API');

            if (!resp.ok) {
              const text = await resp.text();
              throw new Error(`API responded with ${resp.status}: ${text}`);
            }

            const contentType = resp.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
              const txt = await resp.text();
              if (txt.trim().startsWith('<?php') || txt.includes('<?php')) {
                throw new Error('El endpoint devolvió código PHP en lugar de JSON. Asegúrate de ejecutar un servidor PHP (ej: php -S localhost:8000) y acceder vía http://localhost:8000/.');
              }
              throw new Error('Respuesta inesperada del servidor (no JSON): ' + txt.slice(0,200));
            }

            const json = await resp.json();
            if (json.recomendacion) {
              setGeminiRecommendation(json.recomendacion);
            } else if (json.error) {
              setGeminiError(`${json.error} ${json.message ? '- ' + json.message : ''}`);
            } else {
              setGeminiError('Respuesta inesperada de la API');
            }
          } catch (e) {
            console.warn('Gemini call failed', e && e.message ? e.message : e);
            setGeminiError(e && e.message ? e.message : String(e));
          } finally {
            setGeminiLoading(false);
          }
        }

        // Build summary then call
        const today = (normalized && normalized[0]) || {};
        const cur = normalizedCurrent || {};
        const uv = cur.uvIndex ?? cur.uvi ?? (data.current && (data.current.uvIndex ?? data.current.uvi)) ?? null;
        const precipToday = (today && typeof today.precipitation === 'number' && today.precipitation > 0) ? 'lluvia esperada' : '';
        const builtSummary = `Condición actual: ${cur.description || 'N/D'}. Temp entre ${today.low ?? 'N/D'}°C y ${today.high ?? 'N/D'}°C. Humedad ${cur.humidity ?? 'N/D'}%. Viento ${cur.windSpeed ?? 'N/D'} km/h. UV ${uv ?? 'N/D'}. ${precipToday}`;
        callGemini(builtSummary);

      }catch(err){
        if(!aborted) setError('Error al cargar datos del clima');
        console.error('fetchWeather error', err);
      }finally{
        if(!aborted) setLoading(false);
      }
    }

    fetchWeather();

    return ()=>{ aborted = true; };
  }, [location]);

  const getWeatherIcon = (iconType) => {
    const iconMap = {
      'sunny': <FiSun className="weather-icon sunny" />,
      'partly-cloudy': <FiCloud className="weather-icon partly-cloudy" />,
      'cloudy': <FiCloud className="weather-icon cloudy" />,
      'rainy': <FiCloudRain className="weather-icon rainy" />,
      'stormy': <FiCloudRain className="weather-icon stormy" />
    };
    return iconMap[iconType] || <FiCloud className="weather-icon" />;
  };

  const getUVIndexColor = (uvIndex) => {
    if (uvIndex <= 2) return '#10B981';
    if (uvIndex <= 5) return '#F59E0B';
    if (uvIndex <= 7) return '#F97316';
    if (uvIndex <= 10) return '#EF4444';
    return '#8B5CF6';
  };

  // Calculate an estimated 'exact' temperature for today when current temp is not provided.
  const getTodayExactTemp = (forecastArr, current) => {
    try {
      // If current data provides a temperature, prefer it
      if (current && typeof current.temperature === 'number') return current.temperature;

      const now = new Date();
      const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

      // Find forecast entry for today
      let todayEntry = (forecastArr || []).find(f => f && f.date && isSameDay(new Date(f.date), now));
      // If not found, use the first forecast entry as best-effort
      if (!todayEntry) todayEntry = (forecastArr || [])[0];
      if (!todayEntry) return null;

      const high = typeof todayEntry.high === 'number' ? todayEntry.high : null;
      const low = typeof todayEntry.low === 'number' ? todayEntry.low : null;
      if (high == null || low == null) return null;

      const hour = now.getHours();
      let estimate;
      // Simple heuristic by time of day:
      // 00:00-05:59 => noche (valor cercano al mínimo)
      // 06:00-11:59 => mañana (valor entre min y media)
      // 12:00-17:59 => tarde (valor cercano al máximo)
      // 18:00-23:59 => noche temprano (valor entre min y media baja)
      if (hour >= 12 && hour < 18) {
        estimate = high; // afternoon tends to be warmest
      } else if (hour >= 6 && hour < 12) {
        estimate = low + 0.5 * (high - low); // morning midpoint
      } else if (hour >= 18 && hour < 24) {
        estimate = low + 0.25 * (high - low); // evening cools down
      } else {
        estimate = low; // late night / early morning -> minimum
      }

      // Round to one decimal if fractional
      return Math.round(estimate * 10) / 10;
    } catch (e) {
      return null;
    }
  };

  // Build a small summary for today's main values (condition, temp, humidity, wind)
  const getTodaySummary = (forecastArr, current) => {
    try {
      const temp = getTodayExactTemp(forecastArr, current);
      const now = new Date();
      const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

      let todayEntry = (forecastArr || []).find(f => f && f.date && isSameDay(new Date(f.date), now));
      if (!todayEntry) todayEntry = (forecastArr || [])[0] || null;

      const description = (current && current.description) ? current.description : (todayEntry && todayEntry.description) ? todayEntry.description : null;
      const humidity = (current && typeof current.humidity === 'number') ? current.humidity : (todayEntry && typeof todayEntry.humidity === 'number' ? todayEntry.humidity : null);
      const windSpeed = (current && typeof current.windSpeed === 'number') ? current.windSpeed : (todayEntry && typeof todayEntry.windSpeed === 'number' ? todayEntry.windSpeed : null);

      return {
        temperature: temp,
        description,
        humidity,
        windSpeed
      };
    } catch (e) {
      return { temperature: null, description: null, humidity: null, windSpeed: null };
    }
  };

  if (loading) {
    return (
      <div className="step-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando información del clima...</p>
          {modelSource === 'fusion' && <p style={{marginTop:8,fontSize:13,color:'#9CA3AF'}}>Usando modelo: API entrenada (puede tardar unos segundos)</p>}
          {modelSource === 'local' && <p style={{marginTop:8,fontSize:13,color:'#9CA3AF'}}>Usando modelo: proxy local</p>}
          {modelSource === 'mock' && <p style={{marginTop:8,fontSize:13,color:'#9CA3AF'}}>Usando datos simulados</p>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="step-container">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="step-container">
      <div className="step-header">
        <h1 className="step-title">Información del Clima</h1>
        <p className="step-subtitle">Condiciones actuales y pronóstico para {location?.name || (localStorage.getItem('clima_last_location_v1') ? 'Ubicación guardada' : 'Ubicación no seleccionada')}</p>
        {modelSource && <div style={{marginTop:8,fontSize:13,color:'#6B7280'}}>Fuente de datos: {modelSource === 'fusion' ? 'API entrenada (fusion)' : modelSource === 'local' ? 'Proxy local' : 'Simulado'}</div>}
      </div>

      <div className="weather-content">
        <div className="current-weather">
          <div className="weather-main">
            <div className="weather-icon-large">{getWeatherIcon(weatherData?.icon)}</div>
            <div className="weather-temp">
              {(() => {
                const todayVals = getTodaySummary(forecast, weatherData);
                const hasRealCurrent = weatherData && typeof weatherData.temperature === 'number';
                const display = (hasRealCurrent ? weatherData.temperature : todayVals.temperature);
                return (
                  <>
                    <span className="temperature">{display != null ? `${display}°` : '—'}</span>
                    <span className="feels-like">Sensación térmica {weatherData?.feelsLike ?? '—'}°</span>
                    {!hasRealCurrent && todayVals.temperature != null && (<div className="estimated-note">(valor estimado para hoy según horario)</div>)}
                  </>
                );
              })()}
            </div>
            <div className="weather-description"><h3>{weatherData?.description ?? '—'}</h3><p>{format(new Date(), 'EEEE, dd MMMM', { locale: es })}</p></div>
          </div>

          <div className="weather-details">
            {(() => {
              const todayVals = getTodaySummary(forecast, weatherData);
              const windDisplay = todayVals.windSpeed ?? weatherData?.windSpeed ?? null;
              const humidityDisplay = todayVals.humidity ?? weatherData?.humidity ?? null;
              return (
                <>
                  <div className="detail-item"><FiWind className="detail-icon" /><div><span className="detail-value">{windDisplay != null ? `${windDisplay} km/h` : '—'}</span><span className="detail-label">Viento</span></div></div>
                  <div className="detail-item"><FiDroplet className="detail-icon" /><div><span className="detail-value">{humidityDisplay != null ? `${humidityDisplay}%` : '—'}</span><span className="detail-label">Humedad</span></div></div>
                </>
              );
            })()}
            <div className="detail-item"><FiEye className="detail-icon" /><div><span className="detail-value">{weatherData?.visibility ?? '—'} km{weatherData?.visibilityEstimated ? ' *' : ''}</span><span className="detail-label">Visibilidad{weatherData?.visibilityEstimated ? ' (estimada)' : ''}</span></div></div>
            <div className="detail-item"><FiThermometer className="detail-icon" /><div><span className="detail-value">{weatherData?.pressure ?? '—'} hPa{weatherData?.pressureEstimated ? ' *' : ''}</span><span className="detail-label">Presión{weatherData?.pressureEstimated ? ' (estimada)' : ''}</span></div></div>
            <div className="detail-item"><FiSun className="detail-icon" /><div><span className="detail-value" style={{color: getUVIndexColor(weatherData?.uvIndex)}}>{weatherData?.uvIndex ?? '—'}{weatherData?.uvEstimated ? ' *' : ''}</span><span className="detail-label">Índice UV{weatherData?.uvEstimated ? ' (estimado)' : ''}</span></div></div>
          </div>
        </div>

        <div className="forecast-section"><h3><FiClock className="section-icon" /> Pronóstico de 5 días</h3><div className="forecast-list">{forecast.map((day, i)=> (
          <div key={i} className="forecast-item">
            <div className="forecast-date"><span className="day">{format(day.date, 'EEE', { locale: es })}</span><span className="date">{format(day.date, 'dd/MM')}</span></div>
            <div className="forecast-icon">{getWeatherIcon(day.icon)}</div>
            <div className="forecast-temps"><span className="high-temp">{day.high ?? '—'}°</span><span className="low-temp">{day.low ?? '—'}°</span></div>
            <div className="forecast-desc">{day.description}</div>
            {day.precipitation > 0 && (<div className="precipitation"><FiDroplet className="precip-icon" />{day.precipitation}mm</div>)}
          </div>
        ))}</div></div>

        <div className="alerts-section">
          <h3>Alertas Meteorológicas y Recomendaciones</h3>
          <div className="alerts-list">
            <div className="alert-item warning"><FiCloudRain className="alert-icon" /><div><h4>Posible lluvia</h4><p>Se esperan precipitaciones ligeras mañana por la tarde</p></div></div>
            <div className="alert-item info"><FiSun className="alert-icon" /><div><h4>Índice UV alto</h4><p>Protección solar recomendada entre 10:00 y 16:00</p></div></div>
          </div>

          <div className="gemini-recommendation">
            <h4>Recomendación IA</h4>
            <div className="gemini-card">
              <div className="gemini-left">
                <div style={{width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8,background:'rgba(0,0,0,0.04)'}}>🤖</div>
              </div>
              <div className="gemini-right">
                <div className="gemini-header">
                  <div className="gemini-provider">{geminiLoading ? 'Generando...' : (geminiRecommendation ? 'Recomendación' : 'IA (local)')}</div>
                  <div className="gemini-actions">
                    {geminiLoading ? <div className="gemini-spinner" aria-hidden></div> : null}
                  </div>
                </div>
                <div className="gemini-text">
                  {geminiError && <div className="error-message">{geminiError}</div>}
                  {!geminiError && !geminiRecommendation && !geminiLoading && <div className="gemini-text" style={{color:'var(--textSecondary)'}}>No hay recomendación aún. Se generará automáticamente al obtener datos del clima o puedes reintentar manualmente.</div>}
                  {geminiRecommendation && <div>{geminiRecommendation}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="step-actions"><button onClick={onNext} className="btn btn-primary next-btn">Continuar al Seguimiento</button></div>
    </div>
  );
};

export default WeatherInfo;
