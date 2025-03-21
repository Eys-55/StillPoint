import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../nav/header.jsx';
import { useSummaries } from './summaries_hooks.jsx';

function Summaries() {
  const location = useLocation();
  const navigate = useNavigate();
  const { conversationId, messages: initialMessages } = location.state || {};
  const isDarkMode = document.body.getAttribute("data-bs-theme") === "dark";

  const handleBack = () => {
    navigate('/chat');
  };

  const {
    summary,
    setSummary,
    title,
    setTitle,
    loading,
    error,
    bundledSummaries,
    loadingBundled,
    errorBundled,
    dropdownSummaryId,
    setDropdownSummaryId,
    saveSummary,
    handleDeleteSummary,
    handleEditSummary,
  } = useSummaries(conversationId, initialMessages);

  return (
    <div>
      <Header
        mode="summaries"
        onBack={handleBack}
        darkMode={isDarkMode}
      />
      <div className="container my-4">
        {conversationId ? (
          <>
            <h2 className="mb-3">Conversation Summary</h2>
            {loading ? (
              <div className="text-center">Summarizing conversation...</div>
            ) : error ? (
              <div className="alert alert-danger">{error}</div>
            ) : (
              <>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <button
                    className="btn btn-link"
                    onClick={(e) => { e.stopPropagation(); alert("Additional options not implemented."); }}
                  >
                    <i className="bi bi-three-dots"></i>
                  </button>
                </div>
                <textarea
                  className="form-control mb-3"
                  rows="6"
                  placeholder="Summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                ></textarea>
                <button className="btn btn-primary" onClick={saveSummary}>
                  Save
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <h2 className="mb-3">All Conversation Summaries</h2>
            {loadingBundled ? (
              <div className="text-center">Loading bundled summaries...</div>
            ) : errorBundled ? (
              <div className="alert alert-danger">{errorBundled}</div>
            ) : bundledSummaries.length > 0 ? (
              bundledSummaries.map((item) => (
                <div key={item.id} className="card mb-3" style={{ position: 'relative' }}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <h5 className="card-title">{item.title}</h5>
                      <button
                        className="btn btn-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDropdownSummaryId(prev => prev === item.id ? null : item.id);
                        }}
                      >
                        <i className="bi bi-three-dots"></i>
                      </button>
                    </div>
                    <p className="card-text">{item.summary}</p>
                    {dropdownSummaryId === item.id && (
                      <div
                        className="dropdown-menu show"
                        style={{
                          position: 'absolute',
                          top: '40px',
                          right: '10px',
                          backgroundColor: isDarkMode ? '#343a40' : '#fff',
                          color: isDarkMode ? '#fff' : '#000',
                          border: isDarkMode ? '1px solid #444' : '1px solid #ddd',
                          padding: '0.5rem',
                          zIndex: 1050
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button className="dropdown-item" onClick={() => handleEditSummary(item.id)} style={{ background: 'none', border: 'none' }}>
                          Edit
                        </button>
                        <button className="dropdown-item" onClick={() => handleDeleteSummary(item.id)} style={{ background: 'none', border: 'none' }}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div>No summaries available.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Summaries;