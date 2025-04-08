import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const feedbackCategories = [
  'Bug Report',
  'Feature Request',
  'General Feedback',
  'Usability Issue',
  'Other'
];

function FeedbackModal({ open, handleClose, firestore, userId }) {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setCategory('');
    setDescription('');
    setError('');
    setSuccess('');
    setSubmitting(false);
  };

  const handleInternalClose = () => {
    resetForm(); // Reset form state when closing
    handleClose(); // Call the parent's close handler
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!category) {
      setError('Please select a feedback category.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a description for your feedback.');
      return;
    }
    if (!userId) {
        setError('User not identified. Cannot submit feedback.');
        return;
    }
    if (!firestore) {
        setError('Database connection not available. Cannot submit feedback.');
        return;
    }


    setSubmitting(true);

    try {
      const feedbackCollectionRef = collection(firestore, 'feedback');
      await addDoc(feedbackCollectionRef, {
        userId: userId,
        category: category,
        description: description.trim(),
        timestamp: serverTimestamp(), // Use server timestamp
        status: 'new', // Default status
      });

      setSuccess('Feedback submitted successfully! Thank you.');
      // Optionally close the modal after a short delay
      setTimeout(() => {
        handleInternalClose();
      }, 1500);

    } catch (err) {
      console.error("Error submitting feedback:", err);
      setError(`Failed to submit feedback: ${err.message}. Please try again.`);
      setSubmitting(false); // Keep modal open on error
    }
    // Keep submitting true until success message or error handling is complete
    // setSubmitting(false); // Moved inside success/error paths
  };

  return (
    <Dialog open={open} onClose={handleInternalClose} maxWidth="sm" fullWidth>
      <DialogTitle>Submit Feedback</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 3 }}>
          We value your input! Please select a category and describe the issue or suggestion you have.
        </DialogContentText>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}


        <Box component="form" onSubmit={handleFeedbackSubmit} noValidate>
          <FormControl fullWidth margin="normal" required error={!category && error /* Highlight if empty on error */}>
            <InputLabel id="feedback-category-label">Category</InputLabel>
            <Select
              labelId="feedback-category-label"
              id="feedback-category"
              value={category}
              label="Category"
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting || !!success} // Disable after success too
            >
              {feedbackCategories.map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            margin="normal"
            required
            fullWidth
            id="feedback-description"
            label="Description"
            name="description"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting || !!success}
            error={!description.trim() && error /* Highlight if empty on error */}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleInternalClose} disabled={submitting}>Cancel</Button>
        <Button
          type="submit" // This button needs to trigger the form submit
          onClick={handleFeedbackSubmit} // Also attach handler here for clarity if needed outside form context
          variant="contained"
          disabled={submitting || !category || !description.trim() || !!success} // Disable if submitting, fields empty, or success
        >
          {submitting ? <CircularProgress size={24} color="inherit" /> : 'Submit Feedback'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default FeedbackModal;