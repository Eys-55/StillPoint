import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import ChatIcon from '@mui/icons-material/Chat';
import SettingsIcon from '@mui/icons-material/Settings';
// Removed LogoutIcon import

export const FOOTER_HEIGHT = 56; // Default MUI BottomNavigation height

// Helper function to determine the active value based on pathname
const getCurrentValue = (pathname) => {
    // Match base paths to highlight the correct icon
    if (pathname.startsWith('/home')) return '/home';
    if (pathname.startsWith('/profile')) return '/profile'; // This ensures Profile stays selected within /profile/*
    if (pathname.startsWith('/chat')) return '/chat';
    if (pathname.startsWith('/settings')) return '/settings';
    // Add other base paths if needed
    return false; // Return false if no route matches
};

// Removed conversationActive and endConversation from props
function Footer({ darkMode, setDarkMode }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Directly calculate the current selected value based on location pathname
  const currentValue = getCurrentValue(location.pathname);

  const handleChange = (event, newValue) => {
     // Removed special handling for 'end-conversation'

     // For all other actions, navigate to the corresponding path
     navigate(newValue);

     // The BottomNavigation component's visual state (`value` prop) will update on the next render
     // because `location.pathname` will change, causing `currentValue` to be recalculated.
  };

  return (
    <Paper
        sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: (theme) => theme.zIndex.appBar + 1, // Ensure footer is above chat input area but potentially below modals
            height: `${FOOTER_HEIGHT}px`
        }}
        elevation={3}
     >
      <BottomNavigation
        showLabels // Always show labels
        value={currentValue} // Value controlled by current route
        onChange={handleChange} // Handles navigation logic
        sx={{ height: '100%' }} // Fills the Paper height
      >
        <BottomNavigationAction label="Home" value="/home" icon={<HomeIcon />} />
        <BottomNavigationAction label="Profile" value="/profile" icon={<PersonIcon />} />
        {/* Always show Chat button */}
        <BottomNavigationAction label="Chat" value="/chat" icon={<ChatIcon />} />
        <BottomNavigationAction label="Settings" value="/settings" icon={<SettingsIcon />} />
      </BottomNavigation>
    </Paper>
  );
}

export default Footer;