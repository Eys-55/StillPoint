import React, { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase.jsx';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { questions } from '../prompts.js';

function Questionnaire({ onComplete }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [fade, setFade] = useState(false);
  const user = auth.currentUser;

  // Check if questionnaire has already been completed
  useEffect(() => {
    async function checkQuestionnaire() {
      if (user) {
        const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCompleted(true);
          if (onComplete) onComplete();
        }
      }
      setLoading(false);
    }
    checkQuestionnaire();
  }, [user, onComplete]);

  // Fade effect trigger on question change
  useEffect(() => {
    setFade(false);
    const timer = setTimeout(() => setFade(true), 50);
    return () => clearTimeout(timer);
  }, [currentQuestionIndex]);

  // Handle answer selection and transition
  const handleAnswer = async (option) => {
    const newAnswers = [...answers, { question: questions[currentQuestionIndex].question, answer: option }];
    setAnswers(newAnswers);
    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 300);
    } else {
      // Save questionnaire responses per user in Firestore
      const docRef = doc(firestore, 'users', user.uid, 'questionnaire', 'responses');
      try {
        await setDoc(docRef, { answers: newAnswers, completedAt: new Date().toISOString() });
      } catch (err) {
        console.error("Error saving questionnaire:", err);
      }
      setCompleted(true);
      if (onComplete) onComplete();
    }
  };

  if (loading) return <div className="container my-5 text-center">Loading questionnaire...</div>;
  if (completed) return null;

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