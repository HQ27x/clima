import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './components/Login';
import LocationSelector from './components/LocationSelector';
import Calendar from './components/Calendar';
import WeatherInfo from './components/WeatherInfo';
import Feedback from './components/Feedback';
import Forum from './components/Forum';
import Navigation from './components/Navigation';
import ThemeToggle from './components/ThemeToggle';
import './App.css';
import { seedFirestoreSample } from './utils/firestoreSeed';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [location, setLocation] = useState(null);
  const [seedResult, setSeedResult] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      // If Firebase returns a real user, use it.
      if (fbUser) {
        setUser(fbUser);
        setLoading(false);
        return;
      }

      // No firebase user: check if the app was opened as a guest
      try {
        if (typeof window !== 'undefined' && localStorage.getItem('clima_guest') === '1') {
          // Represent guest with a simple object so components can detect truthy user
          setUser({ guest: true });
        } else {
          setUser(null);
        }
      } catch (e) {
        // If accessing localStorage fails, default to null
        setUser(null);
      }

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
    return (
      <ThemeProvider>
        <Login onLogin={() => setUser(true)} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="app">
          {import.meta.env.DEV && (
            <div style={{position:'fixed', right:12, bottom:12, zIndex:2000}}>
              <button className="btn" onClick={async ()=>{
                try{
                  const res = await seedFirestoreSample();
                  setSeedResult(res);
                  alert('Seed completo. Revisa Firestore o el log.');
                }catch(e){
                  console.error(e);
                  alert('Error al seedear: ' + (e.message || e));
                }
              }}>Seed DB (dev)</button>
            </div>
          )}
          {seedResult && import.meta.env.DEV && (
            <div style={{position:'fixed', left:12, bottom:12, zIndex:2000, background:'#0b1220', color:'#fff', padding:12, borderRadius:6}}>
              <strong>Seed result:</strong>
              <pre style={{maxHeight:200, overflow:'auto', marginTop:6}}>{JSON.stringify(seedResult, null, 2)}</pre>
            </div>
          )}
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
                path="/feedback" 
                element={
                  <Feedback 
                    location={location}
                    onNext={() => setCurrentStep(5)}
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
    </ThemeProvider>
  );
}

export default App;
