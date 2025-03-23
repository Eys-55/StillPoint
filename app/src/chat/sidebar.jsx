import React, { useEffect, useState, useRef } from 'react';
import { collection, query, getDocs, deleteDoc, doc, addDoc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, firestore } from '../firebase.jsx';
import { useSidebarHandlers } from './sidebar_hooks.jsx';

function Sidebar({ activeConversationId, setActiveConversationId, setIsSidebarCollapsed, messages }) {
  const [conversations, setConversations] = useState([]);
  const [hoveredConversationId, setHoveredConversationId] = useState(null);
  const [dropdownVisibleId, setDropdownVisibleId] = useState(null);
  const isDarkMode = document.body.getAttribute("data-bs-theme") === "dark";

  const { handleNewConversation, handleDeleteWithMemories, handleConversationClick } = useSidebarHandlers({
    activeConversationId,
    messages,
    conversations,
    setActiveConversationId,
    setConversations,
    setIsSidebarCollapsed,
    setDropdownVisibleId
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const convRef = collection(firestore, 'users', user.uid, 'conversations');
      const q = query(convRef, orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, snapshot => {
        const convs = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          convs.push({ id: docSnap.id, title: data.title || 'Untitled Conversation' });
        });
        setConversations(convs);
      });
      return () => unsubscribe();
    }
  }, []);

  const sidebarRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsSidebarCollapsed(true);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsSidebarCollapsed]);

  useEffect(() => {
    if (dropdownVisibleId) {
      const handleClickOutside = (event) => {
        if (!event.target.closest('.dropdown-menu-sidebar')) {
          setDropdownVisibleId(null);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownVisibleId]);

  return (
    <>
      <div ref={sidebarRef} className="sidebar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button onClick={() => setIsSidebarCollapsed(true)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
            <i className="bi bi-x"></i>
          </button>
          <button onClick={handleNewConversation} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
            <i className="bi bi-plus"></i>
          </button>
        </div>
        <div>
          {conversations.map(conv => (
            <div
              key={conv.id}
              style={{
                position: 'relative',
                marginBottom: '0.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
                backgroundColor: conv.id === activeConversationId ? (isDarkMode ? '#495057' : '#e9ecef') : 'transparent'
              }}
              onMouseEnter={() => setHoveredConversationId(conv.id)}
              onMouseLeave={() => setHoveredConversationId(null)}
              onClick={() => handleConversationClick(conv.id)}
            >
              {conv.title}
              {hoveredConversationId === conv.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownVisibleId(prev => prev === conv.id ? null : conv.id);
                  }}
                  style={{
                    position: 'absolute',
                    right: '5px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="bi bi-three-dots"></i>
                </button>
              )}
              {dropdownVisibleId === conv.id && (
                <div
                  className="dropdown-menu-sidebar"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: '5px',
                    backgroundColor: isDarkMode ? '#343a40' : '#fff',
                    color: isDarkMode ? '#fff' : '#000',
                    border: isDarkMode ? '1px solid #444' : '1px solid #ddd',
                    padding: '0.5rem',
                    zIndex: 1100
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => { alert("Rename functionality not implemented."); setDropdownVisibleId(null); }}
                    style={{ background: 'none', border: 'none', display: 'block', width: '100%', textAlign: 'left', padding: '0.25rem 0' }}
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDeleteWithMemories(conv)}
                    style={{ background: 'none', border: 'none', display: 'block', width: '100%', textAlign: 'left', padding: '0.25rem 0' }}
                  >
                    Delete with Memories
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default Sidebar;