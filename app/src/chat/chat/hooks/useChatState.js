import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { app, auth, firestore } from '../../../firebase.jsx';
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import * as prompts from '../../../meta/prompts.js';
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
            console.log("AI Model dependencies (summaries, profile) not ready yet.");
            return null;
        }
        const systemInstructionText = `${prompts.system}\n\n${bundledSummaries}\n\n${prompts.userProfileLabel}\n${userProfile}`;
        console.log("Initializing AI model...");
        try {
            return getGenerativeModel(vertexAI, {
                model: "gemini-1.5-flash",
                systemInstruction: { parts: [{ text: systemInstructionText }] },
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
            return;
        }

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

                const formattedHistory = validatedHistory.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }],
                }));

                console.log("Starting chat session with history:", formattedHistory);
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
        if (!currentInput || loading || !model) return; // Prevent sending if loading or model not ready

        setInput('');
        setLoading(true); // Start loading for AI response

        let conversationId = activeConversationId;
        const userMessage = { role: 'user', text: currentInput };
        let currentMessages = []; // To hold the state before AI call

        if (!conversationId) {
            // New Conversation
            const user = auth.currentUser;
            if (!user) { setLoading(false); return; }

            currentMessages = [userMessage];
            setMessages(currentMessages); // Update UI immediately

            const conversationsRef = collection(firestore, 'users', user.uid, 'conversations');
            const newConversation = {
                title: "New Conversation", // Title can be updated later
                messages: currentMessages,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            try {
                const docRef = await addDoc(conversationsRef, newConversation);
                conversationId = docRef.id;
                setActiveConversationId(conversationId); // Set the new ID as active
                // Start chat session for the new conversation
                chatSession.current = model.startChat({
                    history: [{ role: 'user', parts: [{ text: currentInput }] }], // History starts with the user message
                    generationConfig: { maxOutputTokens: 1000 },
                });
                console.log("New conversation created and chat session started:", conversationId);
            } catch (error) {
                console.error("Error creating new conversation:", error);
                setMessages([{ role: 'bot', text: "Error: Could not create conversation." }]);
                setLoading(false);
                return;
            }
        } else {
            // Existing Conversation
            currentMessages = [...messages, userMessage];
            setMessages(currentMessages); // Update UI
            saveMessagesToFirestore(conversationId, currentMessages).catch(err => console.error("Error saving user message:", err));
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
                    // Save conversation with final bot message
                    saveMessagesToFirestore(conversationId, finalMsgs).catch(err => console.error("Error saving final bot message:", err));
                }
                return finalMsgs;
            });

        } catch (error) {
            console.error("Error sending/receiving message:", error);
            const errorMessage = { role: 'bot', text: "Error: " + error.message };
            setMessages(prev => {
                const msgsWithError = [...prev.filter(m => !m.temp), errorMessage]; // Remove temp message if it exists
                saveMessagesToFirestore(conversationId, msgsWithError).catch(err => console.error("Error saving error message:", err));
                return msgsWithError;
            });
        } finally {
            setLoading(false);
        }
    }, [input, activeConversationId, messages, model, chatSession, setLoading, setMessages, setInput, setActiveConversationId, bundledSummaries, userProfile]); // Dependencies


    const handleEndConversation = useCallback(async () => {
        if (!messages || messages.length === 0 || !activeConversationId || !model || !auth.currentUser) {
            console.log("Cannot end conversation: Missing data", { messages: !!messages, activeConversationId, model: !!model, user: !!auth.currentUser });
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
    }, [messages, activeConversationId, model, setIsSummarizing, prompts.summarizer]); // Dependencies

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
        }
    };
};