import React, { useState, useEffect } from 'react';
import { FiStar, FiMessageSquare, FiThumbsUp, FiThumbsDown, FiSend, FiAward, FiUsers } from 'react-icons/fi';
import { collection, addDoc, getDocs, getDoc, query, orderBy, limit, serverTimestamp, onSnapshot, where, Timestamp, doc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import './Feedback.css';

const Feedback = ({ location, onNext }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('positive');
  const [submitted, setSubmitted] = useState(false);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [loading, setLoading] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profileName, setProfileName] = useState(null);

  // Escuchar auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u || null);
    });
    return () => unsub();
  }, []);

  // Cargar nombre de perfil desde users/{uid} o usar displayName
  useEffect(() => {
    let mounted = true;
    const loadProfileName = async () => {
      if (!firebaseUser || !firebaseUser.uid) {
        if (mounted) setProfileName(null);
        return;
      }
      try {
        const udoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (mounted) {
          if (udoc && udoc.exists()) {
            const pd = udoc.data();
            setProfileName(pd.displayName || pd.name || firebaseUser.displayName || null);
          } else {
            setProfileName(firebaseUser.displayName || firebaseUser.email || null);
          }
        }
      } catch (e) {
        console.warn('Error loading profile name:', e);
        if (mounted) setProfileName(firebaseUser.displayName || firebaseUser.email || null);
      }
    };
    loadProfileName();
    return () => { mounted = false; };
  }, [firebaseUser]);

  // Cargar feedback reciente en tiempo real
  useEffect(() => {
    const q = query(
      collection(db, 'feedback'),
      orderBy('timestamp', 'desc'),
      limit(12)
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const feedbackData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentFeedback(feedbackData);
    }, (err) => {
      console.error('Error en onSnapshot feedback:', err);
    });

    return () => unsubscribe();
  }, []);

  const getCityFromLocationProp = (loc) => {
    let city = loc?.city ?? loc?.name ?? null;
    if (!city && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('clima_last_location_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          city = parsed?.city ?? parsed?.name ?? city;
        }
      } catch(e) { /* ignore */ }
    }
    return city;
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    try {
      // Firestore Timestamp
      if (typeof ts.toDate === 'function') return new Date(ts.toDate()).toLocaleString('es-ES');
      // JS Date
      if (ts instanceof Date) return ts.toLocaleString('es-ES');
      // ISO string
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d.toLocaleString('es-ES');
    } catch (e) {}
    return '';
  };

  // Enviar feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (rating === 0 || !feedback.trim()) return;
    // require logged-in user
    if (!firebaseUser || !firebaseUser.uid) {
      if (typeof window !== 'undefined') {
        window.alert('Debes iniciar sesión para enviar feedback. Serás redirigido al inicio de sesión.');
        window.location.replace('/login');
      }
      return;
    }

    setLoading(true);
    try {
      // determine city name from location prop or saved last location
      let cityName = location?.city ?? location?.name ?? null;
      if (!cityName && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('clima_last_location_v1');
          if (raw) {
            const parsed = JSON.parse(raw);
            cityName = parsed?.city ?? parsed?.name ?? cityName;
          }
        } catch(e) { /* ignore */ }
      }

      const feedbackData = {
        rating,
        feedback: feedback.trim(),
        type: feedbackType,
        location: location?.name || cityName || 'Ubicación no especificada',
        city: cityName ?? null,
        coordinates: location ? { lat: location.lat, lng: location.lng } : null,
        userId: firebaseUser.uid,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent
      };
      // rate-limit: allow 1 feedback per user each 24 hours (compare creation timestamp)
      // also use a local fallback in case the remote query fails or is delayed
      const localKey = `feedback_last_sent_${firebaseUser.uid}`;
      try {
        const lastLocal = localStorage.getItem(localKey);
        if (lastLocal) {
          const lastDate = new Date(lastLocal);
          if (!isNaN(lastDate.getTime())) {
            const diffMs = Date.now() - lastDate.getTime();
            const ONE_DAY_MS = 24 * 60 * 60 * 1000;
            if (diffMs < ONE_DAY_MS) {
              alert('Solo puedes enviar 1 feedback cada 24 horas. Intenta de nuevo más tarde.');
              setLoading(false);
              return;
            }
          }
        }
      } catch (localErr) {
        // ignore localStorage errors
        console.warn('localStorage check failed:', localErr);
      }

      try {
        const qLast = query(
          collection(db, 'feedback'),
          where('userId', '==', firebaseUser.uid),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const lastSnap = await getDocs(qLast);
        if (!lastSnap.empty) {
          const lastDoc = lastSnap.docs[0];
          const lastData = lastDoc.data() || {};
          const lastTs = lastData.timestamp;
          if (lastTs) {
            let lastDate = null;
            try {
              lastDate = typeof lastTs.toDate === 'function' ? lastTs.toDate() : new Date(lastTs);
            } catch (_) { lastDate = null; }
            if (lastDate instanceof Date && !isNaN(lastDate.getTime())) {
              const now = Date.now();
              const diffMs = now - lastDate.getTime();
              const ONE_DAY_MS = 24 * 60 * 60 * 1000;
              if (diffMs < ONE_DAY_MS) {
                alert('Solo puedes enviar 1 feedback cada 24 horas. Intenta de nuevo más tarde.');
                setLoading(false);
                return;
              }
            }
          }
        }
      } catch (rqErr) {
        console.warn('Rate-check failed, permitting submission:', rqErr);
      }

      const docRef = await addDoc(collection(db, 'feedback'), feedbackData);
      // on success, persist a local timestamp so subsequent attempts are blocked immediately
      try {
        localStorage.setItem(localKey, new Date().toISOString());
      } catch (lsErr) { console.warn('Could not write local cooldown:', lsErr); }
      
      setSubmitted(true);
      setRating(0);
      setFeedback('');
      setFeedbackType('positive');
      
      // onSnapshot listener will update recentFeedback automatically
      
    } catch (error) {
      console.error('Error enviando feedback:', error);
      alert('Error al enviar feedback. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar estrellas
  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starRating = index + 1;
      let starClass = 'star';
      
      if (index < rating) {
        starClass += ' active';
        // Aplicar colores según el rating
        if (rating === 1) starClass += ' rating-1';
        else if (rating === 2) starClass += ' rating-2';
        else if (rating === 3) starClass += ' rating-3';
        else if (rating === 4) starClass += ' rating-4';
        else if (rating === 5) starClass += ' rating-5';
      }
      
      return (
        <button
          key={index}
          type="button"
          onClick={() => setRating(starRating)}
          className={starClass}
          disabled={submitted}
        >
          <FiStar />
        </button>
      );
    });
  };

  // Obtener texto de calificación
  const getRatingText = (rating) => {
    const ratings = {
      1: 'Muy malo',
      2: 'Malo',
      3: 'Regular',
      4: 'Bueno',
      5: 'Excelente'
    };
    return ratings[rating] || '';
  };

  if (submitted) {
    return (
      <div className="success-overlay">
        <div className="success-container">
          <div className="success-icon">
            <FiAward />
          </div>
          <h1 className="success-title">¡Gracias por tu feedback!</h1>
          <p className="success-message">
            Tu opinión nos ayuda a mejorar la aplicación. 
            {rating >= 4 && ' ¡Has ganado una estrella por tu colaboración!'}
          </p>
          <div className="success-actions">
            <button
              onClick={() => setSubmitted(false)}
              className="btn btn-outline"
            >
              Volver
            </button>
            {/* 'Ver Foro de Participación' button removed per request */}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="step-container">
      <div className="step-header">
        <h1 className="step-title">Feedback y Evaluación</h1>
        <p className="step-subtitle">
          Comparte tu experiencia y ayuda a mejorar la aplicación
        </p>
      </div>

      <div className="feedback-content">
        <div className="feedback-form-section">
          <div className="feedback-card">
            <h3>
              <FiMessageSquare className="header-icon" />
              {profileName ? `${profileName} evalúa tu experiencia` : 'Evalúa tu experiencia'}
            </h3>
            
            <form onSubmit={handleSubmitFeedback} className="feedback-form">
              <div className="rating-section">
                <label>Calificación general:</label>
                <div className="stars-container">
                  {renderStars()}
                  {rating > 0 && (
                    <span className={`rating-text rating-${rating}`}>
                      {getRatingText(rating)}
                    </span>
                  )}
                </div>
              </div>

              <div className="feedback-type-section">
                <label>Tipo de feedback:</label>
                <div className="type-buttons">
                  <button
                    type="button"
                    onClick={() => setFeedbackType('positive')}
                    className={`type-btn ${feedbackType === 'positive' ? 'active' : ''}`}
                  >
                    <FiThumbsUp className="type-icon" />
                    Positivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackType('negative')}
                    className={`type-btn ${feedbackType === 'negative' ? 'active' : ''}`}
                  >
                    <FiThumbsDown className="type-icon" />
                    Sugerencia
                  </button>
                </div>
              </div>

              <div className="feedback-text-section">
                <label htmlFor="feedback">Comentarios:</label>
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Comparte tu experiencia, sugerencias o comentarios..."
                  className="feedback-textarea"
                  rows="4"
                  required
                />
              </div>

              <div className="location-info">
                <p>
                  <strong>Ubicación:</strong> {getCityFromLocationProp(location) || location?.name || 'No especificada'}
                </p>
                {location && (
                  <p>
                    <strong>Coordenadas:</strong> {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={rating === 0 || !feedback.trim() || loading}
                className="btn btn-primary submit-btn"
              >
                {loading ? 'Enviando...' : 'Enviar Feedback'}
              </button>
            </form>
          </div>
        </div>

        <div className="recent-feedback-section">
          <h3>
            <FiUsers className="header-icon" />
            Feedback Reciente
          </h3>
          
          {recentFeedback.length > 0 ? (
            <div className="feedback-list">
              {recentFeedback.map((item) => (
                <div key={item.id} className="feedback-item">
                  <div className="feedback-header">
                    <div className="feedback-rating">
                      {Array.from({ length: 5 }, (_, index) => {
                        let starClass = 'star';
                        if (index < item.rating) {
                          starClass += ' active';
                          // Aplicar colores según el rating
                          if (item.rating === 1) starClass += ' rating-1';
                          else if (item.rating === 2) starClass += ' rating-2';
                          else if (item.rating === 3) starClass += ' rating-3';
                          else if (item.rating === 4) starClass += ' rating-4';
                          else if (item.rating === 5) starClass += ' rating-5';
                        }
                        return (
                          <FiStar
                            key={index}
                            className={starClass}
                          />
                        );
                      })}
                    </div>
                    <div className="feedback-type">
                      {item.type === 'positive' ? (
                        <FiThumbsUp className="type-icon positive" />
                      ) : (
                        <FiThumbsDown className="type-icon negative" />
                      )}
                    </div>
                  </div>
                  
                  <div className="feedback-content-text">
                    {item.feedback}
                  </div>
                  
                  <div className="feedback-meta">
                    <span className="feedback-location">
                      {item.city ?? item.location ?? 'Ubicación seleccionada'}
                    </span>
                    <span className="feedback-date">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-feedback">
              <p>No hay feedback reciente disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* 'Ver Foro de Participación' action removed per request */}
    </div>
  );
};

export default Feedback;
