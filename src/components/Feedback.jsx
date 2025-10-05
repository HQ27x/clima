import React, { useState, useEffect } from 'react';
import { FiStar, FiMessageSquare, FiThumbsUp, FiThumbsDown, FiSend, FiAward, FiUsers } from 'react-icons/fi';
import { collection, addDoc, getDocs, getDoc, query, orderBy, limit, serverTimestamp, onSnapshot, where, Timestamp, doc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import './Feedback.css';

const Feedback = ({ location, onNext }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  // Removed self-classification by user; type will be inferred server-side or by moderators
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
      if (typeof ts.toDate === 'function') return new Date(ts.toDate()).toLocaleString('en-US');
      // JS Date
      if (ts instanceof Date) return ts.toLocaleString('en-US');
      // ISO string
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d.toLocaleString('en-US');
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
        window.alert('You must be signed in to submit feedback. You will be redirected to the login page.');
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
        // type removed: classification should be done by terceros/moderation
        location: location?.name || cityName || 'Location not specified',
  location: location?.name || cityName || 'Location not specified',
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
              alert('You can only submit 1 feedback every 24 hours. Please try again later.');
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
                alert('You can only submit 1 feedback every 24 hours. Please try again later.');
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
      // no-op: self type removed
      
      // onSnapshot listener will update recentFeedback automatically
      
    } catch (error) {
      console.error('Error sending feedback:', error);
      alert('Error sending feedback. Please try again.');
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
      1: 'Very bad',
      2: 'Bad',
      3: 'Average',
      4: 'Good',
      5: 'Excellent'
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
          <h1 className="success-title">Thanks for your feedback!</h1>
          <p className="success-message">
            Your feedback helps us improve the app. 
            {rating >= 4 && ' You have earned a star for your contribution!'}
          </p>
          <div className="success-actions">
            <button
              onClick={() => setSubmitted(false)}
              className="btn btn-outline"
            >
          Back
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
          <h1 className="step-title">Feedback</h1>
          <p className="step-subtitle">
            Share your experience and help improve the app
          </p>
        </div>

      <div className="feedback-content">
        <div className="feedback-form-section">
          <div className="feedback-card">
            <h3>
              <FiMessageSquare className="header-icon" />
              {profileName ? `${profileName} rates your experience` : 'Rate your experience'}
            </h3>
            
            <form onSubmit={handleSubmitFeedback} className="feedback-form">
              <div className="rating-section">
                <label>Overall rating:</label>
                <div className="stars-container">
                  {renderStars()}
                  {rating > 0 && (
                    <span className={`rating-text rating-${rating}`}>
                      {getRatingText(rating)}
                    </span>
                  )}
                </div>
              </div>

              {/* Tipo de feedback removido: la evaluación la realiza otro usuario/moderación */}

              <div className="feedback-text-section">
                <label htmlFor="feedback">Comments:</label>
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your experience, suggestions or comments..."
                  className="feedback-textarea"
                  rows="4"
                  required
                />
              </div>

              <div className="location-info">
                <p>
                  <strong>Location:</strong> {getCityFromLocationProp(location) || location?.name || 'Not specified'}
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
                {loading ? 'Sending...' : 'Send Feedback'}
              </button>
            </form>
          </div>
        </div>

        <div className="recent-feedback-section">
          <h3>
            <FiUsers className="header-icon" />
            Recent Feedback
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
                    {/* Ocultamos icono de tipo ya que el usuario no se auto-clasifica */}
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
              <p>No recent feedback available</p>
            </div>
          )}
        </div>
      </div>

      {/* 'Ver Foro de Participación' action removed per request */}
    </div>
  );
};

export default Feedback;
