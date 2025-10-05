import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMapPin, FiCalendar, FiCloud, FiMessageSquare, FiUsers } from 'react-icons/fi';
import './Navigation.css';

const BottomNav = () => {
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  if (isLogin) return null;

  const steps = [
    { path: '/', icon: FiMapPin, label: 'Location' },
    { path: '/calendar', icon: FiCalendar, label: 'Calendar' },
    { path: '/weather', icon: FiCloud, label: 'Weather' },
    { path: '/feedback', icon: FiMessageSquare, label: 'Feedback' },
    { path: '/forum', icon: FiUsers, label: 'Forum' }
  ];

  return (
    <div className="nav-bottom">
      {steps.map((step)=>{
        const Icon = step.icon;
        const isActive = location.pathname === step.path;
        return (
          <Link key={step.path} to={step.path} className={`bottom-step ${isActive ? 'active' : ''}`}>
            <Icon className="bottom-icon" />
            <span className="bottom-label">{step.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNav;


