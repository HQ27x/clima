// Importa los hooks necesarios de React y las funciones de Firestore
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";

// Importa TU configuración de la base de datos desde config.js
import { db } from "./config.js"; // Asegúrate que la ruta sea correcta

function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // --- NUEVOS ESTADOS ---
  // Para guardar el texto y la ubicación del nuevo recordatorio
  const [reminderText, setReminderText] = useState("");
  const [reminderLocation, setReminderLocation] = useState("");
  // Para guardar la lista de todos los recordatorios traídos desde Firebase
  const [reminders, setReminders] = useState([]);

  // --- FUNCIÓN PARA CARGAR LOS RECORDATORIOS ---
  // useEffect se ejecuta una vez cuando el componente se carga por primera vez
  useEffect(() => {
    const fetchReminders = async () => {
      try {
        // Obtenemos todos los documentos de la colección "recordatorios"
        const querySnapshot = await getDocs(collection(db, "recordatorios"));
        const remindersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReminders(remindersData); // Guardamos los datos en el estado
        console.log("Recordatorios cargados:", remindersData);
      } catch (error) {
        console.error("Error al cargar recordatorios: ", error);
      }
    };

    fetchReminders();
  }, []); // El array vacío [] asegura que se ejecute solo una vez

  // --- FUNCIÓN PARA GUARDAR UN NUEVO RECORDATORIO ---
  const handleSaveReminder = async () => {
    // Validamos que los campos no estén vacíos
    if (!reminderText || !reminderLocation || !selectedDate) {
      alert("Por favor, completa todos los campos y selecciona una fecha.");
      return;
    }

    try {
      // Creamos un nuevo objeto con los datos del recordatorio
      const newReminder = {
        date: selectedDate,
        text: reminderText,
        location: reminderLocation,
        // Opcional: guardar una fecha más completa para ordenar en el futuro
        // createdAt: new Date() 
      };

      // Usamos addDoc para añadir el nuevo objeto como un documento en Firestore
      const docRef = await addDoc(collection(db, "recordatorios"), newReminder);
      
      // Actualizamos el estado local para ver el cambio al instante, sin recargar
      setReminders([...reminders, { id: docRef.id, ...newReminder }]);

      // Limpiamos los campos y cerramos el modal
      setShowModal(false);
      setReminderText("");
      setReminderLocation("");
      setSelectedDate(null);
      alert("¡Recordatorio guardado con éxito! ✅");

    } catch (e) {
      console.error("Error al guardar el recordatorio: ", e);
      alert("Hubo un error al guardar. Revisa la consola.");
    }
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
  };
  
  const handleAddReminderClick = () => {
    if (!selectedDate) {
      alert("Primero selecciona un día del calendario 📅");
      return;
    }
    setShowModal(true);
  };

  return (
    <div className="calendar-page">
      {/* Tu estructura de calendario. Aquí solo pongo un ejemplo simple. */}
      {/* ... Tu calendario va aquí ... */}

      {/* Botón para agregar recordatorio */}
      <button onClick={handleAddReminderClick}>Agregar Recordatorio</button>

      {/* --- MODAL CON FORMULARIO --- */}
      {showModal && (
        <div className="modal">
          <h3>Agregar recordatorio para el día {selectedDate}</h3>
          
          {/* Inputs para el formulario */}
          <input 
            type="text" 
            placeholder="Descripción (ej: paseo familiar)"
            value={reminderText}
            onChange={(e) => setReminderText(e.target.value)}
          />
          <input 
            type="text" 
            placeholder="Lugar (ej: Lima)"
            value={reminderLocation}
            onChange={(e) => setReminderLocation(e.target.value)}
          />
          
          {/* Botones de acción del modal */}
          <button onClick={handleSaveReminder}>Guardar</button>
          <button onClick={() => setShowModal(false)}>Cancelar</button>
        </div>
      )}

      {/* --- SECCIÓN PARA MOSTRAR LOS PRÓXIMOS RECORDATORIOS --- */}
      <div className="upcoming-reminders-box">
          <h3>Próximos Recordatorios</h3>
          {reminders.length > 0 ? (
            reminders.map((reminder) => (
              <div key={reminder.id} className="reminder-item">
                <p><strong>{reminder.date}/10:</strong> {reminder.text}</p>
                <span>{reminder.location}</span>
              </div>
            ))
          ) : (
            <p>Aún no hay recordatorios programados.</p>
          )}
      </div>
    </div>
  );
}

export default CalendarPage;