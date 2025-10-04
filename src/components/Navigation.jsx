import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMapPin, FiCalendar, FiCloud, FiTarget, FiMessageSquare, FiUsers } from 'react-icons/fi';
import './Navigation.css';

const Navigation = ({ currentStep }) => {
  const location = useLocation();
  
  const steps = [
    { path: '/', icon: FiMapPin, label: 'Ubicación', step: 1 },
    { path: '/calendar', icon: FiCalendar, label: 'Calendario', step: 2 },
    { path: '/weather', icon: FiCloud, label: 'Clima', step: 3 },
    { path: '/tracking', icon: FiTarget, label: 'Seguimiento', step: 4 },
    { path: '/feedback', icon: FiMessageSquare, label: 'Feedback', step: 5 },
    { path: '/forum', icon: FiUsers, label: 'Foro', step: 6 }
  ];

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-logo">
          <h2>Alterta Causa</h2>
        </div>
        
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
      </div>
    </nav>
  );
};

export default Navigation;
