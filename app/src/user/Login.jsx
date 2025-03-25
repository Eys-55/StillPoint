import React, { useState } from 'react';
import { auth } from '../firebase.jsx';
import {
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Container, Card, CardContent, Button, Typography, Box, CssBaseline, Alert, Stack, Divider, TextField, CircularProgress } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import EmailIcon from '@mui/icons-material/Email';

// Define a theme, you might want to sync this with your app's main theme
const theme = createTheme({
  palette: {
    mode: 'dark', // Or 'light' depending on your preference
    primary: {
      main: '#90caf9', // Example primary color
    },
    background: {
      default: '#121212', // Dark background
      paper: '#1e1e1e',   // Slightly lighter dark for card
    },
  },
  typography: {
    button: {
      textTransform: 'none', // Keep button text case as defined
    }
  }
});

function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleAuthError = (err) => {
    console.error("Authentication error:", err);
    console.error("Error Code:", err.code);
    console.error("Error Message:", err.message);

    let message = "Failed to authenticate. Please check the console for details.";
    // More specific error messages
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      message = "Login cancelled. Please try again.";
    } else if (err.code === 'auth/account-exists-with-different-credential') {
      message = "An account already exists with this email using a different sign-in method. Try signing in with the original method.";
    } else if (err.code === 'auth/auth-domain-config-error') {
       message = "Authentication domain configuration error. Check Firebase settings.";
    } else if (err.code === 'auth/operation-not-allowed') {
       message = "This sign-in method isn't enabled. Check Firebase settings.";
    } else if (err.code === 'auth/invalid-email') {
      message = "Invalid email address format.";
    } else if (err.code === 'auth/user-disabled') {
      message = "This user account has been disabled.";
    } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      message = "Invalid email or password.";
    } else if (err.code === 'auth/email-already-in-use') {
      message = "An account already exists with this email address.";
    } else if (err.code === 'auth/weak-password') {
      message = "Password is too weak. It should be at least 6 characters.";
    }
    setError(message);
  }

  const handleSocialLogin = async (provider) => {
    setError('');
    setLoading(true);
    console.log("Attempting social login with provider:", provider.providerId);
    try {
      console.log("Calling signInWithPopup...");
      const result = await signInWithPopup(auth, provider);
      console.log("signInWithPopup successful:", result);
      console.log("User:", result.user);
      navigate('/');
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault(); // Prevent form submission
    setError('');
    setLoading(true);
    console.log("Attempting email login...");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Email login successful:", userCredential.user);
      navigate('/');
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

   const handleEmailSignUp = async (e) => {
    e.preventDefault(); // Prevent form submission
    setError('');
    setLoading(true);
    console.log("Attempting email sign up...");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("Email sign up successful:", userCredential.user);
      // Optional: Redirect to a 'complete profile' page or home
      navigate('/');
    } catch (err) {
       handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };


  const handleGoogleLogin = () => {
    console.log("handleGoogleLogin called");
    const provider = new GoogleAuthProvider();
    handleSocialLogin(provider);
  };

  const handleFacebookLogin = () => {
    console.log("handleFacebookLogin called");
    const provider = new FacebookAuthProvider();
    handleSocialLogin(provider);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container
        component="main"
        maxWidth="xs"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          py: 4,
        }}
      >
        <Card sx={{
          width: '100%',
          borderRadius: 2,
          boxShadow: 3,
        }}>
          <CardContent sx={{ p: 4 }}>
            <Typography component="h1" variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
              Welcome
            </Typography>
            <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 3 }}>
              Sign in or create an account
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
                {error}
              </Alert>
            )}

             {loading && ( // Central loading indicator overlay
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10, borderRadius: 'inherit' }}>
                  <CircularProgress />
                </Box>
              )}

            {/* Email/Password Form */}
            <Box component="form" noValidate sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <Stack direction="row" spacing={2} sx={{ mt: 3, mb: 2 }}>
                 <Button
                  type="submit" // Changed from button type
                  fullWidth
                  variant="contained"
                  onClick={handleEmailLogin} // Attach handler
                  disabled={loading || !email || !password}
                >
                  Sign In
                </Button>
                 <Button
                  type="button" // Keep as button type
                  fullWidth
                  variant="outlined"
                  onClick={handleEmailSignUp} // Attach handler
                  disabled={loading || !email || !password}
                >
                  Sign Up
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ my: 3 }}>Or continue with</Divider>

            {/* Social Logins */}
            <Stack spacing={2} sx={{ width: '100%' }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleLogin}
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                Google
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FacebookIcon />}
                onClick={handleFacebookLogin}
                disabled={loading}
                sx={{ py: 1.5, color: '#1877F2', borderColor: '#1877F2', '&:disabled': { color: 'grey', borderColor: 'grey' } }}
              >
                Facebook
              </Button>
            </Stack>

          </CardContent>
        </Card>
      </Container>
    </ThemeProvider>
  );
}

export default Login;