import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../nav/header.jsx';
import { auth, firestore } from '../firebase.jsx';
import { doc, getDoc } from 'firebase/firestore';
import Tracker from './tracker.jsx';

function Home() {
  const navigate = useNavigate();
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(null);

  useEffect(() => {
    async function checkQuestionnaire() {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
        const docSnap = await getDoc(docRef);
        setQuestionnaireCompleted(docSnap.exists());
      } else {
        setQuestionnaireCompleted(false);
      }
    }
    checkQuestionnaire();
  }, []);

  const handleChat = () => {
    if (!questionnaireCompleted) {
      alert("Please answer the questionnaire first.");
      return;
    }
    navigate('/chat');
  };

  const handleProfile = () => {
    if (!questionnaireCompleted) {
      alert("Please answer the questionnaire first.");
      return;
    }
    navigate('/profile');
  };

  return (
    <div>
      <Header mode="home" darkMode={document.body.getAttribute("data-bs-theme") === "dark"} />
      <div className="container my-4">
        <h1>Welcome to the Mental Health App</h1>
        {questionnaireCompleted === false && (
          <div className="mb-3">
            <div className="alert alert-warning">
              You have not answered your questionnaire yet. Please complete it to receive personalized recommendations.
            </div>
            <button className="btn btn-outline-primary" onClick={() => navigate('/get-started')}>
              Answer Questionnaire
            </button>
          </div>
        )}
        <div>
          <p>This is your home page. Here you can view your stats and learn about the app features.</p>
          <p>Placeholder for stats and additional details.</p>
          <Tracker />
          <div className="d-flex gap-2">
            <button className="btn btn-secondary" onClick={handleProfile}>
              View Profile
            </button>
            <button className="btn btn-primary" onClick={handleChat}>
              Go to Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;