import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize Gemini API client with provided API key
  const genAI = new GoogleGenerativeAI("AIzaSyB3MRJUCPAHI-pGF0gAwj4qnaACGxpFJC8");
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    try {
      const result = await model.generateContent(input);
      const botText = result.response.text();
      const botMessage = { sender: 'bot', text: botText };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const botMessage = { sender: 'bot', text: "Error: " + error.message };
      setMessages(prev => [...prev, botMessage]);
    }
    setLoading(false);
  };

  return (
    <div className="container my-5">
      <h1 className="mb-4 text-center">Chat App</h1>
      <div className="card">
        <div className="card-body" style={{ height: '400px', overflowY: 'auto' }}>
          {messages.map((msg, index) => (
            <div key={index} className={`mb-2 text-${msg.sender === 'user' ? 'end' : 'start'}`}>
              <span className={`badge bg-${msg.sender === 'user' ? 'primary' : 'secondary'}`}>
                {msg.sender === 'user' ? 'You' : 'Bot'}
              </span>
              <p className="mt-1">{msg.text}</p>
            </div>
          ))}
          {loading && <div className="text-center">Loading...</div>}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-3">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default App;