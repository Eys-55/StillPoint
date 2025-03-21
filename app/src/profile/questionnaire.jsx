import React, { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase.jsx';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { questions } from '../meta/questions.js';
import { useNavigate } from 'react-router-dom';

function Questionnaire() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditable, setIsEditable] = useState(false);
  const [fade, setFade] = useState(false);
  const user = auth.currentUser;
  const navigate = useNavigate();

  // Check if questionnaire responses already exist
  useEffect(() => {
    async function checkQuestionnaire() {
      if (user) {
        const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          // Set answers from stored data, ensuring the array aligns with questions length
          const storedAnswers = docSnap.data().answers || [];
          setAnswers(storedAnswers);
          setIsEditable(true);
        }
      }
      setLoading(false);
    }
    checkQuestionnaire();
  }, [user, navigate]);

  // Fade effect for interactive mode only
  useEffect(() => {
    if (!isEditable) {
      setFade(false);
      const timer = setTimeout(() => setFade(true), 50);
      return () => clearTimeout(timer);
    }
  }, [currentQuestionIndex, isEditable]);

  // Interactive mode: handle answer selection for first-time responses
  const handleAnswer = async (option) => {
    const newAnswer = { question: questions[currentQuestionIndex].question, answer: option };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 300);
    } else {
      const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
      try {
        await setDoc(docRef, { answers: newAnswers, completedAt: new Date().toISOString() });
      } catch (err) {
        console.error("Error saving questionnaire:", err);
      }
      navigate('/profile');
    }
  };

  // Edit mode: handle selection update for an answer
  const handleSelectOption = (qIndex, option) => {
    const updatedAnswers = [...answers];
    // Ensure an answer object exists for this question; if not, create one
    if (!updatedAnswers[qIndex]) {
      updatedAnswers[qIndex] = { question: questions[qIndex].question, answer: option };
    } else {
      updatedAnswers[qIndex].answer = option;
    }
    setAnswers(updatedAnswers);
  };

  // Save updated answers in edit mode
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
    try {
      await setDoc(docRef, { answers, completedAt: new Date().toISOString() });
      navigate('/profile');
    } catch (err) {
      console.error("Error updating questionnaire:", err);
    }
  };

  if (loading) return <div className="container my-5 text-center">Loading questionnaire...</div>;

  if (isEditable) {
    // Render all questions in edit mode with selectable options
    return (
      <div className="container my-5">
        <div className="card mx-auto" style={{ maxWidth: "600px" }}>
          <div className="card-body">
            <h5 className="card-title">Edit Questionnaire Responses</h5>
            <form onSubmit={handleSaveEdit}>
              {questions.map((q, idx) => {
                // Get current selected answer if available
                const currentAnswer = answers[idx] ? answers[idx].answer : "";
                return (
                  <div key={idx} className="mb-3">
                    <p><strong>Q:</strong> {q.question}</p>
                    <div>
                      {q.options.map((option, optionIdx) => (
                        <button
                          type="button"
                          key={optionIdx}
                          className={`btn m-1 ${currentAnswer === option ? "btn-primary" : "btn-outline-primary"}`}
                          onClick={() => handleSelectOption(idx, option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button type="submit" className="btn btn-primary">Save Changes</button>
              <button type="button" className="btn btn-secondary ms-2" onClick={() => navigate('/profile')}>Cancel</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Interactive mode for first-time answering
  return (
    <div className="container my-5">
      <div className="card mx-auto" style={{ maxWidth: "600px" }}>
        <div className={`card-body fade ${fade ? "show" : ""}`}>
          <h5 className="card-title">Question {currentQuestionIndex + 1} of {questions.length}</h5>
          <p className="card-text">{questions[currentQuestionIndex].question}</p>
          <div>
            {questions[currentQuestionIndex].options.map((option, idx) => (
              <button key={idx} className="btn btn-outline-primary m-1" onClick={() => handleAnswer(option)}>
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Questionnaire;