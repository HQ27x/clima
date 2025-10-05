import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
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
      if (isLogin) {
        // Modo login - verificar usuarios predeterminados primero
        const user = defaultUsers.find(u => u.email === email && u.password === password);
        
        if (user) {
          // Usuario predeterminado encontrado
          console.log(`Bienvenido ${user.name}`);
          onLogin();
        } else {
          // Intentar con Firebase si está configurado
          await signInWithEmailAndPassword(auth, email, password);
          onLogin();
        }
      } else {
        // Modo registro - validar campos requeridos
        if (!name.trim() || !email.trim() || !password.trim() || !gender) {
          setError('Por favor completa todos los campos');
          return;
        }
        
        // Crear usuario con Firebase
        await createUserWithEmailAndPassword(auth, email, password);
        console.log(`Usuario registrado: ${name} (${gender})`);
        onLogin();
      }
    } catch (error) {
      if (isLogin) {
        setError('Credenciales incorrectas. Usa los usuarios predeterminados o verifica tu configuración de Firebase.');
      } else {
        setError('Error al registrar usuario. Verifica que el correo no esté en uso.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Alertify</h1>
          <p>Accede a información meteorológica precisa</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Nombre completo</label>
              <div className="input-group">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre completo"
                  required={!isLogin}
                  className="input"
                />
              </div>
            </div>
          )}

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

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="gender">Sexo</label>
              <div className="input-group">
                <FiUserCheck className="input-icon" />
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required={!isLogin}
                  className="input select-input"
                >
                  <option value="">Selecciona tu sexo</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                  <option value="prefiero-no-decir">Prefiero no decir</option>
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

        {isLogin && (
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
        )}
      </div>
    </div>
  );
};

export default Login;
