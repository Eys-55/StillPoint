import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header.jsx';
import { app, auth, firestore } from './firebase.jsx';
import { collection, getDocs } from 'firebase/firestore';

function Summaries() {
  const navigate = useNavigate();
  const [summariesList, setSummariesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchSummaries() {
      try {
        if (auth.currentUser) {
          const conversationsRef = collection(firestore, 'users', auth.currentUser.uid, 'conversations');
          const querySnapshot = await getDocs(conversationsRef);
          const summaries = [];
          querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.summary) {
              summaries.push({ id: doc.id, title: data.title || 'Untitled Conversation', summary: data.summary });
            }
          });
          setSummariesList(summaries);
        }
      } catch (err) {
        setError('Failed to fetch summaries: ' + err.message);
      }
      setLoading(false);
    }
    fetchSummaries();
  }, []);

  const handleBack = () => {
    navigate('/chat');
  };

  return (
    <div>
      <Header mode="summaries" onBack={handleBack} darkMode={false} />
      <div className="container my-4">
        <h2 className="mb-3">All Conversation Summaries</h2>
        {loading ? (
          <div className="text-center">Loading summaries...</div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : summariesList.length === 0 ? (
          <div className="alert alert-info">No summaries available.</div>
        ) : (
          <div>
            {summariesList.map(item => (
              <div key={item.id} className="card mb-3">
                <div className="card-header">
                  {item.title}
                </div>
                <div className="card-body">
                  <p className="card-text">{item.summary}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Summaries;