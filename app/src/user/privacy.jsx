import React from 'react';

function Privacy() {
  const isDarkMode = document.body.getAttribute("data-bs-theme") === "dark";
  const containerClass = isDarkMode ? 'bg-dark text-light' : 'bg-light text-dark';

  return (
    <div className={`container py-5 ${containerClass}`}>
      <h1>Privacy Policy</h1>
      <p>
        This app respects your privacy. Your personal data is handled securely and in accordance with privacy regulations.
      </p>
      <p>
        All information you provide is used solely for enhancing your experience and is never shared without your consent.
      </p>
      <p>
        For any concerns or further details, please contact our support team.
      </p>
    </div>
  );
}

export default Privacy;