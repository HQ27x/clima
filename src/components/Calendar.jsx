import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { FiCalendar, FiClock, FiBell, FiCheck } from 'react-icons/fi';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import './Calendar.css';

const CalendarComponent = ({ location, onNext }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState('');
  const [showAddReminder, setShowAddReminder] = useState(false);

  // Cargar recordatorios guardados
  useEffect(() => {
    const savedReminders = localStorage.getItem('weatherReminders');
    if (savedReminders) {
      try {
        const parsed = JSON.parse(savedReminders);
        const normalized = Array.isArray(parsed)
          ? parsed.map(r => ({
              ...r,
              // Normalize dates saved as ISO strings back into Date objects
              date: r?.date ? new Date(r.date) : new Date(),
              createdAt: r?.createdAt ? new Date(r.createdAt) : new Date()
            }))
          : [];

        setReminders(normalized);
      } catch (err) {
        console.error('Failed to parse saved reminders', err);
        setReminders([]);
      }
    }
  }, []);

  // Guardar recordatorios
  const saveReminders = (reminders) => {
    try {
      // Serialize Date objects to ISO strings so JSON is stable
      const serializable = (reminders || []).map(r => ({
        ...r,
        date: r?.date instanceof Date ? r.date.toISOString() : r?.date,
        createdAt: r?.createdAt instanceof Date ? r.createdAt.toISOString() : r?.createdAt
      }));

      localStorage.setItem('weatherReminders', JSON.stringify(serializable));
      // Keep state with Date objects for easier usage in the UI
      const normalized = (reminders || []).map(r => ({
        ...r,
        date: r?.date instanceof Date ? r.date : new Date(r?.date),
        createdAt: r?.createdAt instanceof Date ? r.createdAt : new Date(r?.createdAt)
      }));
      setReminders(normalized);
    } catch (err) {
      console.error('Failed to save reminders', err);
    }
  };

  // Agregar recordatorio
  const addReminder = () => {
    if (!newReminder.trim()) return;

    const reminder = {
      id: Date.now(),
      text: newReminder,
      date: selectedDate,
      createdAt: new Date(),
      location: location?.name || 'Ubicación no especificada'
    };

    const updatedReminders = [...reminders, reminder];
    saveReminders(updatedReminders);
    setNewReminder('');
    setShowAddReminder(false);
  };

  // Eliminar recordatorio
  const removeReminder = (id) => {
    const updatedReminders = reminders.filter(r => r.id !== id);
    saveReminders(updatedReminders);
  };

  // Obtener recordatorios para una fecha específica
  const getRemindersForDate = (date) => {
    return reminders.filter(reminder => {
      const rDate = reminder?.date ? new Date(reminder.date) : null;
      if (!rDate || isNaN(rDate.getTime())) return false;
      try {
        return format(rDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      } catch (e) {
        return false;
      }
    });
  };

  // Obtener recordatorios próximos (3-5 días)
  const getUpcomingReminders = () => {
    const today = new Date();
    const fiveDaysFromNow = addDays(today, 5);
    
    return reminders
      .map(r => ({ ...r, date: r?.date ? new Date(r.date) : null }))
      .filter(reminder => {
        const d = reminder.date;
        if (!d || isNaN(d.getTime())) return false;
        return isAfter(d, today) && isBefore(d, fiveDaysFromNow);
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Marcar recordatorio como completado
  const toggleReminder = (id) => {
    const updatedReminders = reminders.map(reminder => 
      reminder.id === id 
        ? { ...reminder, completed: !reminder.completed }
        : reminder
    );
    saveReminders(updatedReminders);
  };

  const upcomingReminders = getUpcomingReminders();
  const selectedDateReminders = getRemindersForDate(selectedDate);

  return (
    <div className="step-container">
      <div className="step-header">
        <h1 className="step-title">Calendario de Recordatorios</h1>
        <p className="step-subtitle">
          Programa recordatorios meteorológicos para los próximos 5 días
        </p>
      </div>

      <div className="calendar-section">
        <div className="calendar-container">
          <div className="calendar-header">
            <h3>
              <FiCalendar className="header-icon" />
              Calendario
            </h3>
            <button
              onClick={() => setShowAddReminder(!showAddReminder)}
              className="btn btn-primary add-reminder-btn"
            >
              <FiBell className="btn-icon" />
              Agregar Recordatorio
            </button>
          </div>

          <Calendar
            onChange={setSelectedDate}
            value={selectedDate}
            locale={es}
            className="react-calendar calendar-modern"
            tileContent={({ date, view }) => {
              if (view === 'month') {
                const dayReminders = getRemindersForDate(date);
                return dayReminders.length > 0 ? (
                  <div className="calendar-dot">
                    <FiBell />
                  </div>
                ) : null;
              }
            }}
          />

          {showAddReminder && (
            <div className="add-reminder-modal-overlay" onClick={()=>setShowAddReminder(false)}>
              <div className="add-reminder-modal" onClick={(e)=>e.stopPropagation()}>
              <h4>Nuevo Recordatorio</h4>
              <div className="form-group">
                <label>Fecha seleccionada:</label>
                <p className="selected-date">
                  {format(selectedDate, 'dd/MM/yyyy', { locale: es })}
                </p>
              </div>
              <div className="form-group">
                <label>Descripción del recordatorio:</label>
                <input
                  type="text"
                  value={newReminder}
                  onChange={(e) => setNewReminder(e.target.value)}
                  placeholder="Ej: Revisar pronóstico para viaje..."
                  className="input"
                  onKeyPress={(e) => e.key === 'Enter' && addReminder()}
                />
              </div>
              <div className="form-actions">
                <button
                  onClick={addReminder}
                  className="btn btn-primary"
                >
                  Agregar
                </button>
                <button
                  onClick={() => {
                    setShowAddReminder(false);
                    setNewReminder('');
                  }}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
              </div>
              </div>
            </div>
          )}
        </div>

        <div className="reminders-sidebar">
          <div className="upcoming-reminders">
            <h3>
              <FiClock className="header-icon" />
              Próximos Recordatorios
            </h3>
            {upcomingReminders.length > 0 ? (
              <div className="reminders-list">
                {upcomingReminders.map(reminder => (
                  <div
                    key={reminder.id}
                    className={`reminder-item ${reminder.completed ? 'completed' : ''}`}
                  >
                    <div className="reminder-content">
                      <div className="reminder-date">
                        {format(reminder.date, 'dd/MM', { locale: es })}
                      </div>
                      <div className="reminder-text">
                        {reminder.text}
                      </div>
                      <div className="reminder-location">
                        {reminder.location}
                      </div>
                    </div>
                    <div className="reminder-actions">
                      <button
                        onClick={() => toggleReminder(reminder.id)}
                        className={`toggle-btn ${reminder.completed ? 'completed' : ''}`}
                      >
                        <FiCheck />
                      </button>
                      <button
                        onClick={() => removeReminder(reminder.id)}
                        className="remove-btn"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-reminders">No hay recordatorios próximos</p>
            )}
          </div>

          {selectedDateReminders.length > 0 && (
            <div className="selected-date-reminders">
              <h4>
                Recordatorios para {format(selectedDate, 'dd/MM/yyyy', { locale: es })}
              </h4>
              <div className="reminders-list">
                {selectedDateReminders.map(reminder => (
                  <div
                    key={reminder.id}
                    className={`reminder-item ${reminder.completed ? 'completed' : ''}`}
                  >
                    <div className="reminder-content">
                      <div className="reminder-text">
                        {reminder.text}
                      </div>
                    </div>
                    <div className="reminder-actions">
                      <button
                        onClick={() => toggleReminder(reminder.id)}
                        className={`toggle-btn ${reminder.completed ? 'completed' : ''}`}
                      >
                        <FiCheck />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarComponent;
