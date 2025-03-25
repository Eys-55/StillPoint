import React, { useState, useEffect, useRef, useMemo } from 'react';
import { app, auth, firestore } from '../firebase.jsx';
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import prompts from '../meta/prompts.js';
import { doc, getDoc, setDoc, updateDoc, collection, query, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import Footer from '../nav/footer.jsx';
import Header from '../nav/header.jsx';
import Sidebar from './sidebar.jsx';
import { useNavigate } from 'react-router-dom';
import { useChatHandlers } from './chat_hooks.jsx';
import { questions } from '../meta/questions.js';
import { Box, TextField, IconButton, Paper, Stack, Typography, CircularProgress, Avatar, useTheme } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop'; // Changed from CheckIcon
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy'; // Bot icon

// Constants for layout
const HEADER_HEIGHT = '64px'; // Adjust based on your Header's actual height
const FOOTER_HEIGHT = '56px'; // Adjust based on your Footer's actual height
const INPUT_AREA_MIN_HEIGHT = '70px';
const INPUT_AREA_MAX_HEIGHT = '200px';
const SIDEBAR_WIDTH = '300px';

function Chat({ darkMode, setDarkMode, activeConversationId, setActiveConversationId, isSidebarCollapsed, setIsSidebarCollapsed }) {
  const [messages, setMessages] = useState([]);
  const [bundledSummaries, setBundledSummaries] = useState('');
  const [userProfile, setUserProfile] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false); // For message sending
  const [conversationLoading, setConversationLoading] = useState(false); // For loading history
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [lastMessageCountAtSave, setLastMessageCountAtSave] = useState(null);
  const chatSession = useRef(null);
  const messagesEndRef = useRef(null); // Ref to scroll to bottom
  const navigate = useNavigate();
  const vertexAI = getVertexAI(app);
  const theme = useTheme();

  const conversationDocRef = useMemo(() => activeConversationId
    ? doc(firestore, 'users', auth.currentUser.uid, 'conversations', activeConversationId)
    : null, [activeConversationId, auth.currentUser?.uid]);

  // Effect to scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch summaries and profile (These should run early)
  useEffect(() => {
    async function fetchSummaries() {
      const summaries = await getAllSummaries();
      setBundledSummaries(summaries || prompts.disclaimer); // Ensure it's never undefined
    }
    fetchSummaries();
  }, [prompts.disclaimer]); // Added prompt dependency

  useEffect(() => {
    async function fetchUserProfile() {
      const user = auth.currentUser;
      if (!user) return;
      const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
      try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.answers && Array.isArray(data.answers)) {
              let profileSummary = "";
              data.answers.forEach(a => {
                const q = questions.find(q => q.question.trim().toLowerCase() === a.question?.trim().toLowerCase());
                 if (q && q.optionDetails && a.answer && q.optionDetails[a.answer]) {
                   profileSummary += `- ${q.optionDetails[a.answer]}\n`;
                 }
              });
              const formattedProfile = `<user_preference>\nThese are the user's preferences and traits:\n${profileSummary.trim()}\n</user_preference>`;
              setUserProfile(formattedProfile);
            } else {
                 setUserProfile("<user_preference>\nNo preferences available.\n</user_preference>");
            }
          } else {
               setUserProfile("<user_preference>\nNo preferences available.\n</user_preference>");
          }
      } catch(error) {
           console.error("Error fetching user profile:", error);
           setUserProfile("<user_preference>\nError fetching preferences.\n</user_preference>");
      }
    }
    fetchUserProfile();
  }, []); // Runs once on mount


  // Initialize Model (Ensure bundledSummaries and userProfile are available)
  const model = useMemo(() => {
    // Only initialize if dependencies are ready. Check for non-empty strings.
    if (!bundledSummaries || !userProfile) {
        console.log("Model dependencies not ready yet.");
        return null;
    }

    const systemInstructionText = `${prompts.system}\n\n${bundledSummaries}\n\n${prompts.userProfileLabel}\n${userProfile}`;
    console.log("Initializing model with System Instruction:", systemInstructionText);

    try {
        return getGenerativeModel(vertexAI, {
          model: "gemini-2.0-flash",
          systemInstruction: {
            parts: [{ text: systemInstructionText }]
          },
        });
    } catch (error) {
        console.error("Error initializing Generative Model:", error);
        return null; // Return null on error
    }
  }, [bundledSummaries, userProfile, vertexAI, prompts.system, prompts.userProfileLabel]);


  // Load chat history (Depends on model being initialized)
  useEffect(() => {
    // Ensure model is initialized and activeConversationId is set
    if (!model || !activeConversationId || !conversationDocRef) {
       console.log("Skipping chat load: Model or conversation ID not ready.");
       setMessages([]); // Clear messages if no active conversation or model not ready
       setLastSavedTime(null);
       setLastMessageCountAtSave(null);
       return;
    }

    const loadChat = async () => {
      console.log("Loading chat for:", activeConversationId);
      setConversationLoading(true);
      setMessages([]); // Clear previous messages
      try {
        const conversationDoc = await getDoc(conversationDocRef);
        let initialHistory = [];
        if (conversationDoc.exists()) {
          const data = conversationDoc.data();
          initialHistory = data.messages || [];
          setMessages(initialHistory);
          const summarizedAt = data.summarizedAt;
          if (summarizedAt instanceof Timestamp) {
            setLastSavedTime(summarizedAt.toDate());
            setLastMessageCountAtSave(initialHistory.length);
          } else {
            setLastSavedTime(null);
            setLastMessageCountAtSave(null);
          }
        } else {
          console.log("Creating new conversation document:", activeConversationId);
          await setDoc(conversationDocRef, { messages: [], title: "New Conversation", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          setMessages([]);
          setLastSavedTime(null);
          setLastMessageCountAtSave(null);
        }

        // Initialize chat session
        const formattedHistory = initialHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        }));

        console.log("Starting chat session with history:", formattedHistory);
        chatSession.current = model.startChat({
           history: formattedHistory,
           generationConfig: { maxOutputTokens: 1000 },
        });
        console.log("Chat session started.");

      } catch (error) {
         console.error("Error loading chat:", error);
      } finally {
         setConversationLoading(false);
      }
    };

    loadChat();
    // Cleanup function if needed when conversation changes
    // return () => { chatSession.current = null; console.log("Chat session cleared"); };

  }, [activeConversationId, conversationDocRef, model]); // Dependencies: conversation ID and the model itself


  // Save chat function
  const saveChat = async (newMessages) => {
    if (!conversationDocRef) return;
    try {
        const messagesToSave = newMessages.map(({ temp, ...rest }) => rest); // Remove temp flag before saving
        await updateDoc(conversationDocRef, { messages: messagesToSave, updatedAt: serverTimestamp() });
    } catch (error) {
        console.error("Error saving chat:", error);
    }
  };

  // Helper to get summaries (used in useEffect above)
  const getAllSummaries = async () => {
    const user = auth.currentUser;
    if (!user) return '';
    const convRef = collection(firestore, 'users', user.uid, 'conversations');
    const q = query(convRef);
    try {
        const snapshot = await getDocs(q);
        const summaries = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.summary) summaries.push(data.summary);
        });
        if (summaries.length > 0) {
            return prompts.disclaimer.replace('</disclaimer>', `\n${summaries.join('\n---\n')}\n</disclaimer>`);
        }
        return prompts.disclaimer;
    } catch (error) {
         console.error("Error fetching summaries:", error);
         return prompts.disclaimer;
    }
  };

  // Use Chat Handlers Hook (pass necessary state and setters)
  const { handleSubmit, handleVoiceButton, handleEndConversation, handleSummarizeHeader, handleEndConversationProfile } = useChatHandlers({
    messages, setMessages, input, setInput, activeConversationId, setActiveConversationId,
    chatSession, model, setLoading, prompts, navigate, isRecording, setIsRecording,
    setRecordingTime, bundledSummaries, userProfile // Removed saveChat prop
  });

  // Handler for the summarize button in the header
  const handleSummarizeAndUpdate = async () => {
    await handleSummarizeHeader();
    setLastSavedTime(new Date());
    setLastMessageCountAtSave(messages.length);
  };

  // Calculate sidebar and main content margin
  const sidebarWidth = isSidebarCollapsed ? 0 : SIDEBAR_WIDTH;
  const mainContentMarginLeft = isSidebarCollapsed ? 0 : SIDEBAR_WIDTH;

  // --- JSX Rendering ---
  return (
    <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Header
        mode="chat"
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSummarize={handleSummarizeAndUpdate}
        darkMode={darkMode}
        lastSavedTime={lastSavedTime}
        hasNewMessages={lastSavedTime ? (messages.length > (lastMessageCountAtSave ?? 0)) : messages.length > 0}
        hasMessages={messages.length > 0}
        sx={{
           position: 'fixed',
           top: 0,
           width: `calc(100% - ${sidebarWidth})`,
           left: sidebarWidth,
           zIndex: (theme) => theme.zIndex.drawer + 1,
           transition: theme.transitions.create(['width', 'left'], { // Smooth transition for header too
             easing: theme.transitions.easing.sharp,
             duration: theme.transitions.duration.leavingScreen,
           }),
         }}
      />

      <Sidebar
        activeConversationId={activeConversationId}
        setActiveConversationId={setActiveConversationId}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        darkMode={darkMode}
      />

      {/* Main Chat Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          marginLeft: mainContentMarginLeft,
          transition: theme.transitions.create('margin', {
             easing: theme.transitions.easing.sharp,
             duration: theme.transitions.duration.leavingScreen,
          }),
          paddingTop: HEADER_HEIGHT,
          // Adjust paddingBottom dynamically based on whether footer is shown? No, Footer is fixed below.
          // We need space for the fixed Input Area + Footer
          paddingBottom: `calc(${INPUT_AREA_MIN_HEIGHT} + ${FOOTER_HEIGHT} + 16px)`, // Add some buffer (16px
        }}
      >
         {/* Message Display Area */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          {conversationLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : messages.length === 0 && !loading ? (
             <Typography variant="body1" color="text.secondary" align="center" sx={{mt: 4}}>
                {!activeConversationId ? "Select a conversation or start a new one." : "Start the conversation by typing a message below."}
             </Typography>
          ) : (
            <Stack spacing={2}>
              {messages.map((msg, index) => (
                <Stack
                  key={index} // Consider more stable keys if messages can be inserted/deleted mid-list
                  direction="row"
                  spacing={1}
                  alignItems="flex-start"
                  justifyContent={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                >
                  {msg.role === 'bot' && <Avatar sx={{ bgcolor: theme.palette.secondary.main, width: 32, height: 32 }}><SmartToyIcon fontSize="small" /></Avatar>}
                  <Paper
                    elevation={1}
                    sx={{
                      p: 1.5,
                      borderRadius: msg.role === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                      color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                      maxWidth: '75%',
                      wordWrap: 'break-word',
                      opacity: msg.temp ? 0.7 : 1,
                    }}
                  >
                     {/* Render potentially multiline text correctly */}
                     <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                       {msg.text || (msg.role === 'bot' && "...")}
                     </Typography>
                  </Paper>
                  {msg.role === 'user' && <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 32, height: 32 }}><PersonIcon fontSize="small" /></Avatar>}
                </Stack>
              ))}
              <div ref={messagesEndRef} /> {/* Scroll target */}
            </Stack>
          )}
           {/* Loading indicator during message send */}
           {loading && !conversationLoading && (
               <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}><CircularProgress size={24} /></Box>
           )}
        </Box>
      </Box>

      {/* Input Area fixed at bottom (above footer) */}
       <Paper
         elevation={3}
         sx={{
           position: 'fixed',
           bottom: FOOTER_HEIGHT,
           left: mainContentMarginLeft,
           right: 0,
           p: 1, // Reduced padding slightly
           zIndex: (theme) => theme.zIndex.drawer + 1,
           transition: theme.transitions.create('left', {
             easing: theme.transitions.easing.sharp,
             duration: theme.transitions.duration.leavingScreen,
           }),
           // Heights managed by TextField's multiline/maxRows
           bgcolor: 'background.paper',
           display: 'flex', // Use flex to align items
           alignItems: 'flex-start', // Align items to the top for multiline
         }}
       >
         {/* Disable form/input if no active conversation */}
         <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
           <TextField
             multiline
             fullWidth
             variant="outlined"
             placeholder={"Type your message..."} // Always allow typing
             value={loading ? "Thinking..." : (isRecording ? `Recording: ${recordingTime}s...` : input)}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={(e) => {
               if (e.key === 'Enter' && !e.shiftKey) {
                 e.preventDefault();
                 // Allow submit even if no activeConversationId (handleSubmit handles creation)
                 if (!loading && !isRecording) handleSubmit(e);
               }
             }}
             disabled={loading || isRecording || conversationLoading} // Remove !activeConversationId check
             size="small"
             maxRows={5} // Controls max height
              InputProps={{
                 sx: { borderRadius: '20px', py: 1 } // Adjust padding
             }}
             sx={{ mr: 1 }} // Margin between textfield and buttons
           />
           <Stack direction="row" spacing={0.5}> {/* Reduced spacing */}
             <IconButton
               onClick={handleVoiceButton}
               disabled={loading || conversationLoading} // Remove !activeConversationId check
               color={isRecording ? "error" : "primary"}
               size="small" // Smaller buttons
             >
               {isRecording ? <StopIcon /> : <MicIcon />}
             </IconButton>
             <IconButton
               type="submit"
               disabled={loading || isRecording || !input.trim() || conversationLoading} // Remove !activeConversationId check
               color="primary"
               size="small" // Smaller buttons
             >
               <SendIcon />
             </IconButton>
           </Stack>
         </form>
       </Paper>

      {/* Footer fixed at the very bottom */}
      <Footer
        sx={{
            position: 'fixed',
            bottom: 0,
            width: `calc(100% - ${mainContentMarginLeft})`,
            left: mainContentMarginLeft,
            zIndex: (theme) => theme.zIndex.drawer + 2,
            transition: theme.transitions.create(['width', 'left'], {
                 easing: theme.transitions.easing.sharp,
                 duration: theme.transitions.duration.leavingScreen,
            }),
        }}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        conversationActive={!!activeConversationId}
        endConversation={handleEndConversationProfile}
      />
    </Box>
  );
}

export default Chat;