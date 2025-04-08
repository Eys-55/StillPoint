import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth, firestore } from '../../firebase.jsx';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { questions } from '../../meta/questions.js';
import { useNavigate } from 'react-router-dom';
import {
  Container,
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
  Alert, // Added for saving status/errors
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Icon for Back button
import SaveIcon from '@mui/icons-material/Save'; // Icon for saving status

const SAVE_DEBOUNCE_MS = 1500; // 1.5 seconds debounce time

function Questionnaire() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // Initialize empty, will be populated
  const [loading, setLoading] = useState(true);
  const [isEditable, setIsEditable] = useState(false);
  const [savingInteractive, setSavingInteractive] = useState(false); // For initial completion save
  const [fade, setFade] = useState(true); // Start visible for initial load

  // State for auto-save in edit mode
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false); // To show temporary success message
  const saveTimeoutId = useRef(null); // Ref to store timeout ID for debouncing
  const hasUnsavedChanges = useRef(false); // Ref to track if changes were made since last save

  const user = auth.currentUser;
  const navigate = useNavigate();

  // --- Data Fetching ---
  useEffect(() => {
    async function checkQuestionnaire() {
      setLoading(true);
      setSaveError('');
      const initializeEmptyAnswers = () => questions.map(q => ({ question: q.question, answer: "" }));

      if (user) {
        const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().answers) {
            const data = docSnap.data();
            const storedAnswers = data.answers || [];
            if (Array.isArray(storedAnswers)) {
                const storedAnswersMap = new Map(storedAnswers.map(a => [a.question, a.answer]));
                const fullAnswers = questions.map(q => ({
                    question: q.question,
                    answer: storedAnswersMap.get(q.question) || ""
                }));
                setAnswers(fullAnswers);
            } else {
                 console.warn("Stored 'answers' is not an array:", storedAnswers);
                 setAnswers(initializeEmptyAnswers());
            }
            setIsEditable(true); // Already completed, enter edit mode
          } else {
            setAnswers(initializeEmptyAnswers());
            setIsEditable(false); // Start fresh interactive mode
          }
        } catch (error) {
          console.error("Error fetching questionnaire:", error);
          setSaveError("Failed to load questionnaire data.");
          setAnswers(initializeEmptyAnswers());
          setIsEditable(false);
        }
      } else {
        console.warn("User not logged in, cannot fetch questionnaire.");
        setSaveError("You must be logged in to view or answer the questionnaire.");
        setAnswers(initializeEmptyAnswers());
        setIsEditable(false);
      }
      setLoading(false);
      hasUnsavedChanges.current = false; // Reset unsaved changes flag on load
    }
    checkQuestionnaire();
  }, [user]); // Rerun if user changes

  // --- Auto-Save Logic (Edit Mode) ---
  const saveChanges = useCallback(async () => {
    if (!user || !hasUnsavedChanges.current) {
        // console.log("Save skipped: No user or no unsaved changes.");
        return; // Don't save if no user or no changes detected
    }

    // console.log("Attempting to save changes...");
    setIsSavingEdit(true);
    setSaveError('');
    setSaveSuccess(false);
    const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');

    try {
      // Filter out any potentially invalid entries before saving
      const finalAnswers = answers.filter(a => a && a.question && typeof a.answer === 'string');
      const dataToSave = {
          answers: finalAnswers,
          updatedAt: new Date().toISOString() // Always update timestamp
      };
      // Preserve completedAt if it exists
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().completedAt) {
          dataToSave.completedAt = docSnap.data().completedAt;
      } else if (!docSnap.exists() || !docSnap.data().completedAt) {
          // If completing for the first time via edit mode (unlikely but possible)
          dataToSave.completedAt = new Date().toISOString();
      }

      await setDoc(docRef, dataToSave, { merge: true });
      // console.log("Changes saved successfully.");
      hasUnsavedChanges.current = false; // Reset flag after successful save
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000); // Show success message briefly

    } catch (err) {
      console.error("Error auto-saving questionnaire:", err);
      setSaveError("Failed to save changes. Please try again later.");
    } finally {
      setIsSavingEdit(false);
    }
  }, [user, answers]); // Dependency array includes user and answers

  // Effect for debounced saving in edit mode
  useEffect(() => {
    if (isEditable && hasUnsavedChanges.current) {
      // Clear existing timer if there is one
      if (saveTimeoutId.current) {
        clearTimeout(saveTimeoutId.current);
      }
      // Set a new timer
      saveTimeoutId.current = setTimeout(() => {
        saveChanges();
      }, SAVE_DEBOUNCE_MS);
    }

    // Cleanup function to clear timeout on unmount or when isEditable changes
    return () => {
      if (saveTimeoutId.current) {
        clearTimeout(saveTimeoutId.current);
      }
    };
  }, [answers, isEditable, saveChanges]); // Rerun when answers or edit mode changes

  // Effect to save changes when component unmounts (if in edit mode and changes exist)
  useEffect(() => {
    return () => {
      if (isEditable && hasUnsavedChanges.current) {
        // console.log("Component unmounting, saving pending changes...");
        saveChanges(); // Save immediately on unmount
      }
    };
  }, [isEditable, saveChanges]); // Depends on edit mode and the save function itself

  // --- Handlers ---

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
  const handleAnswerInteractive = async (option) => {
    const newAnswer = { question: questions[currentQuestionIndex].question, answer: option };
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = newAnswer;
    setAnswers(updatedAnswers); // Update local state

    if (currentQuestionIndex < questions.length - 1) {
      transitionQuestion(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      });
    } else {
      // Last question: Save all answers to Firestore
      setSavingInteractive(true);
      if (user) {
          const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
          try {
            const finalAnswers = updatedAnswers.filter(a => a && typeof a.question === 'string' && typeof a.answer === 'string');
            await setDoc(docRef, {
                answers: finalAnswers,
                completedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString() // Also set updatedAt on completion
            }, { merge: true });
            navigate('/profile'); // Navigate to profile page on success
          } catch (err) {
            console.error("Error saving questionnaire:", err);
            setSaveError("Failed to save responses. Please try again.");
            setSavingInteractive(false);
          }
      } else {
          console.error("Cannot save questionnaire: User not logged in.");
          setSaveError("You must be logged in to save responses.");
          setSavingInteractive(false);
      }
    }
  };

  // Handle option selection in edit mode (using RadioGroup)
  const handleSelectOptionEdit = (qIndex, option) => {
    const updatedAnswers = [...answers];
    if (!updatedAnswers[qIndex] || typeof updatedAnswers[qIndex] !== 'object') {
      updatedAnswers[qIndex] = { question: questions[qIndex].question, answer: option };
    } else {
      // Only update if the answer actually changed
      if (updatedAnswers[qIndex].answer !== option) {
          updatedAnswers[qIndex].answer = option;
          hasUnsavedChanges.current = true; // Mark changes as unsaved
          setAnswers(updatedAnswers); // Update local state -> triggers debounce effect
          setSaveSuccess(false); // Hide success message on new change
          setSaveError(''); // Clear previous errors on new change
      }
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
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'medium' }}>
              Review Your Responses
            </Typography>
            {/* Saving Status Indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '24px' /* Match icon size */ }}>
              {isSavingEdit && <CircularProgress size={20} color="primary" />}
              {isSavingEdit && <Typography variant="body2" color="text.secondary">Saving...</Typography>}
              {saveSuccess && !isSavingEdit && <SaveIcon color="success" fontSize="small" />}
              {saveSuccess && !isSavingEdit && <Typography variant="body2" color="success.main">Saved</Typography>}
            </Box>
          </Stack>

          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

          {/* No <form> tag needed */}
          <Stack spacing={4}>
            {questions.map((q, idx) => {
              const currentAnswerObj = answers.find(a => a?.question === q.question);
              const currentAnswer = currentAnswerObj ? currentAnswerObj.answer : "";

              return (
                <FormControl component="fieldset" key={idx} fullWidth disabled={isSavingEdit}>
                  <FormLabel component="legend" sx={{ mb: 1.5 }}>
                    <Typography variant="h6" fontWeight="regular">
                      {idx + 1}. {q.question}
                    </Typography>
                  </FormLabel>
                  <RadioGroup
                    aria-label={q.question}
                    name={`question-${idx}`}
                    value={currentAnswer}
                    onChange={(e) => handleSelectOptionEdit(idx, e.target.value)}
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
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-start' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/profile')} // Navigate back to profile
              disabled={isSavingEdit} // Disable while saving
              // Use theme default (8px) or specify pill shape
              sx={{ borderRadius: '50px', px: 3 }}
            >
              Back to Profile
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  // --- Interactive Mode UI ---
  const currentQ = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / questions.length) * 100;

  return (
    <Container maxWidth="sm" sx={{ mt: { xs: 3, sm: 5 }, mb: 4 }}>
     <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
         <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: '8px' }}/>
         </Box>
         <Box sx={{ minWidth: 55 }}>
           <Typography variant="body2" color="text.secondary">{`${currentQuestionIndex + 1}/${questions.length}`}</Typography>
         </Box>
       </Box>
       {/* Question Card */}
       <Fade in={fade} timeout={300}>
        <Paper elevation={3}>
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
                  onClick={() => handleAnswerInteractive(option)}
                  disabled={savingInteractive} // Disable buttons while saving last answer
                  sx={{
                     justifyContent: 'flex-start',
                     textTransform: 'none',
                     py: 1.5,
                     px: 2,
                    borderRadius: '8px',
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

      {/* Saving Indicator (for last question submission in interactive mode) */}
      {savingInteractive && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, gap: 1 }}>
          <CircularProgress size={24} />
          <Typography color="text.secondary">Saving your responses...</Typography>
        </Box>
      )}
      {/* Error display for interactive mode save */}
      {saveError && !isEditable && (
          <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>
      )}
    </Container>
  );
}

export default Questionnaire;