import React, { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase.jsx';
import { collection, query, getDocs, Timestamp } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box, useTheme, styled } from '@mui/material';

const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Shortened labels

// Styled component for calendar cells
const CalendarCell = styled(TableCell)(({ theme }) => ({
  border: 'none', // Remove default borders
  padding: theme.spacing(0.5), // Adjust padding as needed
  height: 48, // Fixed height for cells
  width: 48,  // Fixed width for cells
  textAlign: 'center',
  verticalAlign: 'middle',
  boxSizing: 'border-box',
}));

// Styled component for the day number container
const DayBox = styled(Box)(({ theme, highlighted }) => ({
  width: 32, // Circle size
  height: 32,
  lineHeight: '32px',
  borderRadius: '50%', // Perfect circle
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: 'auto',
  fontSize: '0.875rem',
  backgroundColor: highlighted ? theme.palette.success.light : 'transparent', // Use success.light for highlight
  color: highlighted ? theme.palette.success.contrastText : theme.palette.text.primary,
  fontWeight: highlighted ? 'medium' : 'normal',
  transition: 'background-color 0.2s ease-in-out', // Smooth transition on state change (if needed)
}));


function Tracker() {
  const [conversationDays, setConversationDays] = useState([]);
  const theme = useTheme();

  useEffect(() => {
    const fetchConversations = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const convRef = collection(firestore, 'users', user.uid, 'conversations');
      // Consider adding orderBy and limit if performance becomes an issue
      const q = query(convRef);

      try {
        const snapshot = await getDocs(q);
        const days = new Set();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.createdAt && data.createdAt instanceof Timestamp) {
            const date = data.createdAt.toDate();
            // Check if the conversation is in the current month and year
            if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
              days.add(date.getDate());
            }
          } else if (data.createdAt) {
             console.warn("Conversation found with non-Timestamp createdAt:", data.createdAt);
          }
        });
        setConversationDays([...days]);
      } catch (error) {
        console.error("Error fetching conversations for tracker:", error);
      }
    };

    // Fetch immediately if user is already logged in
    if (auth.currentUser) {
        fetchConversations();
    }

    // Use onAuthStateChanged for reliability on login/logout
    const unsubscribe = auth.onAuthStateChanged(user => {
        if (user) {
            fetchConversations();
        } else {
            setConversationDays([]); // Clear if logged out
        }
    });

    return () => unsubscribe(); // Cleanup listener

  }, []); // Run once on mount, listener handles user changes

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

  // Create calendar grid data
  const calendarGrid = [];
  let dayCounter = 1;
  for (let week = 0; week < 6; week++) {
    const weekRow = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      if ((week === 0 && dayOfWeek < firstDayOfMonth) || dayCounter > daysInMonth) {
        weekRow.push(null); // Empty cells
      } else {
        weekRow.push(dayCounter++); // Cells with day numbers
      }
    }
    calendarGrid.push(weekRow);
    if (dayCounter > daysInMonth && weekRow.every(d => d === null)) {
        // Optional: don't add trailing empty rows
        // calendarGrid.pop(); // Remove if the whole row is null after month ends
    }
    if (dayCounter > daysInMonth && week > 3) break; // Ensure we don't create excessive empty rows
  }

  return (
    <Paper
        elevation={2}
        sx={{
            p: { xs: 1.5, sm: 2 }, // Slightly adjust padding
            mt: 0, // Remove default margin top if spacing handled by Stack
            mb: 0, // Remove default margin bottom if spacing handled by Stack
            borderRadius: 4, // Rounded corners
            overflow: 'hidden' // Ensure content respects border radius
        }}
    >
      <Typography variant="h6" component="h3" gutterBottom align="center" sx={{ fontWeight: 'medium', mt: 1 }}>
        {monthName} {year} Activity
      </Typography>
      <TableContainer> {/* Keep TableContainer for potential overflow handling */}
        <Table size="small" sx={{ tableLayout: 'fixed' }}> {/* Fixed layout for equal cells */}
          <TableHead>
            <TableRow>
              {dayLabels.map((day) => (
                <TableCell
                  key={day}
                  align="center"
                  sx={{
                      fontWeight: 'bold',
                      p: 0.5,
                      border: 'none', // No header borders
                      color: 'text.secondary',
                      fontSize: '0.75rem'
                    }}
                >
                  {day}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {calendarGrid.map((week, weekIndex) => (
              <TableRow key={weekIndex} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                {week.map((day, dayIndex) => {
                  const isConversationDay = day !== null && conversationDays.includes(day);
                  return (
                    <CalendarCell key={`${weekIndex}-${dayIndex}`}>
                      {day !== null && (
                        <DayBox highlighted={isConversationDay}>
                          {day}
                        </DayBox>
                      )}
                    </CalendarCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
       <Typography variant="caption" display="block" sx={{ mt: 1.5, mb: 1, textAlign: 'center', color: 'text.secondary' }}>
         <Box component="span" sx={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.light', mr: 0.5, verticalAlign: 'middle' }}/>
          Days with chat activity
       </Typography>
    </Paper>
  );
}

export default Tracker;