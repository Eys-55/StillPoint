import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Header({ mode, onToggleSidebar, onSummarize, onBack, darkMode, conversationTitle, lastSavedTime, hasNewMessages }) {
  const navigate = useNavigate();
  const [localDarkMode, setLocalDarkMode] = useState(mode === 'home' ? (document.body.getAttribute("data-bs-theme") === "dark") : darkMode);

  useEffect(() => {
    if (mode === 'home') {
      setLocalDarkMode(document.body.getAttribute("data-bs-theme") === "dark");
    } else {
      setLocalDarkMode(darkMode);
    }
  }, [mode, darkMode]);

  const effectiveDarkMode = mode === 'home' ? localDarkMode : darkMode;
  const navbarClass = effectiveDarkMode ? 'navbar navbar-dark bg-dark border-bottom' : 'navbar navbar-light bg-light border-bottom';

  const toggleDarkMode = () => {
    const newTheme = effectiveDarkMode ? "light" : "dark";
    document.body.setAttribute("data-bs-theme", newTheme);
    setLocalDarkMode(!effectiveDarkMode);
  };

  const handleBackClick = () => {
    if (mode === 'summaries') {
      navigate('/profile');
    } else if (onBack) {
      onBack();
    }
  };

  const formattedTime = lastSavedTime ? new Date(lastSavedTime).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) : "Not saved";

  return (
    <nav className={navbarClass}>
      <div className="container-fluid d-flex justify-content-between align-items-center">
        {mode === 'summaries' ? (
          <button className="btn btn-outline-secondary" onClick={handleBackClick}>
            <i className="bi bi-arrow-left"></i>
          </button>
        ) : (mode === 'home' || mode === 'profile' || mode === 'settings') ? (
          <div></div>
        ) : (
          <button className="btn btn-outline-secondary" onClick={onToggleSidebar}>
            <i className="bi bi-list"></i>
          </button>
        )}
        <span className="navbar-brand mb-0 h1" style={{ fontSize: 'var(--header-font-size)' }}>
          {conversationTitle || (mode === 'home' ? "Home" : mode === 'profile' ? "Profile" : mode === 'settings' ? "Settings" : "Mental Health Conversation")}
        </span>
        {mode === 'chat' && (
          <div className="d-flex align-items-center">
            <span className="me-2" style={{ cursor: 'pointer' }} onClick={onSummarize}>
              {hasNewMessages ? `New messages since: ${formattedTime}` : `Last saved: ${formattedTime}`}
            </span>
            <button className="btn btn-outline-primary" onClick={onSummarize}>
              <i className="bi bi-check2-square"></i>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Header;