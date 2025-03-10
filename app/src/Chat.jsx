import React, { useState, useEffect, useRef, useMemo } from 'react';
import { app, auth, firestore } from './firebase.jsx';
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import prompts from './prompts.js';
import { doc, getDoc, setDoc, updateDoc, collection, query, getDocs } from 'firebase/firestore';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { useNavigate } from 'react-router-dom';

function Chat({ darkMode, setDarkMode, activeConversationId, setActiveConversationId, isSidebarCollapsed, setIsSidebarCollapsed }) {
  const [messages, setMessages] = useState([]);
  const [bundledSummaries, setBundledSummaries] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // New state for voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const recordingIntervalRef = useRef(null);

  const chatSession = useRef(null);
  const user = auth.currentUser;
  const navigate = useNavigate();
  const vertexAI = getVertexAI(app);

  // Helper function to format recording time
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        transcribeAudio(audioBlob);
      };
      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      clearInterval(recordingIntervalRef.current);
      setIsRecording(false);
    }
  };

  // Handle voice button click: toggle recording
  const handleVoiceButton = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  // Transcribe audio using Whisper API
  const transcribeAudio = async (audioBlob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', 'whisper-1');
    // Removed response_format parameter to get default JSON response
    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_WHISPER_API_KEY}`
        },
        body: formData
      });
      if (!response.ok) {
        throw new Error('Transcription failed');
      }
      const data = await response.json();
      console.log("Transcription:", data.text);
      setInput(prevInput => prevInput ? prevInput + "\n" + data.text : data.text);
    } catch (err) {
      console.error("Error transcribing audio:", err);
    }
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
      model: "gemini-2.0-flash-lite",
      geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
      systemInstruction: {
        parts: [
          { text: `${prompts.system}\n\n${bundledSummaries}` }
        ]
      }
    };
    console.log("Payload passed to getGenerativeModel:", payload);
    return getGenerativeModel(vertexAI, payload);
  }, [bundledSummaries, vertexAI]);

  const conversationDocRef = activeConversationId
    ? doc(firestore, 'users', user.uid, 'conversations', activeConversationId)
    : null;

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
    }
    loadChat();
  }, [activeConversationId, conversationDocRef, model, prompts.system]);

  const saveChat = async (newMessages) => {
    if (!conversationDocRef) return;
    await updateDoc(conversationDocRef, { messages: newMessages });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !conversationDocRef) return;
    const userMessage = { role: 'user', text: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    await saveChat(updatedMessages);
    const messageToSend = input;
    setInput('');
    console.log("Sending message to bot:", messageToSend);
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

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleSummarize = () => {
    if (!activeConversationId) return;
    navigate('/summaries', { state: { conversationId: activeConversationId, messages: messages } });
  };

  // Cleanup recording interval on unmount
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
        onToggleSidebar={handleToggleSidebar}
        onSummarize={handleSummarize}
        darkMode={darkMode}
      />
      <div style={{ display: 'flex' }}>
        <Sidebar
          onSelectConversation={setActiveConversationId}
          activeConversationId={activeConversationId}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
        <div
          className="flex-grow-1"
          style={{
            marginLeft: isSidebarCollapsed ? '0px' : '260px',
            transition: 'margin-left 0.3s ease',
            position: 'relative'
          }}
        >
          <div className="container-fluid p-3">
            {!activeConversationId ? (
              <h2 className="text-center">Please select a conversation from the sidebar or create a new one.</h2>
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
                        <div>
                          {msg.text}
                        </div>
                      </div>
                    )
                  ))}
                  {loading && <div className="text-center">Loading...</div>}
                </div>
                <div className="p-3 mt-3">
                  <form onSubmit={handleSubmit}>
                    <div className="input-group">
                      <button type="button" onClick={handleVoiceButton} className="btn btn-secondary">
                        {isRecording ? <i className="bi bi-check"></i> : <i className="bi bi-mic"></i>}
                      </button>
                      {isRecording && (
                        <span className="align-self-center ms-2" style={{ padding: '0.5rem' }}>
                          Recording: {formatTime(recordingTime)}
                        </span>
                      )}
                      <textarea
                        className="form-control rounded"
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading || isRecording}
                        style={{ minHeight: '80px', maxHeight: '200px', resize: 'vertical', overflowY: 'auto' }}
                        wrap="soft"
                      ></textarea>
<button className="btn btn-primary" type="submit" disabled={loading || isRecording}>
                        <i className="bi bi-arrow-up"></i>
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Chat;