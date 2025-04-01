import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase.jsx';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Grid,
  Icon,
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Link as MuiLink
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'; // Learning AI
import TuneIcon from '@mui/icons-material/Tune'; // Customization/Personalization
import CodeIcon from '@mui/icons-material/Code'; // Open Source
import LockIcon from '@mui/icons-material/Lock'; // Security
import FavoriteIcon from '@mui/icons-material/Favorite'; // Wellness/Get Started
import GitHubIcon from '@mui/icons-material/GitHub'; // GitHub Icon

// Use a theme similar to Login for consistency, assuming dark mode preference
const landingTheme = createTheme({
  palette: {
    mode: 'dark', // Keep mode dark for landing page regardless of system
    primary: {
      // Use the hex value for --light-brand-opposite
      main: '#70ade0', // Use the requested blue
    },
    secondary: {
      // Use the hex value for --light-brand, potentially lightened for dark bg
      main: '#e58a6f', // Example: Lighter orange (#db714f -> #e58a6f)
    },
    background: {
      default: '#262624', // Hex for --dark-background
      paper: '#30302e',   // Hex for --dark-textbox
    },
    text: {
      primary: '#ffffff', // Hex for --text-on-dark
      secondary: '#c2c0b6', // Hex for --dark-text
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '3.2rem',
      fontWeight: 700, // Bolder H1
      marginBottom: '1rem',
      lineHeight: 1.2,
    },
    h2: {
        fontSize: '2.5rem',
        fontWeight: 500,
        marginBottom: '1.5rem', // More space below H2
        marginTop: '4rem', // More space above H2
    },
    h4: { // For Feature Titles
        fontSize: '1.8rem',
        fontWeight: 500,
        marginBottom: '0.8rem',
    },
    h5: {
        fontSize: '1.2rem', // Slightly smaller H5
        fontWeight: 500,
        marginBottom: '0.5rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.7, // Slightly more line spacing
      color: '#e0e0e0', // Lighter body text
    },
    body2: {
        fontSize: '0.9rem',
        color: '#b0b0b0', // Secondary text color
    }
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 50,
          padding: '12px 30px', // Slightly larger button padding
          textTransform: 'none',
          fontWeight: 'bold',
          fontSize: '1rem', // Slightly larger button font
        },
      },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                padding: '2.5rem', // More padding in paper
                borderRadius: 20,
                height: '100%', // Ensure cards in a row have same height
                display: 'flex',
                flexDirection: 'column',
            }
        }
    },
    MuiAppBar: {
        styleOverrides: {
            root: {
                backgroundColor: '#1e1e1e', // Match paper background
            }
        }
    }
  },
});

// Updated Feature Card to allow more content and structure
const FeatureCard = ({ icon, title, description, children }) => (
  <Grid item xs={12} md={4}>
    {/* Paper background will be handled by theme's palette.background.paper */}
    <Paper elevation={4}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
         {/* Use theme's secondary color for icon (matches --light-brand, lightened) */}
        <Icon component={icon} sx={{ fontSize: 40, mr: 2, color: 'secondary.main' }} />
        <Typography variant="h4" component="h3">{title}</Typography>
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ flexGrow: 1 }}>{description}</Typography>
      {children}
    </Paper>
  </Grid>
);

