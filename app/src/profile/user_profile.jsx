import React, { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase.jsx';
import { doc, getDoc } from 'firebase/firestore';
import Header from '../nav/header.jsx';
import { useNavigate } from 'react-router-dom';

function UserProfile() {
  const [questionnaireData, setQuestionnaireData] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (user) {
        try {
          const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setQuestionnaireData(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching questionnaire data:", error);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const handleSummaries = () => {
    navigate('/summaries');
  };

  const handleEditQuestionnaire = () => {
    navigate('/get-started');
  };

  if (!user) return <div>Loading user data...</div>;

  return (
    <div>
      <Header mode="profile" darkMode={document.body.getAttribute("data-bs-theme") === "dark"} />
      <div className="container my-4">
        <h1>User Profile</h1>
        <div className="mb-3">
          <p><strong>Email:</strong> {user.email}</p>
        </div>
        <div className="mb-3">
          <h2>Questionnaire Responses</h2>
          {loading ? (
            <p>Loading questionnaire responses...</p>
          ) : questionnaireData && questionnaireData.answers ? (
            questionnaireData.answers.map((item, index) => (
              <div key={index} className="mb-2">
                <p><strong>Q:</strong> {item.question}</p>
                <p><strong>A:</strong> {item.answer}</p>
              </div>
            ))
          ) : (
            <p>No questionnaire responses found.</p>
          )}
          {questionnaireData && questionnaireData.answers && (
            <button className="btn btn-secondary mt-3" onClick={handleEditQuestionnaire}>
              Edit Questionnaire Responses
            </button>
          )}
        </div>
        <div className="mb-3">
          <button className="btn btn-primary" onClick={handleSummaries}>
            View Conversation Summaries
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;