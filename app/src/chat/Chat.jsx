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
import { questions } from '../meta/questions.js';
import { Box, TextField, IconButton, Paper } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import CheckIcon from '@mui/icons-material/Check';
import SendIcon from '@mui/icons-material/Send';

function Chat({ darkMode, setDarkMode, activeConversationId, setActiveConversationId, isSidebarCollapsed, setIsSidebarCollapsed }) {
  const [messages, setMessages] = useState([]);
  const [bundledSummaries, setBundledSummaries] = useState('');
  const [userProfile, setUserProfile] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [lastMessageCountAtSave, setLastMessageCountAtSave] = useState(null);
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
        const summarizedAt = conversationDoc.data().summarizedAt;
        if (summarizedAt) {
          setLastSavedTime(summarizedAt.toDate());
          setLastMessageCountAtSave(initialHistory.length);
        } else {
          setLastSavedTime(null);
          setLastMessageCountAtSave(null);
        }
      } else {
        initialHistory = [];
        setMessages(initialHistory);
        await setDoc(conversationDocRef, { messages: initialHistory, title: "New Conversation" });
        setLastSavedTime(null);
        setLastMessageCountAtSave(null);
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
          let profileSummary = "";
          data.answers.forEach(a => {
            const q = questions.find(q => q.question.includes(a.question.trim()));
            if (q && q.optionDetails && q.optionDetails[a.answer]) {
              profileSummary += `- ${q.optionDetails[a.answer]}\n`;
            }
          });
          const formattedProfile = `<user_preference>
These are the user's preferences and traits:
${profileSummary.trim()}
</user_preference>`;
          setUserProfile(formattedProfile);
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
    if (summaries.length > 0) {
      return prompts.disclaimer.replace('</disclaimer>', "\n" + summaries.join('\n') + "\n</disclaimer>");
    }
    return prompts.disclaimer;
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
    setRecordingTime,
    bundledSummaries,
    userProfile
  });

  const handleSummarizeAndUpdate = async () => {
    await handleSummarizeHeader();
    setLastSavedTime(new Date());
    setLastMessageCountAtSave(messages.length);
  };

  return (
    <>
      <Header
        sx={{ position: 'fixed', top: 0, width: '100%', zIndex: 1000 }}
        mode="chat"
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSummarize={handleSummarizeAndUpdate}
        darkMode={darkMode}
        lastSavedTime={lastSavedTime}
        hasNewMessages={lastSavedTime ? (messages.length > lastMessageCountAtSave) : false}
        hasMessages={messages.length > 0}
      />
      {!isSidebarCollapsed && (
        <Sidebar
          activeConversationId={activeConversationId}
          setActiveConversationId={setActiveConversationId}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          darkMode={darkMode}
          messages={messages}
        />
      )}
      <Box sx={{ position: 'fixed', top: '60px', bottom: '160px', left: 0, right: 0, overflowY: 'auto', p: 2 }}>
        {activeConversationId && !conversationLoaded ? (
          <Box sx={{ textAlign: 'center' }}>Loading conversation...</Box>
        ) : (
          messages.map((msg, index) =>
            msg.role === 'user' ? (
              <Box key={index} sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Paper sx={{ p: 1, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                  {msg.text}
                </Paper>
              </Box>
            ) : (
              <Box key={index} sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
                <Paper sx={{ p: 1 }}>
                  {msg.text}
                </Paper>
              </Box>
            )
          )
        )}
        {loading && <Box sx={{ textAlign: 'center' }}>Loading...</Box>}
      </Box>
      <Box sx={{ position: 'fixed', bottom: '60px', left: 0, right: 0, p: 2 }}>
        <form onSubmit={(e) => {
          console.log("prompts.system:", prompts.system);
          console.log("bundledSummaries:", bundledSummaries);
          console.log("prompts.userProfileLabel:", prompts.userProfileLabel);
          console.log("userProfile:", userProfile);
          handleSubmit(e);
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              multiline
              fullWidth
              variant="outlined"
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
              sx={{
                minHeight: '60px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}
              InputProps={{
                sx: {
                  backgroundColor: darkMode ? '#424242' : '#fff',
                  color: darkMode ? '#fff' : '#000',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: darkMode ? '#424242' : 'rgba(0, 0, 0, 0.23)',
                  }
                }
              }}
            />
            <Box sx={{ ml: 2 }}>
              <IconButton onClick={handleVoiceButton} sx={{ color: darkMode ? '#fff' : 'inherit' }}>
                {isRecording ? <CheckIcon /> : <MicIcon />}
              </IconButton>
              <IconButton type="submit" disabled={loading || isRecording} sx={{ color: darkMode ? '#fff' : 'inherit' }}>
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </form>
      </Box>
      <Footer
        sx={{ position: 'fixed', bottom: 0, width: '100%' }}
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