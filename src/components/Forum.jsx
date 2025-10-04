import React, { useState, useEffect } from 'react';
import { FiStar, FiMessageCircle, FiHeart, FiFlag, FiSend, FiAward, FiUsers, FiMapPin, FiCalendar } from 'react-icons/fi';
import { collection, addDoc, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Forum.css';

const Forum = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [loading, setLoading] = useState(false);
  const [userStars, setUserStars] = useState(0);
  const [showNewPost, setShowNewPost] = useState(false);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [starredPosts, setStarredPosts] = useState(new Set());

  // Cargar posts del foro
  useEffect(() => {
    const loadPosts = async () => {
      try {
        let q = query(
          collection(db, 'forum_posts'),
          orderBy('timestamp', 'desc'),
          limit(20)
        );

        if (selectedLocation !== 'all') {
          q = query(
            collection(db, 'forum_posts'),
            where('location', '==', selectedLocation),
            orderBy('timestamp', 'desc'),
            limit(20)
          );
        }

        const querySnapshot = await getDocs(q);
        const postsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
          // load offline (temporarily saved) posts from localStorage and prepend them
          try{
            const raw = localStorage.getItem('forum_offline_posts');
            if(raw){
              const offline = JSON.parse(raw);
              if(Array.isArray(offline) && offline.length){
                // offline posts should appear first
                setPosts([...offline, ...postsData]);
                return;
              }
            }
          }catch(_){ /* ignore parse errors */ }

          setPosts(postsData);
      } catch (error) {
        console.error('Error cargando posts:', error);
      }
    };

    loadPosts();
  }, [selectedLocation]);

  // load liked/starred from localStorage
  useEffect(()=>{
    try{
      const rawLiked = localStorage.getItem('forum_liked_posts');
      const rawStar = localStorage.getItem('forum_starred_posts');
      setLikedPosts(new Set(rawLiked ? JSON.parse(rawLiked) : []));
      setStarredPosts(new Set(rawStar ? JSON.parse(rawStar) : []));
    }catch(e){ /* ignore */ }
  }, []);

  // Cargar estrellas del usuario (simulado)
  useEffect(() => {
    // En una app real, esto vendría de la base de datos del usuario
    setUserStars(12); // Simular 12 estrellas
  }, []);

  // Enviar nuevo post
  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setLoading(true);
    try {
      const postData = {
        content: newPost.trim(),
        author: 'Usuario Anónimo', // En una app real, usar el usuario autenticado
        location: selectedLocation === 'all' ? 'General' : selectedLocation,
        stars: 0,
        likes: 0,
        timestamp: new Date(),
        userAgent: navigator.userAgent
      };
      // Optimistic UI: prepend a temporary post while Firebase resolves
      const tempPost = { id: `temp-${Date.now()}`, ...postData, offline: false };
      setPosts(prev => [tempPost, ...(prev || [])]);

      try{
        // wrap the firebase call with a timeout so UI doesn't hang indefinitely
        await promiseWithTimeout(addDoc(collection(db, 'forum_posts'), postData), 8000);
        // on success, reload top posts to get real IDs and timestamps
        const q2 = query(
          collection(db, 'forum_posts'),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        const querySnapshot = await getDocs(q2);
        const postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPosts(postsData);
        setNewPost('');
        setShowNewPost(false);
      }catch(firebaseErr){
        // If sending to Firebase fails, save locally (temporary) so user doesn't lose content
        console.error('Firebase error while posting:', firebaseErr);
        try{
          const localPost = {
            id: `local-${Date.now()}`,
            ...postData,
            offline: true
          };
          // prepend to UI (replace temp)
          setPosts(prev => [localPost, ...(prev ? prev.filter(p=>p.id !== tempPost.id) : [])]);
          // persist to localStorage
          const raw = localStorage.getItem('forum_offline_posts');
          let arr = [];
          try{ arr = raw ? JSON.parse(raw) : []; }catch(_){ arr = []; }
          arr.unshift(localPost);
          localStorage.setItem('forum_offline_posts', JSON.stringify(arr));

          setNewPost('');
          setShowNewPost(false);
          alert('No se pudo publicar en el servidor. Tu post se guardó localmente y aparecerá en la lista.');
        }catch(err){
          console.error('Error guardando localmente:', err);
          alert('Error al enviar post. Inténtalo de nuevo.');
        }
      }
    } catch (error) {
      console.error('Error enviando post (outer):', error);
      alert('Error al enviar post. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Dar like a un post
  const handleLike = async (postId) => {
    // Allow only one like per user per post (tracked locally)
    if(!postId) return;
    if(likedPosts.has(postId)) return; // already liked
    // update UI
    setPosts(prev => prev.map(post => post.id === postId ? { ...post, likes: (post.likes || 0) + 1 } : post));
    const next = new Set(likedPosts);
    next.add(postId);
    setLikedPosts(next);
    try{ localStorage.setItem('forum_liked_posts', JSON.stringify(Array.from(next))); }catch(_){ }
  };

  // Dar estrella a un post
  const handleStar = async (postId) => {
    if(!postId) return;
    if(starredPosts.has(postId)) return; // already starred
    setPosts(prev => prev.map(post => post.id === postId ? { ...post, stars: (post.stars || 0) + 1 } : post));
    const next = new Set(starredPosts);
    next.add(postId);
    setStarredPosts(next);
    try{ localStorage.setItem('forum_starred_posts', JSON.stringify(Array.from(next))); }catch(_){ }
  };

  // Obtener nivel de credibilidad basado en estrellas
  const getCredibilityLevel = (stars) => {
    if (stars >= 50) return { level: 'Experto', color: '#8B5CF6' };
    if (stars >= 25) return { level: 'Avanzado', color: '#10B981' };
    if (stars >= 10) return { level: 'Intermedio', color: '#F59E0B' };
    return { level: 'Principiante', color: '#6B7280' };
  };

  const credibility = getCredibilityLevel(userStars);

  function formatTimestamp(ts){
    // Firebase Timestamp has toDate(), other formats may be Date or number/string
    try{
      if(!ts) return '';
      if(typeof ts === 'object' && typeof ts.toDate === 'function'){
        return ts.toDate().toLocaleDateString('es-ES');
      }
      const d = (typeof ts === 'string' || typeof ts === 'number') ? new Date(ts) : (ts instanceof Date ? ts : null);
      if(d) return d.toLocaleDateString('es-ES');
      return '';
    }catch(e){ return ''; }
  }

  // utility: wrap a promise and reject if it doesn't resolve within ms
  function promiseWithTimeout(promise, ms = 8000){
    let timeoutId;
    const timeout = new Promise((_, reject) => { timeoutId = setTimeout(()=> reject(new Error('timeout')), ms); });
    return Promise.race([promise.then((res)=>{ clearTimeout(timeoutId); return res; }), timeout]);
  }

  return (
    <div className="step-container">
      <div className="step-header">
        <h1 className="step-title">Foro de Participación</h1>
        <p className="step-subtitle">
          Comparte experiencias, consejos y conecta con otros usuarios
        </p>
      </div>

      <div className="forum-content">
        {/* Panel de usuario */}
        <div className="user-panel">
          <div className="user-info">
            <div className="user-avatar">
              <FiUsers />
            </div>
            <div className="user-details">
              <h3>Tu Perfil</h3>
              <div className="user-stars">
                <FiStar className="star-icon" />
                <span className="star-count">{userStars}</span>
                <span className="star-label">estrellas</span>
              </div>
              <div className="user-level" style={{ color: credibility.color }}>
                {credibility.level}
              </div>
            </div>
          </div>
          
          <div className="user-actions">
            <button
              onClick={() => setShowNewPost(!showNewPost)}
              className="btn btn-primary new-post-btn"
            >
              <FiMessageCircle className="btn-icon" />
              Nuevo Post
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="filters-section">
          <h3>Filtrar por ubicación:</h3>
          <div className="location-filters">
            <button
              onClick={() => setSelectedLocation('all')}
              className={`filter-btn ${selectedLocation === 'all' ? 'active' : ''}`}
            >
              <FiMapPin className="filter-icon" />
              Todas las ubicaciones
            </button>
            <button
              onClick={() => setSelectedLocation('Ciudad de México')}
              className={`filter-btn ${selectedLocation === 'Ciudad de México' ? 'active' : ''}`}
            >
              Ciudad de México
            </button>
            <button
              onClick={() => setSelectedLocation('Guadalajara')}
              className={`filter-btn ${selectedLocation === 'Guadalajara' ? 'active' : ''}`}
            >
              Guadalajara
            </button>
            <button
              onClick={() => setSelectedLocation('Monterrey')}
              className={`filter-btn ${selectedLocation === 'Monterrey' ? 'active' : ''}`}
            >
              Monterrey
            </button>
          </div>
        </div>

        {/* Formulario de nuevo post */}
        {showNewPost && (
          <div className="new-post-form">
            <h3>Crear nuevo post</h3>
            <form onSubmit={handleSubmitPost}>
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Comparte tu experiencia meteorológica, consejos o preguntas..."
                className="post-textarea"
                rows="4"
                required
              />
              <div className="form-actions">
                <button
                  type="submit"
                  disabled={!newPost.trim() || loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Publicando...' : 'Publicar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewPost(false);
                    setNewPost('');
                  }}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de posts */}
        <div className="posts-section">
          <h3>
            <FiMessageCircle className="section-icon" />
            Discusiones Recientes
          </h3>
          
          {posts.length > 0 ? (
            <div className="posts-list">
              {posts.map((post) => {
                const postCredibility = getCredibilityLevel(post.authorStars || 0);
                
                return (
                  <div key={post.id} className="post-item">
                    <div className="post-header">
                      <div className="post-author">
                        <div className="author-avatar">
                          <FiUsers />
                        </div>
                        <div className="author-info">
                          <div className="author-name">{post.author}</div>
                          <div className="author-level" style={{ color: postCredibility.color }}>
                            {postCredibility.level}
                          </div>
                        </div>
                      </div>
                      <div className="post-meta">
                        <div className="post-location">
                          <FiMapPin className="meta-icon" />
                          {post.location}
                        </div>
                        <div className="post-date">
                          <FiCalendar className="meta-icon" />
                          {formatTimestamp(post.timestamp)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="post-content">
                      {post.content}
                    </div>
                    
                    <div className="post-actions">
                      <button
                        onClick={() => handleLike(post.id)}
                        className="action-btn like-btn"
                      >
                        <FiHeart className="action-icon" />
                        {post.likes || 0}
                      </button>
                      <button
                        onClick={() => handleStar(post.id)}
                        className="action-btn star-btn"
                      >
                        <FiStar className="action-icon" />
                        {post.stars || 0}
                      </button>
                      <button className="action-btn flag-btn">
                        <FiFlag className="action-icon" />
                        Reportar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-posts">
              <FiMessageCircle className="no-posts-icon" />
              <p>No hay posts disponibles</p>
              <p>¡Sé el primero en compartir algo!</p>
            </div>
          )}
        </div>

        {/* Estadísticas del foro */}
        <div className="forum-stats">
          <div className="stat-item">
            <FiUsers className="stat-icon" />
            <div>
              <div className="stat-number">1,234</div>
              <div className="stat-label">Usuarios activos</div>
            </div>
          </div>
          <div className="stat-item">
            <FiMessageCircle className="stat-icon" />
            <div>
              <div className="stat-number">{posts.length}</div>
              <div className="stat-label">Posts publicados</div>
            </div>
          </div>
          <div className="stat-item">
            <FiAward className="stat-icon" />
            <div>
              <div className="stat-number">89</div>
              <div className="stat-label">Expertos verificados</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forum;
