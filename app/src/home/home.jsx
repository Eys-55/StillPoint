import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Header from '../nav/header.jsx'; // Assuming Header adapts or doesn't need explicit mode
import { auth, firestore } from '../firebase.jsx';
import { doc, getDoc } from 'firebase/firestore';
import Tracker from './tracker.jsx';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ChatIcon from '@mui/icons-material/Chat';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DescriptionIcon from '@mui/icons-material/Description';

function Home() {
  const navigate = useNavigate();
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(null); // null = loading, true/false = checked
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const checkUserStatus = async () => {
      setLoading(true);
      const user = auth.currentUser;
      if (user) {
        setUserName(user.displayName || 'User'); // Get display name
        const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
        try {
          const docSnap = await getDoc(docRef);
          setQuestionnaireCompleted(docSnap.exists());
        } catch (error) {
          console.error("Error checking questionnaire status:", error);
          setQuestionnaireCompleted(false);
        }
      } else {
        setQuestionnaireCompleted(false);
        setUserName('');
        // No need to navigate here, ProtectedRoute handles it
      }
      setLoading(false);
    };

    // Use onAuthStateChanged for reliability
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        checkUserStatus();
      } else {
        // If user becomes null (logged out), ProtectedRoute will handle redirect
        setLoading(false);
        setUserName('');
        setQuestionnaireCompleted(false);
      }
    });

    return () => unsubscribe();

  }, []); // No navigate dependency needed here

  const handleNavigation = (path) => {
    if (questionnaireCompleted === false && path !== '/get-started') {
      alert("Please complete the questionnaire first to access this feature.");
      return;
    }
    navigate(path);
  };

  // Loading state display
  if (loading || questionnaireCompleted === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    // Using Box with background.default ensures the theme's background color is applied
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
       {/* Header might need darkMode prop if it has non-MUI elements needing style changes */}
      <Header mode="home" />
      <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Paper elevation={2} sx={{ p: { xs: 2, md: 4 }, mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome back, {userName}! <PsychologyIcon sx={{ verticalAlign: 'middle' }}/>
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Ready to continue your mental wellness journey? Here's a quick overview.
          </Typography>
        </Paper>

        {questionnaireCompleted === false && (
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                startIcon={<DescriptionIcon />}
                onClick={() => navigate('/get-started')} // Direct navigation is fine here
              >
                Answer Now
              </Button>
            }
          >
            Please complete your initial questionnaire to personalize your experience.
          </Alert>
        )}

        <Stack spacing={3}>
          <Tracker />

          <Paper elevation={2} sx={{ p: 2 }}>
             <Typography variant="h6" gutterBottom>Quick Actions</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button
                variant="contained"
                color="primary"
                startIcon={<ChatIcon />}
                onClick={() => handleNavigation('/chat')}
                disabled={questionnaireCompleted === false}
                sx={{ flexGrow: 1 }}
              >
                Start Chatting
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<AccountCircleIcon />}
                onClick={() => handleNavigation('/profile')}
                 disabled={questionnaireCompleted === false}
                sx={{ flexGrow: 1 }}
              >
                View Profile & Summaries
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
      {/* Footer is now rendered conditionally in App.jsx */}
    </Box>
  );
}

export default Home;