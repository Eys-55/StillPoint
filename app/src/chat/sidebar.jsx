import React, { useEffect, useState } from 'react';
import { Drawer, Box, IconButton, List, ListItem, ListItemButton, ListItemText, Menu, MenuItem, Typography, Divider, Tooltip, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '../firebase.jsx';
import { formatDistanceToNow } from 'date-fns'; // For relative time

const SIDEBAR_WIDTH = 300;

function Sidebar({ activeConversationId, setActiveConversationId, isSidebarCollapsed, setIsSidebarCollapsed }) {
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [menuConversation, setMenuConversation] = useState(null); // Store the whole conv object

  // Fetch conversations
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setLoadingConversations(true);
      const convRef = collection(firestore, 'users', user.uid, 'conversations');
      const q = query(convRef, orderBy("updatedAt", "desc")); // Order by updatedAt

      const unsubscribe = onSnapshot(q, snapshot => {
        const convs = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title || 'Untitled',
            messageCount: data.messages?.length || 0,
            updatedAt: data.updatedAt?.toDate() // Convert Timestamp to Date
          };
        });
        setConversations(convs);
        setLoadingConversations(false);
      }, (error) => {
        console.error("Error fetching conversations:", error);
        setLoadingConversations(false);
      });

      return () => unsubscribe();
    } else {
      setConversations([]); // Clear if user logs out
      setLoadingConversations(false);
    }
  }, []);

  // Handlers
  const handleNewConversation = async () => {
    // Prevent creating new if the current one is empty and unsaved
    const currentConv = conversations.find(conv => conv.id === activeConversationId);
    if (currentConv && currentConv.title === "New Conversation" && currentConv.messageCount === 0) {
      console.log("Current conversation is new and empty, not creating another.");
      setIsSidebarCollapsed(false); // Ensure sidebar is open if needed
      return;
    }

    const user = auth.currentUser;
    if (!user) return;
    const convRef = collection(firestore, 'users', user.uid, 'conversations');
    const newConv = {
      title: "New Conversation", // Temporary title
      messages: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    try {
      const docRef = await addDoc(convRef, newConv);
      setActiveConversationId(docRef.id); // Switch to the new conversation
      setIsSidebarCollapsed(false); // Keep sidebar open
    } catch (error) {
      console.error("Error creating new conversation:", error);
    }
  };

  const handleDeleteConversation = async () => {
    if (!menuConversation) return;
    if (!window.confirm(`Are you sure you want to delete "${menuConversation.title}"? This action cannot be undone.`)) {
      handleMenuClose();
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) return;
      await deleteDoc(doc(firestore, 'users', user.uid, 'conversations', menuConversation.id));
      // If the deleted conversation was active, reset active ID
      if (activeConversationId === menuConversation.id) {
        setActiveConversationId(null);
      }
      handleMenuClose(); // Close menu after deletion
    } catch (error) {
      console.error("Error deleting conversation:", error);
      handleMenuClose();
    }
  };

  const handleConversationClick = (id) => {
    setActiveConversationId(id);
    // Consider closing sidebar on mobile/smaller screens after selection
    // setIsSidebarCollapsed(true); // Or based on screen size
  };

  const handleMenuOpen = (event, conv) => {
    event.stopPropagation(); // Prevent ListItem click
    setMenuAnchorEl(event.currentTarget);
    setMenuConversation(conv);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuConversation(null);
  };

  // Function to format relative time
  const formatRelativeTime = (date) => {
    if (!date) return '';
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      console.error("Error formatting date:", e);
      return '';
    }
  };

  const drawerContent = (
    <Box sx={{ width: SIDEBAR_WIDTH, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ ml: 1 }}>Conversations</Typography>
        <Box>
           <Tooltip title="New Chat">
              <IconButton onClick={handleNewConversation} color="primary">
                <AddIcon />
              </IconButton>
           </Tooltip>
           {/* Removed Close Sidebar button - backdrop click handles this now */}
        </Box>
      </Box>
      <Divider />
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {loadingConversations ? (
           <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
             <CircularProgress />
           </Box>
        ) : (
          <List disablePadding>
            {conversations.map(conv => (
              <ListItem
                key={conv.id}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="options"
                    onClick={(e) => handleMenuOpen(e, conv)}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton
                  selected={conv.id === activeConversationId}
                  onClick={() => handleConversationClick(conv.id)}
                  sx={{
                    '&.Mui-selected': {
                      // backgroundColor: 'action.selected', // Use theme selection color
                       borderLeft: 3, // Add a visual indicator
                       borderColor: 'primary.main',
                    },
                     pt: 0.5, pb: 0.5 // Reduce padding
                  }}
                >
                  <ListItemText
                    primary={conv.title.replace(/^Title:\s*/i, '')} // Clean up title
                    secondary={formatRelativeTime(conv.updatedAt)} // Show relative time
                    primaryTypographyProps={{ noWrap: true, fontSize: '0.9rem' }}
                    secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        {/* <MenuItem onClick={() => { alert("Rename functionality not implemented yet."); handleMenuClose(); }}>
          Rename
        </MenuItem> */}
        <MenuItem onClick={handleDeleteConversation} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );

  return (
     // Using a temporary Drawer for overlay behavior
     <Drawer
      variant="temporary" // Changed from persistent
      anchor="left"
      open={!isSidebarCollapsed}
      onClose={() => setIsSidebarCollapsed(true)} // Add onClose to handle backdrop clicks
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
      }}
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        // Ensure Drawer is above other fixed elements like Header, Input, Footer
        zIndex: (theme) => theme.zIndex.drawer + 3,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          // Match theme background
          bgcolor: 'background.default',
           borderRight: (theme) => `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

export default Sidebar;