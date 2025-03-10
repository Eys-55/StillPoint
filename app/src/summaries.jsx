import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header.jsx';
import prompts from './prompts.js';
import { getVertexAI, getGenerativeModel } from 'firebase/vertexai';
import { app, auth, firestore } from './firebase.jsx';
import { doc, getDoc, updateDoc, collection, query, onSnapshot } from 'firebase/firestore';

function Summaries() {
  const location = useLocation();
  const navigate = useNavigate();
  const { conversationId, messages: initialMessages } = location.state || {};
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState(initialMessages || []);
  const [summariesList, setSummariesList] = useState([]);

  const handleBack = () => {
    navigate('/chat');
  };

  // For specific conversation view
  const fetchConversationMessages = async () => {
    if (conversationId && auth.currentUser) {
      const convRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
      const convDoc = await getDoc(convRef);
      if (convDoc.exists()) {
        const data = convDoc.data();
        if (data.summary) {
          setSummary(data.summary);
        }
        setMessages(data.messages);
        return data.messages;
      }
    }
    return [];
  };

  const generateSummary = async () => {
    let convMessages = messages;
    if (!convMessages || convMessages.length === 0) {
      convMessages = await fetchConversationMessages();
    }
    if (!convMessages || convMessages.length === 0) {
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
      const conversationText = convMessages.map(msg => `${msg.role}: ${msg.text}`).join('\n');
      const inputPrompt = prompts.summarizer + "\n\nConversation:\n" + conversationText;
      const result = await model.generateContent(inputPrompt);
      const generatedSummary = result.response.text();
      setSummary(generatedSummary);
      if (conversationId && auth.currentUser) {
        const convRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
        await updateDoc(convRef, { summary: generatedSummary });
      }
    } catch (err) {
      setError("Error during summarization: " + err.message);
    }
    setLoading(false);
  };

  // When viewing a specific conversation, auto-generate summary.
  useEffect(() => {
    if (conversationId) {
      generateSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // When no conversationId, fetch all summaries.
  useEffect(() => {
    if (!conversationId && auth.currentUser) {
      const convCollection = collection(firestore, 'users', auth.currentUser.uid, 'conversations');
      const q = query(convCollection);
      const unsubscribe = onSnapshot(q, snapshot => {
        const list = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            title: data.title || docSnap.id,
            summary: data.summary || 'No summary available'
          });
        });
        setSummariesList(list);
      });
      return () => unsubscribe();
    }
  }, [conversationId]);

  return (
    <div>
      <Header mode="summaries" onBack={handleBack} darkMode={false} />
      <div className="container my-4">
        {conversationId ? (
          <>
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
                <button className="btn btn-primary" onClick={generateSummary}>
                  Regenerate Summary
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <h2 className="mb-3">All Conversation Summaries</h2>
            {summariesList.length === 0 ? (
              <div>No summaries available.</div>
            ) : (
              summariesList.map(conv => (
                <div key={conv.id} className="card mb-3">
                  <div className="card-body">
                    <h5 className="card-title">{conv.title}</h5>
                    <p className="card-text">{conv.summary}</p>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Summaries;