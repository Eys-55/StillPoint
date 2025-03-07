import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login.jsx';
import { auth } from './firebase.jsx';
import { signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import ChatView from './ChatView.jsx';

// ErrorBoundary component to catch and log errors in child components
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
  const [darkMode, setDarkMode] = useState(false);
  const [user, loadingUser] = useAuthState(auth);

  useEffect(() => {
    document.body.setAttribute("data-bs-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* Header removed; its functionality is now moved to Sidebar */}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/chat" element={<ProtectedRoute><ChatView darkMode={darkMode} setDarkMode={setDarkMode} /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;