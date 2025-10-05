import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiUserCheck } from 'react-icons/fi';
import './Login.css';

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login is shown before Router is mounted in App, so avoid using useNavigate here.

  // no demo users

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('Login.handleSubmit start', { isLogin, email });

    try {
      if (isLogin) {
        console.log('Login: attempting sign in', email);
        // Modo login - intentar con Firebase Auth
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          console.log('Login: signInWithEmailAndPassword returned', cred && cred.user && cred.user.uid);
          const user = cred.user;
          // Verificar que exista el perfil en Firestore users/{uid}
          const profileSnap = await getDoc(doc(db, 'users', user.uid));
          console.log('Login: profileSnap.exists=', profileSnap.exists());
          if (!profileSnap.exists()) {
            // Si no existe, cerrar sesión y mostrar error
            await signOut(auth);
            setError('No existe perfil asociado en la base de datos. Regístrate primero.');
            return;
          }
          // Login exitoso y perfil existe
          console.log('Login successful and profile exists, calling onLogin');
          onLogin();
          // App will re-render and mount Router; force navigation to root
          if (typeof window !== 'undefined') window.location.replace('/');
        } catch (err) {
          console.error('Login error during signIn', err);
          // Pasar al catch general
          throw err;
        }
      } else {
        // Modo registro - validar campos requeridos
        if (!name.trim() || !email.trim() || !password.trim() || !gender) {
          setError('Por favor completa todos los campos');
          return;
        }
        
  // Crear usuario con Firebase
  console.log('Register: creating user', email);
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  console.log('Register: createUserWithEmailAndPassword returned', userCred && userCred.user && userCred.user.uid);
  const user = userCred.user;
        // Actualizar displayName en el perfil de Auth (opcional)
        try {
          await updateProfile(user, { displayName: name });
        } catch (updErr) {
          // no critico
          console.warn('No se pudo actualizar displayName:', updErr);
        }

        // Guardar perfil en Firestore en collection 'users' (docId = uid)
        try {
          await setDoc(doc(db, 'users', user.uid), {
            displayName: name,
            email: email,
            gender: gender,
            createdAt: serverTimestamp()
          });
    console.log('Register: profile saved in Firestore for', user.uid);
        } catch (dbErr) {
          console.error('Error guardando usuario en Firestore:', dbErr);
          // si falla guardar perfil, cerrar sesión para evitar inconsistencias
          try { await signOut(auth); } catch(e){ /* ignore */ }
          throw dbErr;
        }

  console.log(`Usuario registrado: ${name} (${gender})`);
  onLogin();
  if (typeof window !== 'undefined') window.location.replace('/');
      }
    } catch (error) {
      console.error('Login/Register error', error);
      if (isLogin) {
        // Mostrar mensaje específico para errores de autenticación
        if (error?.code === 'auth/invalid-login-credentials') {
          // Mensaje amigable solicitado por el usuario
          setError('Error de inicio de sesion, usuario y/o contraseña incorrecto.');
        } else {
          // Mostrar mensaje detallado para otros códigos
          const codePart = error?.code ? ` [${error.code}]` : '';
          setError(error?.message ? `Error inicio de sesión: ${error.message}${codePart}` : 'Credenciales incorrectas. Verifica tu correo y contraseña.');
        }
      } else {
        // Registro: mostrar código y mensaje si están disponibles
        if (error?.code === 'auth/email-already-in-use') {
          setError('El correo ya está en uso. Prueba iniciar sesión o usa otro correo.');
        } else {
          setError(error?.message ? `Error al registrar usuario: ${error.message}` : 'Error al registrar usuario. Verifica que el correo no esté en uso.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    // allow a quick guest/login without Firebase auth (for demos)
    console.log('Guest login requested');
    try{
      setLoading(true);
      // mark guest in localStorage so other parts of the app can detect
      if (typeof window !== 'undefined') localStorage.setItem('clima_guest', '1');
      // short delay to show spinner
      setTimeout(()=>{
        setLoading(false);
        onLogin();
        if (typeof window !== 'undefined') window.location.replace('/');
      }, 200);
    }catch(e){
      console.error('Guest login failed', e);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Alertify</h1>
          <p>Access accurate weather information</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Full name</label>
              <div className="input-group">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required={!isLogin}
                  className="input"
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-group">
              <FiMail className="input-icon" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-group">
              <FiLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <div className="input-group">
                <FiUserCheck className="input-icon" />
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required={!isLogin}
                  className="input select-input"
                >
                  <option value="">Select your gender</option>
                  <option value="masculino">Male</option>
                  <option value="femenino">Female</option>
                  <option value="otro">Other</option>
                  <option value="prefiero-no-decir">Prefer not to say</option>
                </select>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary login-btn"
          >
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Register')}
          </button>
          {isLogin && (
            <div style={{marginTop:8, display:'flex', justifyContent:'center'}}>
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={loading}
                className="guest-btn"
              >
                Sign in as guest
              </button>
            </div>
          )}
        </form>

        <div className="login-footer">
          <p>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="link-button"
            >
              {isLogin ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* demo users removed */}
      </div>
    </div>
  );
};

export default Login;
