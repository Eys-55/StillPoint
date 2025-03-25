import React, { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase.jsx';
import { collection, query, getDocs, Timestamp } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box, useTheme } from '@mui/material';

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Tracker() {
  const [conversationDays, setConversationDays] = useState([]);
  const theme = useTheme();

  useEffect(() => {
    const fetchConversations = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const convRef = collection(firestore, 'users', user.uid, 'conversations');
      const q = query(convRef);

      try {
        const snapshot = await getDocs(q);
        const days = new Set();
        const now = new Date();
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          // Ensure createdAt exists and is a Firestore Timestamp
          if (data.createdAt && data.createdAt instanceof Timestamp) {
            const date = data.createdAt.toDate();
            // Check if the conversation is in the current month and year
            if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
              days.add(date.getDate());
            }
          } else if (data.createdAt) {
             // Handle potential older data stored differently (e.g., as string or number) - adjust if needed
             console.warn("Conversation found with non-Timestamp createdAt:", data.createdAt);
          }
        });
        setConversationDays([...days]);
      } catch (error) {
        console.error("Error fetching conversations for tracker:", error);
      }
    };

    fetchConversations();
    // Rerun if the user changes (though typically user is stable within this view)
    const unsubscribe = auth.onAuthStateChanged(user => {
        if (user) {
            fetchConversations();
        } else {
            setConversationDays([]); // Clear if logged out
        }
    });

    return () => unsubscribe(); // Cleanup listener

  }, []); // Dependency array is empty as we rely on auth state change listener

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, ...

  // Create calendar grid data
  const calendarGrid = [];
  let dayCounter = 1;
  for (let week = 0; week < 6; week++) { // Max 6 weeks needed
    const weekRow = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      if (week === 0 && dayOfWeek < firstDayOfMonth) {
        // Empty cells before the first day
        weekRow.push(null);
      } else if (dayCounter <= daysInMonth) {
        // Cells with day numbers
        weekRow.push(dayCounter);
        dayCounter++;
      } else {
        // Empty cells after the last day
        weekRow.push(null);
      }
    }
    calendarGrid.push(weekRow);
    if (dayCounter > daysInMonth) break; // Stop adding rows if month is finished
  }

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 3, mb: 3 }}>
      <Typography variant="h5" component="h3" gutterBottom align="center">
        {monthName} {year} Activity
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {dayLabels.map((day) => (
                <TableCell key={day} align="center" sx={{ fontWeight: 'bold', p: 0.5 }}>
                  {day}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {calendarGrid.map((week, weekIndex) => (
              <TableRow key={weekIndex}>
                {week.map((day, dayIndex) => {
                  const isConversationDay = day !== null && conversationDays.includes(day);
                  return (
                    <TableCell
                      key={`${weekIndex}-${dayIndex}`}
                      align="center"
                      sx={{
                        border: `1px solid ${theme.palette.divider}`,
                        p: 0.5,
                        height: 40, // Fixed height for cells
                        width: 40,  // Fixed width for cells
                      }}
                    >
                      {day !== null && (
                        <Box
                          sx={{
                            width: '28px', // Circle size
                            height: '28px',
                            lineHeight: '28px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: 'auto',
                            backgroundColor: isConversationDay ? theme.palette.warning.light : 'transparent',
                            color: isConversationDay ? theme.palette.warning.contrastText : theme.palette.text.primary,
                            fontWeight: isConversationDay ? 'bold' : 'normal',
                          }}
                        >
                          {day}
                        </Box>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
       <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
         Highlighted days indicate a chat session.
       </Typography>
    </Paper>
  );
}

export default Tracker;