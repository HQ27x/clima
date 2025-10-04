import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import './Login.css';

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Usuarios predeterminados para pruebas
  const defaultUsers = [
    { email: 'admin@clima.com', password: 'admin123', name: 'Administrador' },
    { email: 'usuario@clima.com', password: 'user123', name: 'Usuario' },
    { email: 'test@clima.com', password: 'test123', name: 'Test' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Verificar usuarios predeterminados primero
      const user = defaultUsers.find(u => u.email === email && u.password === password);
      
      if (user) {
        // Usuario predeterminado encontrado
        console.log(`Bienvenido ${user.name}`);
        onLogin();
      } else {
        // Intentar con Firebase si está configurado
        if (isLogin) {
          await signInWithEmailAndPassword(auth, email, password);
        } else {
          await createUserWithEmailAndPassword(auth, email, password);
        }
        onLogin();
      }
    } catch (error) {
      setError('Credenciales incorrectas. Usa los usuarios predeterminados o verifica tu configuración de Firebase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Clima App</h1>
          <p>Accede a información meteorológica precisa</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <div className="input-group">
              <FiMail className="input-icon" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
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

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary login-btn"
          >
            {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="link-button"
            >
              {isLogin ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>

        <div className="demo-users">
          <h4>Usuarios de Prueba</h4>
          <div className="demo-users-list">
            {defaultUsers.map((user, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setEmail(user.email);
                  setPassword(user.password);
                }}
                className="demo-user-btn"
              >
                <span className="demo-email">{user.email}</span>
                <span className="demo-password">{user.password}</span>
              </button>
            ))}
          </div>
          <p className="demo-info">
            Haz clic en cualquier usuario para llenar automáticamente los campos
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
