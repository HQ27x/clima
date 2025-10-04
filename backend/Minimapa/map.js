// map.js — lógica del minimapa separada
(function(){
  try{
    // Using Google Maps only
    const statusEl = document.getElementById('status');
    const coordsEl = document.getElementById('coords');
    const cityEl = document.getElementById('city');
    const accuracyEl = document.getElementById('accuracy');
    const sourceEl = document.getElementById('source');

  // Google Maps objects
  let gmap = null;
  let gmarker = null;
  let gcircle = null;
  let lastPosition = null;
  const STORAGE_KEY = 'clima_last_location_v1';
//asdasda
  function showError(msg){
    statusEl.textContent = msg;
    statusEl.style.color = 'crimson';
  }

  const DESIRED_ACCURACY = 5000; // meters
  const AUTO_WATCH = true; // start watchPosition automatically after first good GPS fix
  const INITIAL_TIMEOUT_MS = 8000; // initial wait before falling back to IP (shorter)

  // (Leaflet removed) use Google Maps circle `gcircle` instead ss

  async function reverseGeocode(lat, lon){
    try{
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=es`;
      const res = await fetch(url);
      if(!res.ok) return null;
      const data = await res.json();
      const place = data.address && (data.address.city || data.address.town || data.address.village || data.address.hamlet || data.address.county || data.display_name);
      return place || data.display_name || null;
    }catch(e){
      console.error('Reverse geocode error', e);
      return null;
    }
  }

  async function getBetterPositionViaWatch(timeout = 30000){
    return new Promise((resolve)=>{
      if(!navigator.geolocation){ resolve(null); return; }
      let best = null;
      let samples = 0;
      const id = navigator.geolocation.watchPosition((pos)=>{
        samples++;
        // ignore readings with no accuracy
        if(pos && pos.coords && typeof pos.coords.accuracy === 'number'){
          if(!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        }
        // if we reach desired accuracy resolve early
        if(pos.coords && pos.coords.accuracy && pos.coords.accuracy <= DESIRED_ACCURACY){
          try{ navigator.geolocation.clearWatch(id); }catch(e){}
          resolve(pos);
        }
      }, (err)=>{
        console.warn('watchPosition error', err);
      }, { enableHighAccuracy:true, maximumAge:0, timeout:timeout });

      // after timeout, clear watch and return best found (if any)
      setTimeout(()=>{
        try{ navigator.geolocation.clearWatch(id); }catch(e){}
        resolve(best);
      }, timeout);
    });
  }

  function getCurrentPositionAsync(options = {}){
    return new Promise((resolve, reject)=>{
      if(!navigator.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  async function onLocationSuccess(position, source = 'gps', displayMin = 0){
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const acc = position.coords.accuracy;
    console.log('Location got', lat, lon, acc, 'source=', source);

    // If position came from IP fallback, don't try to improve via watchPosition
    if(source !== 'ip'){
      // If accuracy is poor, try to improve using watchPosition
      if(typeof acc === 'number' && acc > DESIRED_ACCURACY){
        statusEl.textContent = `Precisión baja (${Math.round(acc)} m). Intentando mejorar a ≤ ${DESIRED_ACCURACY} m...`;
        const better = await getBetterPositionViaWatch(15000);
        if(better && better.coords && better.coords.accuracy <= acc){
          // use better if it's actually better
          console.log('Found better position via watch', better.coords.accuracy);
          position = better;
        } else {
          console.log('No mejor posición obtenida, aceptando la actual');
        }
      }
    } else {
      console.log('Position from IP fallback; skipping watchPosition improvements');
    }

  const finalLat = position.coords.latitude;
  const finalLon = position.coords.longitude;
  const finalAcc = position.coords.accuracy;

  // store last position and source
  lastPosition = position;
  if(sourceEl) sourceEl.textContent = (source || 'gps').toUpperCase();

    // persist simplified location + city to localStorage for later use
    try{
      const toStore = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp || Date.now(),
        source: source || 'gps',
        city: null // will be set by reverseGeocode promise below
      };
      // write initial record (city filled in after reverseGeocode)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    }catch(e){ console.warn('Could not write location to localStorage', e); }

    statusEl.textContent = 'Ubicación obtenida';
    statusEl.style.color = '';
    coordsEl.textContent = `${finalLat.toFixed(6)}, ${finalLon.toFixed(6)}`;
  // determine displayed radius: at least displayMin
  const displayRadius = Math.max((typeof finalAcc === 'number' ? finalAcc : 0), (displayMin || 0));
  accuracyEl.textContent = `${Math.round(displayRadius)} m`;

    // Update textual UI first
    if(coordsEl) coordsEl.textContent = `${finalLat.toFixed(6)}, ${finalLon.toFixed(6)}`;

    // Update Google Maps view
    try{
      if(window.google && window.google.maps && gmap){
        const latLng = { lat: finalLat, lng: finalLon };
        if(!gmarker){
          gmarker = new google.maps.Marker({ position: latLng, map: gmap, title: 'Tu ubicación' });
        } else {
          gmarker.setPosition(latLng);
        }
        // circle for accuracy
        if(!gcircle){
          gcircle = new google.maps.Circle({ strokeColor: '#4facfe', strokeOpacity: 0.6, strokeWeight: 1, fillColor: '#4facfe', fillOpacity: 0.12, map: gmap, center: latLng, radius: displayRadius });
        } else {
          gcircle.setCenter(latLng);
          gcircle.setRadius(displayRadius);
        }
        try{ gmap.setCenter(latLng); gmap.setZoom(displayRadius <= DESIRED_ACCURACY ? 13 : 12); }catch(e){/* ignore */}
      } else {
        if(statusEl) statusEl.textContent = `Ubicación: ${finalLat.toFixed(6)}, ${finalLon.toFixed(6)} (precisión ~${Math.round(displayRadius)} m)`;
      }
    }catch(e){ console.warn('Google Maps update failed', e); }

    reverseGeocode(finalLat,finalLon).then(place=>{
      cityEl.textContent = place || 'No disponible';
      try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if(raw){
          const obj = JSON.parse(raw);
          obj.city = place || null;
          obj.timestamp = obj.timestamp || Date.now();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
        }
      }catch(_){/* ignore localStorage errors */}
    });

    // (Google Maps update handled above)

    // If precision still poor, show guidance
    if(typeof finalAcc === 'number' && finalAcc > DESIRED_ACCURACY){
      statusEl.textContent = `Precisión baja (${Math.round(finalAcc)} m). En dispositivos sin GPS la precisión puede ser limitada. Prueba en un móvil con GPS o usa la búsqueda manual.`;
    }

    // If configured, start automatic watchPosition after we have a GPS-derived fix (skip for IP)
    try{
      if(AUTO_WATCH && source === 'gps' && !watchId && navigator.geolocation){
        watchId = navigator.geolocation.watchPosition((pos)=>onLocationSuccess(pos,'gps'), onLocationError, { enableHighAccuracy:true, timeout:15000, maximumAge:2000 });
        if(statusEl) statusEl.textContent = (statusEl.textContent || '') + ' — Observando ubicación automáticamente';
      }
    }catch(e){ console.warn('Failed to start automatic watchPosition', e); }
  }

  function onLocationError(err){
    console.warn('Geolocation error', err);
    if(err && err.code === 1) showError('Permiso denegado. Activa la ubicación y vuelve a intentar.');
    else if(err && err.code === 2) showError('Posición no disponible.');
    else if(err && err.code === 3) showError('Tiempo de espera agotado.');
    else showError('Error al obtener ubicación: '+(err && err.message ? err.message : JSON.stringify(err)));
  }

  async function askLocation(){
    console.log('askLocation invoked');
    statusEl.textContent = 'Preparando solicitud de ubicación…';
    statusEl.style.color = '';
  // start a location request; disable retry button if present
  const retryBtn = document.getElementById('retry');
  if(retryBtn){ retryBtn.disabled = true; retryBtn.textContent = 'Buscando...'; }
  const retryNote = document.getElementById('retryNote');
  if(retryNote) retryNote.textContent = `Último intento: iniciando (${new Date().toLocaleTimeString()})`;
  try{

    if(!navigator.geolocation){
      showError('Geolocalización no soportada por este navegador.');
      return;
    }

    const origin = window.location.origin;
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isSecure = window.isSecureContext;
    if(!isSecure && !isLocalhost){
      showError('Geolocalización requiere un contexto seguro (HTTPS) o localhost. Si usas Live Server asegúrate de abrir la URL en http://localhost:5500 (no file://).');
      return;
    }

      try{
      if(navigator.permissions && navigator.permissions.query){
        const p = await navigator.permissions.query({ name: 'geolocation' });
        console.log('Geolocation permission state:', p.state);
        if(p.state === 'granted'){
          statusEl.textContent = 'Permiso concedido. Obteniendo ubicación…';
          try{ const pos = await getCurrentPositionAsync({ enableHighAccuracy:true, timeout:20000, maximumAge:0 }); onLocationSuccess(pos,'gps', 1000); }
          catch(e){ onLocationError(e); }
          return;
        } else if(p.state === 'prompt'){
            statusEl.textContent = 'El navegador pedirá permiso de ubicación. Por favor acepta.';
            try{
              const pos = await getCurrentPositionAsync({ enableHighAccuracy:true, timeout:20000, maximumAge:0 });
              onLocationSuccess(pos,'gps', 1000);
            }catch(e){
              console.warn('getCurrentPosition threw', e);
              onLocationError(e);
            }
          return;
        } else if(p.state === 'denied'){
          showError('Permiso de ubicación denegado previamente. Habilítalo en la configuración del sitio en tu navegador.');
          return;
        }
      }
    }catch(e){
      console.warn('Permissions API unavailable or failed', e);
    }

    statusEl.textContent = 'Solicitando ubicación…';
      try{
        // shorter initial timeout to avoid long waits
        const pos = await getCurrentPositionAsync({ enableHighAccuracy:true, timeout:INITIAL_TIMEOUT_MS, maximumAge:0 });
        onLocationSuccess(pos,'gps', 1000);
        if(retryNote) retryNote.textContent = `Último intento: éxito (${new Date().toLocaleTimeString()}) — GPS`;
      }catch(e){
        console.warn('getCurrentPosition error', e);
        // fallback to IP if available and not user denied
        if(e && e.code !== 1){ // not permission denied
          await ipFallback(1000);
          if(retryNote) retryNote.textContent = `Último intento: fallback IP (${new Date().toLocaleTimeString()})`;
        } else {
          onLocationError(e);
          if(retryNote) retryNote.textContent = `Último intento: error (${new Date().toLocaleTimeString()})`;
        }
      }
    }finally{
      if(retryBtn){ retryBtn.disabled = false; retryBtn.textContent = 'Obtener ubicación'; }
      // after first attempt, optionally start automatic watch (only if permitted and enabled)
      // we start watching inside onLocationSuccess when we have a GPS-derived position
    }
  }

  // Google Maps loader: expect window.GOOGLE_MAPS_API_KEY to be present in index.html
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

  // Initialize Google Map container
  (async function initGoogleMap(){
    try{
      const key = window.GOOGLE_MAPS_API_KEY || null;
      if(!key){
        if(statusEl) statusEl.textContent = 'Google Maps: API key no encontrada. Añádela en index.html.';
      } else {
        await loadGoogleMaps(key);
        const mapDiv = document.getElementById('map');
        if(mapDiv){
          gmap = new google.maps.Map(mapDiv, { center: { lat:0, lng:0 }, zoom: 3 });
          console.log('Google Maps initialized');
        }
      }
    }catch(e){
      console.error('Failed to init Google Maps', e);
      if(statusEl) statusEl.textContent = 'No se pudo inicializar Google Maps. Revisa la consola.';
    }
  })();

  // Restore stored location if present
  (function restoreStored(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      const obj = JSON.parse(raw);
      if(obj && typeof obj.latitude === 'number' && typeof obj.longitude === 'number'){
        coordsEl.textContent = `${obj.latitude.toFixed(6)}, ${obj.longitude.toFixed(6)}`;
        accuracyEl.textContent = obj.accuracy ? `${Math.round(obj.accuracy)} m` : '—';
        cityEl.textContent = obj.city || 'No disponible';
        // show on map if map ready
        if(window.google && window.google.maps && gmap){
          const latLng = { lat: obj.latitude, lng: obj.longitude };
          if(!gmarker) gmarker = new google.maps.Marker({ position: latLng, map: gmap, title: 'Última ubicación' });
          else gmarker.setPosition(latLng);
          if(!gcircle && obj.accuracy) gcircle = new google.maps.Circle({ strokeColor: '#4facfe', strokeOpacity: 0.6, strokeWeight: 1, fillColor: '#4facfe', fillOpacity: 0.12, map: gmap, center: latLng, radius: obj.accuracy });
          else if(gcircle && obj.accuracy) { gcircle.setCenter(latLng); gcircle.setRadius(obj.accuracy); }
          try{ gmap.setCenter(latLng); gmap.setZoom(12); }catch(_){/*ignore*/}
        }
      }
    }catch(e){ console.warn('Failed to restore stored location', e); }
  })();

  // no alternate map container; Google Maps initialized in initGoogleMap()

  // retry button removed from HTML; automatic mode active
  const manualInput = document.getElementById('manualInput');
  const manualSearchBtn = document.getElementById('manualSearch');
  const watchCheckbox = document.getElementById('watchPos');

  let watchId = null;

  async function ipFallback(displayMin = 0){
    showError('Intentando ubicar por IP...');
    try{
      const res = await fetch('https://ipapi.co/json/');
      if(!res.ok) throw new Error('IP API error');
      const d = await res.json();
      const lat = parseFloat(d.latitude);
      const lon = parseFloat(d.longitude);
      if(!lat || !lon) throw new Error('No coords from IP');
      statusEl.textContent = 'Ubicación por IP estimada';
      onLocationSuccess({ coords: { latitude: lat, longitude: lon, accuracy: d.latitude ? 50000 : 0 } }, 'ip', displayMin);
    }catch(e){
      showError('No se pudo obtener ubicación por IP: '+(e.message||e));
    }
  }

  async function manualSearch(q, displayMin = 0){
    if(!q) return showError('Ingresa un término de búsqueda');
    statusEl.textContent = 'Buscando "'+q+'"...';
    try{
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&accept-language=es`;
      const res = await fetch(url);
      if(!res.ok) throw new Error('Search error');
      const arr = await res.json();
      if(!arr || !arr.length) return showError('No se encontraron resultados');
      const it = arr[0];
      const lat = parseFloat(it.lat);
      const lon = parseFloat(it.lon);
      onLocationSuccess({ coords: { latitude: lat, longitude: lon, accuracy: 1000 } }, 'manual', displayMin);
    }catch(e){
      showError('Error en búsqueda: '+(e.message||e));
    }
  }

  if(manualSearchBtn){
    manualSearchBtn.addEventListener('click', ()=> manualSearch(manualInput.value.trim(), 1000));
  }
  const fit5kBtn = document.getElementById('fit5k');
  if(fit5kBtn){
    fit5kBtn.addEventListener('click', ()=>{
      if(!lastPosition){ showError('No hay posición para ajustar.'); return; }
      if(!gmap){ showError('El mapa (Google Maps) no está disponible para ajustar el radio.'); return; }
      const lat = lastPosition.coords.latitude;
      const lon = lastPosition.coords.longitude;
      const minRadius = 5000;
      const acc = (lastPosition.coords.accuracy && lastPosition.coords.accuracy > 0) ? lastPosition.coords.accuracy : minRadius;
      const radius = Math.max(minRadius, acc);
      const latLng = { lat, lng: lon };
      if(!gcircle){
        gcircle = new google.maps.Circle({ strokeColor: '#4facfe', strokeOpacity: 0.6, strokeWeight: 1, fillColor: '#4facfe', fillOpacity: 0.12, map: gmap, center: latLng, radius });
      } else {
        gcircle.setCenter(latLng);
        gcircle.setRadius(radius);
      }
      try{
        const bounds = gcircle.getBounds();
        if(bounds) gmap.fitBounds(bounds);
      }catch(e){ console.warn('fit5k bounds failed', e); }
      statusEl.textContent = `Ajustado a ${Math.round(radius)} m.`;
    });
  }

  if(watchCheckbox){
    watchCheckbox.addEventListener('change', (e)=>{
      if(e.target.checked){
        if(!navigator.geolocation){ showError('Geolocalización no soportada'); watchCheckbox.checked=false; return; }
        watchId = navigator.geolocation.watchPosition((pos)=>onLocationSuccess(pos,'gps'), onLocationError, { enableHighAccuracy:true, timeout:10000, maximumAge:0 });
        statusEl.textContent = 'Observando ubicación...';
      }else{
        if(watchId) navigator.geolocation.clearWatch(watchId);
        watchId = null;
        statusEl.textContent = 'Observación detenida';
      }
    });
  }

  // intentar automáticamente al cargar
  askLocation();

  // expose for debugging
  window.__clima_minimap = {
    askLocation, onLocationSuccess, onLocationError, ipFallback, manualSearch,
    getStoredLocation: ()=>{ try{ const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null }catch(e){return null} },
    clearStoredLocation: ()=>{ try{ localStorage.removeItem(STORAGE_KEY); return true }catch(e){return false} }
  };
  }catch(e){
    // top-level initialization error
    console.error('map.js top-level error', e);
    try{
      const statusEl2 = document.getElementById && document.getElementById('status');
      if(statusEl2){ statusEl2.textContent = 'Error en el mapa: revisa la consola.'; statusEl2.style.color='crimson'; }
    }catch(_){/* ignore */}
  }
})();
