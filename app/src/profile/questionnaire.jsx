import React, { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase.jsx';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { questions } from '../meta/questions.js';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card, // No longer used directly, but kept for potential future use
  CardContent,
  Typography,
  Button,
  Box,
  LinearProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  CircularProgress,
  Fade,
  Paper,
  Stack,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

function Questionnaire() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState(Array(questions.length).fill(null)); // Initialize with nulls
  const [loading, setLoading] = useState(true);
  const [isEditable, setIsEditable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fade, setFade] = useState(true); // Start visible for initial load
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    async function checkQuestionnaire() {
      setLoading(true);
      const initializeEmptyAnswers = () => questions.map(q => ({ question: q.question, answer: "" }));

      if (user) {
        const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().answers) {
            const storedAnswers = docSnap.data().answers || [];
            // Ensure storedAnswers is actually an array before mapping
            if (Array.isArray(storedAnswers)) {
                const storedAnswersMap = new Map(storedAnswers.map(a => [a.question, a.answer]));
                const fullAnswers = questions.map(q => ({
                    question: q.question,
                    answer: storedAnswersMap.get(q.question) || ""
                }));
                setAnswers(fullAnswers);
            } else {
                 // Handle case where 'answers' field exists but is not an array
                 console.warn("Stored 'answers' is not an array:", storedAnswers);
                 setAnswers(initializeEmptyAnswers());
            }
            setIsEditable(true); // Already completed, enter edit mode
          } else {
            // No document or no 'answers' field, start fresh
            setAnswers(initializeEmptyAnswers());
            setIsEditable(false);
          }
        } catch (error) {
          console.error("Error fetching questionnaire:", error);
          setAnswers(initializeEmptyAnswers());
          setIsEditable(false);
        }
      } else {
        console.warn("User not logged in, cannot fetch questionnaire.");
        setAnswers(initializeEmptyAnswers());
        setIsEditable(false);
      }
      setLoading(false);
    }
    checkQuestionnaire();
  }, [user]); // Rerun if user changes

  // Effect for fade transition (only in interactive mode)
  useEffect(() => {
    if (!isEditable && !loading) {
      setFade(true); // Ensure fade-in happens when question changes
    }
  }, [currentQuestionIndex, isEditable, loading]);

  // Helper for smooth question transition
  const transitionQuestion = (callback) => {
    setFade(false); // Fade out current question
    setTimeout(() => {
      callback(); // Change the question index
      setFade(true); // Fade in the new question
    }, 300); // Match Fade timeout duration
  };

  // Handle answer selection in interactive mode
  const handleAnswer = async (option) => {
    const newAnswer = { question: questions[currentQuestionIndex].question, answer: option };
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = newAnswer;
    setAnswers(updatedAnswers); // Update local state

    if (currentQuestionIndex < questions.length - 1) {
      // Move to the next question with transition
      transitionQuestion(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      });
    } else {
      // Last question: Save all answers to Firestore
      setSaving(true);
      if (user) {
          const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
          try {
            // Ensure only valid answers are saved (basic check)
            const finalAnswers = updatedAnswers.filter(a => a && typeof a.question === 'string' && typeof a.answer === 'string');
            await setDoc(docRef, { answers: finalAnswers, completedAt: new Date().toISOString() }, { merge: true });
            navigate('/profile'); // Navigate to profile page on success
            // No need to setSaving(false) due to navigation
          } catch (err) {
            console.error("Error saving questionnaire:", err);
            alert("Failed to save responses. Please try again."); // User feedback
            setSaving(false); // Reset saving state on error
          }
      } else {
          console.error("Cannot save questionnaire: User not logged in.");
          alert("You must be logged in to save responses.");
          setSaving(false);
      }
    }
  };

  // Handle option selection in edit mode (using RadioGroup)
  const handleSelectOption = (qIndex, option) => {
    const updatedAnswers = [...answers];
    // Ensure the answer object structure is correct
    if (!updatedAnswers[qIndex] || typeof updatedAnswers[qIndex] !== 'object') {
      updatedAnswers[qIndex] = { question: questions[qIndex].question, answer: option };
    } else {
      updatedAnswers[qIndex].answer = option;
    }
    setAnswers(updatedAnswers); // Update local state
  };

  // Handle saving changes in edit mode
  const handleSaveEdit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setSaving(true);
    if (user) {
        const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
        try {
            // Filter out any potentially invalid entries before saving
            const finalAnswers = answers.filter(a => a && a.question && typeof a.answer === 'string'); // Check answer type too
            await setDoc(docRef, { answers: finalAnswers, completedAt: new Date().toISOString() }, { merge: true });
            navigate('/profile'); // Navigate back to profile on success
            // No need to setSaving(false) due to navigation
        } catch (err) {
            console.error("Error updating questionnaire:", err);
            alert("Failed to save changes. Please try again."); // User feedback
            setSaving(false); // Reset saving state on error
        }
    } else {
        console.error("Cannot save questionnaire updates: User not logged in.");
        alert("You must be logged in to save changes.");
        setSaving(false);
    }
  };

  // ----- Render Logic -----

  // Common Loading Indicator
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: 2 }}>
        <CircularProgress />
        <Typography variant="h6" color="text.secondary">Loading questionnaire...</Typography>
      </Box>
    );
  }

  // --- Edit Mode UI ---
  if (isEditable) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ borderRadius: 4, p: { xs: 2, sm: 3, md: 4 } }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'medium', mb: 3 }}>
            Review Your Responses
          </Typography>
          <form onSubmit={handleSaveEdit}>
            <Stack spacing={4}>
              {questions.map((q, idx) => {
                // Find the corresponding answer object, default to empty string if not found
                const currentAnswerObj = answers.find(a => a?.question === q.question);
                const currentAnswer = currentAnswerObj ? currentAnswerObj.answer : "";

                return (
                  <FormControl component="fieldset" key={idx} fullWidth>
                    <FormLabel component="legend" sx={{ mb: 1.5 }}>
                      <Typography variant="h6" fontWeight="regular">
                        {idx + 1}. {q.question}
                      </Typography>
                    </FormLabel>
                    <RadioGroup
                      aria-label={q.question}
                      name={`question-${idx}`}
                      value={currentAnswer} // Use the found answer value
                      onChange={(e) => handleSelectOption(idx, e.target.value)} // Pass index to identify question
                    >
                      {q.options.map((option, optionIdx) => (
                        <FormControlLabel
                          key={optionIdx}
                          value={option}
                          control={<Radio sx={{ '& .MuiSvgIcon-root': { fontSize: 24 } }} />}
                          label={<Typography variant="body1">{option}</Typography>}
                          sx={{ mb: 0.5, ml: 1 }}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                );
              })}
            </Stack>
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/profile')} // Navigate back to profile on cancel
                disabled={saving}
                color="secondary"
                sx={{ borderRadius: 5, px: 3 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{ borderRadius: 5, px: 3 }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
    );
  }

  // --- Interactive Mode UI ---
  const currentQ = questions[currentQuestionIndex];
  // Progress based on NEXT question index (0/N, 1/N, ..., N/N)
  const progress = ((currentQuestionIndex) / questions.length) * 100;

  return (
    <Container maxWidth="sm" sx={{ mt: { xs: 3, sm: 5 }, mb: 4 }}>
      {/* Progress Bar */}
       <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
         <Box sx={{ width: '100%', mr: 1 }}>
           <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }}/>
         </Box>
         <Box sx={{ minWidth: 55 }}> {/* Adjusted width */}
           {/* Show N/Total */}
           <Typography variant="body2" color="text.secondary">{`${currentQuestionIndex + 1}/${questions.length}`}</Typography>
         </Box>
       </Box>

      {/* Question Card */}
      <Fade in={fade} timeout={300}>
        <Paper elevation={3} sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            <Typography variant="h5" component="div" sx={{ mb: 4, fontWeight: 'medium', textAlign: 'center' }}>
              {currentQ.question}
            </Typography>
            <Stack spacing={2}>
              {currentQ.options.map((option, idx) => (
                <Button
                  key={idx}
                  variant="outlined"
                  fullWidth
                  onClick={() => handleAnswer(option)}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    py: 1.5,
                    px: 2,
                    borderRadius: 3,
                    borderColor: 'grey.400',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                   }}
                >
                  <CheckCircleOutlineIcon sx={{ mr: 1.5, color: 'grey.500' }} />
                  <Typography variant="body1">{option}</Typography>
                </Button>
              ))}
            </Stack>
          </CardContent>
        </Paper>
      </Fade>

      {/* Saving Indicator (for last question submission) */}
      {saving && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, gap: 1 }}>
          <CircularProgress size={24} />
          <Typography color="text.secondary">Saving your responses...</Typography>
        </Box>
      )}
    </Container>
  );
}

export default Questionnaire;