import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, firestore } from '../../firebase.jsx';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { questions } from '../../meta/questions.js'; // Import questions definition
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
  Chip,
  Paper,
  Stack,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  // FormLabel, // No longer needed for individual edits
  Alert,
  IconButton, // For Edit/Save/Cancel icons
  Tooltip, // For icon button labels
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/CancelOutlined';

function Insights() {
  const [questionnaireData, setQuestionnaireData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // Error state for feedback

  // State for inline editing
  const [editingQuestion, setEditingQuestion] = useState(null); // Store question text being edited
  const [tempAnswer, setTempAnswer] = useState(''); // Store temporary answer for the editing question
  const [isSavingSingle, setIsSavingSingle] = useState(false); // Loading state for single save

  const user = auth.currentUser;
  const navigate = useNavigate();

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    if (user) {
      try {
        const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
        const docSnap = await getDoc(docRef);
        let fullAnswers;
        let completionData = {}; // Store completion/update timestamps if they exist

        if (docSnap.exists()) {
          const data = docSnap.data();
          completionData = { completedAt: data.completedAt, updatedAt: data.updatedAt }; // Preserve timestamps
          const currentAnswers = Array.isArray(data.answers) ? data.answers : [];
          // Ensure all questions from `questions.js` are represented
          fullAnswers = questions.map(q => {
            const existing = currentAnswers.find(a => a.question === q.question);
            return { question: q.question, answer: existing ? existing.answer : "" };
          });
        } else {
          // Initialize with empty answers if no document found
          fullAnswers = questions.map(q => ({ question: q.question, answer: "" }));
        }
        setQuestionnaireData({ ...completionData, answers: fullAnswers });
      } catch (fetchError) {
        console.error('Error fetching questionnaire data:', fetchError);
        setError('Failed to load questionnaire data. Please try again.');
        setQuestionnaireData({ answers: [] });
      }
    } else {
      setError('You must be logged in to view or edit insights.');
      setQuestionnaireData({ answers: [] });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Edit Handlers ---
  const handleStartEdit = (questionText, currentAnswer) => {
    setEditingQuestion(questionText);
    setTempAnswer(currentAnswer || ""); // Initialize with current answer or empty string
    setError(''); // Clear errors when starting edit
  };

  const handleCancelSingleEdit = () => {
    setEditingQuestion(null);
    setTempAnswer('');
    setError('');
  };

  const handleSaveSingleAnswer = async () => {
    if (!editingQuestion) return; // Should not happen if button is only visible when editing

    setIsSavingSingle(true);
    setError('');

    if (!user) {
      setError("You must be logged in to save changes.");
      setIsSavingSingle(false);
      return;
    }

    // Find the potentially modified answer from the temp state
    const answerToSave = tempAnswer;

    // Create the updated list of answers
    const updatedAnswers = (questionnaireData?.answers || []).map(ans =>
      ans.question === editingQuestion ? { ...ans, answer: answerToSave } : ans
    );

    const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
    try {
      await setDoc(docRef, {
        answers: updatedAnswers, // Save the entire updated array
        completedAt: questionnaireData?.completedAt || new Date().toISOString(), // Preserve or set completedAt
        updatedAt: new Date().toISOString() // Always update updatedAt
      }, { merge: true }); // Merge to preserve other potential fields

      // Update local state and exit edit mode for this question
      setQuestionnaireData(prev => ({ ...prev, answers: updatedAnswers }));
      setEditingQuestion(null);
      setTempAnswer('');

    } catch (saveError) {
      console.error("Error updating questionnaire answer:", saveError);
      setError("Failed to save changes for this question. Please try again.");
      // Keep editing mode active on error? Or cancel? Let's keep it active.
    } finally {
      setIsSavingSingle(false);
    }
  };

  // Check if the questionnaire has been completed
  const hasCompletedQuestionnaire = questionnaireData && questionnaireData.completedAt;

  // --- Render Logic ---

  // Loading State
  if (loading) {
    return (
      // Use theme's default Card border radius (16px)
      <Card elevation={2} sx={{ minHeight: 200 }}> {/* Added minHeight */}
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
            <PsychologyOutlinedIcon color="action" />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 'medium' }}>
              Your Insights Questionnaire
            </Typography>
          </Stack>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    // Use theme's default Card border radius (16px)
    <Card elevation={2}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={1}> {/* Reduced mb */}
          <PsychologyOutlinedIcon color="action" />
          <Typography variant="h6" component="h2" sx={{ fontWeight: 'medium' }}>
            Your Insights Questionnaire
          </Typography>
        </Stack>

        {/* Helper Text/Error Display */}
        {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
        {!hasCompletedQuestionnaire ? (
             <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
                 Answering these questions helps personalize your experience. Click below to start.
             </Typography>
        ) : !isSavingSingle && editingQuestion === null && (
             <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
                 Your responses are saved. Click an answer chip below to edit it.
             </Typography>
        )}


        {/* Answers List / Edit Area */}
        <Stack spacing={2} sx={{ mt: 2 }}>
          {/* Ensure questionnaireData and answers exist before mapping */}
          {questionnaireData?.answers?.map((item, index) => {
            // Define isCurrentlyEditingThis inside the map scope
            const isCurrentlyEditingThis = editingQuestion === item.question;
            const questionDefinition = questions.find(q => q.question === item.question); // Find options for RadioGroup

            return (
              // Use theme's default Paper border radius (or specify 8px if needed)
              <Paper key={index} variant="outlined" sx={{ p: 1.5, borderRadius: 2, position: 'relative' }}> {/* Keep 2 for tighter look? Let's try 8px */}
              {/* <Paper key={index} variant="outlined" sx={{ p: 1.5, borderRadius: '8px', position: 'relative' }}> */}
                {/* Question Text */}
                <Typography variant="body1" gutterBottom sx={{ fontWeight: 'medium', pr: 4 }}> {/* Add padding for icon */}
                  {index + 1}. {item.question}
                </Typography>

                {isCurrentlyEditingThis ? (
                  // --- Inline Edit View for this question ---
                  <Box>
                    <FormControl component="fieldset" fullWidth disabled={isSavingSingle} sx={{ mt: 1 }}>
                      <RadioGroup
                        aria-label={item.question}
                        name={`edit-question-${index}`}
                        value={tempAnswer} // Bind to temporary answer state
                        onChange={(e) => setTempAnswer(e.target.value)} // Update temporary state
                      >
                        {(questionDefinition?.options || []).map((option, optionIdx) => (
                          <FormControlLabel
                            key={optionIdx}
                            value={option}
                            control={<Radio sx={{ '& .MuiSvgIcon-root': { fontSize: 22 } }} size="small" />}
                            label={<Typography variant="body2">{option}</Typography>}
                            sx={{ mb: 0 }}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>
                    {/* Save/Cancel Buttons for Inline Edit */}
                    <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
                      <Tooltip title="Cancel">
                        <IconButton onClick={handleCancelSingleEdit} disabled={isSavingSingle} size="small" color="secondary">
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Save">
                        <IconButton onClick={handleSaveSingleAnswer} disabled={isSavingSingle} size="small" color="primary">
                          {isSavingSingle ? <CircularProgress size={16} color="inherit" /> : <SaveIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                ) : (
                  // --- Read-Only View for this question ---
                   <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '34px' /* Approximate height of chip + margins */ }}>
                       <Chip
                          label={item.answer || 'Not answered'}
                          size="small"
                          color={item.answer ? "primary" : "default"}
                          variant="filled"
                          onClick={editingQuestion === null && !isSavingSingle ? () => handleStartEdit(item.question, item.answer) : undefined} // Make chip clickable
                          disabled={editingQuestion !== null || isSavingSingle} // Visually disable if another is editing
                          sx={{
                              mt: 0.5,
                              borderRadius: 16,
                              mr: 1, // Keep some margin
                              justifyContent: 'flex-start',
                              maxWidth: '100%', // Allow chip to take full width if needed
                              '& .MuiChip-label': { overflow: 'visible', whiteSpace: 'normal' }, // Allow wrapping
                              // Add pointer cursor only when clickable
                              cursor: editingQuestion === null && !isSavingSingle ? 'pointer' : 'default',
                              '&:hover': {
                                  // Add subtle hover effect only when clickable
                                  backgroundColor: editingQuestion === null && !isSavingSingle && item.answer ? 'primary.dark' : undefined, // Darken primary chip on hover
                                  filter: editingQuestion === null && !isSavingSingle && !item.answer ? 'brightness(0.95)' : undefined // Slightly darken default chip
                              }
                          }}
                       />
                        {/* Edit icon removed */}
                   </Box>
                )}
              </Paper>
            );
          })}
        </Stack>

        {/* "Start Questionnaire" Button only if not completed */}
        {!hasCompletedQuestionnaire && !loading && ( // Only show if not completed AND not loading
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<PsychologyOutlinedIcon />}
              onClick={() => navigate('/questionnaire')} // Changed path to match App.jsx
              // Use theme default (8px) or specify pill shape if desired
              sx={{ borderRadius: '50px', px: 3 }} // Make this button pill-shaped
            >
              Start Questionnaire
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default Insights;