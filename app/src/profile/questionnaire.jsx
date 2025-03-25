import React, { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase.jsx';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { questions } from '../meta/questions.js';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
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
} from '@mui/material';

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
      setLoading(true); // Start loading
      const initializeEmptyAnswers = () => questions.map(q => ({ question: q.question, answer: "" }));

      if (user) {
        const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().answers) {
            // CORRECTED LINE: Provide default empty array if answers doesn't exist
            const storedAnswers = docSnap.data().answers ||[]; // Get stored answers array
            
            // Create a map for quick lookup of stored answers by question text
            const storedAnswersMap = new Map(storedAnswers.map(a => [a.question, a.answer]));

            // Map questions to answers, ensuring order and filling gaps
            const fullAnswers = questions.map(q => ({
              question: q.question,
              answer: storedAnswersMap.get(q.question) || "" // Get stored answer or default to empty string
            }));

            setAnswers(fullAnswers);
            setIsEditable(true); // Go directly to edit mode if data exists
          } else {
             // Initialize answers with empty structure if no document or answers array exists
            setAnswers(initializeEmptyAnswers());
            setIsEditable(false); // Start in interactive mode if no previous answers
          }
        } catch (error) {
          console.error("Error fetching questionnaire:", error);
          // Handle error appropriately, maybe show a message to the user
          // Initialize with empty structure on error as well
           setAnswers(initializeEmptyAnswers());
           setIsEditable(false);
        }
      } else {
        // Handle case where user is not logged in
         console.warn("User not logged in, cannot fetch questionnaire.");
         // Initialize with empty structure
         setAnswers(initializeEmptyAnswers());
         setIsEditable(false);
      }
      setLoading(false); // Finish loading
    }
    checkQuestionnaire();
  }, [user]); // Dependency array only includes user
  // Fade effect for interactive mode transitions
  useEffect(() => {
    if (!isEditable && !loading) {
      setFade(true); // Ensure fade-in happens when component is ready
    }
  }, [currentQuestionIndex, isEditable, loading]);

  const transitionQuestion = (callback) => {
    setFade(false);
    setTimeout(() => {
      callback();
      setFade(true);
    }, 300); // Match timeout with CSS transition duration if needed
  };

  // Interactive mode: handle answer selection
  const handleAnswer = async (option) => {
    const newAnswer = { question: questions[currentQuestionIndex].question, answer: option };
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = newAnswer;
    setAnswers(updatedAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      transitionQuestion(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      });
    } else {
      setSaving(true); // Indicate saving process
      const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
      try {
        await setDoc(docRef, { answers: updatedAnswers, completedAt: new Date().toISOString() }, { merge: true }); // Use merge to be safe
        navigate('/profile');
      } catch (err) {
        console.error("Error saving questionnaire:", err);
        setSaving(false); // Reset saving state on error
        // Show error message to user
      }
      // No need to setSaving(false) on success as we navigate away
    }
  };

  // Edit mode: handle selection update
  const handleSelectOption = (qIndex, option) => {
    const updatedAnswers = [...answers];
    // Ensure an answer object exists, though initialization should prevent this need
    if (!updatedAnswers[qIndex]) {
      updatedAnswers[qIndex] = { question: questions[qIndex].question, answer: option };
    } else {
      updatedAnswers[qIndex].answer = option;
    }
    setAnswers(updatedAnswers);
  };

  // Save updated answers in edit mode
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
    try {
      // Filter out any potentially null entries before saving, though ideally 'answers' state is always full
      const finalAnswers = answers.filter(a => a !== null && a.answer !== "");
      await setDoc(docRef, { answers: finalAnswers, completedAt: new Date().toISOString() }, { merge: true });
      navigate('/profile');
    } catch (err) {
      console.error("Error updating questionnaire:", err);
      setSaving(false);
      // Show error message to user
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 5, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading questionnaire...</Typography>
      </Container>
    );
  }

  // Edit Mode UI
  if (isEditable) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h5" component="div" gutterBottom>
              Edit Questionnaire Responses
            </Typography>
            <form onSubmit={handleSaveEdit}>
              {questions.map((q, idx) => {
                const currentAnswer = answers[idx] ? answers[idx].answer : "";
                return (
                  <FormControl component="fieldset" key={idx} sx={{ mb: 3, width: '100%' }}>
                    <FormLabel component="legend" sx={{ mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {idx + 1}. {q.question}
                      </Typography>
                    </FormLabel>
                    {/* Assuming single choice based on original interactive mode */}
                    <RadioGroup
                      aria-label={q.question}
                      name={`question-${idx}`}
                      value={currentAnswer}
                      onChange={(e) => handleSelectOption(idx, e.target.value)}
                    >
                      {q.options.map((option, optionIdx) => (
                        <FormControlLabel
                          key={optionIdx}
                          value={option}
                          control={<Radio />}
                          label={option}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                );
              })}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                    variant="outlined"
                    onClick={() => navigate('/profile')}
                    disabled={saving}
                    color="secondary"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Interactive Mode UI
  const currentQ = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Box sx={{ width: '100%', mb: 2 }}>
        <LinearProgress variant="determinate" value={progress} />
      </Box>
      <Fade in={fade} timeout={300}>
        <Card>
          <CardContent>
            <Typography variant="overline" display="block" gutterBottom>
              Question {currentQuestionIndex + 1} of {questions.length}
            </Typography>
            <Typography variant="h6" component="div" sx={{ mb: 3 }}>
              {currentQ.question}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {currentQ.options.map((option, idx) => (
                <Button
                  key={idx}
                  variant="outlined"
                  fullWidth
                  onClick={() => handleAnswer(option)}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.5, px: 2 }} // Nicer button layout
                >
                  {option}
                </Button>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Fade>
       {saving && ( // Show saving indicator at the bottom in interactive mode too
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <CircularProgress />
            <Typography sx={{ ml: 1 }}>Saving...</Typography>
          </Box>
        )}
    </Container>
  );
}

export default Questionnaire;