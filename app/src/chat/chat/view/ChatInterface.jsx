import React, { useRef, useEffect } from 'react';
import { Box, TextField, IconButton, Paper, Stack, Typography, CircularProgress, useTheme } from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import { FOOTER_HEIGHT } from '../../../nav/footer.jsx';
import { HEADER_HEIGHT } from '../../../nav/header.jsx';

// Constants
const INPUT_AREA_MIN_HEIGHT = '70px';

function ChatInterface({
    messages,
    input,
    setInput,
    handleSubmit,
    handleVoiceButton,
    loading, // AI response loading
    conversationLoading, // History loading
    isRecording,
    recordingTime,
    transcribing,
    activeConversationId,
    chatSessionReady, // Boolean indicating if chatSession.current is initialized
    isTemporaryChat // Boolean indicating if the current mode is temporary
}) {
    const theme = useTheme();
    const messagesEndRef = useRef(null);

    // Effect to scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Determine input placeholder text based on state
    const getPlaceholderText = () => {
        if (loading) return "Thinking...";
        if (isRecording) return `Recording: ${recordingTime}s...`;
        if (transcribing) return "Transcribing audio...";
        if (!chatSessionReady && activeConversationId) return "Initializing chat..."; // Indicate session loading for existing convo
        if (!activeConversationId && !isTemporaryChat) return "Start a new conversation..."; // New regular chat state
        if (!activeConversationId && isTemporaryChat) return "Start a temporary chat..."; // New temporary chat state
        // If activeConversationId exists, but chatSession isn't ready yet (less common)
        if (activeConversationId && !chatSessionReady) return "Initializing chat...";
        // Default for active, ready conversation
        return "Type your message or use the mic...";
    };

    // Input should only be disabled during active operations, not just because no chat is selected or ready.
    // The model readiness check happens in handleSubmit.
    const isInputDisabled = loading || isRecording || transcribing || conversationLoading;
    const isSendDisabled = isInputDisabled || !input.trim();
    // Mic should only be disabled if an action prevents starting it (loading, transcribing). Recording state is handled by the button itself (Stop vs Mic icon).
    const isMicDisabled = loading || conversationLoading || transcribing;


    return (
        <>
            {/* Main Chat Area */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    overflow: 'hidden', // Hide potential overflow, child Box handles scrolling
                    display: 'flex',
                    flexDirection: 'column',
                    paddingTop: `${HEADER_HEIGHT}px`,
                    paddingBottom: `calc(${INPUT_AREA_MIN_HEIGHT} + ${FOOTER_HEIGHT}px + 16px)`, // Buffer space
                }}
            >
                {/* Message Display Area (Scrollable) */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, maxWidth: '1000px', width: '100%', mx: 'auto' }}>
                    {conversationLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <CircularProgress />
                        </Box>
                    ) : messages.length === 0 && !loading ? (
                        <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 4 }}>
                            {!activeConversationId && !isTemporaryChat ? "Start typing to begin a new conversation." :
                             !activeConversationId && isTemporaryChat ? "Start typing to begin a temporary chat. Messages won't be saved." :
                             activeConversationId ? "Start the conversation by typing a message below." : // Should have active ID if messages loaded
                             "Select a conversation or start a new one." // Fallback
                            }
                        </Typography>
                    ) : (
                        <Stack spacing={2}>
                            {messages.map((msg, index) => (
                                <Stack
                                    key={index}
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
                                            bgcolor: msg.role === 'user'
                                                ? (theme.palette.mode === 'light' ? '#8ac0e8' : theme.palette.primary.main)
                                                : 'background.paper',
                                            color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                                            maxWidth: '85%',
                                            wordWrap: 'break-word',
                                            opacity: msg.temp ? 0.7 : 1,
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                            {msg.text || (msg.role !== 'user' && msg.temp ? "Thinking..." : "")}
                                        </Typography>
                                    </Paper>
                                </Stack>
                            ))}
                            {/* Loading indicator during AI response generation (if not using temp message) */}
                            {/* {loading && !conversationLoading && messages[messages.length - 1]?.role === 'user' && (
                                <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent='flex-start'>
                                    <Paper elevation={1} sx={{ p: 1.5, borderRadius: '20px 20px 20px 5px', bgcolor: 'background.paper', color: 'text.primary', maxWidth: '85%' }}>
                                        <CircularProgress size={18} sx={{ verticalAlign: 'middle' }} />
                                    </Paper>
                                </Stack>
                            )} */}
                            <div ref={messagesEndRef} /> {/* Scroll target */}
                        </Stack>
                    )}
                </Box>
            </Box>

            {/* Input Area fixed at bottom (above footer) */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: `${FOOTER_HEIGHT}px`,
                    left: 0,
                    right: 0,
                    p: 1,
                    zIndex: (theme) => theme.zIndex.appBar + 1,
                    bgcolor: 'background.paper',
                    display: 'flex',
                    alignItems: 'flex-start',
                }}
            >
                {/* Inner Box to constrain and center the form */}
                <Box sx={{ maxWidth: '1000px', width: '100%', mx: 'auto', display: 'flex' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <TextField
                            multiline
                            fullWidth
                            variant="outlined"
                            placeholder={getPlaceholderText()}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (!isSendDisabled) handleSubmit(e);
                                }
                            }}
                            disabled={isInputDisabled}
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
                                disabled={isMicDisabled}
                                color={isRecording ? "error" : "primary"}
                                size="small"
                            >
                                {transcribing ? <CircularProgress size={24} color="inherit" /> : (isRecording ? <StopIcon /> : <MicIcon />)}
                            </IconButton>
                            <IconButton
                                type="submit"
                                disabled={isSendDisabled}
                                color="primary"
                                size="small"
                            >
                                <SendIcon />
                            </IconButton>
                        </Stack>
                    </form>
                </Box>
            </Box>
        </>
    );
}

export default ChatInterface;