import React, { useState } from 'react';
import { auth } from '../firebase.jsx'; // Firestore potentially not needed directly anymore
// import Header from '../nav/header.jsx'; // Removed Header import
import Insights from './Insights.jsx'; // Import the new Insights component
import SummariesList from './SummariesList.jsx'; // Import the new SummariesList component
import {
  Container,
  Typography,
  Box,
  Grid, // Keep Grid for overall layout if needed, but not for side-by-side content
  Avatar,
  Paper,
  Stack,
  useTheme,
  ToggleButton, // For the slider/toggle
  ToggleButtonGroup, // Group for the toggle
} from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined'; // Icon for Insights toggle
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined'; // Icon for Summaries toggle
import { HEADER_HEIGHT } from '../nav/header.jsx'; // Import for padding calculation if needed, or set a static value
import { FOOTER_HEIGHT } from '../nav/footer.jsx'; // Import Footer height

function UserProfile() {
  const user = auth.currentUser;
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // State to manage the current view: 'insights' or 'summaries'
  const [viewMode, setViewMode] = useState('insights'); // Default to insights view

  const handleViewChange = (event, newViewMode) => {
    // Prevent unselecting all options; if the same button is clicked again, do nothing
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  return (
    // Adjust main Box if it previously relied on Header for structure
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default', pt: 4 /* Add padding top */ }}>
      {/* <Header mode="profile" darkMode={isDarkMode} /> */} {/* Removed Header */}
      {/* Add bottom margin (mb) to account for fixed Footer height + buffer */}
      <Container maxWidth="lg" sx={{ /* mt: 5, removed */ mb: `${FOOTER_HEIGHT + 16}px`, flexGrow: 1 }}>
        {/* User Info Header */}
        <Paper elevation={0} sx={{ p: {xs: 2, sm: 3}, mb: 4, borderRadius: 4, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: 'background.paper', color: 'primary.main', width: 56, height: 56 }}>
              <AccountCircleOutlinedIcon fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 'medium' }}>
                {user?.displayName || 'Your Profile'}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {user ? user.email : 'Loading...'}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* View Mode Toggle (Slider) - Already Centered */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewChange}
            aria-label="Profile view mode"
            color="primary"
            sx={{ bgcolor: 'background.paper', borderRadius: 5 }} // Background for the group
          >
            <ToggleButton value="insights" aria-label="insights questionnaire" sx={{ borderRadius: 5, px: 3, textTransform: 'none' }}>
              <PsychologyOutlinedIcon sx={{ mr: 1 }} />
              Insights
            </ToggleButton>
            <ToggleButton value="summaries" aria-label="conversation summaries" sx={{ borderRadius: 5, px: 3, textTransform: 'none' }}>
              <ListAltOutlinedIcon sx={{ mr: 1 }} />
              Reflections
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Conditional Content Area - Container handles centering */}
        <Box>
          {viewMode === 'insights' && <Insights />}
          {viewMode === 'summaries' && <SummariesList />}
        </Box>

      </Container>
        {/* Footer rendered conditionally in App.jsx */}
    </Box>
  );
}

export default UserProfile;