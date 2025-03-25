import React, { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase.jsx';
import { doc, getDoc } from 'firebase/firestore';
import Header from '../nav/header.jsx';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
  Grid,
  Chip,
  Avatar,
  Paper,
  Divider,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import EditIcon from '@mui/icons-material/Edit';
import ListAltIcon from '@mui/icons-material/ListAlt';

function UserProfile() {
  const [questionnaireData, setQuestionnaireData] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const navigate = useNavigate();
  const isDarkMode = document.body.getAttribute('data-bs-theme') === 'dark'; // Keep for Header prop

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      if (user) {
        try {
          const docRef = doc(
            firestore,
            'users',
            user.uid,
            'questionnaire',
            'responses'
          );
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setQuestionnaireData(docSnap.data());
          } else {
            console.log('No questionnaire responses found for this user.');
            setQuestionnaireData({ answers: [] }); // Set to empty array if no doc
          }
        } catch (error) {
          console.error('Error fetching questionnaire data:', error);
          // Optionally set an error state here
        }
      } else {
        console.log('No user logged in.');
      }
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const handleSummaries = () => {
    navigate('/summaries');
  };

  const handleEditQuestionnaire = () => {
    navigate('/get-started'); // Navigate to the questionnaire page
  };

  return (
    <div>
      <Header mode="profile" darkMode={isDarkMode} />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
              <AccountCircleIcon />
            </Avatar>
            <Typography variant="h4" component="h1">
              User Profile
            </Typography>
          </Box>
          <Typography variant="h6" color="text.secondary">
            {user ? user.email : 'Loading user data...'}
          </Typography>
        </Paper>

        <Grid container spacing={3}>
          {/* Questionnaire Section */}
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <QuestionAnswerIcon color="action" sx={{ mr: 1 }} />
                  <Typography variant="h5" component="h2">
                    Questionnaire Responses
                  </Typography>
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : questionnaireData && questionnaireData.answers && questionnaireData.answers.length > 0 ? (
                  <Grid container spacing={2}>
                    {questionnaireData.answers.map((item, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                              {index + 1}. {item.question}
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                            <Chip
                              label={item.answer || 'Not answered'}
                              color="primary"
                              variant="outlined"
                              sx={{ mt: 1 }}
                            />
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography sx={{ mt: 2, fontStyle: 'italic' }}>
                    No questionnaire responses found. Complete the questionnaire to personalize your experience.
                  </Typography>
                )}

                <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={handleEditQuestionnaire}
                    disabled={loading}
                  >
                    {questionnaireData && questionnaireData.answers && questionnaireData.answers.length > 0
                      ? 'Edit Responses'
                      : 'Start Questionnaire'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Summaries Section */}
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ListAltIcon color="action" sx={{ mr: 1 }} />
                  <Typography variant="h5" component="h2">
                    Conversation Summaries
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Review summaries of your past conversations.
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleSummaries}
                  disabled={loading}
                  color="secondary"
                >
                  View Summaries
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
}

export default UserProfile;