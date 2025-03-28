import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './user/login.jsx';
import Home from './home/home.jsx';
import { auth } from './firebase.jsx';
import { signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import Chat from './chat/chat.jsx';

import UserProfile from './profile/user_profile.jsx';
import Footer from './nav/footer.jsx';
import Privacy from './user/privacy.jsx';
import Settings from './user/settings.jsx';
import Questionnaire from './profile/questionnaire.jsx';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Box } from '@mui/material'; // Import Box for loading

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
      // Consider a styled error message
      return <div>Error occurred: {this.state.error.toString()}</div>;
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }) {
  const [user, loading] = useAuthState(auth);

  if (loading) {
     // Use a simple loading indicator consistent with MUI theme potentially
     return (
       <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
         Loading...
       </Box>
     );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const location = useLocation();
  // Initialize darkMode state from localStorage or system preference if desired
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
    // Or use system preference: window.matchMedia('(prefers-color-scheme: dark)').matches
  });
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [user] = useAuthState(auth);

  // Update localStorage and body attribute when darkMode changes
  useEffect(() => {
    document.body.setAttribute("data-bs-theme", darkMode ? "dark" : "light");
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Create MUI theme based on darkMode state
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          // You can customize primary/secondary colors here for light/dark modes
          // primary: { main: darkMode ? '#90caf9' : '#1976d2' },
          // secondary: { main: darkMode ? '#f48fb1' : '#dc004e' },
        },
      }),
    [darkMode],
  );


  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Optionally clear state like activeConversationId etc.
      setActiveConversationId(null);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Ensures background and text colors match theme */}
      <ErrorBoundary>
        <Routes>
          {/* Login route doesn't need protection */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                {/* Pass setDarkMode if Header needs to toggle it */}
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat
                  darkMode={darkMode} // Pass darkMode state
                  setDarkMode={setDarkMode} // Pass setter
                  activeConversationId={activeConversationId}
                  setActiveConversationId={setActiveConversationId}
                  isSidebarCollapsed={isSidebarCollapsed}
                  setIsSidebarCollapsed={setIsSidebarCollapsed}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                {/* Settings component already receives darkMode and setDarkMode */}
                <Settings darkMode={darkMode} setDarkMode={setDarkMode} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/privacy"
            element={
              <ProtectedRoute>
                {/* Privacy component might need theme adaptation if not using MUI heavily */}
                <Privacy />
              </ProtectedRoute>
            }
          />
          <Route
            path="/get-started"
            element={
              <ProtectedRoute>
                <Questionnaire />
              </ProtectedRoute>
            }
          />
          {/* Default redirect for authenticated users */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
        {/* Conditionally render Footer based on user auth and route */}
        {user && location.pathname !== '/chat' && location.pathname !== '/login' && (
          <Footer darkMode={darkMode} setDarkMode={setDarkMode} />
        )}
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;