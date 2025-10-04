import React, { useState, useEffect } from 'react';
import { FiTarget, FiMapPin, FiClock, FiCheckCircle, FiAlertCircle, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { format, addDays, isAfter, isBefore, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import './Tracking.css';

const Tracking = ({ location, onNext }) => {
  const [trackingData, setTrackingData] = useState({
    startDate: new Date(),
    targetDate: addDays(new Date(), 5),
    currentStep: 1,
    totalSteps: 5,
    progress: 20,
    milestones: [
      { id: 1, title: 'Ubicación seleccionada', completed: true, date: new Date() },
      { id: 2, title: 'Calendario configurado', completed: true, date: addDays(new Date(), 1) },
      { id: 3, title: 'Información del clima revisada', completed: true, date: addDays(new Date(), 2) },
      { id: 4, title: 'Seguimiento iniciado', completed: false, date: addDays(new Date(), 3) },
      { id: 5, title: 'Meta alcanzada', completed: false, date: addDays(new Date(), 5) }
    ],
    weatherHistory: [
      { date: new Date(), temperature: 22, condition: 'Soleado', notes: 'Día perfecto para actividades al aire libre' },
      { date: addDays(new Date(), -1), temperature: 20, condition: 'Nublado', notes: 'Temperatura agradable, ideal para caminar' },
      { date: addDays(new Date(), -2), temperature: 18, condition: 'Lluvia ligera', notes: 'Día fresco, perfecto para quedarse en casa' }
    ],
    goals: [
      { id: 1, title: 'Monitorear temperatura diaria', target: 5, current: 3, unit: 'días' },
      { id: 2, title: 'Registrar condiciones climáticas', target: 7, current: 5, unit: 'días' },
      { id: 3, title: 'Completar seguimiento', target: 1, current: 0, unit: 'veces' }
    ]
  });

  const [newNote, setNewNote] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);

  // Calcular progreso general
  const calculateProgress = () => {
    const completedMilestones = trackingData.milestones.filter(m => m.completed).length;
    return Math.round((completedMilestones / trackingData.milestones.length) * 100);
  };

  // Agregar nueva nota
  const addNote = () => {
    if (!newNote.trim()) return;

    const newWeatherEntry = {
      date: new Date(),
      temperature: Math.floor(Math.random() * 15) + 15, // Simular temperatura
      condition: ['Soleado', 'Nublado', 'Lluvia ligera', 'Parcialmente nublado'][Math.floor(Math.random() * 4)],
      notes: newNote
    };

    setTrackingData(prev => ({
      ...prev,
      weatherHistory: [newWeatherEntry, ...prev.weatherHistory],
      progress: calculateProgress()
    }));

    setNewNote('');
    setShowAddNote(false);
  };

  // Marcar hito como completado
  const toggleMilestone = (milestoneId) => {
    setTrackingData(prev => ({
      ...prev,
      milestones: prev.milestones.map(milestone =>
        milestone.id === milestoneId
          ? { ...milestone, completed: !milestone.completed }
          : milestone
      ),
      progress: calculateProgress()
    }));
  };

  // Calcular días restantes
  const daysRemaining = differenceInDays(trackingData.targetDate, new Date());

  return (
    <div className="step-container">
      <div className="step-header">
        <h1 className="step-title">Seguimiento del Clima</h1>
        <p className="step-subtitle">
          Monitorea el progreso de tu seguimiento meteorológico
        </p>
      </div>

      <div className="tracking-content">
        {/* Resumen del progreso */}
        <div className="progress-summary">
          <div className="progress-card">
            <div className="progress-header">
              <h3>
                <FiTarget className="header-icon" />
                Progreso General
              </h3>
              <span className="progress-percentage">{trackingData.progress}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${trackingData.progress}%` }}
              ></div>
            </div>
            <div className="progress-details">
              <div className="detail">
                <span className="label">Días restantes:</span>
                <span className="value">{daysRemaining} días</span>
              </div>
              <div className="detail">
                <span className="label">Hitos completados:</span>
                <span className="value">
                  {trackingData.milestones.filter(m => m.completed).length} / {trackingData.milestones.length}
                </span>
              </div>
            </div>
          </div>

          <div className="location-card">
            <h3>
              <FiMapPin className="header-icon" />
              Ubicación de Seguimiento
            </h3>
            <p className="location-name">{location?.name}</p>
            <p className="location-coords">
              {location?.lat?.toFixed(4)}, {location?.lng?.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Hitos del seguimiento */}
        <div className="milestones-section">
          <h3>Hitos del Seguimiento</h3>
          <div className="milestones-list">
            {trackingData.milestones.map((milestone) => (
              <div
                key={milestone.id}
                className={`milestone-item ${milestone.completed ? 'completed' : ''}`}
              >
                <div className="milestone-content">
                  <div className="milestone-checkbox">
                    <button
                      onClick={() => toggleMilestone(milestone.id)}
                      className={`checkbox ${milestone.completed ? 'checked' : ''}`}
                    >
                      {milestone.completed && <FiCheckCircle />}
                    </button>
                  </div>
                  <div className="milestone-info">
                    <h4>{milestone.title}</h4>
                    <p>
                      <FiClock className="icon" />
                      {format(milestone.date, 'dd/MM/yyyy', { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="milestone-status">
                  {milestone.completed ? (
                    <span className="status completed">
                      <FiCheckCircle className="icon" />
                      Completado
                    </span>
                  ) : (
                    <span className="status pending">
                      <FiAlertCircle className="icon" />
                      Pendiente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Objetivos */}
        <div className="goals-section">
          <h3>Objetivos de Seguimiento</h3>
          <div className="goals-grid">
            {trackingData.goals.map((goal) => {
              const progress = Math.round((goal.current / goal.target) * 100);
              const isCompleted = goal.current >= goal.target;
              
              return (
                <div key={goal.id} className={`goal-card ${isCompleted ? 'completed' : ''}`}>
                  <div className="goal-header">
                    <h4>{goal.title}</h4>
                    <span className="goal-progress">
                      {goal.current} / {goal.target} {goal.unit}
                    </span>
                  </div>
                  <div className="goal-bar">
                    <div 
                      className="goal-fill" 
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                  <div className="goal-percentage">
                    {progress}% completado
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Historial del clima */}
        <div className="history-section">
          <div className="history-header">
            <h3>Historial del Clima</h3>
            <button
              onClick={() => setShowAddNote(!showAddNote)}
              className="btn btn-primary add-note-btn"
            >
              Agregar Nota
            </button>
          </div>

          {showAddNote && (
            <div className="add-note-form">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Describe las condiciones climáticas observadas..."
                className="note-textarea"
                rows="3"
              />
              <div className="form-actions">
                <button onClick={addNote} className="btn btn-primary">
                  Agregar Nota
                </button>
                <button
                  onClick={() => {
                    setShowAddNote(false);
                    setNewNote('');
                  }}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="history-list">
            {trackingData.weatherHistory.map((entry, index) => (
              <div key={index} className="history-item">
                <div className="history-date">
                  {format(entry.date, 'dd/MM/yyyy', { locale: es })}
                </div>
                <div className="history-weather">
                  <div className="weather-temp">{entry.temperature}°C</div>
                  <div className="weather-condition">{entry.condition}</div>
                </div>
                <div className="history-notes">
                  {entry.notes}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button
          onClick={onNext}
          className="btn btn-primary next-btn"
        >
          Continuar al Feedback
        </button>
      </div>
    </div>
  );
};

export default Tracking;
