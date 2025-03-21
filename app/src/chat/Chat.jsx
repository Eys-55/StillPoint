import React, { useState, useEffect, useRef, useMemo } from 'react';
import { app, auth, firestore } from '../firebase.jsx';
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import prompts from '../meta/prompts.js';
import { doc, getDoc, setDoc, updateDoc, collection, query, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import Footer from '../nav/footer.jsx';
import Header from '../nav/header.jsx';
import Sidebar from './sidebar.jsx';
import { useNavigate } from 'react-router-dom';
import { useChatHandlers } from './chat_hooks.jsx';

function Chat({ darkMode, setDarkMode, activeConversationId, setActiveConversationId, isSidebarCollapsed, setIsSidebarCollapsed }) {
  const [messages, setMessages] = useState([]);
  const [bundledSummaries, setBundledSummaries] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [summaryData, setSummaryData] = useState({ title: '', summary: '' });
  const recordingIntervalRef = useRef(null);
  const chatSession = useRef(null);
  const navigate = useNavigate();
  const vertexAI = getVertexAI(app);

  const conversationDocRef = activeConversationId
    ? doc(firestore, 'users', auth.currentUser.uid, 'conversations', activeConversationId)
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
      setConversationLoaded(true);
    }
    loadChat();
  }, [activeConversationId, conversationDocRef, vertexAI]);

  const saveChat = async (newMessages) => {
    if (!conversationDocRef) return;
    await updateDoc(conversationDocRef, { messages: newMessages, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  };

  const model = useMemo(() => {
    const payload = {
      model: "gemini-2.0-flash",
      geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
      systemInstruction: {
        parts: [
          { text: `${prompts.system}\n\n${bundledSummaries}` }
        ]
      }
    };
    return getGenerativeModel(vertexAI, payload);
  }, [bundledSummaries, vertexAI]);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    async function fetchSummaries() {
      const summaries = await getAllSummaries();
      setBundledSummaries(summaries);
    }
    fetchSummaries();
  }, []);

  const getAllSummaries = async () => {
    const user = auth.currentUser;
    if (!user) return '';
    const convRef = collection(firestore, 'users', user.uid, 'conversations');
    const q = query(convRef);
    const snapshot = await getDocs(q);
    const summaries = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.summary) summaries.push(data.summary);
    });
    return prompts.disclaimer + "\n" + summaries.join('\n');
  };

  const { handleSubmit, handleVoiceButton, handleEndConversation, handleSummarizeHeader, handleEndConversationProfile } = useChatHandlers({
    messages,
    setMessages,
    input,
    setInput,
    activeConversationId,
    setActiveConversationId,
    chatSession,
    model,
    setLoading,
    prompts,
    navigate
  });

  return (
    <>
      <Header
        style={{ position: 'fixed', top: 0, width: '100%', zIndex: 1000 }}
        mode="chat"
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSummarize={handleSummarizeHeader}
        darkMode={darkMode}
      />
      {!isSidebarCollapsed && (
        <Sidebar
          activeConversationId={activeConversationId}
          setActiveConversationId={setActiveConversationId}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
        />
      )}
      {/* Messages container scrolls between Header and Chat Bar */}
      <div style={{ position: 'fixed', top: '60px', bottom: '160px', left: 0, right: 0, overflowY: 'auto', padding: '1rem' }}>
        {activeConversationId && !conversationLoaded ? (
          <div className="text-center">Loading conversation...</div>
        ) : (
          messages.map((msg, index) =>
            msg.role === 'user' ? (
              <div key={index} className="mb-2 text-end">
                <div className="d-inline-block p-2 bg-primary text-white rounded">
                  {msg.text}
                </div>
              </div>
            ) : (
              <div key={index} className="mb-2 text-start">
                <div>{msg.text}</div>
              </div>
            )
          )
        )}
        {loading && <div className="text-center">Loading...</div>}
      </div>
      {/* Chat bar fixed above Footer with extra bottom padding */}
      <div style={{ position: 'fixed', bottom: '60px', left: 0, right: 0, padding: '0 1rem 20px' }}>
        <form onSubmit={handleSubmit}>
          <div className="d-flex align-items-stretch">
            <textarea
              className="form-control rounded"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={loading || isRecording}
              style={{ minHeight: '60px', maxHeight: '200px', resize: 'none', overflowY: 'auto' }}
              wrap="soft"
            ></textarea>
            <div className="d-flex align-items-center ms-2">
              <button type="button" onClick={handleVoiceButton} className="btn btn-outline-secondary btn-sm rounded-circle me-1">
                {isRecording ? <i className="bi bi-check"></i> : <i className="bi bi-mic"></i>}
              </button>
              <button className="btn btn-primary btn-sm rounded-circle" type="submit" disabled={loading || isRecording}>
                <i className="bi bi-arrow-up-circle-fill"></i>
              </button>
            </div>
          </div>
        </form>
      </div>
      <Footer
        style={{ position: 'fixed', bottom: 0, width: '100%' }}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        conversationActive={true}
        endConversation={handleEndConversationProfile}
      />
      {summaryModalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1200 }}>
          <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '4px', width: '300px' }}>
            <h5>{summaryData.title}</h5>
            <p>{summaryData.summary}</p>
            <div style={{ textAlign: 'right', marginTop: '1rem' }}>
              <button onClick={() => setSummaryModalVisible(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Chat;