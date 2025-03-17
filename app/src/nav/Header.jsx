import React, { useState, useEffect } from 'react';

function Header({ mode, onToggleSidebar, onSummarize, onBack, darkMode, conversationTitle }) {
  // For home mode, use local state for dark toggle; otherwise, use the darkMode prop.
  const [localDarkMode, setLocalDarkMode] = useState(mode === 'home' ? (document.body.getAttribute("data-bs-theme") === "dark") : darkMode);

  useEffect(() => {
    if (mode === 'home') {
      setLocalDarkMode(document.body.getAttribute("data-bs-theme") === "dark");
    } else {
      setLocalDarkMode(darkMode);
    }
  }, [mode, darkMode]);

  // For chat and other modes, use darkMode prop.
  const effectiveDarkMode = mode === 'home' ? localDarkMode : darkMode;
  const navbarClass = effectiveDarkMode ? 'navbar navbar-dark bg-dark border-bottom' : 'navbar navbar-light bg-light border-bottom';

  const toggleDarkMode = () => {
    const newTheme = effectiveDarkMode ? "light" : "dark";
    document.body.setAttribute("data-bs-theme", newTheme);
    setLocalDarkMode(!effectiveDarkMode);
  };

  return (
    <nav className={navbarClass}>
      <div className="container-fluid d-flex justify-content-between align-items-center">
        {mode === 'summaries' ? (
          <button className="btn btn-outline-secondary" onClick={onBack}>
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
        {mode === 'chat' ? (
          <button className="btn btn-outline-primary me-2" onClick={onSummarize}>
            <i className="bi bi-check2-square"></i>
          </button>
        ) : null}
      </div>
    </nav>
  );
}

export default Header;