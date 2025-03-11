import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header.jsx';

function Home() {
  const navigate = useNavigate();

  const handleChat = () => {
    navigate('/chat');
  };

  return (
    <div>
      <Header mode="home" darkMode={document.body.getAttribute("data-bs-theme") === "dark"} />
      <div className="container my-4">
        <h1>Welcome to the Mental Health App</h1>
        <p>This is your home page. Here you can view your stats and learn about the app features.</p>
        <p>Placeholder for stats and additional details.</p>
        <button className="btn btn-primary" onClick={handleChat}>Go to Chat</button>
      </div>
    </div>
  );
}

export default Home;