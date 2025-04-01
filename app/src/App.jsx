import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import Login from './user/login.jsx';
import Home from './home/home.jsx';
import { auth } from './firebase.jsx';
import { signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import Chat from './chat/chat/Chat.jsx';
import LandingPage from './landing/LandingPage.jsx'; // Import LandingPage

import UserProfile from './profile/user_profile.jsx';
import Footer from './nav/footer.jsx';
import Privacy from './user/privacy.jsx';
import Settings from './user/settings.jsx';
import Questionnaire from './profile/insights/questionnaire.jsx';
import { ThemeProvider, createTheme, CssBaseline, CircularProgress } from '@mui/material'; // Import CircularProgress
import { Box } from '@mui/material';

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

// Updated ProtectedRoute to handle loading state better and redirect unauthenticated users
function ProtectedRoute() {
  const [user, loading] = useAuthState(auth);
  const location = useLocation();

  if (loading) {
     // Use a simple loading indicator consistent with MUI theme
     return (
       <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
         <CircularProgress />
       </Box>
     );
  }

  // If not loading and no user, redirect to login, preserving the intended destination
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated, render the child routes/component
  return <Outlet />; // Use Outlet to render nested routes
}

function App() {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
    // Or use system preference: window.matchMedia('(prefers-color-scheme: dark)').matches
  });
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [user, loading] = useAuthState(auth); // Use loading state here too

  useEffect(() => {
    document.body.setAttribute("data-bs-theme", darkMode ? "dark" : "light");
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            // Using --light-brand-opposite for light mode primary, and a slightly adjusted version for dark
            main: darkMode ? '#8ac0e8' : '#70ade0', // Example: Lighter blue for dark mode primary
          },
          secondary: {
             // Using --light-brand for secondary
            main: darkMode ? '#e58a6f' : '#db714f', // Example: Lighter orange for dark mode secondary
          },
          background: {
            default: darkMode ? '#262624' : '#faf9f5', // --dark-background : --light-background
            paper: darkMode ? '#30302e' : '#f7f6f2',   // --dark-textbox : --light-textbox
          },
          text: {
            primary: darkMode ? '#ffffff' : '#000000', // --text-on-dark : --text-on-light (Simplified)
            secondary: darkMode ? '#c2c0b6' : '#6e6e6e', // --dark-text : --light-text
          },
        },
         // Apply consistent shape globally if desired
         shape: {
           borderRadius: 16, // Example global border radius
         },
         components: {
           // Consistent button rounding (can be overridden)
           MuiButton: {
             styleOverrides: {
               root: {
                 borderRadius: 50,
               },
             },
           },
           // Consistent TextField rounding (can be overridden)
           MuiTextField: {
             styleOverrides: {
               root: {
                 '& .MuiOutlinedInput-root': {
                   borderRadius: 50,
                 },
               },
             },
           },
           // Consistent Card rounding (can be overridden)
           MuiCard: {
             styleOverrides: {
               root: {
                 borderRadius: 20,
               }
             }
           },
           // Consistent Alert rounding (can be overridden)
           MuiAlert: {
             styleOverrides: {
               root: {
                 borderRadius: 12,
               }
             }
           }
         }
      }),
    [darkMode],
  );


  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveConversationId(null);
      // Navigate to landing page after logout
      // No need to explicitly navigate here if using ProtectedRoute correctly,
      // as the auth state change will trigger redirection.
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  // Determine if the footer should be shown
  const showFooter = user && !loading && location.pathname !== '/chat' && location.pathname !== '/login' && location.pathname !== '/';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Routes>
          {/* Public Routes */}
          <Route path="/get-started" element={<LandingPage />} /> {/* Changed path */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes Wrapper */}
          <Route element={<ProtectedRoute />}>
            {/* Routes accessible only when logged in */}
            <Route path="/home" element={<Home />} />
            <Route
              path="/chat"
              element={
                <Chat
                  darkMode={darkMode}
                  setDarkMode={setDarkMode}
                  activeConversationId={activeConversationId}
                  setActiveConversationId={setActiveConversationId}
                  isSidebarCollapsed={isSidebarCollapsed}
                  setIsSidebarCollapsed={setIsSidebarCollapsed}
                />
              }
            />
            <Route path="/profile" element={<UserProfile />} />
            <Route
              path="/settings"
              element={<Settings darkMode={darkMode} setDarkMode={setDarkMode} />}
            />
            <Route path="/privacy" element={<Privacy />} /> {/* Keep privacy potentially accessible */}
            <Route path="/get-started" element={<Questionnaire />} />
          </Route>

          {/* Fallback Route */}
          {/* If logged in, redirect unknown paths to home. If not logged in, redirect to landing. */}
          <Route path="*" element={<Navigate to={user ? "/home" : "/get-started"} replace />} /> {/* Changed fallback for unauthenticated */}

        </Routes>
        {/* Conditionally render Footer */}
        {showFooter && (
          <Footer darkMode={darkMode} setDarkMode={setDarkMode} />
        )}
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;