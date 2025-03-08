import React from 'react';

function Header({ mode, onToggleSidebar, onSummarize, onBack, darkMode }) {
  const navbarClass = darkMode
    ? 'navbar navbar-dark bg-dark border-bottom'
    : 'navbar navbar-light bg-light border-bottom';

  return (
    <nav className={navbarClass}>
      <div className="container-fluid d-flex justify-content-between align-items-center">
        {mode === 'summaries' ? (
          <button className="btn btn-outline-secondary" onClick={onBack}>
            <i className="bi bi-arrow-left"></i>
          </button>
        ) : (
          <button className="btn btn-outline-secondary" onClick={onToggleSidebar}>
            <i className="bi bi-list"></i>
          </button>
        )}
        <span className="navbar-brand mb-0 h1">Chat App</span>
        {mode === 'chat' && (
          <button className="btn btn-outline-primary" onClick={onSummarize}>
            <i className="bi bi-check2-square"></i>
          </button>
        )}
      </div>
    </nav>
  );
}

export default Header;