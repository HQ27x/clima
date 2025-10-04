# Clima App - Aplicación Meteorológica Interactiva

Una aplicación web moderna para el seguimiento del clima con funcionalidades de ubicación, calendario, feedback y foro de participación.

## 🌟 Características

- **Autenticación**: Sistema de login/registro con Firebase
- **Ubicación Inteligente**: Mapa interactivo con selección precisa de coordenadas
- **Calendario de Recordatorios**: Programación de alertas meteorológicas (3-5 días)
- **Información del Clima**: Datos meteorológicos detallados y pronóstico
- **Seguimiento**: Monitoreo del progreso y objetivos
- **Sistema de Feedback**: Evaluación con estrellas y comentarios
- **Foro de Participación**: Comunidad con sistema de credibilidad

## 🎨 Identidad Visual

- **Paleta de Colores**:
  - Primario: #2563EB (Azul)
  - Secundario: #10B981 (Verde)
  - Fondo: #0B1220 (Azul oscuro)
  - Texto principal: #FFFFFF
  - Texto secundario: #9CA3AF

- **Tipografía**: Inter (Regular y Semibold)
- **Iconografía**: Estilo lineal simple

## 🚀 Instalación

### Prerrequisitos

- Node.js (versión 16 o superior)
- npm o yarn
- Cuenta de Firebase

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd clima-app
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar Firebase**
   - Ve a [Firebase Console](https://console.firebase.google.com/)
   - Crea un nuevo proyecto
   - Habilita Authentication y Firestore Database
   - Copia la configuración de Firebase
   - Reemplaza la configuración en `src/firebase/config.js`

4. **Configurar variables de entorno** (opcional)
   ```bash
   cp .env.example .env
   ```
   Edita el archivo `.env` con tus configuraciones.

5. **Ejecutar la aplicación**
   ```bash
   npm run dev
   ```

La aplicación estará disponible en `http://localhost:3000`

## 📱 Funcionalidades Detalladas

### 1. Autenticación
- Login y registro de usuarios
- Integración con Firebase Auth
- Interfaz moderna y responsive

### 2. Selección de Ubicación
- Mapa interactivo con Leaflet
- Búsqueda por nombre de ciudad
- Selección precisa con coordenadas
- Ubicación automática del usuario

### 3. Calendario de Recordatorios
- Vista de calendario con react-calendar
- Recordatorios programables (3-5 días máximo)
- Notificaciones visuales
- Gestión de tareas completadas

### 4. Información del Clima
- Datos meteorológicos actuales
- Pronóstico de 5 días
- Alertas meteorológicas
- Índices UV y humedad

### 5. Seguimiento
- Progreso visual del seguimiento
- Hitos y objetivos
- Historial de condiciones climáticas
- Notas personalizadas

### 6. Sistema de Feedback
- Calificación con estrellas (1-5)
- Comentarios detallados
- Tipos de feedback (positivo/sugerencia)
- Historial de evaluaciones

### 7. Foro de Participación
- Posts de la comunidad
- Sistema de estrellas y credibilidad
- Filtros por ubicación
- Estadísticas del foro

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 18, Vite
- **Routing**: React Router DOM
- **Mapas**: Leaflet, React Leaflet
- **Calendario**: React Calendar
- **Backend**: Firebase (Auth, Firestore)
- **Estilos**: CSS3 con variables personalizadas
- **Iconos**: React Icons
- **Fechas**: date-fns

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── Login.jsx
│   ├── LocationSelector.jsx
│   ├── Calendar.jsx
│   ├── WeatherInfo.jsx
│   ├── Tracking.jsx
│   ├── Feedback.jsx
│   ├── Forum.jsx
│   └── Navigation.jsx
├── firebase/           # Configuración de Firebase
│   └── config.js
├── App.jsx            # Componente principal
├── App.css           # Estilos globales
├── main.jsx          # Punto de entrada
└── index.css         # Estilos base
```

## 🔧 Configuración de Firebase

1. **Authentication**:
   - Habilita Email/Password
   - Configura las reglas de seguridad

2. **Firestore Database**:
   - Crea las siguientes colecciones:
     - `feedback` - Para almacenar evaluaciones
     - `forum_posts` - Para posts del foro
     - `weather_reminders` - Para recordatorios (opcional)

3. **Reglas de Firestore** (ejemplo):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

## 🎯 Flujo de Usuario

1. **Login/Registro** → Autenticación inicial
2. **Selección de Ubicación** → Mapa interactivo
3. **Calendario** → Programación de recordatorios
4. **Información del Clima** → Datos meteorológicos
5. **Seguimiento** → Monitoreo del progreso
6. **Feedback** → Evaluación de la experiencia
7. **Foro** → Participación en la comunidad

## 📱 Responsive Design

La aplicación está optimizada para:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (320px - 767px)

## 🚀 Despliegue

### Vercel (Recomendado)
1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Despliega automáticamente

### Netlify
1. Build del proyecto: `npm run build`
2. Sube la carpeta `dist` a Netlify
3. Configura las variables de entorno

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas:
- Abre un issue en GitHub
- Contacta al equipo de desarrollo

## 🔮 Próximas Características

- [ ] Notificaciones push
- [ ] Integración con APIs meteorológicas reales
- [ ] Modo offline
- [ ] Exportación de datos
- [ ] Widgets personalizables
- [ ] Integración con redes sociales

---

Desarrollado con ❤️ para la comunidad meteorológica
