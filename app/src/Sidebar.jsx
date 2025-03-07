import React, { useEffect, useState } from 'react';
import { firestore, auth } from './firebase.jsx';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';

function Sidebar({ onSelectConversation, activeConversationId, darkMode, setDarkMode, isCollapsed, setIsCollapsed }) {
  const [conversations, setConversations] = useState([]);
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    if (loading || !user) return;
    const conversationsRef = collection(firestore, 'users', user.uid, 'conversations');
    const q = query(conversationsRef);
    const unsubscribe = onSnapshot(q, snapshot => {
      const convs = [];
      snapshot.forEach(doc => {
        convs.push({ id: doc.id, ...doc.data() });
      });
      setConversations(convs);
    });
    return () => unsubscribe();
  }, [user, loading]);

  const handleNewConversation = async () => {
    if (!user) return;
    const conversationsRef = collection(firestore, 'users', user.uid, 'conversations');
    const newConversation = {
      title: "New Conversation",
      messages: [
        { role: 'user', text: "Hello, I have 2 dogs in my house." },
        { role: 'bot', text: "Great to meet you. What would you like to know?" },
      ],
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(conversationsRef, newConversation);
    onSelectConversation(docRef.id);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const bgClass = darkMode ? 'bg-dark text-light' : 'bg-light text-dark';

  if (loading) {
    return (
      <div className={`position-fixed min-vh-100 p-3 shadow ${bgClass}`} style={{ width: '250px', left: 0, top: 0, transition: 'width 0.3s ease' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`position-fixed min-vh-100 p-3 shadow ${bgClass}`} style={{ width: '250px', left: 0, top: 0, transition: 'width 0.3s ease' }}>
        <div>Please login.</div>
      </div>
    );
  }

  if (isCollapsed) {
    return null;
  }

  return (
    <div className={`position-fixed min-vh-100 p-3 shadow ${bgClass} d-flex flex-column`} style={{ width: '250px', left: 0, top: 0, transition: 'width 0.3s ease', overflowY: 'auto' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Conversations</h5>
        <button className="btn btn-outline-secondary" onClick={() => setIsCollapsed(true)}>
          <i className="bi bi-chevron-double-left"></i>
        </button>
      </div>
      <button className="btn btn-primary mb-3 w-100" onClick={handleNewConversation}>New Conversation</button>
      <ul className="list-group">
        {conversations.map(conv => (
          <li
            key={conv.id}
            className={`list-group-item ${activeConversationId === conv.id ? 'active' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectConversation(conv.id)}
          >
            {conv.createdAt ? new Date(conv.createdAt.seconds * 1000).toLocaleString() : conv.id}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-3 border-top">
        <div className="d-flex justify-content-between align-items-center">
          <span className="fw-bold text-truncate" title={user.email}>{user.email}</span>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setDarkMode(!darkMode)}
              title="Toggle Dark Mode"
            >
              <i className={`bi ${darkMode ? 'bi-sun' : 'bi-moon'}`}></i>
            </button>
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={handleLogout}
              title="Logout"
            >
              <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;