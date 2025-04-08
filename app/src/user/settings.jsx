import React, { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase.jsx'; // Import firestore
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  deleteUser,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  Accordion, // Added for collapsible password section
  AccordionSummary, // Added for collapsible password section
  AccordionDetails, // Added for collapsible password section
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // Icon for Accordion
import FeedbackModal from './feedback.jsx'; // Import the new FeedbackModal
// import Header from '../nav/header.jsx'; // Removed Header import
import { HEADER_HEIGHT } from '../nav/header.jsx'; // Import for padding calculation if needed, or set a static value
import { FOOTER_HEIGHT } from '../nav/footer.jsx'; // Import Footer height
// Import icons if available, e.g.,
// import Palette from '@mui/icons-material/Palette';
// import ExitToApp from '@mui/icons-material/ExitToApp';
// import DeleteForever from '@mui/icons-material/DeleteForever';
// import PrivacyTip from '@mui/icons-material/PrivacyTip';
// import Brightness4Icon from '@mui/icons-material/Brightness4';
// import Brightness7Icon from '@mui/icons-material/Brightness7';
// import FeedbackIcon from '@mui/icons-material/Feedback'; // Example icon for Feedback

function Settings({ darkMode, setDarkMode }) {
  const [user, loading, error] = useAuthState(auth);
  const [message, setMessage] = useState(''); // General/Profile messages
  const [messageType, setMessageType] = useState('info'); // 'info', 'success', 'error'
  const [passwordMessage, setPasswordMessage] = useState(''); // Password change specific messages
  const [passwordMessageType, setPasswordMessageType] = useState('info');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false); // State for feedback modal
  const navigate = useNavigate();

  // Removed useEffect related to displayName as profile section is removed

  // Removed handleSave function as profile section is removed

  const handleDeleteAccount = async () => {
    setMessage(''); // Clear previous messages
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone and all your data will be lost.")) {
      if (user) {
        try {
          await deleteUser(user);
          // No need to navigate here, signOut listener in App might handle it,
          // or deletion might automatically sign out. Let's navigate explicitly.
          navigate('/login');
        } catch (error) {
          setMessage(`Error deleting account: ${error.message}. You might need to re-authenticate.`);
          setMessageType('error');
        }
      }
    }
  };

  const handleLogout = async () => {
    setMessage(''); // Clear previous messages
    try {
      await signOut(auth);
      navigate('/login'); // Navigate after sign out is complete
    } catch (error) {
      setMessage(`Error logging out: ${error.message}`);
      setMessageType('error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordMessageType('info');
    setPasswordLoading(true);

    // Basic validation
    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match.");
      setPasswordMessageType('error');
      setPasswordLoading(false);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage("New password must be at least 6 characters long.");
      setPasswordMessageType('error');
      setPasswordLoading(false);
      return;
    }
    if (!currentPassword) {
      setPasswordMessage("Please enter your current password.");
      setPasswordMessageType('error');
      setPasswordLoading(false);
      return;
    }

    if (user) {
      try {
        // Re-authenticate user
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        // Update password
        await updatePassword(user, newPassword);

        setPasswordMessage("Password updated successfully.");
        setPasswordMessageType('success');
        // Clear fields after success
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

      } catch (error) {
        console.error("Error changing password:", error);
        let errMsg = `Error changing password: ${error.message}`;
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          errMsg = "Incorrect current password.";
        } else if (error.code === 'auth/weak-password') {
          errMsg = "New password is too weak. Please choose a stronger password (min 6 characters).";
        } else if (error.code === 'auth/requires-recent-login') {
          errMsg = "This operation requires recent login. Please log out and log back in before changing your password.";
        } else {
          errMsg = `An error occurred (${error.code}). Please try again.`;
        }
        setPasswordMessage(errMsg);
        setPasswordMessageType('error');
      } finally {
        setPasswordLoading(false);
      }
    }
  };

  const handleOpenFeedbackModal = () => {
    setIsFeedbackModalOpen(true);
  };

  const handleCloseFeedbackModal = () => {
    setIsFeedbackModalOpen(false);
    // Optionally show a success message after feedback submission if needed
    // setMessage("Thank you for your feedback!");
    // setMessageType('success');
  };


  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', /* Adjust height */ }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
     return (
       <Container sx={{ mt: 4 }}>
         <Alert severity="error">Error loading user data: {error.message}</Alert>
       </Container>
     );
  }


  if (!user) {
    // This case might not be reached often due to ProtectedRoute, but good practice.
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center' }}>
        <Typography variant="h6">Please log in to access settings.</Typography>
      </Container>
     );
   }

   // Removed paperStyle object, styles will be applied directly or use theme defaults

   const accordionStyle = {
     boxShadow: 'none', // Remove double shadow from Paper + Accordion
     '&:before': { // Remove default top border line
      display: 'none',
    },
     '&.Mui-expanded': { // Prevent margin changes when expanded
       margin: 0,
      },
   };

  // Removed textFieldStyle object, styles will use theme defaults

  // Removed buttonStyle object, styles will use theme defaults

  // Example sx for button if specific overrides needed:
  // sx={{ py: 1.2, px: 3 }}

  return (
    // Use a Box to allow the Header to be outside the main Container margins if needed
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default', pt: 4 /* Add padding top */ }}>
      {/* <Header mode="settings" darkMode={darkMode} /> */} {/* Removed Header */}
      {/* Add bottom margin (mb) to account for fixed Footer height + buffer */}
      <Container component="main" maxWidth="md" sx={{ /* mt: 4, removed */ mb: `${FOOTER_HEIGHT + 16}px`, flexGrow: 1 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'medium' }}>
            Settings
          </Typography>

       {/* Use theme's default Alert border radius (8px) */}
       {/* Appearance Section */}
      {/* Apply theme defaults: mb: 3, elevation: 2, borderRadius: 16, bgcolor: background.paper */}
      <Paper elevation={2} sx={{ mb: 3, p: 3, overflow: 'hidden' }}>
          <Typography variant="h6" gutterBottom>Appearance</Typography>
          <FormControlLabel
            control={
             <Switch
               checked={darkMode}
               onChange={() => setDarkMode(prev => !prev)}
               name="darkModeSwitch"
               color="primary"
             />
           }
           label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
           sx={{ mt: 1, display: 'flex', alignItems: 'center' }} // Ensure label and switch align well
         /> {/* Closing tag was missing here, added it */}
         </Paper>

      {/* Change Password Section (Collapsible) */}
     {/* Apply theme defaults: mb: 3, elevation: 2, borderRadius: 16, bgcolor: background.paper */}
     <Paper elevation={2} sx={{ mb: 3, overflow: 'hidden' }}>
        <Accordion sx={accordionStyle} elevation={0}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="password-content"
            id="password-header"
          >
            <Typography variant="h6">Change Password</Typography>
          </AccordionSummary> {/* <-- Correct closing tag for summary */}
          {/* Removed extra closing tag */}
          <AccordionDetails>
            <Box component="form" onSubmit={handleChangePassword} sx={{ mt: 0, width: '100%' }}> {/* Removed mt: 2 */}
             {/* Use theme's default Alert border radius (8px) */}
             {passwordMessage && <Alert severity={passwordMessageType} sx={{ mb: 2 }} onClose={() => setPasswordMessage('')}>{passwordMessage}</Alert>}
              <TextField
                fullWidth
                type="password"
                label="Current Password"
                variant="outlined"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
               sx={{ mb: 2 }} // Apply margin bottom directly
                autoComplete="current-password"
                disabled={passwordLoading}
              />
              <TextField
                fullWidth
                type="password"
                label="New Password"
                variant="outlined"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
               sx={{ mb: 2 }} // Apply margin bottom directly
                autoComplete="new-password"
                disabled={passwordLoading}
              />
              <TextField
                fullWidth
                type="password"
                label="Confirm New Password"
                variant="outlined"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
               sx={{ mb: 2 }} // Apply margin bottom directly
                autoComplete="new-password"
                disabled={passwordLoading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disabled={passwordLoading}
                sx={{ mt: 2 }} // Add some margin top
              >
                {passwordLoading ? <CircularProgress size={24} color="inherit" /> : 'Change Password'}
              </Button>
            </Box>
          </AccordionDetails> {/* <-- Correct closing tag for Details */}
        </Accordion> {/* <-- Moved closing tag for Accordion HERE */}
      </Paper> {/* <-- Correct closing tag for Paper */}

        {/* Feedback Section */}
        {/* Apply theme defaults: mb: 3, elevation: 2, borderRadius: 16, bgcolor: background.paper */}
        <Paper elevation={2} sx={{ mb: 3, overflow: 'hidden' }}>
           <List disablePadding>
              <ListItem button onClick={handleOpenFeedbackModal}>
                  {/* <ListItemIcon><FeedbackIcon /></ListItemIcon> */}
                  <ListItemText primary="Send Feedback" secondary="Help us improve the app" />
              </ListItem>
           </List>
        </Paper>

      {/* Account Management Section */}
     {/* Apply theme defaults: mb: 3, elevation: 2, borderRadius: 16, bgcolor: background.paper */}
     <Paper elevation={2} sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 3, pb: 1 }}> {/* Adjust padding for title */}
            <Typography variant="h6" gutterBottom>Account Management</Typography>
        </Box>
        <List disablePadding>
          <ListItem button onClick={() => navigate('/privacy')}>
            {/* <ListItemIcon><PrivacyTip /></ListItemIcon> */}
            <ListItemText primary="Privacy Policy" secondary="Review our data usage policies" />
          </ListItem>
          <Divider component="li" variant="inset" /> {/* Inset divider */}
          <ListItem button onClick={handleLogout}>
            {/* <ListItemIcon><ExitToApp /></ListItemIcon> */}
            <ListItemText primary="Log Out" secondary="Sign out of your current session" />
          </ListItem>
          <Divider component="li" variant="inset" /> {/* Inset divider */}
          <ListItem button onClick={handleDeleteAccount} sx={{ color: 'error.main' }}>
              {/* <ListItemIcon sx={{ color: 'error.main' }}><DeleteForever /></ListItemIcon> */}
              <ListItemText
                primary="Delete Account"
                secondary="Permanently delete your account and all associated data"
                primaryTypographyProps={{ color: 'error' }}
                secondaryTypographyProps={{ color: 'error.light' }}
              />
          </ListItem>
        </List>
      </Paper>

      </Container>
      {/* Footer rendered conditionally in App.jsx */}

      {/* Feedback Modal */}
       <FeedbackModal
          open={isFeedbackModalOpen}
          handleClose={handleCloseFeedbackModal}
          firestore={firestore} // Pass firestore instance
          userId={user?.uid} // Pass user ID
       />

    </Box> // Close the main Box
  );
}

export default Settings;