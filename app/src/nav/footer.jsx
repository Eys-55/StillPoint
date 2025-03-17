import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Footer({ darkMode, setDarkMode, conversationActive, endConversation }) {
  const navigate = useNavigate();
  // Removed settings modal state as we now navigate to settings
  const [showConversationModal, setShowConversationModal] = useState(false);

  const handleHome = () => {
    navigate('/home');
  };

  const handleProfile = () => {
    if (window.location.pathname === '/chat' && conversationActive) {
      setShowConversationModal(true);
    } else {
      navigate('/profile');
    }
  };

  const handleMessage = () => {
    navigate('/chat');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const handleCloseModal = () => {
    setShowSettingsModal(false);
  };

  const handleLogout = () => {
    navigate('/login');
  };

  const footerClass = darkMode ? 'bg-dark text-light' : 'bg-light text-dark';

  return (
    <>
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

      {showConversationModal && (
        <>
          <div className="modal show" style={{ display: 'block' }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className={`modal-content ${footerClass}`}>
                <div className="modal-header">
                  <h5 className="modal-title">End Conversation</h5>
                  <button type="button" className="btn-close" onClick={() => setShowConversationModal(false)}></button>
                </div>
                <div className="modal-body">
                  <p>Do you want to pause this conversation or end it?</p>
                  <div className="d-flex justify-content-between">
                    <button className="btn btn-secondary" onClick={() => { setShowConversationModal(false); navigate('/profile'); }}>
                      Pause Conversation
                    </button>
                    <button className="btn btn-primary" onClick={async () => { await endConversation(); setShowConversationModal(false); }}>
                      I'm Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show"></div>
        </>
      )}
    </>
  );
}

export default Footer;