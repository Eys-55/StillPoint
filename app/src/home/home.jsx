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
// import Header from '../nav/header.jsx'; // Removed Header import
import { auth, firestore } from '../firebase.jsx';
import { doc, getDoc } from 'firebase/firestore';
import Tracker from './tracker.jsx';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ChatIcon from '@mui/icons-material/Chat';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import WavingHandIcon from '@mui/icons-material/WavingHand'; // Friendly icon
import { HEADER_HEIGHT } from '../nav/header.jsx'; // Import for padding calculation if needed, or set a static value
import { FOOTER_HEIGHT } from '../nav/footer.jsx'; // Import Footer height

function Home() {
  const navigate = useNavigate();
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(null); // null = loading, true/false = checked
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const checkUserStatus = async (user) => {
      setLoading(true);
      setUserName(user.displayName || 'User'); // Get display name
      const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
      try {
        const docSnap = await getDoc(docRef);
        setQuestionnaireCompleted(docSnap.exists());
      } catch (error) {
        console.error("Error checking questionnaire status:", error);
        setQuestionnaireCompleted(false); // Assume not completed on error
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        checkUserStatus(user);
      } else {
        // If user becomes null (logged out), ProtectedRoute will handle redirect
        setLoading(false);
        setUserName('');
        setQuestionnaireCompleted(false);
      }
    });

    return () => unsubscribe(); // Cleanup listener on unmount

  }, []); // Empty dependency array, effect runs once on mount and cleanup on unmount

  const handleNavigation = (path) => {
    if (questionnaireCompleted === false && path !== '/get-started') {
      // Consider using a Snackbar or a more gentle notification
      alert("Please complete the questionnaire first to unlock this feature.");
      return;
    }
    navigate(path);
  };

  // Loading state display
  if (loading || questionnaireCompleted === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    // Adjust main Box if it previously relied on Header for structure
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default', pt: 4 /* Add padding top if needed */ }}>
      {/* <Header mode="home" /> */} {/* Removed Header */}
      {/* Adjust top margin (mt) to account for removed header, or use padding on the parent Box */}
      {/* Add bottom margin (mb) to account for fixed Footer height + buffer */}
      <Container component="main" sx={{ /* mt: 4, removed */ mb: `${FOOTER_HEIGHT + 16}px`, flexGrow: 1 }}>

        {questionnaireCompleted === false && (
          <Alert
            severity="info" // Changed from warning for a softer tone
            sx={{ mb: 3, borderRadius: 1.5 }} // Reduced borderRadius
            icon={<PsychologyIcon fontSize="inherit" />}
            action={
              <Button
                color="primary" // Use primary color for action
                size="small"
                variant="contained" // Make it stand out slightly more
                disableElevation
                 startIcon={<DescriptionIcon />}
                 onClick={() => navigate('/get-started')}
                 sx={{ borderRadius: 3 }} // Reduced borderRadius
               >
                 Get Started
               </Button>
            }
          >
            Complete your initial questionnaire to personalize your experience and unlock all features.
          </Alert>
        )}

        <Stack spacing={4}> {/* Increased spacing */}
          <Tracker />

          {/* Quick Actions Removed */}
        </Stack>
      </Container>
      {/* Footer rendered conditionally in App.jsx */}
    </Box>
  );
}

export default Home;