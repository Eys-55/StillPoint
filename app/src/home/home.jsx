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
import { auth, firestore } from '../firebase.jsx';
import { doc, getDoc } from 'firebase/firestore';
import Tracker from './tracker.jsx';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ChatIcon from '@mui/icons-material/Chat';
import DescriptionIcon from '@mui/icons-material/Description';
// import WavingHandIcon from '@mui/icons-material/WavingHand'; // Removed greeting icon
import { FOOTER_HEIGHT } from '../nav/footer.jsx'; // Import Footer height

// Import react-slick slider
// IMPORTANT: Make sure to install react-slick and slick-carousel
// npm install react-slick slick-carousel
// or
// yarn add react-slick slick-carousel
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useTheme } from '@mui/material/styles'; // Import useTheme

function Home() {
  const navigate = useNavigate();
  const theme = useTheme(); // Get theme for styling slider dots
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(null); // null = loading, true/false = checked
  const [loading, setLoading] = useState(true);
  // const [userName, setUserName] = useState(''); // Removed userName state

  // Define the quick actions with descriptions
  const quickActions = [
    { text: 'Start Chat', icon: <ChatIcon />, path: '/chat', description: 'Begin a new conversation with your AI companion.' },
    // Updated paths to point to the profile page where these sections likely live
    { text: 'View Insights', icon: <PsychologyIcon />, path: '/profile', description: 'Explore personalized insights based on your chats.' },
    { text: 'View Summaries', icon: <DescriptionIcon />, path: '/profile', description: 'Review summaries of your past conversations.' },
  ];

  useEffect(() => {
    const checkUserStatus = async (user) => {
      setLoading(true);
      // setUserName(user.displayName || 'User'); // No longer setting user name
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
        // setUserName(''); // No longer setting user name
        setQuestionnaireCompleted(false);
      }
    });

    return () => unsubscribe(); // Cleanup listener on unmount

  }, []); // Empty dependency array, effect runs once on mount and cleanup on unmount

  const handleNavigation = (path) => {
    // Allow navigation to /profile even if questionnaire isn't done,
    // as profile might contain the link/prompt to do it.
    // Only restrict chat if questionnaire is incomplete.
    if (questionnaireCompleted === false && path === '/chat') {
      alert("Please complete the questionnaire first to start chatting.");
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

  // Slider settings
  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500, // Transition speed in ms
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000, // Time between slides in ms
    arrows: false, // Hide default arrows, dots are enough
    pauseOnHover: true,
    // Custom dots styling
    appendDots: dots => (
      <Box component="ul" sx={{
          position: 'relative', // Position relative to the container
          bottom: '-10px', // Adjust spacing below the slider content (reduced slightly)
          padding: 0,
          margin: 0,
          listStyle: 'none',
          textAlign: 'center',
          '& li': { // Target list items (dots containers)
              mx: 0.5, // Add horizontal margin between dots
          },
          '& li button:before': { // Target the dot pseudo-elements
              fontSize: '12px', // Slightly larger dots
              color: theme.palette.action.disabled, // Default dot color
              opacity: 0.75,
          },
          '& li.slick-active button:before': { // Target the active dot
              color: theme.palette.primary.main, // Active dot color
              opacity: 1,
          }
      }}>
        {dots}
      </Box>
    ),
  };


  return (
    // Main container for the page, ensures it takes full height and allows vertical centering
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default', pt: 4 /* Add padding top if needed */ }}>
      {/* Add bottom margin (mb) to account for fixed Footer height + buffer */}
      {/* Container limits width, flexGrow allows it to take vertical space */}
      <Container component="main" sx={{ mt: 2, mb: `${FOOTER_HEIGHT + 16}px`, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Optional Alert */}
        {questionnaireCompleted === false && (
          <Alert
            severity="info"
            sx={{ mb: 3, borderRadius: 1.5, flexShrink: 0 /* Prevent alert from shrinking */ }}
            icon={<PsychologyIcon fontSize="inherit" />}
            action={
              <Button
                color="primary"
                size="small"
                variant="contained"
                disableElevation
                 startIcon={<DescriptionIcon />}
                 onClick={() => navigate('/questionnaire')}
                 sx={{ borderRadius: 3 }}
               >
                 Get Started
               </Button>
            }
          >
            Complete your initial questionnaire to personalize your experience and unlock all features.
          </Alert>
        )}

        {/* Wrapper Box for Centering Content */}
        <Box sx={{
            flexGrow: 1, // Allows this box to take up remaining vertical space
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center', // Center vertically
            alignItems: 'center', // Center horizontally
            width: '100%', // Ensure it takes full width of container
        }}>
            {/* Stack containing the Slider and Tracker */}
            <Stack spacing={5} sx={{ width: '100%', maxWidth: 'md' /* Optional: constrain max width */, alignItems: 'center' }}> {/* Increased spacing */}

              {/* --- Quick Actions Slider (Bigger & Centered) --- */}
              <Box sx={{ width: '100%', px: { xs: 0, sm: 2 } /* Add some horizontal padding on larger screens */ }}>
                <Slider {...sliderSettings}>
                  {quickActions.map((action, index) => {
                    const isDisabled = questionnaireCompleted === false && action.path === '/chat';
                    return (
                      <Box
                        key={index}
                        sx={{
                          px: 1, // Padding between slides
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.6 : 1,
                        }}
                        onClick={() => !isDisabled && handleNavigation(action.path)}
                      >
                        {/* Increased padding, minHeight, icon size, and text variants */}
                        <Stack spacing={1} alignItems="center" textAlign="center" sx={{ p: 3, minHeight: 150 /* Increased height */ }}>
                          <Box sx={{ color: isDisabled ? 'action.disabled' : 'primary.main', mb: 1 }}>
                              {React.cloneElement(action.icon, { sx: { fontSize: 40 } })} {/* Larger icon */}
                          </Box>
                          <Typography variant="h6" sx={{ fontWeight: 'medium' }}> {/* Larger text */}
                            {action.text}
                          </Typography>
                          <Typography variant="body1" color="text.secondary"> {/* Larger description */}
                            {action.description}
                          </Typography>
                        </Stack>
                      </Box>
                    );
                  })}
                </Slider>
              </Box>
              {/* --- End Quick Actions --- */}

              {/* Tracker remains below the slider */}
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                 <Tracker />
              </Box>

            </Stack>
        </Box>
      </Container>
      {/* Footer rendered conditionally in App.jsx */}
    </Box>
  );
}

export default Home;