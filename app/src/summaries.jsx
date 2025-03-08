import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header.jsx';
import prompts from './prompts.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

function Summaries() {
  const location = useLocation();
  const navigate = useNavigate();
  const { conversationId, messages } = location.state || {};
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateSummary = async () => {
    if (!messages || messages.length === 0) {
      setError('No conversation messages available for summarization.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const conversationText = messages.map(msg => `${msg.role}: ${msg.text}`).join('\n');
      const inputPrompt = prompts.summarizer + "\n\nConversation:\n" + conversationText;
      
      const result = await model.generateContent(inputPrompt);
      const generatedSummary = result.response.text();
      setSummary(generatedSummary);
      // Optionally, update the conversation state in Firestore with the summary.
    } catch (err) {
      setError("Error during summarization: " + err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    generateSummary();
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