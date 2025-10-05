import React, { useEffect, useRef, useState } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { FiCamera, FiUser } from 'react-icons/fi';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      // guests cannot edit profile; show local storage values if any
      if (!u) {
        try{
          const lsName = localStorage.getItem('guest_name') || 'Invitado';
          const lsPhoto = localStorage.getItem('guest_photo') || '';
          setDisplayName(lsName);
          setPhotoURL(lsPhoto);
        }catch(_){ setDisplayName('Invitado'); setPhotoURL(''); }
        return;
      }
      // try to load Firestore profile first
      try{
        const docRef = doc(db, 'users', u.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const d = snap.data() || {};
          setDisplayName(d.displayName || u.displayName || '');
          setPhotoURL(d.photoURL || u.photoURL || '');
        } else {
          setDisplayName(u.displayName || '');
          setPhotoURL(u.photoURL || '');
        }
      }catch(_){
        setDisplayName(u.displayName || '');
        setPhotoURL(u.photoURL || '');
      }
    });
    return () => unsub();
  }, []);

  const handlePickFile = () => fileInputRef.current && fileInputRef.current.click();

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target && ev.target.result ? String(ev.target.result) : '';
      setPhotoURL(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try{
      if (!user) {
        // guest: store locally
        try{
          localStorage.setItem('guest_name', displayName || 'Invitado');
          if (photoURL) localStorage.setItem('guest_photo', photoURL); else localStorage.removeItem('guest_photo');
          alert('Perfil de invitado actualizado');
        }catch(_){ alert('No se pudo guardar el perfil de invitado'); }
        return;
      }
      // update Firebase Auth profile (displayName, photoURL)
      try{ await updateProfile(user, { displayName: displayName || user.displayName, photoURL: photoURL || user.photoURL }); }catch(_){ }
      // upsert Firestore user doc
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      const payload = { displayName: displayName || '', photoURL: photoURL || '' };
      if (snap.exists()) await updateDoc(ref, payload); else await setDoc(ref, payload, { merge: true });
      alert('Perfil actualizado');
    }catch(e){
      console.error('save profile error', e);
      alert('No se pudo actualizar el perfil');
    }finally{
      setSaving(false);
    }
  };

  return (
    <div className="step-container">
      <div className="step-header">
        <h1 className="step-title">Editar perfil</h1>
        <p className="step-subtitle">Actualiza tu nombre y foto</p>
      </div>

      <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
          <div style={{ position:'relative' }}>
            <div style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'var(--hover)',
              border: '2px solid var(--border)',
              display: 'flex', alignItems:'center', justifyContent:'center'
            }}>
              {photoURL ? (
                <img src={photoURL} alt="foto de perfil" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <FiUser style={{ fontSize: 48, color: 'var(--textSecondary)' }} />
              )}
            </div>
            <button type="button" onClick={handlePickFile} className="btn" style={{ position:'absolute', right: -8, bottom: -8, padding:8 }}>
              <FiCamera />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display:'none' }} />
          </div>

          <div style={{ width:'100%' }}>
            <label htmlFor="displayName" style={{ display:'block', color:'var(--text)', fontWeight:600, marginBottom:6 }}>Nombre</label>
            <input id="displayName" className="input" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Tu nombre" />
          </div>

          <div style={{ display:'flex', gap:12, marginTop:8 }}>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;


