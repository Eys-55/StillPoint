import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './Login.jsx';
import { auth, firestore } from './firebase.jsx';
import { signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import Chat from './Chat.jsx';
import Header from './Header.jsx';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error:", error, info);
    this.setState({ error });
  }

  render() {
    if (this.state.error) {
      return <div>Error occurred: {this.state.error.toString()}</div>;
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [user, loadingUser] = useAuthState(auth);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    document.body.setAttribute("data-bs-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

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
      setActiveConversationId(docRef.id);
    } catch (err) {
      console.error("Error creating new conversation:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <ErrorBoundary>
      {location.pathname !== '/login' && (
        <Header
          onToggleSidebar={handleToggleSidebar}
          onNewConversation={handleNewConversation}
          darkMode={darkMode}
        />
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                activeConversationId={activeConversationId}
                setActiveConversationId={setActiveConversationId}
                isSidebarCollapsed={isSidebarCollapsed}
                setIsSidebarCollapsed={setIsSidebarCollapsed}
              />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;