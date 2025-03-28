import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import { app, auth, firestore } from '../firebase.jsx';
import { doc, getDoc, updateDoc, collection, query, getDocs, deleteDoc, orderBy, Timestamp } from 'firebase/firestore';
import prompts from '../meta/prompts.js';

export function useSummaries(conversationId = null, initialMessages = []) { // Default conversationId to null
  const navigate = useNavigate();
  // State for single summary view (used when conversationId is present)
  const [summary, setSummary] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false); // Loading for single summary operations
  const [error, setError] = useState('');
  const [messages, setMessages] = useState(initialMessages); // Messages for single summary generation

  // State for bundled summaries view (used when conversationId is null)
  const [bundledSummaries, setBundledSummaries] = useState([]); // Holds { id, title, summary, updatedAt }
  const [loadingBundled, setLoadingBundled] = useState(false); // Loading for fetching all summaries
  const [errorBundled, setErrorBundled] = useState('');

  // Fetch messages specifically for the single conversation view
  const fetchConversationMessages = useCallback(async () => {
    // Only run if conversationId is provided and user exists
    if (conversationId && auth.currentUser) {
      const convRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
      try {
        const convDoc = await getDoc(convRef);
        if (convDoc.exists()) {
          const data = convDoc.data();
          // Pre-populate fields if they exist
          if (data.summary) setSummary(data.summary);
          if (data.title) setTitle(data.title);
          const fetchedMessages = data.messages || [];
          setMessages(fetchedMessages); // Ensure messages is an array
          return fetchedMessages;
        } else {
            setError('Conversation not found.');
            return [];
        }
      } catch (err) {
        console.error("Error fetching conversation messages:", err);
        setError('Failed to load conversation messages.');
      }
    }
    return []; // Return empty array if no conversationId or error
  }, [conversationId]); // Dependency: only conversationId

  // Generate summary for the *current* conversationId (single view)
  const generateSummary = useCallback(async () => {
      if (!conversationId) {
          setError('No conversation ID provided for summary generation.');
          return;
      }

    let convMessages = messages;
    // If messages aren't loaded for single view, fetch them first
    if (!convMessages || convMessages.length === 0) {
       setLoading(true); // Show loading while fetching messages too
       convMessages = await fetchConversationMessages();
       // setLoading(false); // Loading will be handled by the main generation logic below
    }

    // Check again after fetching
    if (!convMessages || convMessages.length === 0) {
      setError('No messages found in this conversation to summarize.');
      setLoading(false); // Ensure loading stops if no messages
      return;
    }

    setLoading(true);
    setError('');
    try {
      const vertexAI = getVertexAI(app);
      const model = getGenerativeModel(vertexAI, {
        model: "gemini-1.5-flash",
        geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY, // Ensure API key is loaded
      });

      // Make sure messages are in the expected format
      const conversationText = convMessages
         .filter(msg => msg && msg.role && msg.text) // Basic validation
         .map(msg => `${msg.role}: ${msg.text}`)
         .join('\n');

        if (!conversationText) {
            throw new Error("Formatted conversation text is empty.");
        }

      const combinedPrompt = prompts.summarizer + "\n\nConversation:\n" + conversationText;
      const resultCombined = await model.generateContent(combinedPrompt);

      // Handle potential API errors or empty responses
       if (!resultCombined || !resultCombined.response || typeof resultCombined.response.text !== 'function') {
            throw new Error('Invalid response from AI model.');
       }
       const responseText = resultCombined.response.text();
       if (!responseText) {
            throw new Error('Empty response text from AI model.');
       }

      const lines = responseText.split("\n").filter(line => line.trim() !== "");

      let generatedTitle = "Untitled Summary";
      let generatedSummary = "Could not generate summary."; // Default error message

      // Improved parsing for Title/Summary, less prone to errors
       let summaryStartIndex = -1;
        if (lines.length > 0) {
             let firstLine = lines[0].replace(/\*\*/g, '').trim();
             if (firstLine.toLowerCase().startsWith("title:")) {
                 generatedTitle = firstLine.substring(6).trim() || generatedTitle;
                 summaryStartIndex = 1; // Summary starts from the next line
             } else {
                 // Assume first line IS the title if no "Title:" prefix
                 generatedTitle = firstLine || generatedTitle;
                 summaryStartIndex = 1;
             }
        }

        if (summaryStartIndex !== -1 && lines.length > summaryStartIndex) {
             let summaryLines = lines.slice(summaryStartIndex);
             let firstSummaryLine = summaryLines[0].trim();
             if (firstSummaryLine.toLowerCase().startsWith("summary:")) {
                 // Remove "Summary:" prefix from the first line
                 summaryLines[0] = firstSummaryLine.substring(8).trim();
             }
             generatedSummary = summaryLines.join("\n").trim() || generatedSummary;
        } else if (lines.length === 1 && !lines[0].toLowerCase().startsWith("title:")) {
             // Handle case where response might just be the summary text itself
             generatedSummary = lines[0].trim() || generatedSummary;
        }

      setSummary(generatedSummary);
      setTitle(generatedTitle);

      // Automatically save the newly generated summary if conversationId exists
      if (auth.currentUser) {
        const convRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
        // Use updateDoc, assuming the conversation document already exists
        await updateDoc(convRef, { summary: generatedSummary, title: generatedTitle, updatedAt: Timestamp.now() });
      }
    } catch (err) {
      setError("Error during summarization: " + err.message);
      console.error("Summarization error:", err);
       // Keep potentially partially generated content visible for user if desired? Or clear them?
       // setSummary(''); setTitle(''); // Option: Clear on error
    } finally {
      setLoading(false);
    }
  }, [conversationId, messages, fetchConversationMessages, prompts.summarizer]); // Dependencies for single summary generation

  // Save the edited title/summary for the *single* summary view
  const saveCurrentSummary = useCallback(async () => {
    // Requires conversationId, user, title, and summary
    if (conversationId && auth.currentUser && title && summary) {
      setLoading(true); // Indicate saving process
      try {
        const convRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
        await updateDoc(convRef, { summary, title, updatedAt: Timestamp.now() }); // Update timestamp on save
        setLoading(false);
        navigate('/profile'); // Navigate to profile page after saving single summary
      } catch (err) {
        setError("Error saving summary: " + err.message);
        console.error("Save summary error:", err);
        setLoading(false);
      }
    } else {
      setError("Cannot save - missing information, not logged in, or invalid data.");
       console.warn("Save aborted: ", { conversationId, user: !!auth.currentUser, title, summary });
    }
  }, [conversationId, title, summary, navigate]); // Dependencies for saving single summary

  // Fetch *all* summaries (bundled view)
  const fetchAndSetBundledSummaries = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setErrorBundled("User not logged in. Cannot fetch summaries.");
       setBundledSummaries([]); // Clear summaries if user logs out
      return; // Stop execution if no user
    }
    setLoadingBundled(true);
    setErrorBundled('');
    try {
      const convRef = collection(firestore, 'users', user.uid, 'conversations');
      // Query ordered by 'updatedAt' descending
      const q = query(convRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const summariesArr = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        // Include only conversations that HAVE a non-empty summary and title
        // And check for updatedAt timestamp
        if (data.summary && data.title && data.updatedAt) {
          summariesArr.push({
            id: docSnap.id,
            title: data.title,
            summary: data.summary,
            // Convert Firestore Timestamp to JS Date for easier sorting/display
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(0) // Fallback if not a Timestamp
          });
        }
      });
      setBundledSummaries(summariesArr); // Update state with fetched summaries
    } catch (err) {
      setErrorBundled("Error fetching summaries: " + err.message);
      console.error("Error fetching bundled summaries:", err);
      setBundledSummaries([]); // Clear on error
    } finally {
      setLoadingBundled(false);
    }
  }, []); // No explicit dependencies, but relies on auth.currentUser being checked inside

  // Delete a full conversation (used in bundled view)
  const handleDeleteSummary = useCallback(async (id) => {
     if (!id) return; // Need an ID
    // Confirmation dialog
    if (!window.confirm("Are you sure you want to delete this entire conversation and its summary permanently? This action cannot be undone.")) return;

    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to delete conversations.");
        return;
    };

    try {
      // Add loading indicator specific to this operation if needed, or reuse bundled loading
      // setLoadingBundled(true); // Optional: Indicate activity
      await deleteDoc(doc(firestore, 'users', user.uid, 'conversations', id));
      // Refetch summaries to update the list after deletion
      await fetchAndSetBundledSummaries(); // Call fetch to refresh the list
    } catch (err) {
      alert("Error deleting conversation: " + err.message);
      console.error("Error deleting conversation:", err);
      // setLoadingBundled(false); // Ensure loading stops on error if used
    }
    // No finally needed if not using specific loading state here
  }, [fetchAndSetBundledSummaries]); // Dependency on the refetch function

  // Update an existing summary's title and text (used in bundled view during edit)
  const handleUpdateSummary = useCallback(async (id, newTitle, newSummary) => {
      const user = auth.currentUser;
      // Basic validation
      if (!user || !id || !newTitle || !newSummary) {
          console.error("Update failed: Missing data or user not logged in.", {id, newTitle, newSummary, user: !!user});
          alert("Could not update summary. Missing information or not logged in.");
          return false; // Indicate failure
      }
      try {
        const convRef = doc(firestore, 'users', user.uid, 'conversations', id);
        await updateDoc(convRef, {
            title: newTitle,
            summary: newSummary,
            updatedAt: Timestamp.now() // Update the timestamp on edit
        });

        // Optimistically update the local state for immediate UI feedback
        const updatedDate = new Date(); // JS Date for local state
        setBundledSummaries(prev =>
            prev.map(item =>
                item.id === id ? { ...item, title: newTitle, summary: newSummary, updatedAt: updatedDate } : item
            ).sort((a, b) => b.updatedAt - a.updatedAt) // Re-sort after update
        );
        return true; // Indicate success
      } catch (err) {
         console.error("Error updating summary:", err);
         alert("Error updating summary: " + err.message);
         return false; // Indicate failure
      }
  }, [setBundledSummaries]); // Dependency on setBundledSummaries for optimistic update

  // Effect for the SINGLE summary view: Fetch messages and generate/fetch summary if conversationId provided
  useEffect(() => {
    if (conversationId && auth.currentUser) {
      // Fetch messages first, then generate summary if messages are available
      // generateSummary now includes fetching logic if messages are empty
      generateSummary();
    }
     // Clear single summary state if conversationId becomes null (e.g., navigating away)
     if (!conversationId) {
         setSummary('');
         setTitle('');
         setMessages([]);
         setError('');
         setLoading(false);
     }
  }, [conversationId, generateSummary]); // Rerun if conversationId changes or generateSummary function reference changes

  // Effect for the BUNDLED summaries view: Fetch all summaries if NO conversationId is provided
  useEffect(() => {
    // Only fetch bundled summaries when hook is used without a conversationId (e.g., in SummariesList)
    if (!conversationId && auth.currentUser) {
      fetchAndSetBundledSummaries();
    }
     // Clear bundled state if conversationId IS provided (switching to single view)
     // or if user logs out
     if (conversationId || !auth.currentUser) {
         setBundledSummaries([]);
         setErrorBundled('');
         setLoadingBundled(false);
     }

     // Re-fetch if user logs in/out (auth state change)
     const unsubscribe = auth.onAuthStateChanged(user => {
        if (!conversationId) { // Only refetch bundled if in that mode
            fetchAndSetBundledSummaries();
        }
     });
     return () => unsubscribe(); // Cleanup listener

  }, [conversationId, fetchAndSetBundledSummaries]); // Rerun if conversationId changes or fetch function reference changes

  return {
    // Single Summary Props
    summary,
    setSummary,
    title,
    setTitle,
    loading, // Loading for single view
    error,   // Error for single view
    messages,// Messages relevant to single view
    generateSummary,   // Regenerate single summary
    saveCurrentSummary,// Save single summary

    // Bundled Summaries Props
    bundledSummaries, // Sorted list for bundled view
    loadingBundled,   // Loading for bundled view
    errorBundled,     // Error for bundled view
    handleDeleteSummary, // Delete full conversation (used in list)
    handleUpdateSummary, // Update existing summary (used in list edit)
    setBundledSummaries, // Expose setter for optimistic updates in list
    // fetchAndSetBundledSummaries // Optionally expose refetch for manual refresh
  };
}