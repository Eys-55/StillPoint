import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.jsx';
import { useAuthState } from 'react-firebase-hooks/auth';
import { updateProfile, deleteUser } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Container, Card, CardContent, Typography, TextField, Button, Box, Alert, CssBaseline } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

function Settings({ darkMode, setDarkMode }) {
  const [user, loading] = useAuthState(auth);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
    }
  }, [user]);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
    },
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (user) {
      try {
        await updateProfile(user, { displayName: name });
        setMessage("Profile updated successfully.");
      } catch (error) {
        setMessage("Error updating profile: " + error.message);
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        await deleteUser(user);
        navigate('/login');
      } catch (error) {
        setMessage("Error deleting account: " + error.message);
      }
    }
  };

  if (loading) return (
    <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Typography>Loading...</Typography>
    </Container>
  );
  if (!user) return (
    <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Typography>Please log in to view settings.</Typography>
    </Container>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ mt: 5 }}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h4" align="center" gutterBottom>
              User Settings
            </Typography>
            {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}
            <Box component="form" onSubmit={handleSave} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Display Name"
                variant="outlined"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button type="submit" variant="contained" fullWidth sx={{ mb: 2 }}>
                Save Changes
              </Button>
            </Box>
            <Typography variant="h6" gutterBottom>
              Privacy and Data Management
            </Typography>
            <Typography sx={{ mb: 2 }}>
              You have full control over your personal data. Edit your information and manage how your data is used.
            </Typography>
            <Button variant="contained" color="error" fullWidth onClick={handleDeleteAccount} sx={{ mb: 2 }}>
              Delete Account
            </Button>
            <Button variant="outlined" fullWidth onClick={() => navigate('/privacy')} sx={{ mb: 2 }}>
              Privacy Policy
            </Button>
            <Button variant="outlined" fullWidth onClick={() => setDarkMode(prev => !prev)}>
              {darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </Button>
          </CardContent>
        </Card>
      </Container>
    </ThemeProvider>
  );
}

export default Settings;