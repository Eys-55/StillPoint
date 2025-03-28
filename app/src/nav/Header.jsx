import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Typography, Tooltip, Box, Badge } from '@mui/material'; // Import Badge
import MenuIcon from '@mui/icons-material/Menu';
import CheckIcon from '@mui/icons-material/Check';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '@mui/material/styles';

// Define AppBar height for layout calculations elsewhere
export const HEADER_HEIGHT = 64; // Default MUI AppBar height

// IMPORTANT: This Header uses `position: "fixed"`.
// Consuming components/layouts MUST apply `paddingTop: HEADER_HEIGHT` (or appropriate value)
// to their main scrollable content area to prevent content from being hidden underneath the header.
// THIS HEADER IS NOW INTENDED PRIMARILY FOR THE CHAT VIEW.
function Header({ mode = 'chat', onToggleSidebar, onSummarize, onBack, darkMode, conversationTitle, lastSavedTime, hasNewMessages, hasMessages }) {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleBackClick = () => {
    if (mode === 'summaries') { // Keep summaries back logic if needed
      navigate('/profile');
    } else if (onBack) {
      onBack(); // Use the provided onBack function if available
    } else {
      navigate(-1); // Default back navigation if no specific handler
    }
  };

  const formattedTime = lastSavedTime
    ? new Date(lastSavedTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) // Shorter time format
    : "never"; // Changed from "Not saved"

  // Determine tooltip text based on state
  let tooltipTitle = "No messages yet";
  if (hasMessages) {
    if (hasNewMessages) {
      tooltipTitle = `Unsaved changes (last save: ${formattedTime}). Click to save.`;
    } else if (lastSavedTime) {
      tooltipTitle = `Conversation saved (${formattedTime})`;
    } else {
      tooltipTitle = "Click to save conversation";
    }
  }

  // Simplify title logic - primarily for chat
  let title = "Chat";
  if (mode === 'summaries') {
    title = "Conversation Summary";
  } else if (conversationTitle && conversationTitle !== "New Conversation") {
     title = conversationTitle; // Use conversation title if available in chat mode
  }


  // Determine button visibility/state - primarily for chat
  const showSidebarButton = mode === 'chat';
  const showBackButton = mode === 'summaries' || !!onBack; // Show if mode is summaries OR if onBack prop is provided
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
              <Tooltip title={tooltipTitle}>
                {/* Wrap IconButton in span for Tooltip when disabled */}
                <span style={{ cursor: !hasMessages ? 'not-allowed' : 'pointer' }}>
                  <IconButton
                    color="inherit"
                    onClick={hasMessages ? onSummarize : undefined}
                    disabled={!hasMessages}
                    size="medium" // Standard IconButton size
                    sx={{
                      mr: 1, // Add some margin if needed
                      // Change color based on save state for visual feedback
                      color: hasMessages ? (hasNewMessages ? 'warning.main' : 'success.main') : 'action.disabled'
                    }}
                  >
                    {/* Add Badge if there are new messages */}
                    {hasNewMessages ? (
                       <Badge color="warning" variant="dot">
                         <CheckIcon />
                       </Badge>
                    ) : (
                       <CheckIcon />
                    )}
                  </IconButton>
                </span>
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