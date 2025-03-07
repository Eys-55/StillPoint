import React, { useEffect, useState } from 'react';
import { firestore, auth } from './firebase.jsx';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';

function Sidebar({ onSelectConversation, activeConversationId, darkMode, setDarkMode, isCollapsed, setIsCollapsed }) {
  const [conversations, setConversations] = useState([]);
  const [user, loading] = useAuthState(auth);
  // States for custom dropdown management
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [hoveredDropdown, setHoveredDropdown] = useState(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.conversation-dropdown')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleNewConversation = async () => {
    if (!user) return;
    const conversationsRef = collection(firestore, 'users', user.uid, 'conversations');
    const newConversation = {
      title: "New Conversation",
      messages: [],
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(conversationsRef, newConversation);
    onSelectConversation(docRef.id);
  };

  const handleRename = async (convId) => {
    const newTitle = prompt("Enter new conversation title:");
    if (newTitle) {
      const convRef = doc(firestore, 'users', user.uid, 'conversations', convId);
      try {
        await updateDoc(convRef, { title: newTitle });
      } catch (error) {
        console.error("Error renaming conversation:", error);
      }
    }
  };

  const handleDelete = async (convId) => {
    if (window.confirm("Are you sure you want to delete this conversation?")) {
      const convRef = doc(firestore, 'users', user.uid, 'conversations', convId);
      try {
        await deleteDoc(convRef);
      } catch (error) {
        console.error("Error deleting conversation:", error);
      }
    }
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
        <button className="btn btn-link p-0" onClick={() => setIsCollapsed(true)}>
          <i className="bi bi-chevron-double-left" style={{ fontSize: '1.2rem' }}></i>
        </button>
        <button className="btn btn-link p-0" onClick={handleNewConversation}>
          <i className="bi bi-plus" style={{ fontSize: '1.2rem' }}></i>
        </button>
      </div>
      <div>
        {conversations.map(conv => (
          <div
            key={conv.id}
            style={{ cursor: 'pointer', padding: '0.5rem 1rem', borderBottom: '1px solid rgba(0,0,0,0.1)' }}
            onClick={() => onSelectConversation(conv.id)}
          >
            <div className="d-flex justify-content-between align-items-center">
              <span>{conv.title ? conv.title : conv.id}</span>
              <div className="conversation-dropdown" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn btn-link p-0"
                  style={{
                    backgroundColor: hoveredDropdown === conv.id ? (darkMode ? '#555' : '#eee') : 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === conv.id ? null : conv.id);
                  }}
                  onMouseEnter={() => setHoveredDropdown(conv.id)}
                  onMouseLeave={() => setHoveredDropdown(null)}
                >
                  <i className="bi bi-three-dots" style={{ fontSize: '1.2rem' }}></i>
                </button>
                {activeDropdown === conv.id && (
                  <div className="dropdown-menu show" style={{ position: 'absolute', top: '100%', right: 0, display: 'block', zIndex: 1000 }}>
                    <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); handleRename(conv.id); setActiveDropdown(null); }}>Rename</button>
                    <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); handleDelete(conv.id); setActiveDropdown(null); }}>Delete</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
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