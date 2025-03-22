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
  const [userProfile, setUserProfile] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [summaryData, setSummaryData] = useState({ title: '', summary: '' });
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [lastMessageCountAtSave, setLastMessageCountAtSave] = useState(0);
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
        generationConfig: { maxOutputTokens: 1000 },
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
          { text: `${prompts.system}\n\n${bundledSummaries}\n\n${prompts.userProfileLabel}\n${userProfile}` }
        ]
      }
    };
    return getGenerativeModel(vertexAI, payload);
  }, [bundledSummaries, userProfile, vertexAI]);

  useEffect(() => {
    async function fetchSummaries() {
      const summaries = await getAllSummaries();
      setBundledSummaries(summaries);
    }
    fetchSummaries();
  }, []);

  useEffect(() => {
    async function fetchUserProfile() {
      const user = auth.currentUser;
      if (!user) return;
      const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.answers) {
          const profileText = data.answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n');
          setUserProfile(profileText);
        }
      }
    }
    fetchUserProfile();
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
    navigate,
    isRecording,
    setIsRecording,
    setRecordingTime
  });

  const handleSummarizeAndUpdate = async () => {
    await handleSummarizeHeader();
    setLastSavedTime(new Date());
    setLastMessageCountAtSave(messages.length);
  };

  return (
    <>
      <Header
        style={{ position: 'fixed', top: 0, width: '100%', zIndex: 1000 }}
        mode="chat"
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSummarize={handleSummarizeAndUpdate}
        darkMode={darkMode}
        lastSavedTime={lastSavedTime}
        hasNewMessages={messages.length > lastMessageCountAtSave}
      />
      {!isSidebarCollapsed && (
        <Sidebar
          activeConversationId={activeConversationId}
          setActiveConversationId={setActiveConversationId}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
        />
      )}
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
      <div style={{ position: 'fixed', bottom: '60px', left: 0, right: 0, padding: '0 1rem 20px' }}>
        <form onSubmit={(e) => {
          console.log("prompts.system:", prompts.system);
          console.log("bundledSummaries:", bundledSummaries);
          console.log("prompts.userProfileLabel:", prompts.userProfileLabel);
          console.log("userProfile:", userProfile);
          handleSubmit(e);
        }}>
          <div className="d-flex align-items-stretch">
            <textarea
              className="form-control rounded"
              placeholder="Type your message..."
              value={loading ? "Loading..." : (isRecording ? `Recording: ${recordingTime}s` : input)}
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
      {auth.currentUser && window.location.pathname !== '/chat' && <Footer darkMode={darkMode} setDarkMode={setDarkMode} />}
    </>
  );
}

export default Chat;