import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import ChatIcon from '@mui/icons-material/Chat';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout'; // For potential end conversation
import { auth } from '../firebase.jsx'; // To check auth status if needed

// Define Footer height for layout calculations elsewhere
export const FOOTER_HEIGHT = 56; // Default MUI BottomNavigation height

// IMPORTANT: This Footer uses `position: "fixed"`.
// Consuming components/layouts MUST apply `paddingBottom: FOOTER_HEIGHT` (or appropriate value)
// to their main scrollable content area to prevent content from being hidden underneath the footer.
// Note: Components like Chat.jsx might need additional paddingBottom if they have other fixed elements above the footer (e.g., a fixed input bar).
function Footer({ darkMode, setDarkMode, conversationActive, endConversation }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine the current value based on the path
  const getCurrentValue = (pathname) => {
    if (pathname.startsWith('/home')) return '/home';
    if (pathname.startsWith('/profile')) return '/profile';
    if (pathname.startsWith('/chat')) return '/chat';
    if (pathname.startsWith('/settings')) return '/settings';
    return false; // No match
  };

  const [value, setValue] = React.useState(getCurrentValue(location.pathname));

  // Update value if the location changes externally
  React.useEffect(() => {
    setValue(getCurrentValue(location.pathname));
  }, [location.pathname]);

  const handleChange = (event, newValue) => {
     // Handle special case for 'end-conversation'
     if (newValue === 'end-conversation') {
       if (endConversation) {
         endConversation(); // Call the passed function
       }
       // Don't navigate or change the selected value
       return;
     }
    setValue(newValue);
    navigate(newValue);
  };

  // Check if the user is logged in - hide footer if not? Or adjust actions?
  // For now, assume user is logged in if footer is visible.

  return (
    <Paper
        sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: (theme) => theme.zIndex.drawer + 2, // Ensure footer is above input area
            height: `${FOOTER_HEIGHT}px`
        }}
        elevation={3}
     >
      <BottomNavigation
        showLabels // Show labels below icons
        value={value}
        onChange={handleChange}
        sx={{ height: '100%' }} // Ensure it fills the Paper height
      >
        <BottomNavigationAction label="Home" value="/home" icon={<HomeIcon />} />
        <BottomNavigationAction label="Profile" value="/profile" icon={<PersonIcon />} />
         {/* Dynamically show Chat or End Conversation */}
         {conversationActive ? (
             <BottomNavigationAction
                label="End Chat"
                value="end-conversation" // Special value, handled in onChange
                icon={<LogoutIcon color="error"/>} // Use a distinct icon/color
             />
         ) : (
             <BottomNavigationAction label="Chat" value="/chat" icon={<ChatIcon />} />
         )}
        <BottomNavigationAction label="Settings" value="/settings" icon={<SettingsIcon />} />
      </BottomNavigation>
    </Paper>
  );
}

export default Footer;