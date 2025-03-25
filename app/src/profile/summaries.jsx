import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../nav/header.jsx';
import { useSummaries } from './summaries_hooks.jsx';
import { auth, firestore } from '../firebase.jsx';
import { doc, updateDoc } from 'firebase/firestore';
import {
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Paper,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

function Summaries() {
  const location = useLocation();
  const navigate = useNavigate();
  const { conversationId, messages: initialMessages } = location.state || {};
  const isDarkMode = document.body.getAttribute("data-bs-theme") === "dark"; // Keep for Header prop

  const handleBack = () => {
    navigate('/chat');
  };

  const {
    summary,
    setSummary,
    title,
    setTitle,
    loading,
    error,
    bundledSummaries,
    loadingBundled,
    errorBundled,
    generateSummary, // Added for potential refresh button
    saveSummary,
    handleDeleteSummary,
    handleEditSummary, // Keeping the placeholder function
  } = useSummaries(conversationId, initialMessages);

  // State for Material UI Menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentMenuId, setCurrentMenuId] = useState(null);
  const open = Boolean(anchorEl);

  const handleClickMenu = (event, id) => {
    setAnchorEl(event.currentTarget);
    setCurrentMenuId(id);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setCurrentMenuId(null);
  };

  const handleDeleteMemory = async (id) => {
    handleCloseMenu(); // Close menu after action
    if (!window.confirm("Are you sure you want to delete the summary memory (leaves conversation intact)?")) return;
    try {
      const convRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', id);
      await updateDoc(convRef, { summary: '' }); // Clear only the summary field
       // Optimistically update UI or refetch
       // For simplicity, we might rely on the hook's refetch or reload the page if necessary.
       // A more sophisticated approach would update the bundledSummaries state directly.
       // For now, let's assume the hook will handle refresh or add a manual refresh
       window.location.reload(); // Simple refresh for now
    } catch (err) {
      alert("Error deleting summary memory: " + err.message);
    }
  };

   const handleDeleteFull = async (id) => {
    handleCloseMenu(); // Close menu after action
    await handleDeleteSummary(id); // This function already contains confirmation and deletion logic
  };

  const handleEdit = (id) => {
    handleCloseMenu();
    handleEditSummary(id); // Call the placeholder edit function
  }

  // Clean title and summary strings
  const cleanTitle = (t) => t.replace(/^Title:\s*/i, '').replace(/\*\*/g, '').trim();
  const cleanSummary = (s) => s.replace(/^Summary:\s*/i, '').trim();

  return (
    <div>
      <Header
        mode="summaries"
        onBack={handleBack}
        darkMode={isDarkMode}
      />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {conversationId ? (
          // Single Summary View (Editing/Saving)
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Conversation Summary
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Summarizing conversation...</Typography>
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
            ) : (
              <>
                <TextField
                  fullWidth
                  label="Title"
                  variant="outlined"
                  value={cleanTitle(title)}
                  onChange={(e) => setTitle(e.target.value)}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Summary"
                  multiline
                  rows={8}
                  variant="outlined"
                  value={cleanSummary(summary)}
                  onChange={(e) => setSummary(e.target.value)}
                  sx={{ mb: 3 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                   <Button
                    variant="outlined"
                    onClick={generateSummary} // Add a button to regenerate if needed
                    disabled={loading}
                  >
                    Regenerate
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={saveSummary}
                    disabled={loading}
                  >
                    Save Summary
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        ) : (
          // Bundled Summaries View (Listing)
          <>
            <Typography variant="h4" component="h1" gutterBottom>
              All Conversation Summaries
            </Typography>
            {loadingBundled ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading summaries...</Typography>
              </Box>
            ) : errorBundled ? (
              <Alert severity="error" sx={{ mt: 2 }}>{errorBundled}</Alert>
            ) : bundledSummaries.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {bundledSummaries.map((item) => (
                  <Card key={item.id} elevation={2}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" component="div">
                          {cleanTitle(item.title)}
                        </Typography>
                        <IconButton
                          aria-label="more options"
                          aria-controls={`summary-menu-${item.id}`}
                          aria-haspopup="true"
                          onClick={(e) => handleClickMenu(e, item.id)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                        <Menu
                          id={`summary-menu-${item.id}`}
                          anchorEl={anchorEl}
                          open={open && currentMenuId === item.id}
                          onClose={handleCloseMenu}
                          MenuListProps={{
                            'aria-labelledby': 'basic-button',
                          }}
                        >
                          <MenuItem onClick={() => handleEdit(item.id)}>
                            <EditIcon fontSize="small" sx={{ mr: 1 }}/> Edit (Not Implemented)
                          </MenuItem>
                           <MenuItem onClick={() => handleDeleteMemory(item.id)}>
                            <DeleteIcon fontSize="small" sx={{ mr: 1 }}/> Delete Summary Only
                          </MenuItem>
                          <Divider />
                          <MenuItem onClick={() => handleDeleteFull(item.id)} sx={{ color: 'error.main' }}>
                           <DeleteForeverIcon fontSize="small" sx={{ mr: 1 }}/> Delete with Conversation
                          </MenuItem>
                        </Menu>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {cleanSummary(item.summary)}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="subtitle1" color="text.secondary">
                  No conversation summaries found. Finish a chat session to generate one.
                </Typography>
              </Paper>
            )}
          </>
        )}
      </Container>
    </div>
  );
}

export default Summaries;