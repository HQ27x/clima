import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { FiMapPin, FiCalendar, FiCloud, FiMessageSquare, FiUsers, FiMoreVertical, FiUser, FiLogOut } from 'react-icons/fi';
import ThemeToggle from './ThemeToggle';
import './Navigation.css';
import { useTheme } from '../contexts/ThemeContext';
import lightIcon from '../img/icon-clima-light.svg';
import darkIcon from '../img/icon-clima-dark.svg';

const Navigation = ({ currentStep }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginRoute = location.pathname === '/login';
  const { isDark } = useTheme();
  const logoIcon = isDark ? darkIcon : lightIcon;
  const [menuOpen, setMenuOpen] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsGuest(!!localStorage.getItem('clima_guest'));
    }
  }, [location.pathname]);
  
  const steps = [
  { path: '/', icon: FiMapPin, label: 'Location', step: 1 },
  { path: '/calendar', icon: FiCalendar, label: 'Calendar', step: 2 },
  { path: '/weather', icon: FiCloud, label: 'Weather', step: 3 },
  { path: '/feedback', icon: FiMessageSquare, label: 'Feedback', step: 4 },
  { path: '/forum', icon: FiUsers, label: 'Forum', step: 5 }
  ];

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-logo">
          {!isLoginRoute && (
            <>
              <img src={logoIcon} alt="Alertify icon" className="nav-logo-icon" />
              <h2>Alertify</h2>
            </>
          )}
        </div>
        
        {!isLoginRoute && (
          <div className="nav-steps">
            {steps.map((step) => {
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
            <div className="nav-menu" ref={menuRef}>
              <button
                className="menu-trigger"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                title="Options"
              >
                <FiMoreVertical />
              </button>
              {menuOpen && (
                <div className="menu-dropdown" role="menu">
                  {isGuest ? (
                    <button
                      className="menu-item"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        if (typeof window !== 'undefined') localStorage.removeItem('clima_guest');
                        navigate('/login');
                      }}
                    >
                      <FiLogOut className="menu-item-icon" />
                      <span>Exit guest</span>
                    </button>
                  ) : (
                    <>
                      <button
                        className="menu-item"
                        role="menuitem"
                        onClick={() => { setMenuOpen(false); navigate('/forum'); }}
                      >
                        <FiUser className="menu-item-icon" />
                        <span>View profile</span>
                      </button>
                      <button
                        className="menu-item"
                        role="menuitem"
                        onClick={async ()=>{
                          setMenuOpen(false);
                          try{ await signOut(auth); }catch(e){ /* ignore */ }
                          if (typeof window !== 'undefined') localStorage.removeItem('clima_guest');
                          navigate('/login');
                        }}
                      >
                        <FiLogOut className="menu-item-icon" />
                        <span>Sign out</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
