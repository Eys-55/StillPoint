import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, deleteDoc, doc, addDoc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, firestore } from '../firebase.jsx';

function Sidebar({ activeConversationId, setActiveConversationId, setIsSidebarCollapsed }) {
  const [conversations, setConversations] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [hoveredConversationId, setHoveredConversationId] = useState(null);

  const handleOptionsClick = (conversation) => {
    setSelectedConversation(conversation);
    setModalVisible(true);
  };

  const handleNewConversation = async () => {
    if (activeConversationId) {
      const currentConv = conversations.find(conv => conv.id === activeConversationId);
      if (currentConv && currentConv.title === "New Conversation") {
        return;
      }
    }
    const user = auth.currentUser;
    if (!user) return;
    const convRef = collection(firestore, 'users', user.uid, 'conversations');
    const newConv = {
      title: "New Conversation",
      messages: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(convRef, newConv);
    setActiveConversationId(docRef.id);
  };

  const handleDeleteWithMemories = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !selectedConversation) return;
      await deleteDoc(doc(firestore, 'users', user.uid, 'conversations', selectedConversation.id));
      setConversations(prev => prev.filter(conv => conv.id !== selectedConversation.id));
      setModalVisible(false);
    } catch (error) {
      console.error("Error deleting conversation with memories: ", error);
    }
  };

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

  const handleConversationClick = (id) => {
    setActiveConversationId(id);
    setIsSidebarCollapsed(true);
  };

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '300px',
        height: '100%',
        backgroundColor: '#f8f9fa',
        borderRight: '1px solid #ddd',
        overflowY: 'auto',
        zIndex: 1000,
        padding: '1rem'
      }}>
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
                backgroundColor: conv.id === activeConversationId ? '#e9ecef' : 'transparent'
              }}
              onMouseEnter={() => setHoveredConversationId(conv.id)}
              onMouseLeave={() => setHoveredConversationId(null)}
              onClick={() => handleConversationClick(conv.id)}
            >
              {conv.title}
              {hoveredConversationId === conv.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleOptionsClick(conv); }}
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
            </div>
          ))}
        </div>
      </div>
      {modalVisible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '1rem',
            borderRadius: '4px',
            width: '300px'
          }}>
            <h5>Conversation Options</h5>
            <input type="text" defaultValue={selectedConversation ? selectedConversation.title : ''} style={{ width: '100%', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button style={{ marginRight: '0.5rem' }}>Rename</button>
              <button style={{ marginRight: '0.5rem' }}>Delete</button>
              <button onClick={handleDeleteWithMemories}>Delete with Memories</button>
            </div>
            <div style={{ textAlign: 'right', marginTop: '1rem' }}>
              <button onClick={() => setModalVisible(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;