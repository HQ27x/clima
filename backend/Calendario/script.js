document.addEventListener('DOMContentLoaded', () => {
    const monthYearStr = document.getElementById('month-year-str');
    const calendarDays = document.getElementById('calendar-days');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const addEventModal = document.getElementById('add-event-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const saveEventBtn = document.getElementById('save-event-btn');
    const deleteEventBtn = document.getElementById('delete-event-btn');
    const eventTitleInput = document.getElementById('event-title-input');
    const eventDateEl = document.getElementById('event-date');
    const notificationContainer = document.getElementById('notification-container');

    let currentDate = new Date();
    let events = JSON.parse(localStorage.getItem('events')) || {};
    let selectedDate = null;

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const lastDayOfPrevMonth = new Date(year, month, 0);

        monthYearStr.textContent = `${currentDate.toLocaleDateString('es-ES', { month: 'long' })} ${year}`;
        calendarDays.innerHTML = '';

        // Días del mes anterior
        for (let i = firstDayOfMonth.getDay(); i > 0; i--) {
            const day = document.createElement('div');
            day.classList.add('day', 'empty');
            day.textContent = lastDayOfPrevMonth.getDate() - i + 1;
            calendarDays.appendChild(day);
        }

        // Días del mes actual
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            const day = document.createElement('div');
            day.classList.add('day');
            day.textContent = i;
            
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            
            if (events[dateStr]) {
                day.classList.add('has-event');
            }

            const today = new Date();
            if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                day.classList.add('today');
            }

            day.addEventListener('click', () => openModal(dateStr));
            calendarDays.appendChild(day);
        }
    };

    const openModal = (dateStr) => {
        selectedDate = dateStr;
        const [year, month, day] = dateStr.split('-');
        const dateObj = new Date(year, month - 1, day);
        eventDateEl.textContent = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        if (events[selectedDate]) {
            eventTitleInput.value = events[selectedDate];
            deleteEventBtn.classList.remove('hidden');
        } else {
            eventTitleInput.value = '';
            deleteEventBtn.classList.add('hidden');
        }
        addEventModal.style.display = 'block';
    };

    const closeModal = () => {
        addEventModal.style.display = 'none';
    };

    const saveEvent = () => {
        if (eventTitleInput.value && selectedDate) {
            events[selectedDate] = eventTitleInput.value;
            localStorage.setItem('events', JSON.stringify(events));
            closeModal();
            renderCalendar();
            checkNotifications();
        }
    };

    const deleteEvent = () => {
        if (selectedDate) {
            delete events[selectedDate];
            localStorage.setItem('events', JSON.stringify(events));
            closeModal();
            renderCalendar();
            checkNotifications();
        }
    };

    const checkNotifications = () => {
        notificationContainer.innerHTML = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalizar a medianoche

        for (const dateStr in events) {
            // Corregir el problema de la zona horaria al crear la fecha del evento
            const [year, month, day] = dateStr.split('-').map(Number);
            const eventDate = new Date(year, month - 1, day);

            const diffTime = eventDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Notificar si el evento es hoy o en los próximos 5 días
            if (diffDays >= 0 && diffDays <= 5) {
                displayNotification(events[dateStr], diffDays);
            }
        }
    };

    const displayNotification = (title, daysUntil) => {
        const notification = document.createElement('div');
        notification.classList.add('notification');
        
        let message = `Recordatorio: ${title}`;
        if (daysUntil === 0) {
            message += ' - ¡Hoy es el día!';
        } else if (daysUntil === 1) {
            message += ' - Mañana.';
        } else {
            message += ` - en ${daysUntil} días.`;
        }
        
        notification.textContent = message;
        notificationContainer.appendChild(notification);
    };

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    closeModalBtn.addEventListener('click', closeModal);
    saveEventBtn.addEventListener('click', saveEvent);
    deleteEventBtn.addEventListener('click', deleteEvent);

    window.addEventListener('click', (e) => {
        if (e.target === addEventModal) {
            closeModal();
        }
    });

    // Renderizar calendario y comprobar notificaciones al cargar la página
    renderCalendar();
    checkNotifications();
});
