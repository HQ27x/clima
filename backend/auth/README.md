Auth server for Clima (backend/auth)

This small Express server provides two endpoints:

- POST /register  { name, email, password, gender }
  - Creates a Firestore document in the `users` collection and stores a hashed password (passwordHash).
- POST /login { email, password }
  - Verifies password and returns a JWT + profile data.

Setup:
1. Copy your Firebase Service Account JSON to `backend/auth/service-account.json` or set `GOOGLE_APPLICATION_CREDENTIALS` env var to its path.
2. Install deps:
   cd backend/auth
   npm install
3. Run:
   npm start

Security notes:
- This server writes `passwordHash` to Firestore. Do NOT expose this collection publicly. Use Firestore rules to prevent client reads of `passwordHash`.
- For production, set a strong `JWT_SECRET` and store credentials securely.
