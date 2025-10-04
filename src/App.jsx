import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import Login from './components/Login';
import LocationSelector from './components/LocationSelector';
import Calendar from './components/Calendar';
import WeatherInfo from './components/WeatherInfo';
import Tracking from './components/Tracking';
import Feedback from './components/Feedback';
import Forum from './components/Forum';
import Navigation from './components/Navigation';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => setUser(true)} />;
  }

  return (
    <Router>
      <div className="app">
        <Navigation currentStep={currentStep} />
        <main className="main-content">
          <Routes>
            <Route 
              path="/" 
              element={
                <LocationSelector 
                  onLocationSelect={(loc) => {
                    setLocation(loc);
                    setCurrentStep(2);
                  }} 
                />
              } 
            />
            <Route 
              path="/calendar" 
              element={
                <Calendar 
                  location={location}
                  onNext={() => setCurrentStep(3)}
                />
              } 
            />
            <Route 
              path="/weather" 
              element={
                <WeatherInfo 
                  location={location}
                  onNext={() => setCurrentStep(4)}
                />
              } 
            />
            <Route 
              path="/tracking" 
              element={
                <Tracking 
                  location={location}
                  onNext={() => setCurrentStep(5)}
                />
              } 
            />
            <Route 
              path="/feedback" 
              element={
                <Feedback 
                  location={location}
                  onNext={() => setCurrentStep(6)}
                />
              } 
            />
            <Route 
              path="/forum" 
              element={<Forum />} 
            />
            <Route 
              path="/login" 
              element={<Login onLogin={() => setUser(true)} />} 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
