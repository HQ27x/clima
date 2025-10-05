import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { FiMapPin, FiCalendar, FiCloud, FiMessageSquare, FiUsers } from 'react-icons/fi';
import ThemeToggle from './ThemeToggle';
import './Navigation.css';

const Navigation = ({ currentStep }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginRoute = location.pathname === '/login';
  
  const steps = [
    { path: '/', icon: FiMapPin, label: 'Ubicación', step: 1 },
    { path: '/calendar', icon: FiCalendar, label: 'Calendario', step: 2 },
    { path: '/weather', icon: FiCloud, label: 'Clima', step: 3 },
    { path: '/feedback', icon: FiMessageSquare, label: 'Feedback', step: 4 },
    { path: '/forum', icon: FiUsers, label: 'Foro', step: 5 }
  ];

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-logo">
          {!isLoginRoute && <h2>Alertify</h2>}
        </div>
        
        {!isLoginRoute && (
          <div className="nav-steps">
            {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = location.pathname === step.path;
            const isCompleted = currentStep > step.step;
            
            return (
              <Link
                key={step.path}
                to={step.path}
                className={`nav-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <Icon className="nav-icon" />
                <span className="nav-label">{step.label}</span>
              </Link>
            );
            })}
          </div>
        )}
        
        {!isLoginRoute && (
          <div className="nav-actions">
            <ThemeToggle />
            <button
              className="btn btn-logout"
              onClick={async ()=>{
                try{ await signOut(auth); }catch(e){ /* ignore */ }
                if (typeof window !== 'undefined') localStorage.removeItem('clima_guest');
                navigate('/login');
              }}
            >Salir</button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
