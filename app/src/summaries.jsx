// Updated summaries.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header.jsx';
import prompts from './prompts.js';
import { getVertexAI, getGenerativeModel } from 'firebase/vertexai';
import { app, auth, firestore } from './firebase.jsx';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

function Summaries() {
  const location = useLocation();
  const navigate = useNavigate();
  const { conversationId, messages: initialMessages } = location.state || {};
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState(initialMessages || []);

  // Fetch conversation messages from Firestore if not provided via state,
  // and also fetch the saved summary if available.
  const fetchConversationMessages = async () => {
    if (conversationId && auth.currentUser) {
      const conversationDocRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationDocRef);
      if (conversationDoc.exists()) {
        const data = conversationDoc.data();
        const fetchedMessages = data.messages;
        if (data.summary) {
          setSummary(data.summary);
        }
        setMessages(fetchedMessages);
        return fetchedMessages;
      }
    }
    return [];
  };

  const generateSummary = async () => {
    let conversationMessages = messages;
    if (!conversationMessages || conversationMessages.length === 0) {
      conversationMessages = await fetchConversationMessages();
    }
    if (!conversationMessages || conversationMessages.length === 0) {
      setError('No conversation messages available for summarization.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const vertexAI = getVertexAI(app);
      const model = getGenerativeModel(vertexAI, {
        model: "gemini-2.0-flash",
        geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
      });
      const conversationText = conversationMessages.map(msg => `${msg.role}: ${msg.text}`).join('\n');
      const inputPrompt = prompts.summarizer + "\n\nConversation:\n" + conversationText;
      
      const result = await model.generateContent(inputPrompt);
      const generatedSummary = result.response.text();
      setSummary(generatedSummary);
      if (conversationId && auth.currentUser) {
        const conversationDocRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
        await updateDoc(conversationDocRef, { summary: generatedSummary });
      }
    } catch (err) {
      setError("Error during summarization: " + err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    generateSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBack = () => {
    navigate('/chat');
  };

  return (
    <div>
      <Header mode="summaries" onBack={handleBack} darkMode={false} />
      <div className="container my-4">
        <h2 className="mb-3">Conversation Summary</h2>
        {loading ? (
          <div className="text-center">Summarizing conversation...</div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <>
            <textarea
              className="form-control mb-3"
              rows="6"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            ></textarea>
            <button className="btn btn-primary" onClick={() => alert("Summary saved!")}>
              Save Summary
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Summaries;