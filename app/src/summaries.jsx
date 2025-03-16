import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './nav/Header.jsx';
import prompts from './prompts.js';
import { getVertexAI, getGenerativeModel } from 'firebase/vertexai';
import { app, auth, firestore } from './firebase.jsx';
import { doc, getDoc, updateDoc, collection, query, getDocs } from 'firebase/firestore';

function Summaries() {
  const location = useLocation();
  const navigate = useNavigate();
  const { conversationId, messages: initialMessages } = location.state || {};
  const [summary, setSummary] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState(initialMessages || []);
  const [bundledSummaries, setBundledSummaries] = useState([]);
  const [loadingBundled, setLoadingBundled] = useState(false);
  const [errorBundled, setErrorBundled] = useState('');

  const handleBack = () => {
    navigate('/chat');
  };

  const fetchConversationMessages = async () => {
    if (conversationId && auth.currentUser) {
      const convRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
      const convDoc = await getDoc(convRef);
      if (convDoc.exists()) {
        const data = convDoc.data();
        if (data.summary) {
          setSummary(data.summary);
        }
        if (data.title) {
          setTitle(data.title);
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
      
      // Generate combined title and summary
      const combinedPrompt = prompts.summarizer + "\n\nConversation:\n" + conversationText;
      const resultCombined = await model.generateContent(combinedPrompt);
      const responseText = resultCombined.response.text();
      const lines = responseText.split("\n").filter(line => line.trim() !== "");
      const generatedTitle = lines[0].replace(/\*\*/g, '').trim();
      const generatedSummary = lines.slice(1).join("\n").trim();

      setSummary(generatedSummary);
      setTitle(generatedTitle);

      if (conversationId && auth.currentUser) {
        const convRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
        await updateDoc(convRef, { summary: generatedSummary, title: generatedTitle });
      }
    } catch (err) {
      setError("Error during summarization: " + err.message);
    }
    setLoading(false);
  };

  const saveSummary = async () => {
    if (conversationId && auth.currentUser) {
      try {
        const convRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
        await updateDoc(convRef, { summary: summary, title: title });
        navigate('/chat');
      } catch (err) {
        setError("Error saving summary: " + err.message);
      }
    }
  };

  const getAllSummaries = async () => {
    const user = auth.currentUser;
    if (!user) return [];
    const convRef = collection(firestore, 'users', user.uid, 'conversations');
    const q = query(convRef);
    const snapshot = await getDocs(q);
    const summaries = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.summary && data.title) {
        summaries.push({ title: data.title, summary: data.summary });
      }
    });
    return summaries;
  };

  useEffect(() => {
    if (conversationId) {
      generateSummary();
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId && auth.currentUser) {
      setLoadingBundled(true);
      getAllSummaries()
        .then(result => {
          setBundledSummaries(result);
          setLoadingBundled(false);
        })
        .catch(err => {
          setErrorBundled("Error fetching bundled summaries: " + err.message);
          setLoadingBundled(false);
        });
    }
  }, [conversationId]);

  return (
    <div>
      <Header
        mode="summaries"
        onBack={handleBack}
        darkMode={document.body.getAttribute("data-bs-theme") === "dark"}
      />
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
                <input
                  type="text"
                  className="form-control mb-3"
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                  className="form-control mb-3"
                  rows="6"
                  placeholder="Summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                ></textarea>
                <button className="btn btn-primary" onClick={saveSummary}>
                  Save
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <h2 className="mb-3">All Conversation Summaries</h2>
            {loadingBundled ? (
              <div className="text-center">Loading bundled summaries...</div>
            ) : errorBundled ? (
              <div className="alert alert-danger">{errorBundled}</div>
            ) : bundledSummaries.length > 0 ? (
              bundledSummaries.map((item, index) => (
                <div key={index} className="card mb-3">
                  <div className="card-body">
                    <h5>{item.title}</h5>
                    <p className="card-text">{item.summary}</p>
                  </div>
                </div>
              ))
            ) : (
              <div>No summaries available.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Summaries;