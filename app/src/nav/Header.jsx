import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Typography, Button, Tooltip, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SaveAltIcon from '@mui/icons-material/SaveAlt'; // Changed icon
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '@mui/material/styles';

// Define AppBar height for layout calculations elsewhere
export const HEADER_HEIGHT = 64; // Default MUI AppBar height

// IMPORTANT: This Header uses `position: "fixed"`.
// Consuming components/layouts MUST apply `paddingTop: HEADER_HEIGHT` (or appropriate value)
// to their main scrollable content area to prevent content from being hidden underneath the header.
function Header({ mode, onToggleSidebar, onSummarize, onBack, darkMode, conversationTitle, lastSavedTime, hasNewMessages, hasMessages }) {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleBackClick = () => {
    if (mode === 'summaries') {
      navigate('/profile');
    } else if (onBack) {
      onBack();
    }
  };

  const formattedTime = lastSavedTime
    ? new Date(lastSavedTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) // Shorter time format
    : "Not saved";

  let title = "Chat"; // Default title for chat mode
  if (mode === 'home') title = "Home";
  else if (mode === 'profile') title = "Profile";
  else if (mode === 'settings') title = "Settings";
  else if (mode === 'summaries') title = "Conversation Summary";
  // Allow conversationTitle prop to override the default 'Chat' title if provided
  if (mode === 'chat' && conversationTitle && conversationTitle !== "New Conversation") {
      title = conversationTitle;
  }


  // Determine button visibility/state
  const showSidebarButton = mode === 'chat';
  const showBackButton = mode === 'summaries' || onBack;
  const showSummarizeSection = mode === 'chat';

  return (
    // Use position="fixed" to keep it at the top
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, height: `${HEADER_HEIGHT}px` }} elevation={1}>
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: `${HEADER_HEIGHT}px !important` /* Override minHeight */ }}>
        {/* Left Section */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
          {showSidebarButton && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={onToggleSidebar}
            >
              <MenuIcon />
            </IconButton>
          )}
          {showBackButton && (
            <IconButton
              color="inherit"
              aria-label="back"
              edge="start"
              onClick={handleBackClick}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          {/* Add Spacer if no button is shown to maintain center alignment */}
          {!showSidebarButton && !showBackButton && <Box sx={{ width: 48 }} />}
        </Box>

        {/* Center Section (Title) */}
        <Typography variant="h6" component="div" sx={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </Typography>

        {/* Right Section */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {showSummarizeSection && (
            <>
              <Tooltip title={hasMessages ? (lastSavedTime ? (hasNewMessages ? `New messages since ${formattedTime}` : `Last saved: ${formattedTime}`) : "Conversation not saved") : "No messages yet"}>
                {/* Wrap the span in a div for Tooltip when button is disabled */}
                 <div style={{ display: 'inline-block', cursor: !hasMessages ? 'not-allowed' : 'default' }}>
                   <Button
                      color="inherit"
                      onClick={hasMessages ? onSummarize : undefined}
                      disabled={!hasMessages}
                      startIcon={<SaveAltIcon />}
                      size="small" // Smaller button
                      sx={{ textTransform: 'none', mr: 1 }} // Prevent uppercase, add margin
                    >
                       <Typography variant="caption" display={{ xs: 'none', sm: 'inline' }}> {/* Hide text on extra small screens */}
                         {hasMessages ? (lastSavedTime ? (hasNewMessages ? `Save` : `Saved`) : "Save") : 'Save'}
                       </Typography>
                   </Button>
                </div>
              </Tooltip>
            </>
          )}
          {/* Add Spacer if no button is shown to maintain center alignment */}
           {!showSummarizeSection && <Box sx={{ width: 48 }} />} {/* Adjust width to match potential icon button */}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;