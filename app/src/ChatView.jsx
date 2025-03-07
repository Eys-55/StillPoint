import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Chat from './Chat.jsx';

function ChatView({ darkMode, setDarkMode }) {
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar
        onSelectConversation={setActiveConversationId}
        activeConversationId={activeConversationId}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <div className="flex-grow-1" style={{ marginLeft: isSidebarCollapsed ? '0px' : '260px', transition: 'margin-left 0.3s ease' }}>
        <div className="container my-5">
          <div className="mx-auto" style={{ maxWidth: '600px' }}>
            <Chat conversationId={activeConversationId} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatView;