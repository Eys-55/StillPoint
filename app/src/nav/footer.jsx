import React from 'react';
import { useNavigate } from 'react-router-dom';

function Footer({ darkMode, setDarkMode }) {
  const navigate = useNavigate();

  const handleHome = () => {
    navigate('/home');
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  const handleMessage = () => {
    navigate('/chat');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const footerClass = darkMode ? 'bg-dark text-light' : 'bg-light text-dark';

  return (
    <footer className={`fixed-bottom ${footerClass} border-top`}>
      <div className="container">
        <div className="row text-center">
          <div className="col">
            <button className="btn btn-link" onClick={handleHome}>
              <i className="bi bi-house" style={{ fontSize: '1.5rem' }}></i>
            </button>
          </div>
          <div className="col">
            <button className="btn btn-link" onClick={handleProfile}>
              <i className="bi bi-person" style={{ fontSize: '1.5rem' }}></i>
            </button>
          </div>
          <div className="col">
            <button className="btn btn-link" onClick={handleMessage}>
              <i className="bi bi-chat-dots" style={{ fontSize: '1.5rem' }}></i>
            </button>
          </div>
          <div className="col">
            <button className="btn btn-link" onClick={handleSettings}>
              <i className="bi bi-gear" style={{ fontSize: '1.5rem' }}></i>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;