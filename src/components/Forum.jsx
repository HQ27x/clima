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
        setPosts(postsData);
      } catch (error) {
        console.error('Error cargando posts:', error);
      }
    };

    loadPosts();
  }, [selectedLocation]);

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

      await addDoc(collection(db, 'forum_posts'), postData);
      
      setNewPost('');
      setShowNewPost(false);
      
      // Recargar posts
      const q = query(
        collection(db, 'forum_posts'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const querySnapshot = await getDocs(q);
      const postsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
      
    } catch (error) {
      console.error('Error enviando post:', error);
      alert('Error al enviar post. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Dar like a un post
  const handleLike = async (postId) => {
    // En una app real, esto actualizaría el contador de likes en la base de datos
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, likes: (post.likes || 0) + 1 }
        : post
    ));
  };

  // Dar estrella a un post
  const handleStar = async (postId) => {
    // En una app real, esto actualizaría el contador de estrellas en la base de datos
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, stars: (post.stars || 0) + 1 }
        : post
    ));
  };

  // Obtener nivel de credibilidad basado en estrellas
  const getCredibilityLevel = (stars) => {
    if (stars >= 50) return { level: 'Experto', color: '#8B5CF6' };
    if (stars >= 25) return { level: 'Avanzado', color: '#10B981' };
    if (stars >= 10) return { level: 'Intermedio', color: '#F59E0B' };
    return { level: 'Principiante', color: '#6B7280' };
  };

  const credibility = getCredibilityLevel(userStars);

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
                          {new Date(post.timestamp?.toDate()).toLocaleDateString('es-ES')}
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
              <div className="stat-number">5,678</div>
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
