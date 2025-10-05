Firebase setup for local development

1) Create a file named `.env.local` at the project root (do NOT commit it).

Example contents (replace values as appropriate):

VITE_FIREBASE_API_KEY=AIzaSyDhI4LjpUGRpf1oU-cFofq-fkivK4MKiKc
VITE_FIREBASE_AUTH_DOMAIN=alertacausa.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=alertacausa
VITE_FIREBASE_STORAGE_BUCKET=alertacausa.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=514087363199
VITE_FIREBASE_APP_ID=1:514087363199:web:3c93dc6b73ecc68ea3554a
VITE_FIREBASE_MEASUREMENT_ID=G-03H942FV0N

2) Ignore this file by ensuring your `.gitignore` contains:

.env.local

3) For server-side operations that require elevated privileges (moderation, admin tasks), use a Service Account JSON and set it as an environment variable on your server or keep the file outside the repo.

4) Optional: To use the Firebase Emulator Suite for local development, install the Firebase CLI and run `firebase emulators:start` with Firestore and Auth enabled. Then update `src/firebase/config.js` to point SDKs to the emulator when `import.meta.env.DEV` is true (we can help set this up).