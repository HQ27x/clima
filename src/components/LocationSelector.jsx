import React, { useState, useEffect, useRef } from 'react';
import { FiMapPin, FiSearch, FiNavigation, FiCheck } from 'react-icons/fi';
import './LocationSelector.css';

const DEFAULT_CENTER = { lat: 19.4326, lng: -99.1332 };

const LocationSelector = ({ onLocationSelect }) => {
  const mapContainerRef = useRef(null);
  const pendingRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const mapReadyRef = useRef(false);
  const listenersRef = useRef([]);
  const watchIdRef = useRef(null);

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('Preparando…');
  const [coordsText, setCoordsText] = useState('—');
  const [cityText, setCityText] = useState('—');
  const [accuracyText, setAccuracyText] = useState('—');
  const [sourceText, setSourceText] = useState('—');
  const [userLocation, setUserLocation] = useState(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  function getCurrentPositionAsync(options = {}){
    return new Promise((resolve, reject)=>{
      if(!navigator.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  function getBetterPositionViaWatch(timeout = 30000){
    return new Promise((resolve)=>{
      if(!navigator.geolocation){ resolve(null); return; }
      let best = null;
      const id = navigator.geolocation.watchPosition((pos)=>{
        if(pos && pos.coords && typeof pos.coords.accuracy === 'number'){
          if(!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        }
        if(pos.coords && pos.coords.accuracy && pos.coords.accuracy <= 5000){
          try{ navigator.geolocation.clearWatch(id); }catch(e){}
          resolve(pos);
        }
      }, (err)=>{
        console.warn('watchPosition error', err);
      }, { enableHighAccuracy:true, maximumAge:0, timeout:timeout });

      setTimeout(()=>{
        try{ navigator.geolocation.clearWatch(id); }catch(e){}
        resolve(best);
      }, timeout);
    });
  }

  async function reverseGeocode(lat, lon){
    try{
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=es`;
      const res = await fetch(url);
      if(!res.ok) return null;
      const data = await res.json();
      const place = data.address && (data.address.city || data.address.town || data.address.village || data.address.hamlet || data.address.county || data.display_name);
      return place || data.display_name || null;
    }catch(e){ console.error('Reverse geocode error', e); return null; }
  }

  function saveLastLocation(obj){
    try{
      const toSave = {
        latitude: typeof obj.latitude === 'number' ? obj.latitude : (obj.lat || obj.latitude),
        longitude: typeof obj.longitude === 'number' ? obj.longitude : (obj.lng || obj.lon || obj.longitude),
        accuracy: obj.accuracy ?? obj.acc ?? 0,
        city: obj.city || obj.name || null,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('clima_last_location_v1', JSON.stringify(toSave));
    }catch(e){ console.warn('saveLastLocation failed', e); }
  }

  async function loadGoogleMaps(apiKey){
    if(!apiKey) throw new Error('No API key');
    if(window.google && window.google.maps) return window.google.maps;
    return new Promise((resolve, reject)=>{
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
      s.async = true;
      s.defer = true;
      s.onload = ()=> resolve(window.google.maps);
      s.onerror = (e)=> reject(e);
      document.head.appendChild(s);
    });
  }

  async function initMap(){
    try{
      const key = window.GOOGLE_MAPS_API_KEY || process.env.REACT_APP_GOOGLE_MAPS_API_KEY || null;
      if(!key){ setStatusText('Google Maps: API key no encontrada. Añádela en window.GOOGLE_MAPS_API_KEY o REACT_APP_GOOGLE_MAPS_API_KEY'); return; }
      await loadGoogleMaps(key);
      if(mapContainerRef.current){
        mapInstance.current = new window.google.maps.Map(mapContainerRef.current, { center: DEFAULT_CENTER, zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          scaleControl: false,
          clickableIcons: false
        });
        markerRef.current = new window.google.maps.Marker({ map: mapInstance.current, position: DEFAULT_CENTER });
        circleRef.current = null;
        mapReadyRef.current = true;

        // attach click handler to allow selecting location by clicking on the map
        const clickListener = mapInstance.current.addListener('click', (e)=>{
          try{
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            const name = `Ubicación seleccionada (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            setSelectedLocation({ lat, lng, name });
            setCoordsText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            setSourceText('MAP');
            updateMapMarker(lat, lng, 0);
            reverseGeocode(lat,lng).then(place=>{
              const city = place || 'No disponible';
              setCityText(city);
              // persist last location
              saveLastLocation({ latitude: lat, longitude: lng, accuracy: 0, city });
            });
          }catch(err){ console.warn('map click handler failed', err); }
        });
        listenersRef.current.push(clickListener);

  // restore stored location (if any) after map is ready
        try{
          const raw = localStorage.getItem('clima_last_location_v1');
          if(raw){
            const obj = JSON.parse(raw);
            if(obj && typeof obj.latitude === 'number' && typeof obj.longitude === 'number'){
              setCoordsText(`${obj.latitude.toFixed(6)}, ${obj.longitude.toFixed(6)}`);
              setAccuracyText(obj.accuracy ? `${Math.round(obj.accuracy)} m` : '—');
              setCityText(obj.city || 'No disponible');
              updateMapMarker(obj.latitude, obj.longitude, obj.accuracy);
              try{ mapInstance.current.setCenter({ lat: obj.latitude, lng: obj.longitude }); mapInstance.current.setZoom(12); }catch(_){ }
            }
          }
        }catch(e){ /* ignore */ }

        // trigger a resize shortly after init so Google Maps computes layout correctly
        setTimeout(()=>{
          try{
            if(window.google && window.google.maps && mapInstance.current){
              window.google.maps.event.trigger(mapInstance.current, 'resize');
              // re-center to last marker
              if(markerRef.current && markerRef.current.getPosition){
                const p = markerRef.current.getPosition();
                mapInstance.current.setCenter(p);
              } else {
                mapInstance.current.setCenter(DEFAULT_CENTER);
              }
            }
          }catch(e){/* ignore */}
        }, 200);

        // apply any pending marker update that happened before map was ready
        if(pendingRef.current){
          const { lat, lng, acc } = pendingRef.current;
          pendingRef.current = null;
          try{ updateMapMarker(lat, lng, acc); }catch(_){ }
        }

        // install a ResizeObserver so when the container becomes visible or resizes we trigger a resize on the map
        try{
          if(window.ResizeObserver && mapContainerRef.current){
            resizeObserverRef.current = new ResizeObserver(()=>{
              try{
                if(window.google && window.google.maps && mapInstance.current){
                  window.google.maps.event.trigger(mapInstance.current, 'resize');
                  // keep center on marker if present
                  if(markerRef.current && markerRef.current.getPosition){
                    const p = markerRef.current.getPosition();
                    mapInstance.current.setCenter(p);
                  }
                }
              }catch(_){ }
            });
            resizeObserverRef.current.observe(mapContainerRef.current);
          }
        }catch(_){ }
      }
    }catch(e){
      console.error('Failed to init Google Maps', e);
      setStatusText('No se pudo inicializar Google Maps. Revisa la consola. Usando fallback embebido.');
      setUseIframeFallback(true);
    }
  }

  function updateMapMarker(lat, lng, acc){
    const latLng = { lat, lng };
    try{
      // If the map isn't ready yet, store the requested marker and apply it when the map initializes
      if(!mapInstance.current){ pendingRef.current = { lat, lng, acc }; return; }
      if(markerRef.current){ markerRef.current.setPosition(latLng); }
      if(!markerRef.current && mapInstance.current){ markerRef.current = new window.google.maps.Marker({ map: mapInstance.current, position: latLng }); }
      if(acc && mapInstance.current){
        if(!circleRef.current){
          circleRef.current = new window.google.maps.Circle({ strokeColor: '#4facfe', strokeOpacity: 0.6, strokeWeight: 1, fillColor: '#4facfe', fillOpacity: 0.12, map: mapInstance.current, center: latLng, radius: Math.max(acc,0) });
        } else {
          circleRef.current.setCenter(latLng);
          circleRef.current.setRadius(Math.max(acc,0));
        }
      }
      try{ mapInstance.current && mapInstance.current.setCenter(latLng); }catch(e){}
    }catch(e){ console.warn('Google Maps update failed', e); }
  }

  function buildEmbedUrl(lat, lng, zoom = 12){
    // Use the simple google maps embed query (no API key required)
    // This generates an embeddable map centered on the coords.
    return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
  }

  async function onLocationSuccess(position, source = 'gps', displayMin = 0){
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const acc = position.coords.accuracy;
    console.log('Location got', lat, lng, acc, 'source=', source);

    if(source !== 'ip'){
      if(typeof acc === 'number' && acc > 5000){
        setStatusText(`Precisión baja (${Math.round(acc)} m). Intentando mejorar a ≤ 5000 m...`);
        const better = await getBetterPositionViaWatch(15000);
        if(better && better.coords && better.coords.accuracy <= acc){
          position = better;
        }
      }
    }

    const finalLat = position.coords.latitude;
    const finalLon = position.coords.longitude;
    const finalAcc = position.coords.accuracy;

    setCoordsText(`${finalLat.toFixed(6)}, ${finalLon.toFixed(6)}`);
    setAccuracyText(finalAcc ? `${Math.round(finalAcc)} m` : '—');
    setSourceText((source || 'gps').toUpperCase());
    setStatusText('Ubicación obtenida');

    updateMapMarker(finalLat, finalLon, Math.max(finalAcc || 0, displayMin || 0));

    reverseGeocode(finalLat, finalLon).then(place=>{ setCityText(place || 'No disponible'); });

    setSelectedLocation({ lat: finalLat, lng: finalLon, name: 'Ubicación seleccionada' });

    // Persist last good location
    try{
      // Try to get place name and then save
      const place = await reverseGeocode(finalLat, finalLon).catch(()=>null);
      const city = place || cityText || null;
      saveLastLocation({ latitude: finalLat, longitude: finalLon, accuracy: finalAcc, city });
      // ensure cityText updated (reverseGeocode called earlier in code path too)
      if(place) setCityText(place);
    }catch(e){ /* ignore */ }
  }

  function onLocationError(err){
    console.warn('Geolocation error', err);
    if(err && err.code === 1) setStatusText('Permiso denegado. Activa la ubicación y vuelve a intentar.');
    else if(err && err.code === 2) setStatusText('Posición no disponible.');
    else if(err && err.code === 3) setStatusText('Tiempo de espera agotado.');
    else setStatusText('Error al obtener ubicación: '+(err && err.message ? err.message : JSON.stringify(err)));
  }

  async function askLocation(){
    setStatusText('Preparando solicitud de ubicación…');
    const isLocalhost = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1');
    const isSecure = window.isSecureContext;
    if(!isSecure && !isLocalhost){
      setStatusText('Geolocalización requiere HTTPS o localhost. Abre en http://localhost o usa HTTPS.');
      return;
    }

    try{
      if(navigator.permissions && navigator.permissions.query){
        const p = await navigator.permissions.query({ name: 'geolocation' });
        if(p.state === 'granted'){
          setStatusText('Permiso concedido. Obteniendo ubicación…');
          try{ const pos = await getCurrentPositionAsync({ enableHighAccuracy:true, timeout:20000, maximumAge:0 }); onLocationSuccess(pos,'gps',1000); }
          catch(e){ onLocationError(e); }
          return;
        } else if(p.state === 'prompt'){
          setStatusText('El navegador pedirá permiso de ubicación. Por favor acepta.');
          try{ const pos = await getCurrentPositionAsync({ enableHighAccuracy:true, timeout:20000, maximumAge:0 }); onLocationSuccess(pos,'gps',1000); }
          catch(e){ onLocationError(e); }
          return;
        } else if(p.state === 'denied'){
          setStatusText('Permiso de ubicación denegado previamente. Habilítalo en la configuración del sitio.');
          return;
        }
      }
    }catch(e){ console.warn('Permissions API unavailable', e); }

    setStatusText('Solicitando ubicación…');
    try{
      const pos = await getCurrentPositionAsync({ enableHighAccuracy:true, timeout:8000, maximumAge:0 });
      onLocationSuccess(pos,'gps',1000);
    }catch(e){
      console.warn('getCurrentPosition error', e);
      if(e && e.code !== 1){
        try{ await ipFallback(1000); }catch(_){ }
      } else {
        onLocationError(e);
      }
    }
  }

  async function ipFallback(displayMin = 0){
    setStatusText('Intentando ubicar por IP...');
    try{
      const res = await fetch('https://ipapi.co/json/');
      if(!res.ok) throw new Error('IP API error');
      const d = await res.json();
      const lat = parseFloat(d.latitude);
      const lon = parseFloat(d.longitude);
      if(!lat || !lon) throw new Error('No coords from IP');
      setStatusText('Ubicación por IP estimada');
      await onLocationSuccess({ coords: { latitude: lat, longitude: lon, accuracy: d.latitude ? 50000 : 0 } }, 'ip', displayMin);
    }catch(e){ setStatusText('No se pudo obtener ubicación por IP'); }
  }

  async function manualSearch(q, displayMin = 0){
    if(!q) return setStatusText('Ingresa un término de búsqueda');
    setStatusText(`Buscando "${q}"...`);
    try{
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&accept-language=es`;
      const res = await fetch(url);
      if(!res.ok) throw new Error('Search error');
      const arr = await res.json();
      if(!arr || !arr.length) return setStatusText('No se encontraron resultados');
      const it = arr[0];
      const lat = parseFloat(it.lat);
      const lon = parseFloat(it.lon);
      await onLocationSuccess({ coords: { latitude: lat, longitude: lon, accuracy: 1000 } }, 'manual', displayMin);
    }catch(e){ setStatusText('Error en búsqueda'); console.error(e); }
  }

  const handleSearch = async ()=>{
    if(!searchQuery.trim()) return;
    setIsLoading(true);
    await manualSearch(searchQuery.trim(), 1000);
    setIsLoading(false);
  };

  const useCurrentLocation = async ()=>{
    try{
      const pos = await getCurrentPositionAsync({ enableHighAccuracy:true, timeout:10000 });
      setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      await onLocationSuccess(pos, 'gps', 1000);
    }catch(e){ onLocationError(e); }
  };

  const confirmLocation = ()=>{
    if(selectedLocation){
      try{
        // persist on explicit confirm as well
        // Prefer reverse-geocoded cityText when available to avoid saving generic labels like 'Ubicación seleccionada'
        saveLastLocation({ latitude: selectedLocation.lat || selectedLocation.latitude, longitude: selectedLocation.lng || selectedLocation.longitude, accuracy: 0, city: cityText || selectedLocation.name });
        // show a brief confirmation message
        setSavedNotice(true);
        setTimeout(()=>setSavedNotice(false), 3000);
      }catch(e){ /* ignore */ }
      if(onLocationSelect) onLocationSelect({
        lat: selectedLocation.lat || selectedLocation.latitude,
        lng: selectedLocation.lng || selectedLocation.longitude,
        // prefer human-readable cityText when available
        name: cityText || selectedLocation.name || `(${(selectedLocation.lat||selectedLocation.latitude).toFixed ? (selectedLocation.lat||selectedLocation.latitude).toFixed(4) : selectedLocation.lat}, ${(selectedLocation.lng||selectedLocation.longitude).toFixed ? (selectedLocation.lng||selectedLocation.longitude).toFixed(4) : selectedLocation.lng})`
      });
    }
  };

  const toggleWatch = (checked)=>{
    if(checked){
      if(!navigator.geolocation){ setStatusText('Geolocalización no soportada'); return; }
      watchIdRef.current = navigator.geolocation.watchPosition((pos)=>onLocationSuccess(pos,'gps'), onLocationError, { enableHighAccuracy:true, timeout:10000, maximumAge:0 });
      setStatusText('Observando ubicación...');
    } else {
      if(watchIdRef.current){ navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      setStatusText('Observación detenida');
    }
  };

  useEffect(()=>{ initMap(); }, []);

  // removed storage restore here; it's handled during initMap once the map is ready

  useEffect(()=>{
    return ()=>{
      try{ if(watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); }catch(_){ }
      // remove map listeners
      try{
        if(listenersRef.current && listenersRef.current.length && window.google && window.google.maps){
          listenersRef.current.forEach(l=>{ if(l && l.remove) l.remove(); });
          listenersRef.current = [];
        }
      }catch(_){ }
    };
  }, []);

  return (
    <div className="step-container">
      <div className="step-header">
        <h1 className="step-title">Selecciona tu ubicación</h1>
        <p className="step-subtitle">Busca o usa tu ubicación para centrar el mapa.</p>
      </div>

      <div className="location-selector">
        <div className="search-section">
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e)=>setSearchQuery(e.target.value)}
              placeholder="Buscar ciudad, dirección..."
              className="search-input"
              onKeyPress={(e)=> e.key === 'Enter' && handleSearch() }
            />
            <button onClick={handleSearch} disabled={isLoading} className="btn search-btn">{isLoading ? 'Buscando...' : 'Buscar'}</button>
          </div>

          <button onClick={useCurrentLocation} className="btn btn-outline location-btn"><FiNavigation className="btn-icon" /> Usar mi ubicación</button>

          <label style={{display:'flex',alignItems:'center',gap:8}}>
            <input type="checkbox" id="watchPos" onChange={(e)=>toggleWatch(e.target.checked)} /> <span className="muted">Seguir ubicación</span>
          </label>
        </div>

        <div ref={mapContainerRef} className="map-container" style={{position:'relative', height: '400px', minHeight: '320px'}}>
          {useIframeFallback && (
            <iframe
              title="map-embed"
              src={buildEmbedUrl(selectedLocation ? selectedLocation.lat : DEFAULT_CENTER.lat, selectedLocation ? selectedLocation.lng : DEFAULT_CENTER.lng)}
              style={{border:0,width:'100%',height:'100%'}}
              loading="lazy"
            />
          )}
          {useIframeFallback && (
            // overlay to hide the embedded iframe box (e.g. "Ampliar mapa / Cómo llegar")
            <div style={{position:'absolute', left:8, top:8, width:160, height:48, background:'rgba(0,0,0,0)', pointerEvents:'auto'}} aria-hidden="true" />
          )}
        </div>

        <div className="location-info">
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <FiMapPin className="location-icon" />
              <div>
                <h3 style={{margin:0}}>{selectedLocation?.name || 'Ubicación seleccionada'}</h3>
                <p style={{margin:0,color:'#9CA3AF'}}>{coordsText}</p>
              </div>
            </div>
            <div style={{marginTop:12}}>
              <div className="field"><strong>Ciudad / Lugar:</strong> <span>{cityText}</span></div>
              <div className="field"><strong>Fuente:</strong> <span>{sourceText}</span></div>
              <div className="field"><strong>Precisión (m):</strong> <span>{accuracyText}</span></div>
              <div className="field"><strong>Estado:</strong> <span>{statusText}</span></div>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button onClick={confirmLocation} className="btn btn-primary confirm-btn">Confirmar ubicación</button>
            {savedNotice && (
              <div className="alert-modal">
    <FiCheck style={{marginRight:8, fontSize:20}} />
    Ubicación guardada
  </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSelector;
