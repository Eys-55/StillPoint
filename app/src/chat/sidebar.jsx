import React, { useEffect, useState, useRef } from 'react';
import { Box, IconButton, List, ListItem, ListItemText, Menu, MenuItem } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, firestore } from '../firebase.jsx';
import { useSidebarHandlers } from './sidebar_hooks.jsx';

function Sidebar({ activeConversationId, setActiveConversationId, setIsSidebarCollapsed, messages, darkMode }) {
  const [conversations, setConversations] = useState([]);
  const sidebarRef = useRef(null);
  const { handleNewConversation, handleDeleteWithMemories, handleConversationClick } = useSidebarHandlers({
    activeConversationId,
    messages,
    conversations,
    setActiveConversationId,
    setConversations,
    setIsSidebarCollapsed
  });

  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [menuConversationId, setMenuConversationId] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const convRef = collection(firestore, 'users', user.uid, 'conversations');
      const q = query(convRef, orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, snapshot => {
        const convs = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          convs.push({
            id: docSnap.id,
            title: data.title || 'Untitled Conversation',
            messageCount: data.messages ? data.messages.length : 0
          });
        });
        setConversations(convs);
      });
      return () => unsubscribe();
    }
  }, []);

  return (
    <Box ref={sidebarRef} className="sidebar" sx={{ width: 300, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => setIsSidebarCollapsed(true)} sx={{ color: darkMode ? '#fff' : 'inherit' }}>
          <CloseIcon />
        </IconButton>
        <IconButton onClick={handleNewConversation} sx={{ color: darkMode ? '#fff' : 'inherit' }}>
          <AddIcon />
        </IconButton>
      </Box>
      <List>
        {conversations.map(conv => (
          <ListItem
            button
            key={conv.id}
            selected={conv.id === activeConversationId}
            onClick={() => handleConversationClick(conv.id)}
          >
            <ListItemText primary={conv.title.replace(/^Title:\s*/i, '')} />
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setMenuAnchorEl(e.currentTarget);
                setMenuConversationId(conv.id);
              }}
              sx={{ color: darkMode ? '#fff' : 'inherit' }}
            >
              <MoreVertIcon />
            </IconButton>
          </ListItem>
        ))}
      </List>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl) && menuConversationId !== null}
        onClose={() => {
          setMenuAnchorEl(null);
          setMenuConversationId(null);
        }}
      >
        <MenuItem onClick={() => { alert("Rename functionality not implemented."); setMenuAnchorEl(null); setMenuConversationId(null); }}>
          Rename
        </MenuItem>
        <MenuItem onClick={() => {
          const conv = conversations.find(c => c.id === menuConversationId);
          handleDeleteWithMemories(conv);
          setMenuAnchorEl(null);
          setMenuConversationId(null);
        }}>
          Delete with Memories
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default Sidebar;