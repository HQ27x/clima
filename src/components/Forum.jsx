import React, { useState, useEffect, useRef } from 'react';
import { FiStar, FiMessageCircle, FiHeart, FiFlag, FiSend, FiAward, FiUsers, FiMapPin, FiCalendar, FiCamera, FiEdit2 } from 'react-icons/fi';
import { collection, addDoc, getDocs, query, orderBy, limit, where, doc, getDoc, onSnapshot, serverTimestamp, runTransaction, increment, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import './Forum.css';

const Forum = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [userStars, setUserStars] = useState(0);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profileName, setProfileName] = useState(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [starredPosts, setStarredPosts] = useState(new Set());
  const [profileImg, setProfileImg] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const fileInputRef = useRef();

  // Cargar posts del foro
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const q = query(
          collection(db, 'forum_posts'),
          orderBy('timestamp', 'desc'),
          limit(20)
        );

        const querySnapshot = await getDocs(q);
        let postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // fetch comment counts and authorStars for each post (parallel)
        try{
          const withCounts = await Promise.all(postsData.map(async (p)=>{
            try{
              const cs = await getDocs(collection(db, 'forum_posts', p.id, 'comments'));
              return { ...p, commentCount: cs.size };
            }catch(e){ return { ...p, commentCount: 0 }; }
          }));
          postsData = withCounts;
        }catch(_){ /* ignore failures */ }

        // compute author post counts and fetch authorStars from users collection
        try{
          const authorIds = Array.from(new Set(postsData.map(p=>p.authorId).filter(Boolean)));
          const countsByAuthor = {};
          for(const id of authorIds){ countsByAuthor[id] = postsData.filter(p=>p.authorId===id).length; }
          // fetch user docs for authorStars
          const authorDocs = await Promise.all(authorIds.map(id => getDoc(doc(db, 'users', id)).catch(()=>null)));
          const starsByAuthor = {};
          authorDocs.forEach((d, i)=>{ const id = authorIds[i]; starsByAuthor[id] = (d && d.exists() && d.data().stars) ? d.data().stars : 0; });
          postsData = postsData.map(p=>({ ...p, authorStars: starsByAuthor[p.authorId] || 0, authorPostCount: countsByAuthor[p.authorId] || 0 }));
        }catch(_){ /* ignore */ }
        setPosts(postsData);
        // if user is logged, fetch their action (like/star) for each post
        if (firebaseUser && firebaseUser.uid) {
          try{
            const actions = {};
            await Promise.all(postsData.map(async (p)=>{
              try{
                const aDoc = await getDoc(doc(db, 'forum_posts', p.id, 'actions', firebaseUser.uid));
                if (aDoc && aDoc.exists()) actions[p.id] = aDoc.data().type;
              }catch(_){ }
            }));
            setUserActions(actions);
          }catch(_){ }
        } else {
          setUserActions({});
        }
      } catch (error) {
  console.error('Error loading posts:', error);
      }
    };

    loadPosts();
  }, [firebaseUser]);

  // liked/starred state will not be persisted to localStorage to avoid storing post records in code
  useEffect(()=>{
    setLikedPosts(new Set());
    setStarredPosts(new Set());
  }, []);

  // Cargar estrellas del usuario (simulado)
  // Remove simulated default stars; real value will be loaded from Firestore profile in auth listener

  // Escuchar auth state y cargar perfil de Firestore si existe
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
  if (user && user.uid) {
        try {
          const pDoc = await getDoc(doc(db, 'users', user.uid));
          if (pDoc.exists()) {
            const pd = pDoc.data();
            setProfileName(pd.displayName || pd.name || user.email || 'User');
            setUserStars(pd.stars || 0);
          } else {
            // user exists in Auth but not in Firestore - treat as unregistered for posting
            setProfileName(null);
            setUserStars(0);
          }
        } catch (e) {
          console.error('Error cargando perfil de usuario:', e);
          setProfileName(null);
        }
      } else {
        setProfileName(null);
        setUserStars(0);
      }
    });
    return () => unsub();
  }, []);

  // Cargar imagen de perfil desde Firestore (si existe)
  useEffect(() => {
    if (firebaseUser && firebaseUser.uid) {
      getDoc(doc(db, 'users', firebaseUser.uid)).then((pDoc) => {
        if (pDoc.exists()) {
          setProfileImg(pDoc.data().photoURL || null);
        }
      });
    }
  }, [firebaseUser]);

  // Enviar nuevo post
  const handleSubmitPost = async (e) => {
    e.preventDefault();
  if (!newPost.trim()) return;
    // require registered user with profile
      if (!firebaseUser || !profileName) {
      if (typeof window !== 'undefined') {
        window.alert('You must sign in with a registered account to create posts. You will be redirected to the login page.');
        window.location.replace('/login');
      }
      return;
    }

    setLoading(true);
    try {
      const postData = {
        content: newPost.trim(),
        author: profileName || 'Usuario', // store logged user name
        authorId: firebaseUser ? firebaseUser.uid : null,
        location: 'General',
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
        // If sending to Firebase fails, show an error but do NOT persist posts locally
        console.error('Firebase error while posting:', firebaseErr);
        alert('Could not publish to server. Please try again.');
      }
    } catch (error) {
      console.error('Error sending post (outer):', error);
      alert('Error sending post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle action (like or star) - only one action per user per post, cannot do both
  const handleAction = async (post, type) => {
    if (!post || !type) return;
    if (!firebaseUser || !firebaseUser.uid || !profileName) {
      window.alert('You must be signed in to perform this action.');
      window.location.replace('/login');
      return;
    }
    const uid = firebaseUser.uid;
    // prevent if user already performed an action
    if (userActions[post.id]) {
      alert('Ya realizaste una acción en este post');
      return;
    }
    const actionRef = doc(db, 'forum_posts', post.id, 'actions', uid);
    const postRef = doc(db, 'forum_posts', post.id);
  try{
      await runTransaction(db, async (tx) => {
        const actionSnap = await tx.get(actionRef);
  if (actionSnap.exists()) throw new Error('You have already performed an action on this post');
  const postSnap = await tx.get(postRef);
  if (!postSnap.exists()) throw new Error('Post not found');
        // increment post counter
        if (type === 'like') {
          tx.update(postRef, { likes: increment(1) });
        } else if (type === 'star') {
          tx.update(postRef, { stars: increment(1) });
        }
        // increment author reputation (user stars)
        const authorId = postSnap.data().authorId;
        if (authorId) {
          const userRef = doc(db, 'users', authorId);
          const points = 1; // both like and star give 1 point
          tx.update(userRef, { stars: increment(points) });
        }
        // record user's action
        tx.set(actionRef, { type, timestamp: serverTimestamp(), userId: uid });
      });
      // reflect in UI
      setUserActions(prev => ({ ...prev, [post.id]: type }));
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: (p.likes || 0) + (type === 'like' ? 1 : 0), stars: (p.stars || 0) + (type === 'star' ? 1 : 0) } : p));
      // also update authorStars displayed for all posts by that author
      try{
  const points = 1;
        if(post.authorId){
          setPosts(prev => prev.map(p => p.authorId === post.authorId ? { ...p, authorStars: (p.authorStars || 0) + points } : p));
        }
      }catch(_){ }
    }catch(err){
      console.error('Action error', err);
      if(err.message && err.message.includes('already performed')) alert('You have already performed an action on this post'); else alert('Could not perform the action');
    }
  };

  // Obtener nivel de credibilidad basado en estrellas (rangos solicitados)
  const getCredibilityLevel = (stars) => {
    const s = Number(stars || 0);
    if (s >= 201) return { level: 'Expert', color: '#8B5CF6' };
    if (s >= 101) return { level: 'Advanced', color: '#10B981' };
    if (s >= 51) return { level: 'Intermediate', color: '#F59E0B' };
    return { level: 'Beginner', color: '#6B7280' };
  };

  const credibility = getCredibilityLevel(userStars);
  const [feedbacks, setFeedbacks] = useState([]);
  const [activeUsersCount, setActiveUsersCount] = useState(null);
  const [verifiedExpertsCount, setVerifiedExpertsCount] = useState(null);
  // Thread (comments) state
  const [openPost, setOpenPost] = useState(null);
  const [threadComments, setThreadComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const commentsUnsubRef = useRef(null);
  const [userActions, setUserActions] = useState({}); // { postId: 'like'|'star' }

  // load recent feedbacks from backend Foro (if running)
  useEffect(()=>{
    const load = async ()=>{
      try{
        const res = await fetch('http://localhost:4002/feedbacks');
        if(res.ok){
          const arr = await res.json();
          setFeedbacks(arr || []);
        }
      }catch(e){ /* ignore if backend not running */ }
    };
    load();
  }, []);

  // Load forum stats: active users and verified experts
  useEffect(() => {
    let mounted = true;
    const loadStats = async () => {
      try {
        // try to compute active users as users with lastActive within 30 days if that field exists
        const usersSnap = await getDocs(collection(db, 'users'));
        if (!mounted) return;
        const now = new Date();
        const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;
        let activeCount = 0;
        let verifiedCount = 0;
        usersSnap.forEach(u => {
          const d = u.data() || {};
          // active if lastActive is recent (Timestamp or Date)
          const la = d.lastActive;
          if (la) {
            let last = la;
            if (typeof la.toDate === 'function') last = la.toDate();
            if (last instanceof Date && (now - last) <= THIRTY_DAYS) activeCount += 1;
          }
          // fallback: count users with a non-empty displayName as active when no lastActive exists
          else if (d.displayName) activeCount += 1;

          // verified experts: prefer explicit flag, or role === 'expert', or stars >= 201
          if (d.verified === true || d.role === 'expert' || (typeof d.stars === 'number' && d.stars >= 201)) verifiedCount += 1;
        });

        // if there were no users with lastActive and activeCount seems too high due to fallback, clamp to usersSnap.size
        if (mounted) {
          setActiveUsersCount(activeCount || usersSnap.size || 0);
          setVerifiedExpertsCount(verifiedCount || 0);
        }
      } catch (e) {
        console.error('Error loading forum stats:', e);
        if (mounted) {
          // fallbacks
          setActiveUsersCount(0);
          setVerifiedExpertsCount(0);
        }
      }
    };
    loadStats();
    return () => { mounted = false; };
  }, []);

  function formatTimestamp(ts){
    // Firebase Timestamp has toDate(), other formats may be Date or number/string
    try{
      if(!ts) return '';
      if(typeof ts === 'object' && typeof ts.toDate === 'function'){
          return ts.toDate().toLocaleDateString('en-US');
        }
        const d = (typeof ts === 'string' || typeof ts === 'number') ? new Date(ts) : (ts instanceof Date ? ts : null);
        if(d) return d.toLocaleDateString('en-US');
      return '';
    }catch(e){ return ''; }
  }

  // utility: wrap a promise and reject if it doesn't resolve within ms
  function promiseWithTimeout(promise, ms = 8000){
    let timeoutId;
    const timeout = new Promise((_, reject) => { timeoutId = setTimeout(()=> reject(new Error('timeout')), ms); });
    return Promise.race([promise.then((res)=>{ clearTimeout(timeoutId); return res; }), timeout]);
  }

  // Open a thread (subscribe to comments subcollection)
  const openThread = (post) => {
    // close previous
    if (commentsUnsubRef.current) {
      try{ commentsUnsubRef.current(); }catch(_){ }
      commentsUnsubRef.current = null;
    }
    setOpenPost(post);
    setThreadComments([]);
    setCommentsLoading(true);
    try{
      const commentsCol = collection(db, 'forum_posts', post.id, 'comments');
      const q = query(commentsCol, orderBy('timestamp', 'asc'));
      const unsub = onSnapshot(q, (snap) => {
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setThreadComments(arr);
        setCommentsLoading(false);
      }, (err) => {
        console.error('comments snapshot error', err);
        setCommentsLoading(false);
      });
      commentsUnsubRef.current = unsub;
    }catch(e){ console.error('Error subscribing to comments', e); setCommentsLoading(false); }
  };

  const closeThread = () => {
    if (commentsUnsubRef.current) {
      try{ commentsUnsubRef.current(); }catch(_){ }
      commentsUnsubRef.current = null;
    }
    setOpenPost(null);
    setThreadComments([]);
    setNewComment('');
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !openPost) return;
    // require registered user with profile
    if (!firebaseUser || !profileName) {
      if (typeof window !== 'undefined') {
        window.alert('Debes iniciar sesión con una cuenta registrada para comentar. Serás redirigido al inicio de sesión.');
        window.location.replace('/login');
      }
      return;
    }
    try{
      const commentsCol = collection(db, 'forum_posts', openPost.id, 'comments');
      await addDoc(commentsCol, {
        body: newComment.trim(),
        author: profileName || 'Usuario',
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent
      });
      setNewComment('');
    }catch(err){
      console.error('Error adding comment', err);
      alert('No se pudo enviar el comentario. Inténtalo de nuevo.');
    }
  };

  // Profile image change handler
  const handleProfileImgChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Opcional: puedes agregar validación de tipo/tamaño aquí
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setProfileImg(base64);
      // Guarda en Firestore
      if (firebaseUser && firebaseUser.uid) {
        await setDoc(doc(db, 'users', firebaseUser.uid), { photoURL: base64 }, { merge: true });
      }
      setShowEditProfile(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="step-container">
      <div className="step-header">
        <h1 className="step-title">Community Forum</h1>
        <p className="step-subtitle">
          Share experiences, tips, and connect with other users
        </p>
      </div>

      <div className="forum-content">
        {/* Panel de usuario */}
        <div className="user-panel">
          <div className="user-info">
            <div className="user-avatar" onClick={() => setShowEditProfile(true)} style={{cursor:'pointer', position:'relative'}}>
              {profileImg ? (
                <img src={profileImg} alt="avatar" className="profile-img" />
              ) : (
                <FiUsers />
              )}
              <span className="edit-avatar-btn"><FiEdit2 /></span>
            </div>
            <div className="user-details">
                <h3>{profileName ?? 'Tu Perfil'}</h3>
              <div className="user-stars">
                <FiStar className="star-icon" />
                <span className="star-count">{userStars}</span>
                <span className="star-label">Stars</span>
              </div>
              <div className="user-level" style={{ color: credibility.color }}>
                {credibility.level}
              </div>
            </div>
          </div>
          
          <div className="user-actions">
            <button
              onClick={async () => {
                // Only allow registered users (must have Firestore profile) to create posts
                if (!firebaseUser || !profileName) {
                  // redirect to login or show message
                  if (typeof window !== 'undefined') {
                    window.alert('Debes iniciar sesión con una cuenta registrada para crear posts. Serás redirigido al inicio de sesión.');
                    window.location.replace('/login');
                  }
                  return;
                }
                setShowNewPost(!showNewPost);
              }}
              className="btn btn-primary new-post-btn"
            >
              <FiMessageCircle className="btn-icon" />
              New Post
            </button>
          </div>
        </div>

        {/* Edit profile form (shown on camera icon click) */}
        {showEditProfile && (
          <div className="profile-modal-overlay" onClick={() => setShowEditProfile(false)}>
            <div className="profile-modal" onClick={e => e.stopPropagation()}>
              <h4>Edit Profile Photo</h4>
              <div className="profile-img-preview">
                {profileImg ? <img src={profileImg} alt="preview" /> : <FiCamera size={48} />}
              </div>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleProfileImgChange}
              />
              <button className="btn btn-primary" onClick={() => fileInputRef.current.click()}>
                Select Image
              </button>
              <button className="btn btn-outline" onClick={() => setShowEditProfile(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filters removed per request */}

        {/* Formulario de nuevo post */}
        {showNewPost && (
          <div className="new-post-form">
              <h3>Create new post</h3>
            <form onSubmit={handleSubmitPost}>
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Share your weather experience, tips, or questions..."
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
                  {loading ? 'Posting...' : 'Post'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewPost(false);
                    setNewPost('');
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de posts */}
        <div className="posts-section">
          <h3>
            <FiMessageCircle className="section-icon" />
            Recent Discussions
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
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div className="author-post-count">{post.authorPostCount || 0} posts</div>
                            <div className="author-level" style={{ color: postCredibility.color }}>
                              {postCredibility.level}
                            </div>
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
                          <div className="post-comments-count">
                            {typeof post.commentCount === 'number' ? `${post.commentCount} comments` : ''}
                          </div>
                      </div>
                    </div>
                    
                    <div className="post-content">
                      {post.content}
                    </div>
                    
                    <div className="post-actions">
                      <button
                        onClick={() => handleAction(post, 'like')}
                        className={`action-btn like-btn ${userActions[post.id] === 'like' ? 'acted' : ''}`}
                        disabled={!!userActions[post.id]}
                      >
                        <FiHeart className="action-icon" />
                        {post.likes || 0}
                      </button>
                      <button
                        onClick={() => handleAction(post, 'star')}
                        className={`action-btn star-btn ${userActions[post.id] === 'star' ? 'acted' : ''}`}
                        disabled={!!userActions[post.id]}
                      >
                        <FiStar className="action-icon" />
                        {post.stars || 0}
                      </button>
                      <button className="action-btn flag-btn">
                        <FiFlag className="action-icon" />
                        Report
                      </button>
                      <button
                        onClick={() => openThread(post)}
                        className="action-btn thread-btn"
                      >
                        Open thread
                      </button>
                    </div>
                    {/* Thread view */}
                    {openPost && openPost.id === post.id && (
                      <div className="thread-section">
                        <div className="thread-header">
                          <strong>Thread: {post.content.substring(0, 80)}</strong>
                          <button onClick={closeThread} className="btn btn-outline">Close thread</button>
                        </div>
                        <div className="thread-comments">
                          {commentsLoading ? <div>Cargando comentarios...</div> : (
                            threadComments.length ? (
                              threadComments.map(c => (
                                <div key={c.id} className="thread-comment">
                                    <div className="comment-author"><strong>{c.author}</strong> · <span className="comment-date">{formatTimestamp(c.timestamp)}</span></div>
                                    <div className="comment-body">{c.body}</div>
                                </div>
                              ))
                            ) : <div>No comments yet</div>
                          )}
                        </div>
                        <form className="comment-form" onSubmit={handleSubmitComment}>
                          <textarea value={newComment} onChange={(e)=>setNewComment(e.target.value)} placeholder="Write a comment..." rows={2} required />
                          <div style={{display:'flex',gap:8,marginTop:8}}>
                            <button type="submit" className="btn btn-primary">Comment</button>
                            <button type="button" onClick={closeThread} className="btn btn-outline">Cancel</button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-posts">
              <FiMessageCircle className="no-posts-icon" />
              <p>No posts available</p>
              <p>Be the first to share something!</p>
            </div>
          )}
        </div>
        
        {/* Estadísticas del foro */}
        <div className="forum-stats">
          <div className="stat-item">
            <FiUsers className="stat-icon" />
            <div>
              <div className="stat-number">{activeUsersCount === null ? '—' : activeUsersCount.toLocaleString()}</div>
              <div className="stat-label">User Online</div>
            </div>
          </div>
          <div className="stat-item">
            <FiMessageCircle className="stat-icon" />
            <div>
              <div className="stat-number">{posts.length}</div>
              <div className="stat-label">Published Posts</div>
            </div>
          </div>
          <div className="stat-item">
            <FiAward className="stat-icon" />
            <div>
              <div className="stat-number">{verifiedExpertsCount === null ? '—' : verifiedExpertsCount.toLocaleString()}</div>
              <div className="stat-label">Verified Experts</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forum;
