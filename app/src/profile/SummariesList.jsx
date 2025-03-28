import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaries } from './summaries_hooks.jsx';
import { auth, firestore } from '../firebase.jsx';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import {
  Typography,
  TextField,
  Button,
  Card,
  CardHeader,
  CardContent,
  CircularProgress,
  Alert,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Paper,
  Grid,
  Tooltip,
  Stack,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import DeleteForeverIcon from '@mui/icons-material/DeleteForeverOutlined';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';

// Helper function to format date (copied from summaries.jsx)
const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });
  } catch (e) {
    return 'Invalid Date';
  }
};

// Helper to clean potential AI prefixes/markdown (copied from summaries.jsx)
const cleanText = (text, type = 'title') => {
    if (!text) return '';
    let cleaned = text.replace(/\*\*/g, '').trim();
    cleaned = cleaned.replace(/^title:\s*/i, '');
    cleaned = cleaned.replace(/^summary:\s*/i, '');
    return cleaned;
};

function SummariesList() {
  const navigate = useNavigate();
  // Use the hook without conversationId to fetch bundled summaries
  const {
    bundledSummaries,
    loadingBundled,
    errorBundled,
    handleDeleteSummary,
    handleUpdateSummary,
    setBundledSummaries, // Needed for local state updates (like removing summary only)
  } = useSummaries();

  const [editingId, setEditingId] = useState(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditedTitle(cleanText(item.title, 'title'));
    setEditedSummary(cleanText(item.summary, 'summary'));
    handleCloseMenu();
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
      setEditingId(null); // Exit edit mode
    }
  };

  const handleDeleteMemoryOnly = async (id) => {
    handleCloseMenu();
    if (!window.confirm("Are you sure you want to remove this summary? The conversation transcript will remain.")) return;
    try {
        setIsSavingEdit(true); // Use same saving state for visual feedback
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in.");
      const convRef = doc(firestore, 'users', user.uid, 'conversations', id);
      // Update Firestore: Clear summary/title, keep conversation
      await updateDoc(convRef, { summary: '', title: 'Conversation (Summary Removed)', updatedAt: Timestamp.now() });

      // Update local state directly to remove the card visually from the list
      setBundledSummaries(prev => prev.filter(item => item.id !== id));

    } catch (err) {
      alert("Error removing summary: " + err.message);
       console.error("Error removing summary:", err);
    } finally {
       setIsSavingEdit(false);
    }
  };

  const handleDeleteFullConversation = async (id) => {
    handleCloseMenu();
    await handleDeleteSummary(id); // Hook handles confirmation & deletion & refetch/update
  };


  if (loadingBundled) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', flexDirection: 'column', gap: 2 }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading your summaries...</Typography>
      </Box>
    );
  }

  if (errorBundled) {
    return <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{errorBundled}</Alert>;
  }

  if (bundledSummaries.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: {xs: 3, sm: 5}, mt: 0, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 3 }}>
        <SentimentSatisfiedAltIcon sx={{ fontSize: 50, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.primary" gutterBottom>
          No summaries yet!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          After a chat session, you can create a summary. Your reflections will appear here.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/chat')} sx={{mt: 2, borderRadius: 5, px: 3}}>
          Start a New Chat
        </Button>
      </Paper>
    );
  }

  return (
    <Grid container spacing={3}>
      {bundledSummaries.map((item) => (
        <Grid item xs={12} md={6} lg={4} key={item.id}>
          <Card elevation={2} sx={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 3 }}>
            {editingId === item.id ? (
              // --- Edit State Card ---
              <>
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
                      sx={{ '.MuiInputBase-input': { fontWeight: 500, fontSize: '1.1rem' } }}
                      autoFocus
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
                  sx={{ pb: 1 }}
                />
                <CardContent sx={{ flexGrow: 1, pt: 0 }}>
                  <TextField
                    multiline
                    fullWidth
                    variant="outlined"
                    rows={8}
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    disabled={isSavingEdit}
                    size="small"
                    placeholder="Enter Summary"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </CardContent>
              </>
            ) : (
              // --- Display State Card ---
              <>
                <CardHeader
                  title={<Typography variant="h6" sx={{ fontWeight: 500 }}>{cleanText(item.title)}</Typography>}
                  subheader={`Last updated: ${formatDate(item.updatedAt)}`}
                  action={
                    <>
                      <IconButton
                        aria-label="options"
                        onClick={(e) => handleClickMenu(e, item.id)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                      <Menu
                        anchorEl={anchorEl}
                        open={openMenu && currentMenuId === item.id}
                        onClose={handleCloseMenu}
                        MenuListProps={{ sx: { py: 0.5 } }}
                        PaperProps={{ sx: { borderRadius: 2, mt: 0.5 } }}
                      >
                        <MenuItem onClick={() => startEditing(item)} sx={{ fontSize: '0.9rem' }}>
                          <EditIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> Edit Title/Summary
                        </MenuItem>
                        <MenuItem onClick={() => handleDeleteMemoryOnly(item.id)} sx={{ fontSize: '0.9rem' }}>
                          <DeleteIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }}/> Remove Summary Only
                        </MenuItem>
                        <Divider sx={{ my: 0.5 }} />
                        <MenuItem onClick={() => handleDeleteFullConversation(item.id)} sx={{ color: 'error.main', fontSize: '0.9rem' }}>
                          <DeleteForeverIcon fontSize="small" sx={{ mr: 1.5 }}/> Delete Conversation
                        </MenuItem>
                      </Menu>
                    </>
                  }
                />
                <CardContent sx={{ flexGrow: 1, pt: 0 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {cleanText(item.summary, 'summary')}
                  </Typography>
                </CardContent>
              </>
            )}
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export default SummariesList;