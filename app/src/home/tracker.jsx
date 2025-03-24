import React, { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase.jsx';
import { collection, query, getDocs } from 'firebase/firestore';

function Tracker() {
  const [conversationDays, setConversationDays] = useState([]);

  useEffect(() => {
    const fetchConversations = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const convRef = collection(firestore, 'users', user.uid, 'conversations');
      const q = query(convRef);
      const snapshot = await getDocs(q);
      const days = new Set();
      const now = new Date();
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.createdAt && data.createdAt.toDate) {
          const date = data.createdAt.toDate();
          if(date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()){
            days.add(date.getDate());
          }
        }
      });
      setConversationDays([...days]);
    };
    fetchConversations();
  }, []);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  
  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  
  return (
    <div style={{ margin: '1rem 0' }}>
      <h3>{monthName} {year}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => (
              <th key={day} style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={{ border: '1px solid #ccc', padding: '0.5rem', textAlign: 'center' }}>
                  {cell ? (
                    <span style={{
                      display: 'inline-block',
                      width: '24px',
                      height: '24px',
                      lineHeight: '24px',
                      borderRadius: '50%',
                      backgroundColor: conversationDays.includes(cell) ? '#ffeb3b' : 'transparent'
                    }}>
                      {cell}
                    </span>
                  ) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Tracker;