function LandingPage() {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    if (!loading && user) {
      navigate('/home');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <ThemeProvider theme={landingTheme}>
        <CssBaseline />
        <Container maxWidth="lg" sx={{ textAlign: 'center', py: { xs: 3, md: 5 } }}>
          <Typography variant="h4">Loading...</Typography>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={landingTheme}>
      <CssBaseline />


      <Container maxWidth="lg" sx={{ textAlign: 'center', py: { xs: 3, md: 5 } }}>
        {/* Hero Section */}
        <Box sx={{ my: { xs: 4, md: 6 } }}>
           {/* Use theme's secondary color for title */}
          <Typography variant="h1" component="h1" gutterBottom sx={{ color: 'secondary.main' }}>
            Meet Aura: The AI That Learns You
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 4, maxWidth: '750px', mx: 'auto' }}>
            The first truly <strong style={{ color: landingTheme.palette.primary.light }}>open-source</strong> AI tool for personal reflection. Aura gets to know you better with every conversation, offering a private space for insight and growth.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => navigate('/login')}
            startIcon={<FavoriteIcon />}
          >
            Start Your Journey (It's Free!)
          </Button>
        </Box>

        {/* Features Section - REORDERED AND REWRITTEN */}
        <Box sx={{ my: { xs: 6, md: 10 } }}>
          <Typography variant="h2" component="h2" gutterBottom>
            Why Aura is Different
          </Typography>
          <Grid container spacing={4} justifyContent="center" alignItems="stretch">
            {/* Feature 1: Learns & Adapts */}
            <FeatureCard
              icon={AutoAwesomeIcon}
              title="It Gets Smarter"
              description="Aura doesn't just talk; it listens and learns. Through your conversations and reflections (securely stored!), it develops a deeper understanding, providing increasingly relevant and personalized support over time."
            />
            {/* Feature 2: Personalized Experience */}
            <FeatureCard
              icon={TuneIcon}
              title="Tailored To You"
              description="Your journey is unique, and Aura respects that. Based on your initial insights and ongoing chats, Aura adapts its approach. You guide the conversation, shaping an experience that truly resonates with you."
            />
            {/* Feature 3: Radically Open Source */}
            <FeatureCard
              icon={CodeIcon}
              title="Completely Open Source"
              description="Transparency is key. Aura is built as the first open-source AI reflection tool. Anyone can view, audit, or even contribute to the code. No hidden agendas, just a community-driven tool for well-being."
            >
                <Box sx={{ mt: 'auto', pt: 2 }}> {/* Pushes button to bottom */}
                   <Button
                     variant="outlined"
                     color="secondary"
                     size="small"
                     startIcon={<GitHubIcon />}
                     href="https://github.com/AceCanacan/mental-health-app" // Add your repo link here!
                     target="_blank"
                     rel="noopener noreferrer"
                     sx={{ mt: 2 }}
                   >
                     View Code on GitHub
                   </Button>
                </Box>
            </FeatureCard>
          </Grid>
        </Box>

        {/* Security & Trust Section (Keep relevant parts) */}
        <Box sx={{ my: 8 }}>
           <Typography variant="h2" component="h2" gutterBottom>
            Your Privacy, Our Priority
          </Typography>
           <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: '800px', mx: 'auto' }}>
             Built on Google's secure cloud (Firebase & Vertex AI), your conversations and data are encrypted and protected. We require email verification and provide clear controls. Being open source means you can verify our commitment to your privacy. Review our <MuiLink href="/privacy" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }} color="primary" sx={{ fontWeight: 'bold' }}>Privacy Policy</MuiLink>.
          </Typography>
           {/* Use theme's secondary color for icon */}
           <Icon component={LockIcon} sx={{ fontSize: 60, color: 'secondary.main', my: 2 }} />
        </Box>

        <Box sx={{ my: 5 }}>
          <Typography variant="h4" sx={{ mb: 3 }}>
            Ready to experience the difference?
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => navigate('/login')}
          >
            Get Started
          </Button>
           <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Join the first open-source AI reflection community.
          </Typography>
        </Box>

      </Container>

       {/* Simple Footer */}
       {/* Let theme handle background, maybe add slight border or different shade if needed */}
       <Box component="footer" sx={{ py: 4, mt: 'auto', backgroundColor: 'background.paper' /* Use paper background from theme */ }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            {'© '}
            {new Date().getFullYear()}
            {' Aura Companion. The First Open Source AI Reflection Tool.'}
          </Typography>
           <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
             {/* Make sure this link is correct or remove if no public repo yet */}
             <MuiLink
                // href="YOUR_GITHUB_REPO_LINK"
                target="_blank"
                rel="noopener noreferrer"
                color="inherit"
                sx={{ display: 'inline-flex', alignItems: 'center' }}
             >
               <GitHubIcon sx={{ fontSize: '1rem', mr: 0.5 }}/> View the Source Code
             </MuiLink>
           </Typography>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default LandingPage;