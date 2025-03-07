import React, { useState, useEffect, useRef } from 'react';
import { app, auth, firestore } from './firebase.jsx';
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import prompts from './prompts.js';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import Sidebar from './Sidebar.jsx';

function Chat({ darkMode, setDarkMode }) {
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatSession = useRef(null);
  const user = auth.currentUser;

  // Initialize the Vertex AI model for chat within this file
  const vertexAI = getVertexAI(app);
  const model = getGenerativeModel(vertexAI, {
    model: "gemini-2.0-flash",
    systemInstruction: {
      parts: [
        { text: prompts.system }
      ]
    }
  });

  const conversationDocRef = activeConversationId
    ? doc(firestore, 'users', user.uid, 'conversations', activeConversationId)
    : null;

  useEffect(() => {
    if (!activeConversationId) return;
    async function loadChat() {
      const conversationDoc = await getDoc(conversationDocRef);
      let initialHistory;
      if (conversationDoc.exists()) {
        initialHistory = conversationDoc.data().messages;
        setMessages(initialHistory);
      } else {
        initialHistory = [];
        setMessages(initialHistory);
        await setDoc(conversationDocRef, { messages: initialHistory, title: "New Conversation" });
      }
      const formattedHistory = initialHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));
      chatSession.current = model.startChat({
        history: formattedHistory,
        generationConfig: { maxOutputTokens: 500 },
      });
    }
    loadChat();
  }, [activeConversationId, conversationDocRef, prompts.system]);

  const saveChat = async (newMessages) => {
    if (!conversationDocRef) return;
    await updateDoc(conversationDocRef, { messages: newMessages });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !conversationDocRef) return;

    const userMessage = { role: 'user', text: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    await saveChat(updatedMessages);

    setInput('');
    setLoading(true);

    try {
      const resultStream = await chatSession.current.sendMessageStream(input);
      let botText = '';
      setMessages(prev => {
        const msgs = [...prev, { role: 'bot', text: botText, temp: true }];
        saveChat(msgs);
        return msgs;
      });

      for await (const chunk of resultStream.stream) {
        const chunkText = chunk.text();
        botText += chunkText;
        setMessages(prev => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { role: 'bot', text: botText, temp: true };
          saveChat(msgs);
          return msgs;
        });
      }

      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { role: 'bot', text: botText };
        saveChat(msgs);
        return msgs;
      });
    } catch (error) {
      const errorMessage = { role: 'bot', text: "Error: " + error.message };
      setMessages(prev => {
        const msgs = [...prev, errorMessage];
        saveChat(msgs);
        return msgs;
      });
    }
    setLoading(false);
  };

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
      <div
        className="flex-grow-1"
        style={{
          marginLeft: isSidebarCollapsed ? '0px' : '260px',
          transition: 'margin-left 0.3s ease',
          position: 'relative'
        }}
      >
        {isSidebarCollapsed && (
          <button
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              zIndex: 1000
            }}
            className="btn btn-primary"
            onClick={() => setIsSidebarCollapsed(false)}
          >
            <i className="bi bi-chevron-double-left"></i>
          </button>
        )}
        <div className="container my-5">
          <div className="mx-auto" style={{ maxWidth: '600px' }}>
            {!activeConversationId ? (
              <h2 className="text-center">Please select a conversation from the sidebar or create a new one.</h2>
            ) : (
              <>
                <div className="card">
                  <div className="card-body" style={{ height: '400px', overflowY: 'auto' }}>
                    {messages.map((msg, index) => (
                      <div key={index} className={`mb-2 text-${msg.role === 'user' ? 'end' : 'start'}`}>
                        <span className={`badge bg-${msg.role === 'user' ? 'primary' : 'secondary'}`}>
                          {msg.role === 'user' ? 'You' : 'Bot'}
                        </span>
                        <p className="mt-1">{msg.text}</p>
                      </div>
                    ))}
                    {loading && <div className="text-center">Loading...</div>}
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="mt-3">
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type your message..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                    />
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                      Send
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;