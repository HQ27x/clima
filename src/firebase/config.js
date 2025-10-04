import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Reemplaza estos valores con tu configuración real de Firebase
  apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Tu API Key real
  authDomain: "tu-proyecto-12345.firebaseapp.com", // Tu dominio real
  projectId: "tu-proyecto-12345", // Tu Project ID real
  storageBucket: "tu-proyecto-12345.appspot.com", // Tu Storage Bucket real
  messagingSenderId: "123456789012", // Tu Sender ID real
  appId: "1:123456789012:web:abcdef1234567890" // Tu App ID real
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
