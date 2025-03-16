import React, { useState, useEffect, useRef, useMemo } from 'react';
import { app, auth, firestore } from '../firebase.jsx';
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import prompts from '../prompts.js';
import { doc, getDoc, setDoc, updateDoc, collection, query, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import Footer from '../nav/footer.jsx';
import Header from '../nav/Header.jsx';
import Sidebar from './sidebar.jsx';
import { useNavigate } from 'react-router-dom';

function Chat({ darkMode, setDarkMode, activeConversationId, setActiveConversationId, isSidebarCollapsed, setIsSidebarCollapsed }) {
  const [messages, setMessages] = useState([]);
  const [bundledSummaries, setBundledSummaries] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [summaryData, setSummaryData] = useState({ title: '', summary: '' });
  const recordingIntervalRef = useRef(null);
  const chatSession = useRef(null);
  const navigate = useNavigate();
  const vertexAI = getVertexAI(app);

  // Helper function for formatting recording time
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // Removed auto-creation useEffect block to defer conversation creation until first message is sent.

  const conversationDocRef = activeConversationId
    ? doc(firestore, 'users', auth.currentUser.uid, 'conversations', activeConversationId)
    : null;

  // Load chat conversation when activeConversationId is set
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    let conversationId = activeConversationId;
    if (!conversationId) {
      const user = auth.currentUser;
      const conversationsRef = collection(firestore, 'users', user.uid, 'conversations');
      const newConversation = {
        title: "New Conversation",
        messages: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const docRef = await addDoc(conversationsRef, newConversation);
      conversationId = docRef.id;
      setActiveConversationId(docRef.id);
    }
    const conversationDocRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
    const userMessage = { role: 'user', text: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    await saveChat(updatedMessages);
    const messageToSend = input;
    setInput('');
    setLoading(true);
    try {
      const resultStream = await chatSession.current.sendMessageStream(messageToSend);
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

  const handleVoiceButton = () => {};

  // Updated summarization logic for ending conversation
  const handleEndConversation = async () => {
    let convMessages = messages;
    if (!convMessages || convMessages.length === 0) return;
    setLoading(true);
    try {
      const conversationText = convMessages.map(msg => `${msg.role}: ${msg.text}`).join('\n');
      const combinedPrompt = prompts.summarizer + "\n\nConversation:\n" + conversationText;
      const resultCombined = await model.generateContent(combinedPrompt);
      const responseText = resultCombined.response.text();
      const lines = responseText.split("\n").filter(line => line.trim() !== "");
      const generatedTitle = lines[0].replace(/\*\*/g, '').trim();
      const generatedSummary = lines.slice(1).join("\n").trim();
      if (conversationDocRef) {
        await updateDoc(conversationDocRef, {
          summary: generatedSummary,
          title: generatedTitle,
          ended: true,
        });
      }
      setSummaryData({ title: generatedTitle, summary: generatedSummary });
      setSummaryModalVisible(true);
    } catch (err) {
      console.error("Error during summarization: " + err.message);
    }
    setLoading(false);
  };

  // For header check button: end conversation and navigate to home
  const handleSummarizeHeader = async () => {
    await handleEndConversation();
  };

  // For profile modal "I'm done" option: end conversation and navigate to profile
  const handleEndConversationProfile = async () => {
    await handleEndConversation();
    navigate('/profile');
  };

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

  return (
    <>
      <Header
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
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div className="container-fluid p-3" style={{ flexGrow: 1 }}>
          {!conversationLoaded ? (
            <div className="text-center">Loading conversation...</div>
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
                      <div>{msg.text}</div>
                    </div>
                  )
                ))}
                {loading && <div className="text-center">Loading...</div>}
              </div>
              <div className="p-3 mt-3">
                <form onSubmit={handleSubmit}>
                  <div className="d-flex align-items-stretch">
                    <textarea
                      className="form-control rounded"
                      placeholder="Type your message..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
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
            </>
          )}
        </div>
        <Footer darkMode={darkMode} setDarkMode={setDarkMode} conversationActive={true} endConversation={handleEndConversationProfile} />
      </div>
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