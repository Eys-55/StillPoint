import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../nav/header.jsx';
import { useSummaries } from './summaries_hooks.jsx';
import { auth, firestore } from '../firebase.jsx'; // Firestore needed for updateDoc potentially
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import {
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Paper,
  Grid, // Added for layout
  Tooltip,
  Stack, // Added for layout
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RefreshIcon from '@mui/icons-material/Refresh';
import CancelIcon from '@mui/icons-material/Cancel'; // For cancelling edit

// Helper function to format date (can be expanded)
const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
      return date.toLocaleDateString('en-US', {
           year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
       });
  } catch (e) {
      return 'Invalid Date';
  }
};

// Helper to clean potential AI prefixes/markdown
const cleanText = (text, type = 'title') => {
    if (!text) return '';
    let cleaned = text.replace(/\*\*/g, '').trim();
    if (type === 'title' && cleaned.toLowerCase().startsWith("title:")) {
        cleaned = cleaned.slice(6).trim();
    } else if (type === 'summary' && cleaned.toLowerCase().startsWith("summary:")) {
        cleaned = cleaned.slice(8).trim();
    }
    return cleaned;
};


function Summaries() {
  const location = useLocation();
  const navigate = useNavigate();
  const { conversationId, messages: initialMessages } = location.state || {};
  const isDarkMode = document.body.getAttribute("data-bs-theme") === "dark";

  const handleBack = () => {
    // If coming from generating a summary, go back to chat, otherwise maybe profile?
    // For now, always go back to chat as the primary flow leads here from chat.
    navigate('/chat');
  };

  const {
    summary: currentSummary, // Renamed to avoid conflict
    setSummary: setCurrentSummary,
    title: currentTitle, // Renamed to avoid conflict
    setTitle: setCurrentTitle,
    loading, // Loading state for single summary generation/saving
    error,
    bundledSummaries, // Already sorted by hook
    loadingBundled,
    errorBundled,
    generateSummary, // Regenerate the single summary
    saveCurrentSummary, // Save the single summary
    handleDeleteSummary, // Deletes entire conversation
    handleUpdateSummary, // Updates existing summary title/text
  } = useSummaries(conversationId, initialMessages);

  // State for managing which summary is being edited in the list view
  const [editingId, setEditingId] = useState(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false); // Loading state for saving an edit

  // --- Menu State ---
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentMenuId, setCurrentMenuId] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleClickMenu = (event, id) => {
    setAnchorEl(event.currentTarget);
    setCurrentMenuId(id);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setCurrentMenuId(null);
  };
  // --- End Menu State ---

  // --- Edit Actions ---
  const startEditing = (item) => {
    setEditingId(item.id);
    setEditedTitle(cleanText(item.title, 'title'));
    setEditedSummary(cleanText(item.summary, 'summary'));
    handleCloseMenu(); // Close menu when starting edit
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditedTitle('');
    setEditedSummary('');
  };

  const saveEditing = async () => {
     if (!editingId) return;
     setIsSavingEdit(true);
     const success = await handleUpdateSummary(editingId, editedTitle, editedSummary);
     setIsSavingEdit(false);
     if (success) {
       setEditingId(null); // Exit edit mode on successful save
       // No need to reset editedTitle/Summary as they are cleared by exiting edit mode
     } // Error handling is done within the hook (shows alert)
  };
  // --- End Edit Actions ---

   // --- Delete Actions ---
   const handleDeleteMemoryOnly = async (id) => {
    handleCloseMenu(); // Close menu after action
    if (!window.confirm("Are you sure you want to remove this summary memory? The conversation transcript will remain.")) return;
    try {
        setIsSavingEdit(true); // Reuse loading state
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in.");
      const convRef = doc(firestore, 'users', user.uid, 'conversations', id);
      // Set summary and title to empty strings, keep other data
      await updateDoc(convRef, { summary: '', title: 'Conversation (Summary Removed)', updatedAt: Timestamp.now() });

      // Update local state to remove the summary visually
      // Option 1: Refetch (simpler but heavier) - await fetchAndSetBundledSummaries();
      // Option 2: Update local state directly (more complex but faster UI)
      setBundledSummaries(prev => prev.filter(item => item.id !== id)); // Remove from list

    } catch (err) {
      alert("Error removing summary memory: " + err.message);
       console.error("Error removing summary memory:", err);
    } finally {
        setIsSavingEdit(false);
    }
  };

   const handleDeleteFullConversation = async (id) => {
    handleCloseMenu();
    await handleDeleteSummary(id); // This function from hook handles confirmation and deletion
  };
  // --- End Delete Actions ---


  // --- Render Logic ---
  const renderSingleSummaryView = () => (
    <Paper elevation={3} sx={{ p: 3, mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Review & Save Summary
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', flexDirection: 'column', gap: 2 }}>
          <CircularProgress />
          <Typography>Generating or loading summary...</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      ) : (
        <>
          <TextField
            fullWidth
            label="Title"
            variant="outlined"
            value={cleanText(currentTitle)}
            onChange={(e) => setCurrentTitle(e.target.value)}
            sx={{ mb: 3 }}
            InputLabelProps={{ shrink: true }} // Keep label floated
          />
          <TextField
            fullWidth
            label="Summary"
            multiline
            rows={10} // Increased rows
            variant="outlined"
            value={cleanText(currentSummary, 'summary')}
            onChange={(e) => setCurrentSummary(e.target.value)}
            sx={{ mb: 3 }}
            InputLabelProps={{ shrink: true }} // Keep label floated
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
             <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={generateSummary} // Button to regenerate
                  disabled={loading}
                >
                  Regenerate
             </Button>
             <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={saveCurrentSummary} // Use the specific save function
              disabled={loading || !currentTitle || !currentSummary}
            >
              Save & Go to Chat
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );

  const renderBundledSummariesView = () => (
    <>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 4 }}>
        Conversation History
      </Typography>
      {loadingBundled ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', flexDirection: 'column', gap: 2 }}>
          <CircularProgress />
          <Typography>Loading summaries...</Typography>
        </Box>
      ) : errorBundled ? (
        <Alert severity="error" sx={{ mt: 2 }}>{errorBundled}</Alert>
      ) : bundledSummaries.length > 0 ? (
        <Grid container spacing={3}>
          {bundledSummaries.map((item) => (
            <Grid item xs={12} md={6} lg={4} key={item.id}>
              <Card elevation={2} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {editingId === item.id ? (
                  // --- Edit State Card Header ---
                  <CardHeader
                    title={
                      <TextField
                        variant="standard"
                        fullWidth
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        disabled={isSavingEdit}
                        size="small"
                        placeholder="Enter Title"
                         sx={{ '.MuiInputBase-input': { fontWeight: 'bold' } }} // Style like title
                      />
                    }
                     subheader={`Last updated: ${formatDate(item.updatedAt)}`}
                    action={
                       <Stack direction="row" spacing={0.5}>
                           <Tooltip title="Save Changes">
                               <IconButton onClick={saveEditing} disabled={isSavingEdit || !editedTitle || !editedSummary} color="primary" size="small">
                                   {isSavingEdit ? <CircularProgress size={20} /> : <SaveIcon fontSize="small"/>}
                               </IconButton>
                           </Tooltip>
                           <Tooltip title="Cancel Edit">
                               <IconButton onClick={cancelEditing} disabled={isSavingEdit} color="default" size="small">
                                   <CancelIcon fontSize="small"/>
                               </IconButton>
                           </Tooltip>
                       </Stack>
                    }
                    sx={{ pb: 0 }} // Reduce padding below header in edit mode
                  />
                ) : (
                  // --- Display State Card Header ---
                  <CardHeader
                    title={cleanText(item.title)}
                    subheader={`Last updated: ${formatDate(item.updatedAt)}`}
                    action={
                      <>
                        <IconButton
                          aria-label="options"
                          onClick={(e) => handleClickMenu(e, item.id)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                         <Menu
                          anchorEl={anchorEl}
                          open={openMenu && currentMenuId === item.id}
                          onClose={handleCloseMenu}
                        >
                          <MenuItem onClick={() => startEditing(item)}>
                            <EditIcon fontSize="small" sx={{ mr: 1.5 }} /> Edit Title/Summary
                          </MenuItem>
                          <MenuItem onClick={() => handleDeleteMemoryOnly(item.id)}>
                            <DeleteIcon fontSize="small" sx={{ mr: 1.5 }}/> Remove Summary Only
                          </MenuItem>
                          <Divider sx={{ my: 0.5 }} />
                          <MenuItem onClick={() => handleDeleteFullConversation(item.id)} sx={{ color: 'error.main' }}>
                            <DeleteForeverIcon fontSize="small" sx={{ mr: 1.5 }}/> Delete Conversation
                          </MenuItem>
                        </Menu>
                      </>
                    }
                  />
                )}
                <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
                   {editingId === item.id ? (
                       // --- Edit State Card Content ---
                       <TextField
                          multiline
                          fullWidth
                          variant="outlined"
                          rows={6} // Adjust rows as needed
                          value={editedSummary}
                          onChange={(e) => setEditedSummary(e.target.value)}
                          disabled={isSavingEdit}
                          size="small"
                          placeholder="Enter Summary"
                       />
                   ) : (
                       // --- Display State Card Content ---
                       <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                          {cleanText(item.summary, 'summary')}
                       </Typography>
                   )}
                </CardContent>
                 {/* Optional: CardActions could be used here too if needed */}
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper elevation={1} sx={{ p: 4, mt: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No conversation summaries found.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Complete a chat session and choose to summarize it, or check back later.
          </Typography>
           <Button variant="outlined" onClick={() => navigate('/chat')} sx={{mt: 2}}>
                Start a new Chat
            </Button>
        </Paper>
      )}
    </>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        mode="summaries" // Keep mode for header logic
        onBack={handleBack}
        darkMode={isDarkMode}
        // No other specific props needed for summaries header currently
      />
      <Container component="main" maxWidth="lg" sx={{ flexGrow: 1, mt: 2, mb: 4 }}>
        {conversationId ? renderSingleSummaryView() : renderBundledSummariesView()}
      </Container>
       {/* Footer might be added here if needed on this page, or kept separate via App.jsx routing */}
    </Box>
  );
}

export default Summaries;