import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { FiMapPin, FiSearch, FiNavigation } from 'react-icons/fi';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationSelector.css';

// Configurar iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationSelector = ({ onLocationSelect }) => {
  const [position, setPosition] = useState([19.4326, -99.1332]); // Ciudad de México por defecto
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Obtener ubicación del usuario
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setPosition([latitude, longitude]);
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
        }
      );
    }
  }, []);

  // Componente para manejar clics en el mapa
  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        setSelectedLocation({
          lat,
          lng,
          name: `Ubicación seleccionada (${lat.toFixed(4)}, ${lng.toFixed(4)})`
        });
      }
    });
    return null;
  };

  // Buscar ubicación por nombre
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setPosition([lat, lng]);
        setSelectedLocation({
          lat,
          lng,
          name: result.display_name
        });
      }
    } catch (error) {
      console.error('Error buscando ubicación:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Usar ubicación actual
  const useCurrentLocation = () => {
    if (userLocation) {
      setPosition(userLocation);
      setSelectedLocation({
        lat: userLocation[0],
        lng: userLocation[1],
        name: 'Mi ubicación actual'
      });
    }
  };

  // Confirmar ubicación seleccionada
  const confirmLocation = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
    }
  };

  return (
    <div className="step-container">
      <div className="step-header">
        <h1 className="step-title">Selecciona tu ubicación</h1>
        <p className="step-subtitle">
          Busca o haz clic en el mapa para seleccionar tu ubicación
        </p>
      </div>

      <div className="location-selector">
        <div className="search-section">
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ciudad, dirección..."
              className="search-input"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="btn btn-primary search-btn"
            >
              {isLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          
          <button
            onClick={useCurrentLocation}
            disabled={!userLocation}
            className="btn btn-outline location-btn"
          >
            <FiNavigation className="btn-icon" />
            Usar mi ubicación
          </button>
        </div>

        <div className="map-container">
          <MapContainer
            center={position}
            zoom={13}
            style={{ height: '400px', width: '100%' }}
            className="map"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapClickHandler />
            <Marker position={position}>
              <Popup>
                <div className="marker-popup">
                  <FiMapPin className="popup-icon" />
                  <p>{selectedLocation?.name || 'Ubicación seleccionada'}</p>
                  <small>
                    {position[0].toFixed(4)}, {position[1].toFixed(4)}
                  </small>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        {selectedLocation && (
          <div className="location-info">
            <div className="location-details">
              <FiMapPin className="location-icon" />
              <div>
                <h3>{selectedLocation.name}</h3>
                <p>
                  Lat: {selectedLocation.lat.toFixed(4)}, 
                  Lng: {selectedLocation.lng.toFixed(4)}
                </p>
              </div>
            </div>
            <button
              onClick={confirmLocation}
              className="btn btn-primary confirm-btn"
            >
              Confirmar ubicación
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationSelector;
