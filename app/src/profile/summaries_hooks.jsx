import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import { app, auth, firestore } from '../firebase.jsx';
import { doc, getDoc, updateDoc, collection, query, getDocs, deleteDoc, orderBy, Timestamp } from 'firebase/firestore';
import prompts from '../meta/prompts.js';

export function useSummaries(conversationId, initialMessages) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false); // Loading for single summary generation/saving
  const [error, setError] = useState('');
  const [messages, setMessages] = useState(initialMessages || []);
  const [bundledSummaries, setBundledSummaries] = useState([]); // Holds { id, title, summary, updatedAt }
  const [loadingBundled, setLoadingBundled] = useState(false); // Loading for fetching all summaries
  const [errorBundled, setErrorBundled] = useState('');

  // Fetch messages for a specific conversation (used for single summary generation)
  const fetchConversationMessages = useCallback(async () => {
    if (conversationId && auth.currentUser) {
      const convRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
      try {
        const convDoc = await getDoc(convRef);
        if (convDoc.exists()) {
          const data = convDoc.data();
          if (data.summary) setSummary(data.summary);
          if (data.title) setTitle(data.title);
          setMessages(data.messages || []); // Ensure messages is an array
          return data.messages || [];
        }
      } catch (err) {
        console.error("Error fetching conversation messages:", err);
        setError('Failed to load conversation messages.');
      }
    }
    return [];
  }, [conversationId]);

  // Generate summary for the current conversationId
  const generateSummary = useCallback(async () => {
    let convMessages = messages;
    // If messages aren't loaded yet for the single view, fetch them
    if ((!convMessages || convMessages.length === 0) && conversationId) {
      convMessages = await fetchConversationMessages();
    }
    if (!convMessages || convMessages.length === 0) {
      setError('No conversation messages available for summarization.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const vertexAI = getVertexAI(app);
      const model = getGenerativeModel(vertexAI, {
        model: "gemini-1.5-flash", // Updated model potentially
        geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
      });
      const conversationText = convMessages.map(msg => `${msg.role}: ${msg.text}`).join('\n');
      const combinedPrompt = prompts.summarizer + "\n\nConversation:\n" + conversationText;
      const resultCombined = await model.generateContent(combinedPrompt);
      const responseText = resultCombined.response.text();
      const lines = responseText.split("\n").filter(line => line.trim() !== "");

      let generatedTitle = "Untitled Summary";
      let generatedSummary = "No summary generated.";

      if (lines.length > 0) {
          generatedTitle = lines[0].replace(/\*\*/g, '').trim();
          if (generatedTitle.toLowerCase().startsWith("title:")) {
            generatedTitle = generatedTitle.slice(6).trim();
          }
      }
      if (lines.length > 1) {
          generatedSummary = lines.slice(1).join("\n").trim();
          if (generatedSummary.toLowerCase().startsWith("summary:")) {
            generatedSummary = generatedSummary.slice(8).trim();
          }
      }


      setSummary(generatedSummary);
      setTitle(generatedTitle);

      // Save the newly generated summary immediately if conversationId exists
      if (conversationId && auth.currentUser) {
        const convRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
        await updateDoc(convRef, { summary: generatedSummary, title: generatedTitle });
      }
    } catch (err) {
      setError("Error during summarization: " + err.message);
      console.error("Summarization error:", err);
    } finally {
      setLoading(false);
    }
  }, [messages, conversationId, fetchConversationMessages, prompts.summarizer]);

  // Save the edited title/summary for the *single* summary view
  const saveCurrentSummary = useCallback(async () => {
    if (conversationId && auth.currentUser && title && summary) {
        setLoading(true);
      try {
        const convRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
        await updateDoc(convRef, { summary, title });
        setLoading(false);
        navigate('/chat'); // Navigate back after saving
      } catch (err) {
        setError("Error saving summary: " + err.message);
        setLoading(false);
      }
    } else {
        setError("Cannot save - missing information or not logged in.");
    }
  }, [conversationId, title, summary, navigate]);

  // Fetch *all* summaries and sort them
  const fetchAndSetBundledSummaries = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
        setErrorBundled("User not logged in.");
        return;
    };
    setLoadingBundled(true);
    setErrorBundled('');
    try {
      const convRef = collection(firestore, 'users', user.uid, 'conversations');
      // Order by 'updatedAt' descending in the query itself
      const q = query(convRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const summariesArr = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        // Include only conversations that HAVE a summary and title
        if (data.summary && data.title && data.updatedAt) {
          summariesArr.push({
              id: docSnap.id,
              title: data.title,
              summary: data.summary,
              // Convert Firestore Timestamp to JS Date for easier handling, or keep as Timestamp
              updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date() // Fallback to now if format is unexpected
          });
        }
      });
      setBundledSummaries(summariesArr);
    } catch (err) {
      setErrorBundled("Error fetching summaries: " + err.message);
      console.error("Error fetching bundled summaries:", err);
    } finally {
        setLoadingBundled(false);
    }
  }, []); // Dependencies: auth.currentUser implicitly checked inside

  // Delete a full conversation (including summary)
  const handleDeleteSummary = useCallback(async (id) => {
    if (!window.confirm("Are you sure you want to delete this conversation and its summary permanently?")) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
      await deleteDoc(doc(firestore, 'users', user.uid, 'conversations', id));
      // Refetch summaries to update the list
      await fetchAndSetBundledSummaries();
    } catch (err) {
      alert("Error deleting conversation: " + err.message);
      console.error("Error deleting conversation:", err);
    }
  }, [fetchAndSetBundledSummaries]); // Dependency on refetch function

  // Update an existing summary's title and text
  const handleUpdateSummary = useCallback(async (id, newTitle, newSummary) => {
     const user = auth.currentUser;
     if (!user || !id || !newTitle || !newSummary) {
         console.error("Update failed: Missing data or user not logged in.");
         return false; // Indicate failure
     }
     try {
        const convRef = doc(firestore, 'users', user.uid, 'conversations', id);
        await updateDoc(convRef, {
            title: newTitle,
            summary: newSummary,
            updatedAt: Timestamp.now() // Update the timestamp on edit
        });
        // Optimistically update the local state or refetch
        setBundledSummaries(prev => prev.map(item =>
            item.id === id ? { ...item, title: newTitle, summary: newSummary, updatedAt: new Date() } : item
          ).sort((a, b) => b.updatedAt - a.updatedAt) // Re-sort after update
        );
        return true; // Indicate success
     } catch (err) {
         console.error("Error updating summary:", err);
         alert("Error updating summary: " + err.message);
         return false; // Indicate failure
     }
  }, []); // No external dependencies needed here

  // Effect for fetching single summary data if conversationId is provided
  useEffect(() => {
    if (conversationId) {
      generateSummary(); // Generate/fetch summary for the specific conversation
    }
  }, [conversationId, generateSummary]); // Rerun if conversationId changes

  // Effect for fetching all summaries if no specific conversationId is provided
  useEffect(() => {
    // Only fetch bundled summaries when on the main summaries page (no conversationId)
    if (!conversationId && auth.currentUser) {
      fetchAndSetBundledSummaries();
    }
  }, [conversationId, fetchAndSetBundledSummaries]); // Rerun if conversationId changes or user logs in/out (implicitly via fetch function check)


  return {
    summary,
    setSummary,
    title,
    setTitle,
    loading, // For single summary view
    error,   // For single summary view
    messages,
    bundledSummaries, // Sorted list for bundled view
    loadingBundled,   // For bundled view
    errorBundled,     // For bundled view
    generateSummary,    // Regenerate single summary
    saveCurrentSummary, // Save single summary
    handleDeleteSummary,// Delete conversation/summary
    handleUpdateSummary // Update existing summary (title/text)
    // Removed dropdown state and handleEditSummary (placeholder)
  };
}