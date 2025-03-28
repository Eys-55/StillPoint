import React, { useState } from 'react';
import { auth } from '../firebase.jsx';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification // Import sendEmailVerification
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Container, Card, CardContent, Button, Typography, Box, CssBaseline, Alert, Stack, Divider, TextField, CircularProgress, Link } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
// Removed GoogleIcon and FacebookIcon imports

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
  },
  shape: {
    borderRadius: 16, // Default border radius for components like Button, Card, TextField
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 50, // More rounded buttons
        },
      },
    },
    MuiTextField: {
        styleOverrides: {
            root: {
                '& .MuiOutlinedInput-root': {
                    borderRadius: 50, // More rounded text fields
                },
            },
        },
    },
    MuiCard: {
        styleOverrides: {
            root: {
                borderRadius: 20, // More rounded cards
            }
        }
    },
    MuiAlert: {
        styleOverrides: {
            root: {
                borderRadius: 12, // Slightly rounded alerts
            }
        }
    }
  }
});

function Login() {
  const [error, setError] = useState('');
  const [info, setInfo] = useState(''); // For success/info messages
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleAuthError = (err) => {
    console.error("Authentication error:", err);
    console.error("Error Code:", err.code);
    console.error("Error Message:", err.message);
    setInfo(''); // Clear info messages on error

    let message = "An unexpected error occurred. Please try again.";
    // More specific error messages
    if (err.code === 'auth/invalid-email') {
      message = "Invalid email address format.";
    } else if (err.code === 'auth/user-disabled') {
      message = "This user account has been disabled.";
    } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      message = "Invalid email or password.";
    } else if (err.code === 'auth/email-already-in-use') {
      message = "An account already exists with this email address. Try signing in.";
    } else if (err.code === 'auth/weak-password') {
      message = "Password is too weak. It should be at least 6 characters.";
    } else if (err.code === 'auth/too-many-requests') {
        message = "Too many attempts. Please try again later.";
    } else if (err.code === 'auth/network-request-failed') {
        message = "Network error. Please check your connection and try again.";
    }
    setError(message);
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault(); // Prevent form submission
    setError('');
    setInfo('');
    setLoading(true);
    console.log("Attempting email login...");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Email login attempt successful:", userCredential.user);

      if (!userCredential.user.emailVerified) {
        setError("Please verify your email address before logging in. Check your inbox for the verification link.");
        // Optionally offer to resend verification
        // await sendEmailVerification(userCredential.user); // Resend verification
        // setInfo("Verification email resent. Please check your inbox.");
        setLoading(false);
        return; // Stop login process
      }

      console.log("Email verified, navigating home.");
      navigate('/'); // Navigate only if email is verified

    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

   const handleEmailSignUp = async (e) => {
    e.preventDefault(); // Prevent form submission
    setError('');
    setInfo('');
    setLoading(true);
    console.log("Attempting email sign up...");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("Email sign up successful:", userCredential.user);

      // Send verification email
      await sendEmailVerification(userCredential.user);
      console.log("Verification email sent to:", userCredential.user.email);

      setInfo("Account created successfully! Please check your email inbox for a verification link to activate your account.");
      setEmail(''); // Clear fields after successful signup
      setPassword('');
      // Do not navigate immediately, user needs to verify first.

    } catch (err) {
       handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  // Removed handleSocialLogin, handleGoogleLogin, handleFacebookLogin

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
          // borderRadius: 4, // Applied via theme
          boxShadow: 3,
          position: 'relative', // Needed for loading overlay positioning
          overflow: 'hidden' // Hide overflow from loading indicator
        }}>
          {loading && ( // Central loading indicator overlay
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10, borderRadius: 'inherit' }}>
              <CircularProgress color="primary"/>
            </Box>
           )}
          <CardContent sx={{ p: 4, filter: loading ? 'blur(2px)' : 'none' /* Optional: blur background when loading */ }}>
            <Typography component="h1" variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
              Welcome
            </Typography>
            <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 3 }}>
              Sign in or create an account
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3, width: '100%' /* borderRadius applied via theme */ }}>
                {error}
              </Alert>
            )}
            {info && (
              <Alert severity="success" sx={{ mb: 3, width: '100%' /* borderRadius applied via theme */ }}>
                {info}
              </Alert>
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
                // borderRadius applied via theme
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
                 // borderRadius applied via theme
              />
              <Stack direction="row" spacing={2} sx={{ mt: 3, mb: 2 }}>
                  <Button
                   type="submit" // Changed from button type
                   fullWidth
                   variant="contained"
                   onClick={handleEmailLogin} // Attach handler
                   disabled={loading || !email || !password}
                   sx={{ py: 1.5 /* borderRadius applied via theme */ }}
                  >
                  Sign In
                 </Button>
                  <Button
                   type="button" // Keep as button type
                   fullWidth
                   variant="outlined"
                   onClick={handleEmailSignUp} // Attach handler
                   disabled={loading || !email || !password}
                   sx={{ py: 1.5 /* borderRadius applied via theme */ }}
                 >
                  Sign Up
                 </Button>
              </Stack>
               {/* Optional: Add a "Forgot Password?" link here */}
               {/* <Box textAlign="center" sx={{ mt: 1 }}>
                 <Link href="#" variant="body2">
                   Forgot password?
                 </Link>
               </Box> */}
            </Box>

            {/* Removed Divider and Social Logins */}

          </CardContent>
        </Card>
      </Container>
    </ThemeProvider>
  );
}

export default Login;