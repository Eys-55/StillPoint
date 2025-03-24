import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Header from '../nav/header.jsx';
import { auth, firestore } from '../firebase.jsx';
import { doc, getDoc } from 'firebase/firestore';
import Tracker from './tracker.jsx';

function Home() {
  const navigate = useNavigate();
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(null);

  useEffect(() => {
    async function checkQuestionnaire() {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
        const docSnap = await getDoc(docRef);
        setQuestionnaireCompleted(docSnap.exists());
      } else {
        setQuestionnaireCompleted(false);
      }
    }
    checkQuestionnaire();
  }, []);

  const handleChat = () => {
    if (!questionnaireCompleted) {
      alert("Please answer the questionnaire first.");
      return;
    }
    navigate('/chat');
  };

  const handleProfile = () => {
    if (!questionnaireCompleted) {
      alert("Please answer the questionnaire first.");
      return;
    }
    navigate('/profile');
  };

  return (
    <div>
      <Header mode="home" darkMode={document.body.getAttribute("data-bs-theme") === "dark"} />
      <Container sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Welcome to the Mental Health App
        </Typography>
        {questionnaireCompleted === false && (
          <Box sx={{ mb: 3 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              You have not answered your questionnaire yet. Please complete it to receive personalized recommendations.
            </Alert>
            <Button variant="outlined" onClick={() => navigate('/get-started')}>
              Answer Questionnaire
            </Button>
          </Box>
        )}
        <Box>
          <Typography variant="body1" paragraph>
            This is your home page. Here you can view your stats and learn about the app features.
          </Typography>
          <Typography variant="body1" paragraph>
            Placeholder for stats and additional details.
          </Typography>
          <Tracker />
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button variant="contained" color="secondary" onClick={handleProfile}>
              View Profile
            </Button>
            <Button variant="contained" color="primary" onClick={handleChat}>
              Go to Chat
            </Button>
          </Box>
        </Box>
      </Container>
    </div>
  );
}

export default Home;