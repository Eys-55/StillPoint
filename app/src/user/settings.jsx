import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.jsx';
import { useAuthState } from 'react-firebase-hooks/auth';
import { updateProfile, deleteUser, signOut } from 'firebase/auth';
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
  FormControlLabel
} from '@mui/material';
import Header from '../nav/header.jsx';
// Import icons if available, e.g.,
// import AccountCircle from '@mui/icons-material/AccountCircle';
// import Palette from '@mui/icons-material/Palette';
// import ExitToApp from '@mui/icons-material/ExitToApp';
// import DeleteForever from '@mui/icons-material/DeleteForever';
// import PrivacyTip from '@mui/icons-material/PrivacyTip';
// import Brightness4Icon from '@mui/icons-material/Brightness4';
// import Brightness7Icon from '@mui/icons-material/Brightness7';

function Settings({ darkMode, setDarkMode }) {
  const [user, loading, error] = useAuthState(auth);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'info', 'success', 'error'
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage(''); // Clear previous messages
    if (user) {
      try {
        await updateProfile(user, { displayName: name });
        setMessage("Profile updated successfully.");
        setMessageType('success');
      } catch (error) {
        setMessage(`Error updating profile: ${error.message}`);
        setMessageType('error');
      }
    }
  };

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

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)', /* Adjust height if header exists */ }}>
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
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)', textAlign: 'center' }}>
        <Typography variant="h6">Please log in to access settings.</Typography>
      </Container>
    );
  }

  return (
    // Use a Box to allow the Header to be outside the main Container margins if needed
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header mode="settings" darkMode={darkMode} />
      <Container component="main" maxWidth="md" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Settings
        </Typography>

      {message && <Alert severity={messageType} sx={{ mb: 3 }} onClose={() => setMessage('')}>{message}</Alert>}

      {/* Profile Information Section */}
      <Paper elevation={2} sx={{ mb: 3, p: 3 }}>
        <Typography variant="h6" gutterBottom>Profile Information</Typography>
        <Box component="form" onSubmit={handleSave} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Display Name"
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
            // InputProps={{ startAdornment: <AccountCircle sx={{ mr: 1, color: 'action.active' }} /> }} // Example Icon
          />
          <Button type="submit" variant="contained" size="large">
            Save Changes
          </Button>
        </Box>
      </Paper>

      {/* Appearance Section */}
      <Paper elevation={2} sx={{ mb: 3, p: 3 }}>
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
            sx={{ mt: 1 }}
          />
           {/* Potential Icon: {darkMode ? <Brightness4Icon /> : <Brightness7Icon />} */}
      </Paper>

      {/* Account Management Section */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Account Management</Typography>
        </Box>
        <List disablePadding>
          <ListItem button onClick={() => navigate('/privacy')}>
            {/* <ListItemIcon><PrivacyTip /></ListItemIcon> */}
            <ListItemText primary="Privacy Policy" secondary="Review our data usage policies" />
          </ListItem>
          <Divider component="li" />
          <ListItem button onClick={handleLogout}>
            {/* <ListItemIcon><ExitToApp /></ListItemIcon> */}
            <ListItemText primary="Log Out" secondary="Sign out of your current session" />
          </ListItem>
          <Divider component="li" />
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
    </Box> // Close the main Box
  );
}

export default Settings;