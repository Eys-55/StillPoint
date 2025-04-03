import React, { useEffect } from 'react';
import { auth, firestore } from '../../../firebase.jsx'; // Keep auth for checking user
import { Timestamp, updateDoc } from 'firebase/firestore';
import Footer, { FOOTER_HEIGHT } from '../../../nav/footer.jsx';
import Header, { HEADER_HEIGHT } from '../../../nav/header.jsx';
import Sidebar from '../../sidebar.jsx';
import ChatInterface from './ChatInterface.jsx';
import { useChatState } from '../hooks/useChatState.js';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder.js';
import { Box, CircularProgress, Typography, Fade, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

function Chat({ darkMode, setDarkMode, activeConversationId, setActiveConversationId, isSidebarCollapsed, setIsSidebarCollapsed }) {
    const theme = useTheme();

    // --- Hooks ---
    const {
        messages,
        input,
        setInput,
        loading, // AI response loading
        conversationLoading, // History loading
        isSummarizing,
        lastSavedTime,
        lastMessageCountAtSave,
        chatSession, // Ref to the chat session
        model, // Ref to the AI model
        handleSubmit,
        handleSummarizeHeader,
        // handleEndConversationProfile, // Not directly used here, triggered by Header/Sidebar? Let's keep it simple for now.
        conversationDocRef, // Needed for updating summarizedAt
        updateLastSavedTime // Function to update save time state
    } = useChatState(activeConversationId, setActiveConversationId);

    const {
        isRecording,
        recordingTime,
        transcribing,
        handleVoiceButton,
        // stopRecording // Could be used if needed, e.g. on navigate away
    } = useVoiceRecorder(setInput); // Pass setInput to the voice recorder hook

    // --- Derived State ---
    const chatSessionReady = !!chatSession.current && !!model; // Check if both model and session are initialized
    const hasNewMessages = lastSavedTime ? (messages.length > (lastMessageCountAtSave ?? 0)) : messages.length > 0;

    // --- Handlers ---
    // Handler for the summarize button in the header, updates Firestore timestamp
    const handleSummarizeAndUpdate = async () => {
        // handleSummarizeHeader is now part of useChatState and updates Firestore internally
        const summaryData = await handleSummarizeHeader();
        // No need to manually update state here as useChatState handles it in handleEndConversation
        // if (summaryData && conversationDocRef) {
        //     const now = new Date();
        //     updateLastSavedTime(now, messages.length); // Update local state via helper
        //     try {
        //         await updateDoc(conversationDocRef, { summarizedAt: Timestamp.fromDate(now) });
        //     } catch (error) {
        //         console.error("Error updating summarizedAt timestamp:", error);
        //     }
        // }
    };

    // --- Render ---
    return (
        <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column', bgcolor: 'background.default' }}>
            <Header
                mode="chat"
                onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                onSummarize={handleSummarizeAndUpdate} // Use the combined handler
                darkMode={darkMode}
                lastSavedTime={lastSavedTime}
                hasNewMessages={hasNewMessages}
                hasMessages={messages.length > 0}
                isSummarizing={isSummarizing} // Pass summarizing state to header if needed
            />

            <Sidebar
                activeConversationId={activeConversationId}
                setActiveConversationId={setActiveConversationId}
                isSidebarCollapsed={isSidebarCollapsed}
                setIsSidebarCollapsed={setIsSidebarCollapsed}
                darkMode={darkMode}
            />

            {/* Main Content Area */}
            <Box sx={{ flexGrow: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <ChatInterface
                    messages={messages}
                    input={input}
                    setInput={setInput}
                    handleSubmit={handleSubmit}
                    handleVoiceButton={handleVoiceButton}
                    loading={loading}
                    conversationLoading={conversationLoading}
                    isRecording={isRecording}
                    recordingTime={recordingTime}
                    transcribing={transcribing}
                    activeConversationId={activeConversationId}
                    chatSessionReady={chatSessionReady} // Pass readiness state
                />

                {/* Summarization Loading Overlay */}
                <Fade in={isSummarizing} timeout={300}>
                    <Box
                        sx={{
                            position: 'absolute',
                            top: `${HEADER_HEIGHT}px`,
                            left: 0,
                            right: 0,
                            bottom: `${FOOTER_HEIGHT}px`,
                            bgcolor: alpha(theme.palette.background.default, 0.85),
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                        }}
                    >
                        <CircularProgress />
                        <Typography sx={{ mt: 2 }} color="text.secondary">
                            Summarizing...
                        </Typography>
                    </Box>
                </Fade>
            </Box>

            <Footer
                darkMode={darkMode}
                setDarkMode={setDarkMode}
            />
        </Box>
    );
}

export default Chat;