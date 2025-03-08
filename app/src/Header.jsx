import React from 'react';

function Header({ onToggleSidebar, onNewConversation, darkMode }) {
  const navbarClass = darkMode
    ? 'navbar navbar-dark bg-dark border-bottom'
    : 'navbar navbar-light bg-light border-bottom';

  return (
    <nav className={navbarClass}>
      <div className="container-fluid d-flex justify-content-between align-items-center">
        <button className="btn btn-outline-secondary" onClick={onToggleSidebar}>
          <i className="bi bi-list"></i>
        </button>
        <span className="navbar-brand mb-0 h1">Chat App</span>
        <button className="btn btn-outline-primary" onClick={onNewConversation}>
          <i className="bi bi-plus"></i>
        </button>
      </div>
    </nav>
  );
}

export default Header;