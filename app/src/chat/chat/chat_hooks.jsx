import { useCallback, useRef } from 'react';
import { auth, firestore } from '../../firebase.jsx';
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
  setLoading, // Keep for message sending
  setIsSummarizing, // Add setter for summarization state
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
  const silenceTimeoutRef = useRef(null); // Ref for silence detection timeout

  // Define save function directly within the hook's scope if needed elsewhere,
  // or define locally within handleSubmit if only used there.
  const saveMessagesToFirestore = async (convId, messagesToSave) => {
      if (!convId || !auth.currentUser) return;
      const conversationDocRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', convId);
      try {
          const cleanMsgs = messagesToSave.map(({ temp, ...rest }) => rest); // Remove temp flag
          await updateDoc(conversationDocRef, { messages: cleanMsgs, updatedAt: serverTimestamp() });
      } catch (error) {
          console.error("Error saving chat:", error);
          // Consider how to handle save errors - maybe notify the user
      }
  };

  const handleSubmit = useCallback(async (e) => {
      e.preventDefault();
      const currentInput = input.trim();
      if (!currentInput) return;

      setInput(''); // Clear input immediately

      let conversationId = activeConversationId;
      const userMessage = { role: 'user', text: currentInput };
      let messagesForAI = []; // Store the history + new message to send to AI

      // 1. Handle new conversation creation OR update existing
      if (!conversationId) {
          setLoading(true); // Show loading indicator
          const user = auth.currentUser;
          if (!user) { setLoading(false); return; } // Should be logged in

          // Create the message list *first*
          const initialMessages = [userMessage];
          setMessages(initialMessages); // Update local state immediately
          messagesForAI = initialMessages; // History for AI is just the first message

          // Create Firestore document
          const conversationsRef = collection(firestore, 'users', user.uid, 'conversations');
          const newConversation = {
              title: "New Conversation",
              messages: initialMessages, // Save the first message immediately
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
          };
          try {
              const docRef = await addDoc(conversationsRef, newConversation);
              conversationId = docRef.id;
              // Set the active ID *after* updating local state and saving initial message
              setActiveConversationId(conversationId);
              // Firestore save already happened via addDoc with initial message
          } catch (error) {
              console.error("Error creating new conversation:", error);
              setMessages([{ role: 'bot', text: "Error: Could not create conversation." }]); // Show error in UI
              setLoading(false);
              return;
          }
          // Don't setLoading(false) yet, continue to AI call
      } else {
          // Existing conversation: Update local state and save
          const updatedMessages = [...messages, userMessage];
          setMessages(updatedMessages); // Update UI
          messagesForAI = updatedMessages; // History for AI includes previous messages
          // Save updated messages asynchronously
          saveMessagesToFirestore(conversationId, updatedMessages).catch(err => console.error("Error saving user message:", err));
          setLoading(true); // Set loading for AI response
      }

      // 2. Send message to AI (using the determined conversationId)
      const fullPrompt = `${prompts.system}\n\n${bundledSummaries}\n\n${prompts.userProfileLabel}\n${userProfile}`;
      console.log("Message prompt:", currentInput);
      console.log("Full prompt payload:", { systemPrompt: fullPrompt, conversationHistory: messagesForAI.slice(0, -1) }); // History *before* current user message
      console.log("Complete prompt string:", fullPrompt);


      // Ensure chatSession is ready (could be initializing)
      if (!chatSession.current) {
          console.error("Chat session not initialized yet.");
          setMessages(prev => [...prev, { role: 'bot', text: "Error: Chat session initializing. Please wait and try again." }]);
          setLoading(false);
          return;
      }

      try {
          const resultStream = await chatSession.current.sendMessageStream(currentInput); // Send only the current input
          let botText = '';
          let finalBotMessage = { role: 'bot', text: '', temp: true };

          // Add temporary bot message placeholder immediately
          setMessages(prev => [...prev, finalBotMessage]);

          for await (const chunk of resultStream.stream) {
              const chunkText = chunk.text();
              botText += chunkText;
              finalBotMessage = { role: 'bot', text: botText, temp: true };

              // Update the *last* message in the state array (the bot's response)
              setMessages(prev => {
                  const msgs = [...prev];
                  if (msgs.length > 0) {
                      msgs[msgs.length - 1] = finalBotMessage;
                  }
                  return msgs;
              });
          }

          // Final update for the bot message (remove temp flag)
          // Trim whitespace from the final bot text
          finalBotMessage = { role: 'bot', text: botText.trim() };
          setMessages(prev => {
              const msgs = [...prev];
              if (msgs.length > 0) {
                  msgs[msgs.length - 1] = finalBotMessage;
                  // Save the complete conversation state *now* including the bot's final response
                  saveMessagesToFirestore(conversationId, msgs).catch(err => console.error("Error saving final bot message:", err));
              }
              return msgs;
          });

      } catch (error) {
          console.error("Error sending/receiving message:", error);
          const errorMessage = { role: 'bot', text: "Error: " + error.message };
          setMessages(prev => {
               const msgs = [...prev, errorMessage];
               // Save the state including the error message
               saveMessagesToFirestore(conversationId, msgs).catch(err => console.error("Error saving error message:", err));
               return msgs;
          });
      } finally {
          setLoading(false);
      }
  }, [input, activeConversationId, messages, setMessages, setInput, setActiveConversationId, chatSession, setLoading, prompts, bundledSummaries, userProfile]); // Dependencies updated

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

      const stopRecognition = () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop(); // This will trigger 'onend'
        }
        // Explicit cleanup just in case 'onend' doesn't fire reliably or immediately
        setIsRecording(false);
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        if (silenceTimeoutRef.current) {
           clearTimeout(silenceTimeoutRef.current);
           silenceTimeoutRef.current = null;
        }
        setRecordingTime(0);
        recognitionRef.current = null;
      };

      const startSilenceTimer = () => {
         if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
         silenceTimeoutRef.current = setTimeout(() => {
           console.log("Silence detected for 20 seconds, stopping recognition.");
           stopRecognition();
         }, 20000); // 20 seconds timeout
      };

      recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript; // Get the latest final result
        setInput(prevInput => (prevInput ? prevInput + ' ' : '') + transcript.trim());
        // Don't stop recording here, let silence detection or manual stop handle it.
        // If using continuous=true (not currently), result might fire multiple times.
        // If continuous=false, this fires once after a pause, then onend fires. Reset silence timer after result.
        startSilenceTimer(); // Restart silence timer after a result if continuous is false
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event);
        stopRecognition(); // Ensure cleanup on error
      };

      recognition.onend = () => {
        console.log("Speech recognition ended.");
        // Ensure all states and timers are cleared cleanly when recognition stops for any reason
        setIsRecording(false);
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        if (silenceTimeoutRef.current) {
           clearTimeout(silenceTimeoutRef.current);
           silenceTimeoutRef.current = null;
        }
        setRecordingTime(0);
        recognitionRef.current = null; // Ensure ref is cleared
      };

       // Silence Detection Handlers
       recognition.onspeechstart = () => {
          console.log("Speech started.");
          if (silenceTimeoutRef.current) {
             clearTimeout(silenceTimeoutRef.current);
             silenceTimeoutRef.current = null;
          }
       };

       recognition.onspeechend = () => {
          console.log("Speech ended. Starting silence timer.");
          startSilenceTimer();
       };

       recognition.onaudiostart = () => {
         console.log("Audio capturing started.");
         // Start initial silence timer in case user doesn't speak at all
         startSilenceTimer();
       };

      recognitionRef.current = recognition;
      setIsRecording(true);
      recognition.start();
      console.log("Speech recognition started.");

    } else {
       // User clicked the stop button
       if (recognitionRef.current) {
         recognitionRef.current.stop(); // Triggers onend for cleanup
       } else {
         // Manual cleanup if ref somehow got lost but state is still recording
         setIsRecording(false);
         if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
         if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
         setRecordingTime(0);
         timerIntervalRef.current = null;
         silenceTimeoutRef.current = null;
       }
    }
  }, [setInput, setIsRecording, setRecordingTime]); // Keep dependencies minimal

  const handleEndConversation = useCallback(async () => {
    // Stop recording if active when ending conversation
    if (isRecording && recognitionRef.current) {
       recognitionRef.current.stop();
    }
    if (!messages || messages.length === 0) return null; // Return null if no messages
    setIsSummarizing(true); // Use summarization loading state
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
        summarizedAt: serverTimestamp()
      });
      return { title: generatedTitle, summary: generatedSummary };
    } catch (err) {
      console.error("Error during summarization: " + err.message);
      return null;
    } finally {
      setIsSummarizing(false); // Turn off summarization loading state
    }
  }, [messages, activeConversationId, setIsSummarizing, prompts, model, isRecording]); // Added setIsSummarizing and isRecording dependencies

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