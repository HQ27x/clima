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

        // 1) try remote trained API (may be slow)
        if(lat != null && lng != null){
          try{
            const fusionController = new AbortController();
            const fusionTimeout = setTimeout(()=>fusionController.abort(), 35000);
            const fusionUrl = `https://api-fusion-34si.onrender.com/predict/full?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
            const r = await fetch(fusionUrl, { signal: fusionController.signal });
            clearTimeout(fusionTimeout);
            if(r.ok) { data = await r.json(); setModelSource('fusion'); }
          }catch(err){ console.warn('Fusion API failed', err && err.message ? err.message : err); }
        }

        // 2) try local proxy
        if(!data && lat != null && lng != null){
          try{
            const localController = new AbortController();
            const localTimeout = setTimeout(()=>localController.abort(), 20000);
            const r2 = await fetch(`http://localhost:4003/weather?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`, { signal: localController.signal });
            clearTimeout(localTimeout);
            if(r2.ok){ data = await r2.json(); setModelSource('local'); }
          }catch(err){ console.warn('Local proxy failed', err && err.message ? err.message : err); }
        }

        // 3) fallback mock
        if(!data){ setModelSource('mock'); data = {
          current: { temperature:22, feelsLike:25, humidity:65, windSpeed:12, visibility:10, pressure:1013, description:'Parcialmente nublado', icon:'partly-cloudy', uvIndex:6 },
          short_term_forecast_5_days: [
            { day_name:'mañana', date: new Date(Date.now()+1*86400000).toISOString(), condition:'Soleado', temp_min_celsius:18, temp_max_celsius:26, humidity:60, wind_speed_ms:3 },
            { day_name:'día2', date: new Date(Date.now()+2*86400000).toISOString(), condition:'Lluvia ligera', temp_min_celsius:16, temp_max_celsius:24, humidity:70, wind_speed_ms:4 },
            { day_name:'día3', date: new Date(Date.now()+3*86400000).toISOString(), condition:'Nublado', temp_min_celsius:20, temp_max_celsius:28, humidity:65, wind_speed_ms:5 },
            { day_name:'día4', date: new Date(Date.now()+4*86400000).toISOString(), condition:'Soleado', temp_min_celsius:22, temp_max_celsius:30, humidity:50, wind_speed_ms:3 },
            { day_name:'día5', date: new Date(Date.now()+5*86400000).toISOString(), condition:'Tormenta', temp_min_celsius:19, temp_max_celsius:27, humidity:80, wind_speed_ms:6 }
          ]
        } }

        if(aborted) return;

        // Normalize shapes
        const cur = data.current ?? data.current_weather ?? data;
        setWeatherData(cur || null);

        const rawForecast = Array.isArray(data.forecast) ? data.forecast : (Array.isArray(data.short_term_forecast_5_days) ? data.short_term_forecast_5_days : (Array.isArray(data.forecast_days) ? data.forecast_days : []));
        const normalized = (rawForecast || []).slice(0,5).map(it => {
          const dateStr = it.date || it.dt || it.datetime || it.day || new Date().toISOString();
          const dt = (() => { try{ return new Date(dateStr); }catch(e){ return new Date(); } })();
          return {
            date: dt,
            high: it.temp_max_celsius ?? it.high ?? it.temp?.max ?? it.max ?? null,
            low: it.temp_min_celsius ?? it.low ?? it.temp?.min ?? it.min ?? null,
            description: it.condition ?? it.description ?? it.weather ?? '',
            precipitation: it.precipitation ?? it.rain ?? 0,
            icon: it.icon ?? null
          };
        });
        setForecast(normalized);

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
            <div className="weather-temp"><span className="temperature">{weatherData?.temperature ?? '—'}°</span><span className="feels-like">Sensación térmica {weatherData?.feelsLike ?? '—'}°</span></div>
            <div className="weather-description"><h3>{weatherData?.description ?? '—'}</h3><p>{format(new Date(), 'EEEE, dd MMMM', { locale: es })}</p></div>
          </div>

          <div className="weather-details">
            <div className="detail-item"><FiWind className="detail-icon" /><div><span className="detail-value">{weatherData?.windSpeed ?? '—'} km/h</span><span className="detail-label">Viento</span></div></div>
            <div className="detail-item"><FiDroplet className="detail-icon" /><div><span className="detail-value">{weatherData?.humidity ?? '—'}%</span><span className="detail-label">Humedad</span></div></div>
            <div className="detail-item"><FiEye className="detail-icon" /><div><span className="detail-value">{weatherData?.visibility ?? '—'} km</span><span className="detail-label">Visibilidad</span></div></div>
            <div className="detail-item"><FiThermometer className="detail-icon" /><div><span className="detail-value">{weatherData?.pressure ?? '—'} hPa</span><span className="detail-label">Presión</span></div></div>
            <div className="detail-item"><FiSun className="detail-icon" /><div><span className="detail-value" style={{color: getUVIndexColor(weatherData?.uvIndex)}}>{weatherData?.uvIndex ?? '—'}</span><span className="detail-label">Índice UV</span></div></div>
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

        <div className="alerts-section"><h3>Alertas Meteorológicas</h3><div className="alerts-list"><div className="alert-item warning"><FiCloudRain className="alert-icon" /><div><h4>Posible lluvia</h4><p>Se esperan precipitaciones ligeras mañana por la tarde</p></div></div><div className="alert-item info"><FiSun className="alert-icon" /><div><h4>Índice UV alto</h4><p>Protección solar recomendada entre 10:00 y 16:00</p></div></div></div></div>
      </div>

      <div className="step-actions"><button onClick={onNext} className="btn btn-primary next-btn">Continuar al Seguimiento</button></div>
    </div>
  );
};

export default WeatherInfo;
