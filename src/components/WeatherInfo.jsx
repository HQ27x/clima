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

  // Simular datos de clima (en una app real, usarías una API como OpenWeatherMap)
  useEffect(() => {
    let aborted = false;

    const fetchWeatherData = async () => {
      setLoading(true);
      setError('');
      try {
        // Try local proxy first
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
            let lat = location?.lat || location?.latitude || location?.coords?.lat || location?.coords?.latitude;
            let lng = location?.lng || location?.lon || location?.longitude || location?.coords?.lng || location?.coords?.longitude;
            // Fallback to last saved location in localStorage
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

        let data = null;
        if (lat != null && lng != null) {
          try {
            const resp = await fetch(`http://localhost:4003/weather?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (!resp.ok) throw new Error(`Upstream ${resp.status}`);
            data = await resp.json();
          } catch (err) {
            // fallback to mock below
            console.warn('Failed to fetch local weather proxy, falling back to mock:', err.message || err);
            data = null;
          }
        }

        if (!data) {
          // Fallback: use the previous mock to keep UI responsive
          data = {
            current: {
              temperature: 22,
              feelsLike: 25,
              humidity: 65,
              windSpeed: 12,
              visibility: 10,
              pressure: 1013,
              description: 'Parcialmente nublado',
              icon: 'partly-cloudy',
              uvIndex: 6
            },
            forecast: [
              { date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), high: 26, low: 18, description: 'Soleado', icon: 'sunny', precipitation: 0 },
              { date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), high: 24, low: 16, description: 'Lluvia ligera', icon: 'rainy', precipitation: 2 },
              { date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), high: 28, low: 20, description: 'Nublado', icon: 'cloudy', precipitation: 0 },
              { date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), high: 30, low: 22, description: 'Soleado', icon: 'sunny', precipitation: 0 },
              { date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), high: 27, low: 19, description: 'Tormenta', icon: 'stormy', precipitation: 8 }
            ]
          };
        }

        if (aborted) return;

        setWeatherData(data.current ?? null);
        // Normalize forecast items to ensure date is a Date object and fields exist
        const rawForecast = Array.isArray(data.forecast) ? data.forecast : (data.short_term_forecast_5_days ? data.short_term_forecast_5_days.map(d => ({ date: d.date, high: d.temp_max_celsius || d.temp_max, low: d.temp_min_celsius || d.temp_min, description: d.condition || d.description, icon: d.icon })) : []);
        const normalized = (rawForecast || []).map(item => {
          let dt = item.date;
          try{ dt = dt ? new Date(dt) : new Date(); }catch(_){ dt = new Date(); }
          return {
            date: dt,
            high: typeof item.high === 'number' ? item.high : null,
            low: typeof item.low === 'number' ? item.low : null,
            description: item.description || '',
            precipitation: item.precipitation || 0,
            icon: item.icon || null
          };
        });
        setForecast(normalized);
      } catch (err) {
        if (err.name === 'AbortError') {
          setError('La petición del clima tardó demasiado y fue cancelada.');
        } else {
          console.error('Error fetching weather:', err);
          setError('Error al cargar datos del clima');
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    if (location) {
      fetchWeatherData();
    } else {
      // No location -> don't show spinner, clear data
      setWeatherData(null);
      setForecast([]);
      setLoading(false);
    }

    return () => {
      aborted = true;
    };
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
        <p className="step-subtitle">
          Condiciones actuales y pronóstico para {location?.name || (localStorage.getItem('clima_last_location_v1') ? 'Ubicación guardada' : 'Ubicación no seleccionada')}
        </p>
      </div>

      <div className="weather-content">
        {/* Clima actual */}
        <div className="current-weather">
          <div className="weather-main">
            <div className="weather-icon-large">
              {getWeatherIcon(weatherData?.icon)}
            </div>
            <div className="weather-temp">
              <span className="temperature">{weatherData?.temperature}°</span>
              <span className="feels-like">
                Sensación térmica {weatherData?.feelsLike}°
              </span>
            </div>
            <div className="weather-description">
              <h3>{weatherData?.description}</h3>
              <p>{format(new Date(), 'EEEE, dd MMMM', { locale: es })}</p>
            </div>
          </div>

          <div className="weather-details">
            <div className="detail-item">
              <FiWind className="detail-icon" />
              <div>
                <span className="detail-value">{weatherData?.windSpeed} km/h</span>
                <span className="detail-label">Viento</span>
              </div>
            </div>
            <div className="detail-item">
              <FiDroplet className="detail-icon" />
              <div>
                <span className="detail-value">{weatherData?.humidity}%</span>
                <span className="detail-label">Humedad</span>
              </div>
            </div>
            <div className="detail-item">
              <FiEye className="detail-icon" />
              <div>
                <span className="detail-value">{weatherData?.visibility} km</span>
                <span className="detail-label">Visibilidad</span>
              </div>
            </div>
            <div className="detail-item">
              <FiThermometer className="detail-icon" />
              <div>
                <span className="detail-value">{weatherData?.pressure} hPa</span>
                <span className="detail-label">Presión</span>
              </div>
            </div>
            <div className="detail-item">
              <FiSun className="detail-icon" />
              <div>
                <span 
                  className="detail-value"
                  style={{ color: getUVIndexColor(weatherData?.uvIndex) }}
                >
                  {weatherData?.uvIndex}
                </span>
                <span className="detail-label">Índice UV</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pronóstico de 5 días */}
        <div className="forecast-section">
          <h3>
            <FiClock className="section-icon" />
            Pronóstico de 5 días
          </h3>
          <div className="forecast-list">
            {forecast.map((day, index) => (
              <div key={index} className="forecast-item">
                <div className="forecast-date">
                  <span className="day">
                    {format(day.date, 'EEE', { locale: es })}
                  </span>
                  <span className="date">
                    {format(day.date, 'dd/MM')}
                  </span>
                </div>
                <div className="forecast-icon">
                  {getWeatherIcon(day.icon)}
                </div>
                <div className="forecast-temps">
                  <span className="high-temp">{day.high}°</span>
                  <span className="low-temp">{day.low}°</span>
                </div>
                <div className="forecast-desc">
                  {day.description}
                </div>
                {day.precipitation > 0 && (
                  <div className="precipitation">
                    <FiDroplet className="precip-icon" />
                    {day.precipitation}mm
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Alertas meteorológicas */}
        <div className="alerts-section">
          <h3>Alertas Meteorológicas</h3>
          <div className="alerts-list">
            <div className="alert-item warning">
              <FiCloudRain className="alert-icon" />
              <div>
                <h4>Posible lluvia</h4>
                <p>Se esperan precipitaciones ligeras mañana por la tarde</p>
              </div>
            </div>
            <div className="alert-item info">
              <FiSun className="alert-icon" />
              <div>
                <h4>Índice UV alto</h4>
                <p>Protección solar recomendada entre 10:00 y 16:00</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button
          onClick={onNext}
          className="btn btn-primary next-btn"
        >
          Continuar al Seguimiento
        </button>
      </div>
    </div>
  );
};

export default WeatherInfo;
