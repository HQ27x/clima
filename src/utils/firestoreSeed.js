import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function seedFirestoreSample() {
  const results = { created: [] };
  try {
    // Create sample users (docId as friendly ids for dev)
    const users = [
      { id: 'admin', displayName: 'Administrador', email: 'admin@clima.com', gender: 'masculino' },
      { id: 'usuario', displayName: 'Usuario', email: 'usuario@clima.com', gender: 'femenino' },
      { id: 'test', displayName: 'Test', email: 'test@clima.com', gender: 'otro' }
    ];

    for (const u of users) {
      await setDoc(doc(db, 'users', u.id), {
        displayName: u.displayName,
        email: u.email,
        gender: u.gender,
        createdAt: serverTimestamp()
      });
      results.created.push({ collection: 'users', id: u.id });
    }

    // Create sample posts
    const posts = [
      { authorId: 'admin', content: 'Bienvenidos al foro de Alertify', likesCount: 0, starsCount: 0 },
      { authorId: 'usuario', content: '¿Alguien sabe cómo interpretar el índice UV?', likesCount: 2, starsCount: 1 }
    ];
    for (const p of posts) {
      const r = await addDoc(collection(db, 'posts'), { ...p, createdAt: serverTimestamp() });
      results.created.push({ collection: 'posts', id: r.id });
    }

    // Create sample feedbacks
    const feedbacks = [
      { name: 'Maria', message: 'La app se ve genial', meta: { browser: 'Chrome' } },
      { name: 'Carlos', message: 'Falto más info sobre alertas', meta: { browser: 'Edge' } }
    ];
    for (const f of feedbacks) {
      const r = await addDoc(collection(db, 'feedbacks'), { ...f, createdAt: serverTimestamp() });
      results.created.push({ collection: 'feedbacks', id: r.id });
    }

    // Create sample locations
    const locations = [
      { name: 'Plaza Mayor', latitude: -12.046374, longitude: -77.042793, accuracy: 15 },
      { name: 'Miraflores', latitude: -12.121383, longitude: -77.031728, accuracy: 10 }
    ];
    for (const l of locations) {
      const r = await addDoc(collection(db, 'locations'), { ...l, savedAt: serverTimestamp() });
      results.created.push({ collection: 'locations', id: r.id });
    }

    // Create a weather_cache sample
    const wc = await addDoc(collection(db, 'weather_cache'), {
      lat_lng_hash: 'lat_-12.0464_lng_-77.0428',
      fetchedAt: serverTimestamp(),
      source: 'seed-mock',
      payload: { sample: true },
      ttl: 3600
    });
    results.created.push({ collection: 'weather_cache', id: wc.id });

    return results;
  } catch (err) {
    console.error('seedFirestoreSample error', err);
    throw err;
  }
}
