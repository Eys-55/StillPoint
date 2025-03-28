import React, { useState, useEffect, useRef, useMemo } from 'react';
import { app, auth, firestore } from '../firebase.jsx';
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import prompts from '../meta/prompts.js';
import { doc, getDoc, setDoc, updateDoc, collection, query, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import Footer, { FOOTER_HEIGHT } from '../nav/footer.jsx'; // Import FOOTER_HEIGHT
import Header, { HEADER_HEIGHT } from '../nav/header.jsx'; // Import HEADER_HEIGHT
import Sidebar from './sidebar.jsx';
import { useNavigate } from 'react-router-dom';
import StopIcon from '@mui/icons-material/Stop'; // Changed from CheckIcon
import SendIcon from '@mui/icons-material/Send';
import { Box, TextField, IconButton, Paper, Stack, Typography, CircularProgress, useTheme, Fade } from '@mui/material'; // Import Fade
import { alpha } from '@mui/material/styles'; // Import alpha for transparency
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop'; // Changed from CheckIcon
import SendIcon from '@mui/icons-material/Send';

// Constants for layout
// HEADER_HEIGHT is now imported from Header.jsx
// FOOTER_HEIGHT is now imported from Footer.jsx
const INPUT_AREA_MIN_HEIGHT = '70px';
// const INPUT_AREA_MAX_HEIGHT = '200px'; // Max height is controlled by TextField maxRows

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
  const [isSummarizing, setIsSummarizing] = useState(false); // State for summarization loading
  const chatSession = useRef(null);
  const messagesEndRef = useRef(null); // Ref to scroll to bottom
  const navigate = useNavigate();
  const vertexAI = getVertexAI(app);
  const theme = useTheme();

  const conversationDocRef = useMemo(() => activeConversationId && auth.currentUser?.uid
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
      if (!user) {
         setUserProfile("<user_preference>\nUser not logged in.\n</user_preference>");
         return;
      }
      const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
      try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.answers && Array.isArray(data.answers)) {
              let profileSummary = "";
              data.answers.forEach(a => {
                // Ensure question exists and matches before trying to access details
                const q = questions.find(q => q.question?.trim().toLowerCase() === a.question?.trim().toLowerCase());
                 if (q && q.optionDetails && a.answer && q.optionDetails[a.answer]) {
                   profileSummary += `- ${q.optionDetails[a.answer]}\n`;
                 } else if (a.question && a.answer) {
                    // Fallback: include question and answer directly if details missing
                    profileSummary += `- ${a.question}: ${a.answer}\n`;
                 }
              });
              const formattedProfile = `<user_preference>\nThese are the user's preferences and traits:\n${profileSummary.trim()}\n</user_preference>`;
              setUserProfile(formattedProfile || "<user_preference>\nNo specific preferences recorded.\n</user_preference>");
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
    console.log("Initializing model with System Instruction."); // Simplified log

    try {
        return getGenerativeModel(vertexAI, {
          model: "gemini-1.5-flash", // Corrected model name
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
       // console.log("Skipping chat load: Model or conversation ID not ready.");
       setMessages([]); // Clear messages if no active conversation or model not ready
       setLastSavedTime(null);
       setLastMessageCountAtSave(null);
       return;
    }

    const loadChat = async () => {
      // console.log("Loading chat for:", activeConversationId);
      setConversationLoading(true);
      setMessages([]); // Clear previous messages before loading new ones
      try {
        const conversationDoc = await getDoc(conversationDocRef);
        let initialHistory = [];
        if (conversationDoc.exists()) {
          const data = conversationDoc.data();
          initialHistory = data.messages || [];
          setMessages(initialHistory); // Set the fetched messages
          const summarizedAt = data.summarizedAt; // Use summarizedAt field
          // Update last saved time based on 'summarizedAt'
          if (summarizedAt instanceof Timestamp) {
            setLastSavedTime(summarizedAt.toDate());
            setLastMessageCountAtSave(initialHistory.length); // Set count at the time of last summary
          } else {
            // If no summary timestamp, maybe use updatedAt? Or null?
             setLastSavedTime(data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null);
             setLastMessageCountAtSave(initialHistory.length); // Count at last update
             // setLastSavedTime(null); setLastMessageCountAtSave(null); // Or treat as never summarized
          }
        } else {
          // If conversation doesn't exist, create it (this might happen if ID is new)
           console.log("Creating new conversation document:", activeConversationId);
           await setDoc(conversationDocRef, { messages: [], title: "New Conversation", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
           setMessages([]);
           setLastSavedTime(null);
           setLastMessageCountAtSave(null);
           initialHistory = []; // Ensure history is empty for chat session start
        }

        // --- Validate and Filter History ---
        const validatedHistory = [];
        if (initialHistory.length > 0) {
          // Always add the first message
          validatedHistory.push(initialHistory[0]);

          // Iterate from the second message
          for (let i = 1; i < initialHistory.length; i++) {
            const currentMsg = initialHistory[i];
            const lastAddedMsg = validatedHistory[validatedHistory.length - 1];

            // Only add the current message if its role is different from the last added message's role
            // Or if the last message was 'model' (bot), allowing another 'model' (though unlikely) or 'user'
            if (currentMsg.role !== lastAddedMsg.role || lastAddedMsg.role === 'bot') {
               validatedHistory.push(currentMsg);
            } else {
               // Found consecutive 'user' roles. Log it and skip the current message.
               console.warn(`Skipping consecutive message with role '${currentMsg.role}' at index ${i} for conversation ${activeConversationId}`);
               // Optionally, merge consecutive user messages? For now, just skip.
               // lastAddedMsg.text += `\n\n${currentMsg.text}`; // Example merge (use with caution)
            }
          }
        }
        // --- End Validation ---

        // Initialize chat session with the validated and formatted history
        const formattedHistory = validatedHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model', // Map 'bot' to 'model'
          parts: [{ text: msg.text }],
        }));

        console.log("Starting chat session with validated history:", formattedHistory);
        chatSession.current = model.startChat({
           history: formattedHistory,
           generationConfig: { maxOutputTokens: 1000 },
        });
        // console.log("Chat session started.");

      } catch (error) {
         console.error("Error loading chat:", error);
         // Consider setting an error state to show the user
      } finally {
         setConversationLoading(false);
      }
    };

    loadChat();
    // Cleanup function if needed when conversation changes (e.g., clear interval timers)
    // return () => { chatSession.current = null; console.log("Chat session cleared"); };

  }, [activeConversationId, conversationDocRef, model]); // Dependencies: conversation ID and the model itself


  // Helper to get summaries (used in useEffect above)
  const getAllSummaries = async () => {
    const user = auth.currentUser;
    if (!user) return '';
    const convRef = collection(firestore, 'users', user.uid, 'conversations');
    const q = query(convRef); // Maybe add orderBy('updatedAt', 'desc').limit(5) ?
    try {
        const snapshot = await getDocs(q);
        const summaries = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          // Only include summaries that exist and are non-empty
          if (data.summary && data.summary.trim() !== '') {
             summaries.push(data.summary);
          }
        });
        // Format summaries for the prompt context
        if (summaries.length > 0) {
             return prompts.disclaimer.replace('</disclaimer>', `\n${summaries.join('\n---\n')}\n</disclaimer>`);
        }
        return prompts.disclaimer; // Return default disclaimer if no summaries found
    } catch (error) {
         console.error("Error fetching summaries:", error);
         return prompts.disclaimer; // Return default disclaimer on error
    }
  };

  // Use Chat Handlers Hook
  const { handleSubmit, handleVoiceButton, handleEndConversation, handleSummarizeHeader, handleEndConversationProfile } = useChatHandlers({
    messages, setMessages, input, setInput, activeConversationId, setActiveConversationId,
    chatSession, model, setLoading, // Keep setLoading for message sending
    setIsSummarizing, // Pass the new setter
    prompts, navigate, isRecording, setIsRecording,
    setRecordingTime, bundledSummaries, userProfile, conversationDocRef // Pass conversationDocRef
  });

  // Handler for the summarize button in the header
  const handleSummarizeAndUpdate = async () => {
    const success = await handleSummarizeHeader();
    if (success) { // Only update time if summarization was successful
       const now = new Date();
       setLastSavedTime(now); // Update local state immediately
       setLastMessageCountAtSave(messages.length);
       // Also update Firestore 'summarizedAt' timestamp
       if (conversationDocRef) {
           await updateDoc(conversationDocRef, { summarizedAt: Timestamp.fromDate(now) });
       }
    }
  };

  // --- JSX Rendering ---
  return (
    <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Header is fixed, takes space via paddingTop on main */}
      <Header
        mode="chat"
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSummarize={handleSummarizeAndUpdate}
        darkMode={darkMode}
        lastSavedTime={lastSavedTime}
        hasNewMessages={lastSavedTime ? (messages.length > (lastMessageCountAtSave ?? 0)) : messages.length > 0}
        hasMessages={messages.length > 0}
        // sx prop removed - Header component handles its fixed positioning
      />

      {/* Sidebar uses temporary variant, overlays content */}
      <Sidebar
        activeConversationId={activeConversationId}
        setActiveConversationId={setActiveConversationId}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        darkMode={darkMode}
      />

      {/* Main Chat Area Container (Relative positioning context for overlay) */}
      <Box sx={{ flexGrow: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Main Chat Area */}
          <Box
            component="main"
            sx={{
          flexGrow: 1,
          overflow: 'hidden', // Hide potential overflow, child Box handles scrolling
          display: 'flex',
          flexDirection: 'column',
          // --- Padding to prevent overlap with fixed Header, Input Area, and Footer ---
          paddingTop: `${HEADER_HEIGHT}px`,
          // Padding bottom accounts for Input Area (min height) + Footer height + buffer
          paddingBottom: `calc(${INPUT_AREA_MIN_HEIGHT} + ${FOOTER_HEIGHT}px + 16px)`,
        }}
      >
         {/* Message Display Area (Scrollable) */}
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
                  key={index} // Using index is okay if list doesn't reorder/insert mid-list often
                  direction="row"
                  spacing={1}
                  alignItems="flex-start"
                  justifyContent={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      p: 1.5,
                      borderRadius: msg.role === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                      color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                      maxWidth: '85%',
                      wordWrap: 'break-word',
                      opacity: msg.temp ? 0.7 : 1, // Indicate temporary messages
                    }}
                  >
                     <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}> {/* Use sx instead of style */}
                       {/* Display text or placeholder */}
                       {msg.text || (msg.role !== 'user' ? "Thinking..." : "")}
                     </Typography>
                  </Paper>
                </Stack>
              ))}
              {/* Loading indicator during message send */}
              {loading && !conversationLoading && (
                  <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent='flex-start'>
                       <Paper elevation={1} sx={{ p: 1.5, borderRadius: '20px 20px 20px 5px', bgcolor: 'background.paper', color: 'text.primary', maxWidth: '85%' }}>
                           <CircularProgress size={18} sx={{ verticalAlign: 'middle' }}/>
                       </Paper>
                  </Stack>
              )}
              <div ref={messagesEndRef} /> {/* Scroll target */}
            </Stack>
          )}
        </Box>
      </Box>

      {/* Input Area fixed at bottom (above footer) */}
       <Paper
         elevation={3}
         sx={{
           position: 'fixed',
           bottom: `${FOOTER_HEIGHT}px`, // Position above Footer
           left: 0,
           right: 0, // Spans full width
           p: 1,
           zIndex: (theme) => theme.zIndex.appBar + 1, // Ensure above content, below potential modals
           bgcolor: 'background.paper',
           display: 'flex',
           alignItems: 'flex-start',
         }}
       >
         <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
           <TextField
             multiline
             fullWidth
             variant="outlined"
             placeholder={"Type your message..."}
             value={loading ? "Thinking..." : (isRecording ? `Recording: ${recordingTime}s...` : input)}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={(e) => {
               if (e.key === 'Enter' && !e.shiftKey) {
                 e.preventDefault();
                 if (!loading && !isRecording && input.trim()) handleSubmit(e); // Check input trim
               }
             }}
             disabled={loading || isRecording || conversationLoading || !chatSession.current} // Add !chatSession.current check
             size="small"
             maxRows={5}
             InputProps={{
                 sx: { borderRadius: '20px', py: 1 }
             }}
             sx={{ mr: 1 }}
           />
           <Stack direction="row" spacing={0.5}>
             <IconButton
               onClick={handleVoiceButton}
               disabled={loading || conversationLoading}
               color={isRecording ? "error" : "primary"}
               size="small"
             >
               {isRecording ? <StopIcon /> : <MicIcon />}
             </IconButton>
             <IconButton
               type="submit"
               disabled={loading || isRecording || !input.trim() || conversationLoading || !chatSession.current} // Add !chatSession.current check
               color="primary"
               size="small"
             >
               <SendIcon />
             </IconButton>
           </Stack>
         </form>
       </Paper>
      {/* </Box> */} {/* Removed the closing tag from previous change */}

      {/* Summarization Loading Overlay */}
      <Fade in={isSummarizing} timeout={300}>
        <Box
          sx={{
            position: 'absolute',
            top: `${HEADER_HEIGHT}px`, // Start below header
            left: 0,
            right: 0,
            bottom: `${FOOTER_HEIGHT}px`, // End above footer
            bgcolor: alpha(theme.palette.background.default, 0.85), // Semi-transparent background
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10, // Ensure it's above chat content
          }}
        >
          <CircularProgress />
          <Typography sx={{ mt: 2 }} color="text.secondary">
            Summarizing...
          </Typography>
        </Box>
      </Fade>
     </Box> {/* Close the relative container Box */}


      {/* Footer fixed at the very bottom */}
      {/* sx prop removed - Footer component handles its fixed positioning */}
      <Footer
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        // conversationActive and endConversation props removed
      />
    </Box>
  );
}

export default Chat;