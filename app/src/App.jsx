import React, { useState, useEffect, useRef } from 'react';
import { model } from './firebase.jsx';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Create a ref to store the chat session with built‑in memory
  const chatSession = useRef(null);

  useEffect(() => {
    // Initialize the chat session with pre-populated history to demonstrate memory
    chatSession.current = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "Hello, I have 2 dogs in my house." }],
        },
        {
          role: "model",
          parts: [{ text: "Great to meet you. What would you like to know?" }],
        },
      ],
      generationConfig: { maxOutputTokens: 100 },
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Append user's message to the chat history
    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Use sendMessageStream to stream the bot's response and automatically track conversation context
      const resultStream = await chatSession.current.sendMessageStream(input);
      let botText = '';
      // Add a temporary bot message for live updates
      setMessages(prev => [...prev, { sender: 'bot', text: botText, temp: true }]);
      
      // Stream each chunk and update the last message
      for await (const chunk of resultStream.stream) {
        const chunkText = chunk.text();
        botText += chunkText;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { sender: 'bot', text: botText, temp: true };
          return newMessages;
        });
      }
      
      // Finalize the bot message after streaming is complete
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { sender: 'bot', text: botText };
        return newMessages;
      });
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