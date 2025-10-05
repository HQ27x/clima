import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Valores por defecto (proporcionados)
const FALLBACK = {
  apiKey: 'AIzaSyDhI4LjpUGRpf1oU-cFofq-fkivK4MKiKc',
  authDomain: 'alertacausa.firebaseapp.com',
  projectId: 'alertacausa',
  storageBucket: 'alertacausa.firebasestorage.app',
  messagingSenderId: '514087363199',
  appId: '1:514087363199:web:3c93dc6b73ecc68ea3554a',
  measurementId: 'G-03H942FV0N'
};

// Leer desde variables de entorno (Vite) con fallback a los valores proporcionados
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? FALLBACK.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? FALLBACK.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? FALLBACK.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? FALLBACK.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? FALLBACK.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? FALLBACK.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? FALLBACK.measurementId
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics: inicializar solo en entorno navegador y si measurementId está presente
try {
  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    // eslint-disable-next-line no-unused-vars
    const analytics = getAnalytics(app);
  }
} catch (e) {
  // algunos bundlers/entornos pueden no soportar analytics en SSR/dev; ignorar errores
  // console.warn('Firebase analytics disabled:', e);
}

export default app;
