import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { app, auth, firestore } from '../../../firebase.jsx';
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import prompts from '../../../meta/prompts.js'; // Changed import to handle default export correctly
import { questions } from '../../../meta/questions.js';
import { doc, getDoc, setDoc, updateDoc, collection, query, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

// --- Firestore Helper Functions ---
const saveMessagesToFirestore = async (convId, messagesToSave) => {
    if (!convId || !auth.currentUser) return;
    const conversationDocRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', convId);
    try {
        const cleanMsgs = messagesToSave.map(({ temp, ...rest }) => rest); // Remove temp flag
        await updateDoc(conversationDocRef, { messages: cleanMsgs, updatedAt: serverTimestamp() });
        console.log("Messages saved to Firestore for:", convId);
    } catch (error) {
        console.error("Error saving chat:", error);
    }
};

const fetchUserProfileData = async () => {
    const user = auth.currentUser;
    if (!user) return "<user_preference>\nUser not logged in.\n</user_preference>";

    const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.answers && Array.isArray(data.answers)) {
                let profileSummary = "";
                data.answers.forEach(a => {
                    const q = questions.find(q => q.question?.trim().toLowerCase() === a.question?.trim().toLowerCase());
                    if (q && q.optionDetails && a.answer && q.optionDetails[a.answer]) {
                        profileSummary += `- ${q.optionDetails[a.answer]}\n`;
                    } else if (a.question && a.answer) {
                        profileSummary += `- ${a.question}: ${a.answer}\n`;
                    }
                });
                return `<user_preference>\nThese are the user's preferences and traits:\n${profileSummary.trim()}\n</user_preference>` || "<user_preference>\nNo specific preferences recorded.\n</user_preference>";
            }
        }
        return "<user_preference>\nNo preferences available.\n</user_preference>";
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return "<user_preference>\nError fetching preferences.\n</user_preference>";
    }
};

const fetchAllSummaries = async () => {
    const user = auth.currentUser;
    if (!user) return '';
    const convRef = collection(firestore, 'users', user.uid, 'conversations');
    const q = query(convRef); // Consider adding orderBy and limit
    try {
        const snapshot = await getDocs(q);
        const summaries = snapshot.docs
            .map(docSnap => docSnap.data().summary)
            .filter(summary => summary && summary.trim() !== ''); // Filter out empty/null summaries

        if (summaries.length > 0) {
            return `${prompts.disclaimer}\n\n${prompts.previousSummariesLabel}\n${summaries.join('\n---\n')}`;
        }
        return prompts.disclaimer;
    } catch (error) {
        console.error("Error fetching summaries:", error);
        return prompts.disclaimer;
    }
};
// --- End Firestore Helpers ---


