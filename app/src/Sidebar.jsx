import React, { useEffect, useState } from 'react';
import { firestore, auth } from './firebase.jsx';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function Sidebar({ onSelectConversation, activeConversationId, darkMode, setDarkMode, isCollapsed, setIsCollapsed }) {
  const [conversations, setConversations] = useState([]);
  const [user, loading] = useAuthState(auth);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  
  const toggleDropdown = (convId) => {
    setOpenDropdown(prev => (prev === convId ? null : convId));
  };
  const navigate = useNavigate();

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.conversation-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleNewConversation = async () => {
    if (!user) return;
    try {
      const conversationsRef = collection(firestore, 'users', user.uid, 'conversations');
      const newConversation = {
        title: "New Conversation",
        messages: [],
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(conversationsRef, newConversation);
      onSelectConversation(docRef.id);
    } catch (err) {
      console.error("Error creating new conversation:", err);
    }
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
        <div className={`position-absolute ${darkMode ? 'bg-dark text-light' : ''} shadow`} style={{ top: 'calc(100% + 5px)', right: 0, zIndex: 1000, padding: '0.5rem' }}>
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
    <>
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
                    className="btn btn-link p-0 text-decoration-none"
                    onClick={(e) => { e.stopPropagation(); toggleDropdown(conv.id); }}
                    title="Options"
                  >
                    ...
                  </button>
                  {openDropdown === conv.id && (
                    <div className={`position-absolute ${darkMode ? 'bg-dark text-light border border-secondary' : 'bg-white border'} shadow`} style={{ top: 'calc(100% + 5px)', right: 0, zIndex: 1000, padding: '0.5rem' }}>
                      <button type="button" className="dropdown-item" onClick={() => { handleRename(conv.id); setOpenDropdown(null); }}>Rename</button>
                      <button type="button" className="dropdown-item" onClick={() => { handleDelete(conv.id); setOpenDropdown(null); }}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto pt-3 border-top">
          <div className="d-flex justify-content-between align-items-center">
            <button
              className="btn btn-link p-0 text-truncate"
              onClick={() => setShowEmailModal(true)}
              title={user.email}
            >
<span className="fw-bold" style={{ fontSize: 'var(--body-font-size)' }}>{user.email}</span>
            </button>
            <div className="d-flex gap-2">
            </div>
          </div>
        </div>
      </div>
      {showEmailModal && (
        <>
          <div className="modal-backdrop show"></div>
          <div className="modal show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{user.email}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowEmailModal(false)}></button>
                </div>
                <div className="modal-body">
                  <button className="btn btn-primary w-100 mb-2" onClick={() => { navigate('/summaries'); setShowEmailModal(false); }}>
                    See Profile
                  </button>
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="darkModeSwitch"
                      checked={darkMode}
                      onChange={() => setDarkMode(!darkMode)}
                    />
                    <label className="form-check-label" htmlFor="darkModeSwitch">Dark Mode</label>
                  </div>
                  <button className="btn btn-danger w-100" onClick={() => { handleLogout(); setShowEmailModal(false); }}>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default Sidebar;