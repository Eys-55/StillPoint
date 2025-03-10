import { firestore, auth } from './firebase.jsx';
import { collection, query, getDocs } from 'firebase/firestore';

export async function getAllSummaries() {
  const user = auth.currentUser;
  if (!user) return '';
  const convRef = collection(firestore, 'users', user.uid, 'conversations');
  const q = query(convRef);
  const snapshot = await getDocs(q);
  const summaries = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.summary) summaries.push(data.summary);
  });
  const disclaimer = "Note: Bundled summaries are from previous conversations only. They represent past chats and may not reflect the current conversation. (Use them as reference for the current conversation.)";
  return disclaimer + "\n" + summaries.join('\n');
}