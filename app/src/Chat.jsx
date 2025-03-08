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
    geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
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
        <div className="container-fluid p-3">
          {!activeConversationId ? (
            <h2 className="text-center">Please select a conversation from the sidebar or create a new one.</h2>
          ) : (
            <>
              <div style={{ height: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                  {messages.map((msg, index) => (
                    msg.role === 'user' ? (
                      <div key={index} className="mb-2 text-end">
                        <div className="d-inline-block p-2 bg-primary text-white rounded">
                          {msg.text}
                        </div>
                      </div>
                    ) : (
                      <div key={index} className="mb-2 text-start">
                        <div>
                          {msg.text}
                        </div>
                      </div>
                    )
                  ))}
                  {loading && <div className="text-center">Loading...</div>}
              </div>
              <div className="p-3 mt-3">
                <form onSubmit={handleSubmit}>
                  <div className="input-group">
<textarea
                      className="form-control rounded"
                      placeholder="Type your message..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      style={{ minHeight: '80px', maxHeight: '200px', resize: 'vertical', overflowY: 'auto' }}
                      wrap="soft"
                    ></textarea>
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                      <i className="bi bi-arrow-up"></i>
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chat;