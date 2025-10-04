import { useState } from "react";

function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Cuando el usuario hace clic en un día
  const handleDayClick = (day) => {
    setSelectedDate(day);
  };

  // Cuando hace clic en “Agregar Recordatorio”
  const handleAddReminder = () => {
    if (!selectedDate) {
      alert("Primero selecciona un día del calendario 📅");
      return;
    }
    setShowModal(true);
  };

  return (
    <div className="calendar-page">
      <h2>Calendario de Recordatorios</h2>

      {/* Calendario (ejemplo simple) */}
      <div className="calendar-grid">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <div
            key={day}
            onClick={() => handleDayClick(day)}
            className={`day ${selectedDate === day ? "selected" : ""}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Botón para agregar recordatorio */}
      <button onClick={handleAddReminder}>Agregar Recordatorio</button>

      {/* Modal */}
      {showModal && (
        <div className="modal">
          <h3>Agregar recordatorio para el día {selectedDate}</h3>
          <button onClick={() => setShowModal(false)}>Cerrar</button>
          {/* Aquí puedes agregar el formulario */}
        </div>
      )}
    </div>
  );
}

export default CalendarPage;