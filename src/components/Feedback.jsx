import React, { useState, useEffect } from 'react';
import { FiStar, FiMessageSquare, FiThumbsUp, FiThumbsDown, FiSend, FiAward, FiUsers } from 'react-icons/fi';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Feedback.css';

const Feedback = ({ location, onNext }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('positive');
  const [submitted, setSubmitted] = useState(false);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar feedback reciente
  useEffect(() => {
    const loadRecentFeedback = async () => {
      try {
        const q = query(
          collection(db, 'feedback'),
          orderBy('timestamp', 'desc'),
          limit(12)
        );
        const querySnapshot = await getDocs(q);
        const feedbackData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentFeedback(feedbackData);
      } catch (error) {
        console.error('Error cargando feedback:', error);
      }
    };

    loadRecentFeedback();
  }, []);

  // Enviar feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (rating === 0 || !feedback.trim()) return;

    setLoading(true);
    try {
      const feedbackData = {
        rating,
        feedback: feedback.trim(),
        type: feedbackType,
        location: location?.name || 'Ubicación no especificada',
        coordinates: location ? {
          lat: location.lat,
          lng: location.lng
        } : null,
        timestamp: new Date(),
        userAgent: navigator.userAgent
      };

      await addDoc(collection(db, 'feedback'), feedbackData);
      
      setSubmitted(true);
      setRating(0);
      setFeedback('');
      setFeedbackType('positive');
      
      // Recargar feedback reciente
      const q = query(
        collection(db, 'feedback'),
        orderBy('timestamp', 'desc'),
        limit(12)
      );
      const querySnapshot = await getDocs(q);
      const recentFeedbackData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentFeedback(recentFeedbackData);
      
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
      <div className="step-container">
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
              Dar más feedback
            </button>
            <button
              onClick={onNext}
              className="btn btn-primary"
            >
              Ver Foro de Participación
            </button>
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
              Evalúa tu experiencia
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
                  <strong>Ubicación:</strong> {location?.name || 'No especificada'}
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
                      {item.location}
                    </span>
                    <span className="feedback-date">
                      {new Date(item.timestamp?.toDate()).toLocaleDateString('es-ES')}
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

      <div className="step-actions">
        <button
          onClick={onNext}
          className="btn btn-primary next-btn"
        >
          Ver Foro de Participación
        </button>
      </div>
    </div>
  );
};

export default Feedback;