export const useChatState = (activeConversationId, setActiveConversationId) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false); // AI response loading
    const [conversationLoading, setConversationLoading] = useState(false); // History loading
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [lastSavedTime, setLastSavedTime] = useState(null);
    const [lastMessageCountAtSave, setLastMessageCountAtSave] = useState(null);
    const [bundledSummaries, setBundledSummaries] = useState('');
    const [userProfile, setUserProfile] = useState('');
    const [isTemporaryChat, setIsTemporaryChat] = useState(false); // State for temporary chat mode

    const chatSession = useRef(null);
    const vertexAI = useMemo(() => getVertexAI(app), []);
    const navigate = useNavigate();

    const conversationDocRef = useMemo(() => activeConversationId && auth.currentUser?.uid
        ? doc(firestore, 'users', auth.currentUser.uid, 'conversations', activeConversationId)
        : null, [activeConversationId]);

    // --- Effects for Data Fetching and Model Initialization ---

    // Fetch summaries and profile on mount
    useEffect(() => {
        fetchUserProfileData().then(setUserProfile);
        fetchAllSummaries().then(setBundledSummaries);
    }, []);

    // Initialize AI Model when dependencies are ready
    const model = useMemo(() => {
        if (!bundledSummaries || !userProfile) {
            return null;
        }
        const systemInstructionText = `${prompts.system}\n\n${bundledSummaries}\n\n${prompts.userProfileLabel}\n${userProfile}`;

        /*
        // --- !!! VERIFICATION LOG: COMPLETE SYSTEM INSTRUCTION !!! ---
        // This log shows the *entire* text passed to the AI model's systemInstruction parameter.
        // It includes the base system prompt, fetched summaries, and user profile data.
        console.log("======================================================");
        console.log("=== START: FULL SYSTEM INSTRUCTION FOR GEMINI MODEL ===");
        console.log("======================================================");
        console.log(systemInstructionText);
        console.log("======================================================");
        console.log("=== END: FULL SYSTEM INSTRUCTION FOR GEMINI MODEL ===");
        console.log("======================================================");
        // --- End VERIFICATION LOG ---
        */

        console.log("Initializing AI model (gemini-2.0-flash)..."); // Added model name for clarity
        try {
            return getGenerativeModel(vertexAI, {
                model: "gemini-2.0-flash-thinking-exp-01-21", // Restore model name parameter
                systemInstruction: { parts: [{ text: systemInstructionText }] }, // Restore system instruction parameter
            });
        } catch (error) {
            console.error("Error initializing Generative Model:", error);
            return null;
        }
    }, [bundledSummaries, userProfile, vertexAI]);

    // Load Chat History when model and conversation ID are ready
    useEffect(() => {
        if (!model || !activeConversationId || !conversationDocRef) {
            setMessages([]);
            setLastSavedTime(null);
            setLastMessageCountAtSave(null);
            chatSession.current = null; // Clear chat session if no active convo
            setIsTemporaryChat(false); // Reset temporary chat state when changing/clearing conversation
            return;
        }

        // Reset temporary state if switching TO a valid, existing conversation
        setIsTemporaryChat(false);

        const loadChat = async () => {
            console.log("Loading chat for:", activeConversationId);
            setConversationLoading(true);
            setMessages([]);
            chatSession.current = null; // Clear previous session

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
                        setLastSavedTime(data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null);
                        setLastMessageCountAtSave(initialHistory.length);
                    }
                } else {
                    console.log("Creating new conversation document:", activeConversationId);
                    await setDoc(conversationDocRef, { messages: [], title: "New Conversation", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
                    setMessages([]);
                    setLastSavedTime(null);
                    setLastMessageCountAtSave(null);
                }

                // Validate history (prevent consecutive roles) and format for AI
                const validatedHistory = [];
                if (initialHistory.length > 0) {
                    validatedHistory.push(initialHistory[0]);
                    for (let i = 1; i < initialHistory.length; i++) {
                        if (initialHistory[i].role !== validatedHistory[validatedHistory.length - 1].role || validatedHistory[validatedHistory.length - 1].role === 'bot') {
                            validatedHistory.push(initialHistory[i]);
                        } else {
                            console.warn(`Skipping consecutive message with role '${initialHistory[i].role}' at index ${i}`);
                        }
                    }
                }

                // Filter out messages with empty/null text BEFORE formatting
                const validHistory = validatedHistory.filter(msg => msg.text && msg.text.trim() !== '');

                const formattedHistory = validHistory.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model', // Correctly map role
                    parts: [{ text: msg.text }], // Now guaranteed to have non-empty text
                }));


                console.log("Starting chat session with history:", formattedHistory);
                // Ensure model is ready before starting chat
                if (!model) {
                     console.error("Model not ready when trying to start chat session in useEffect.");
                     // Handle this case appropriately, maybe set an error state or return
                     setMessages([{ role: 'bot', text: "Error: AI Model initialization failed." }]);
                     setConversationLoading(false);
                     return;
                }
                chatSession.current = model.startChat({
                    history: formattedHistory,
                    generationConfig: { maxOutputTokens: 1000 },
                });

            } catch (error) {
                console.error("Error loading chat:", error);
                setMessages([{ role: 'bot', text: `Error loading chat: ${error.message}` }]);
            } finally {
                setConversationLoading(false);
            }
        };

        loadChat();

    }, [activeConversationId, conversationDocRef, model]); // Dependencies


    // --- Core Chat Handlers ---

    const handleSubmit = useCallback(async (e) => {
        if (e) e.preventDefault(); // Allow calling without event object
        const currentInput = input.trim();

        // Ensure model is ready and input is not empty, regardless of activeConversationId
        if (!model) {
             console.error("Model not ready. Cannot send message.");
             // Optionally show an alert or message to the user
             // alert("AI Model is not ready yet. Please wait a moment.");
             return; // Stop execution if model isn't ready
        }
        if (!currentInput || loading) return; // Prevent sending if loading or input is empty

        setInput('');
        setLoading(true); // Start loading for AI response

        let conversationId = activeConversationId; // Might be null if starting new
        const userMessage = { role: 'user', text: currentInput };
        let currentMessages = [...messages, userMessage]; // Start with existing + new message
        let justCreatedConversationId = null; // Flag/ID for newly created regular chat

        setMessages(currentMessages); // Update UI immediately with user message

        if (!conversationId && !isTemporaryChat) {
            // First message of a NEW REGULAR Conversation -> Create Firestore Doc NOW
            const user = auth.currentUser;
            if (!user) { setLoading(false); return; }

            console.log("First message: Creating new REGULAR conversation in Firestore...");
            const conversationsRef = collection(firestore, 'users', user.uid, 'conversations');
            const newConversationData = {
                title: "New Conversation", // Will be updated later by summarizer or first message content
                messages: currentMessages.map(({ temp, ...rest }) => rest), // Save clean messages
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            try {
                const docRef = await addDoc(conversationsRef, newConversationData);
                conversationId = docRef.id; // Assign the new ID
                justCreatedConversationId = conversationId; // Mark that we just created it
                setActiveConversationId(conversationId); // Set the new ID as active *after* creation
                console.log("New regular conversation created and set active:", conversationId);
            } catch (error) {
                console.error("Error creating new conversation on first message:", error);
                // Revert messages state? Show error message?
                setMessages(prev => prev.slice(0, -1)); // Remove the user message optimistically added
                setMessages(prev => [...prev, { role: 'bot', text: "Error: Could not create conversation." }]);
                setLoading(false);
                return;
            }
        } else if (conversationId && !isTemporaryChat) {
            // Subsequent message in an EXISTING REGULAR Conversation
            console.log("Saving user message to existing regular conversation:", conversationId);
            // Save immediately (or maybe batch with bot response later?) - Saving here is simpler
            saveMessagesToFirestore(conversationId, currentMessages).catch(err => console.error("Error saving user message:", err));
        } else if (isTemporaryChat) {
             // Message in a TEMPORARY Chat (new or subsequent)
             console.log("Handling message in TEMPORARY chat (no Firestore save).");
             // No Firestore interaction needed for user message. conversationId remains null if new.
        } else {
             // Should not happen
             console.error("Unhandled case in handleSubmit message saving logic.");
             setLoading(false);
             return;
        }

        // --- AI Interaction ---
        // Initialize or use existing chat session regardless of temporary status
        if (!chatSession.current) {
             // Ensure model is ready before starting chat
             if (!model) {
                 console.error("Model not ready when trying to start chat session in handleSubmit.");
                 setMessages([{ role: 'bot', text: "Error: AI Model initialization failed." }]);
                 setLoading(false);
                 return;
             }
             console.log("Starting new chat session (temporary or first message of regular).");
             // History for the AI should include the current user message, filtering empty ones
             const validCurrentMessages = currentMessages.filter(msg => msg.text && msg.text.trim() !== '');
             const historyForAI = validCurrentMessages.map(msg => ({
                 role: msg.role === 'user' ? 'user' : 'model',
                 parts: [{ text: msg.text }], // Guaranteed non-empty
             }));
             console.log("Initializing chat session with history:", historyForAI); // Log the history being used
             chatSession.current = model.startChat({
                 history: historyForAI, // Start with filtered messages
                 generationConfig: { maxOutputTokens: 1000 },
             });
        }

        // Ensure chat session is valid before sending message
        if (!chatSession.current) {
            console.error("Chat session not ready for sending message.");
            setMessages(prev => [...prev, { role: 'bot', text: "Error: Chat session issue. Please try reloading." }]);
            setLoading(false);
            return;
        }

        // Send message to AI
        try {
            console.log("Sending message to AI:", currentInput);
            const resultStream = await chatSession.current.sendMessageStream(currentInput);
            let botText = '';
            let tempBotMessage = { role: 'bot', text: '', temp: true };

            // Add temporary bot message placeholder
            setMessages(prev => [...prev, tempBotMessage]);

            for await (const chunk of resultStream.stream) {
                const chunkText = chunk.text();
                botText += chunkText;
                tempBotMessage = { role: 'bot', text: botText, temp: true };
                // Update the last message (the temporary bot message)
                setMessages(prev => {
                    const updatedMsgs = [...prev];
                    if (updatedMsgs.length > 0) {
                        updatedMsgs[updatedMsgs.length - 1] = tempBotMessage;
                    }
                    return updatedMsgs;
                });
            }

            // Finalize bot message
            const finalBotMessage = { role: 'bot', text: botText.trim() };
            setMessages(prev => {
                const finalMsgs = [...prev];
                if (finalMsgs.length > 0) {
                    finalMsgs[finalMsgs.length - 1] = finalBotMessage;
                    // Save conversation with final bot message ONLY if not temporary AND conversationId is valid
                    // Use 'conversationId' which might have been updated if it was just created
                    const idToSave = justCreatedConversationId || activeConversationId;
                    if (!isTemporaryChat && idToSave) {
                        console.log("Saving final bot message to regular conversation:", idToSave);
                        saveMessagesToFirestore(idToSave, finalMsgs).catch(err => console.error("Error saving final bot message:", err));
                    } else {
                        console.log("Skipping save for final bot message in temporary chat or if ID is missing.");
                    }
                }
                return finalMsgs;
            });

        } catch (error) {
            console.error("Error sending/receiving message:", error);
            const errorMessage = { role: 'bot', text: "Error: " + error.message };
            setMessages(prev => {
                const msgsWithError = [...prev.filter(m => !m.temp), errorMessage]; // Remove temp message if it exists
                // Save error message ONLY if not temporary AND conversationId is valid
                // Use 'conversationId' which might have been updated if it was just created
                const idToSave = justCreatedConversationId || activeConversationId;
                if (!isTemporaryChat && idToSave) {
                     console.log("Saving error message to regular conversation:", idToSave);
                     saveMessagesToFirestore(idToSave, msgsWithError).catch(err => console.error("Error saving error message:", err));
                } else {
                     console.log("Skipping save for error message in temporary chat or if ID is missing.");
                }
                return msgsWithError;
            });
        } finally {
            setLoading(false);
        }
    }, [input, activeConversationId, messages, model, chatSession, setLoading, setMessages, setInput, setActiveConversationId, bundledSummaries, userProfile, isTemporaryChat]); // Added isTemporaryChat dependency


    const handleEndConversation = useCallback(async () => {
        if (isTemporaryChat) {
            console.log("Attempted to summarize a temporary chat.");
            alert("Temporary chats cannot be saved or summarized.");
            return null;
        }
        // Ensure activeConversationId exists for non-temporary chats before proceeding
        if (!messages || messages.length === 0 || !activeConversationId || !model || !auth.currentUser) {
            console.log("Cannot end conversation: Missing data or not a valid regular conversation", { messages: !!messages, activeConversationId, model: !!model, user: !!auth.currentUser, isTemporaryChat });
            return null;
        }

        setIsSummarizing(true);
        try {
            const conversationText = messages.map(msg => `${msg.role}: ${msg.text}`).join('\n');
            const combinedPrompt = `${prompts.summarizer}\n\nConversation:\n${conversationText}`;
            console.log("Generating summary for conversation:", activeConversationId);
            const resultCombined = await model.generateContent(combinedPrompt);
            const responseText = resultCombined.response.text();

            const lines = responseText.split("\n").filter(line => line.trim() !== "");
            const generatedTitle = lines[0]?.replace(/\*\*/g, '').trim() || "Conversation Summary";
            const generatedSummary = lines.slice(1).join("\n").trim();

            const conversationDocRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', activeConversationId);
            const now = Timestamp.now(); // Use Firestore Timestamp
            await updateDoc(conversationDocRef, {
                summary: generatedSummary,
                title: generatedTitle,
                ended: true,
                summarizedAt: now, // Use Firestore Timestamp
                updatedAt: now     // Also update updatedAt
            });
            console.log("Conversation summarized and updated:", activeConversationId);

            // Update local state for last saved time
            setLastSavedTime(now.toDate());
            setLastMessageCountAtSave(messages.length);

            return { title: generatedTitle, summary: generatedSummary };
        } catch (err) {
            console.error("Error during summarization: ", err);
            alert(`Error summarizing conversation: ${err.message}`);
            return null;
        } finally {
            setIsSummarizing(false);
        }
    }, [messages, activeConversationId, model, setIsSummarizing, prompts.summarizer, isTemporaryChat]); // Added isTemporaryChat dependency

    const handleSummarizeHeader = useCallback(async () => {
        // Simply calls handleEndConversation, which now updates state internally
        await handleEndConversation();
    }, [handleEndConversation]);

    const handleEndConversationProfile = useCallback(async () => {
        const summaryData = await handleEndConversation();
        if (summaryData) {
            setActiveConversationId(null); // Clear active conversation
            navigate('/profile'); // Navigate after successful summary
        }
    }, [handleEndConversation, navigate, setActiveConversationId]);


    return {
        messages,
        setMessages,
        input,
        setInput,
        loading,
        conversationLoading,
        isSummarizing,
        lastSavedTime,
        lastMessageCountAtSave,
        chatSession, // Expose chatSession ref if needed elsewhere (e.g., disabling input)
        model, // Expose model ref if needed elsewhere
        handleSubmit,
        handleEndConversation,
        handleSummarizeHeader,
        handleEndConversationProfile,
        conversationDocRef, // Expose doc ref for potential direct updates (like in Chat.jsx for summarize button)
        updateLastSavedTime: (time, count) => { // Helper to update save time from outside if needed
             setLastSavedTime(time);
             setLastMessageCountAtSave(count);
        },
        isTemporaryChat, // Expose temporary chat state
        setIsTemporaryChat // Expose setter for temporary chat state
    };
};