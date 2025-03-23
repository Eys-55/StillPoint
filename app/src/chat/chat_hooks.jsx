import { useCallback, useRef } from 'react';
import { auth, firestore } from '../firebase.jsx';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const useChatHandlers = ({
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
  bundledSummaries,   // Added parameter
  userProfile         // Added parameter
}) => {
  const recognitionRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const saveChat = async (newMessages) => {
    if (!activeConversationId) return;
    const conversationDocRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', activeConversationId);
    await updateDoc(conversationDocRef, { messages: newMessages, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  };

  const handleSubmit = useCallback(async (e) => {
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
    
    // Build the full prompt string from prompts, bundledSummaries, and userProfile
    const fullPrompt = `${prompts.system}\n\n${bundledSummaries}\n\n${prompts.userProfileLabel}\n${userProfile}`;
    console.log("Message prompt:", messageToSend);
    console.log("Full prompt payload:", { systemPrompt: fullPrompt, conversationHistory: messages });
    console.log("Complete prompt string:", fullPrompt);
    
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
  }, [input, activeConversationId, messages, setMessages, setInput, setActiveConversationId, chatSession, setLoading, prompts, bundledSummaries, userProfile]);

  const handleVoiceButton = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (!recognitionRef.current) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
        if(timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        setRecordingTime(0);
        recognitionRef.current = null;
      };
      recognition.onerror = (event) => {
        console.error("Speech recognition error", event);
        setIsRecording(false);
        if(timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        setRecordingTime(0);
        recognitionRef.current = null;
      };
      recognition.onend = () => {
        setIsRecording(false);
        if(timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        setRecordingTime(0);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      setIsRecording(true);
      recognition.start();
    } else {
      recognitionRef.current.stop();
      setIsRecording(false);
      if(timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setRecordingTime(0);
      recognitionRef.current = null;
    }
  }, [setInput, setIsRecording, setRecordingTime]);

  const handleEndConversation = useCallback(async () => {
    if (!messages || messages.length === 0) return;
    setLoading(true);
    try {
      const conversationText = messages.map(msg => `${msg.role}: ${msg.text}`).join('\n');
      const combinedPrompt = prompts.summarizer + "\n\nConversation:\n" + conversationText;
      const resultCombined = await model.generateContent(combinedPrompt);
      const responseText = resultCombined.response.text();
      const lines = responseText.split("\n").filter(line => line.trim() !== "");
      const generatedTitle = lines[0].replace(/\*\*/g, '').trim();
      const generatedSummary = lines.slice(1).join("\n").trim();
      const conversationDocRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', activeConversationId);
      await updateDoc(conversationDocRef, {
        summary: generatedSummary,
        title: generatedTitle,
        ended: true,
      });
      return { title: generatedTitle, summary: generatedSummary };
    } catch (err) {
      console.error("Error during summarization: " + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [messages, activeConversationId, setLoading, prompts, model]);

  const handleSummarizeHeader = useCallback(async () => {
    await handleEndConversation();
  }, [handleEndConversation]);

  const handleEndConversationProfile = useCallback(async () => {
    const summaryData = await handleEndConversation();
    if (summaryData) {
      setActiveConversationId(null);
      navigate('/profile');
    }
  }, [handleEndConversation, navigate, setActiveConversationId]);

  return { handleSubmit, handleVoiceButton, handleEndConversation, handleSummarizeHeader, handleEndConversationProfile };
};