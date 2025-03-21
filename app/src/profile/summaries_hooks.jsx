import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVertexAI, getGenerativeModel } from 'firebase/vertexai';
import { app, auth, firestore } from '../firebase.jsx';
import { doc, getDoc, updateDoc, collection, query, getDocs, deleteDoc } from 'firebase/firestore';
import prompts from '../meta/prompts.js';

export function useSummaries(conversationId, initialMessages) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState(initialMessages || []);
  const [bundledSummaries, setBundledSummaries] = useState([]);
  const [loadingBundled, setLoadingBundled] = useState(false);
  const [errorBundled, setErrorBundled] = useState('');
  const [dropdownSummaryId, setDropdownSummaryId] = useState(null);

  const fetchConversationMessages = async () => {
    if (conversationId && auth.currentUser) {
      const convRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
      const convDoc = await getDoc(convRef);
      if (convDoc.exists()) {
        const data = convDoc.data();
        if (data.summary) setSummary(data.summary);
        if (data.title) setTitle(data.title);
        setMessages(data.messages);
        return data.messages;
      }
    }
    return [];
  };

  const generateSummary = async () => {
    let convMessages = messages;
    if (!convMessages || convMessages.length === 0) {
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
        model: "gemini-2.0-flash",
        geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
      });
      const conversationText = convMessages.map(msg => `${msg.role}: ${msg.text}`).join('\n');
      const combinedPrompt = prompts.summarizer + "\n\nConversation:\n" + conversationText;
      const resultCombined = await model.generateContent(combinedPrompt);
      const responseText = resultCombined.response.text();
      const lines = responseText.split("\n").filter(line => line.trim() !== "");
      const generatedTitle = lines[0].replace(/\*\*/g, '').trim();
      const generatedSummary = lines.slice(1).join("\n").trim();

      setSummary(generatedSummary);
      setTitle(generatedTitle);

      if (conversationId && auth.currentUser) {
        const convRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
        await updateDoc(convRef, { summary: generatedSummary, title: generatedTitle });
      }
    } catch (err) {
      setError("Error during summarization: " + err.message);
    }
    setLoading(false);
  };

  const saveSummary = async () => {
    if (conversationId && auth.currentUser) {
      try {
        const convRef = doc(firestore, 'users', auth.currentUser.uid, 'conversations', conversationId);
        await updateDoc(convRef, { summary, title });
        navigate('/chat');
      } catch (err) {
        setError("Error saving summary: " + err.message);
      }
    }
  };

  const getAllSummaries = async () => {
    const user = auth.currentUser;
    if (!user) return [];
    const convRef = collection(firestore, 'users', user.uid, 'conversations');
    const q = query(convRef);
    const snapshot = await getDocs(q);
    const summariesArr = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.summary && data.title) {
        summariesArr.push({ id: docSnap.id, title: data.title, summary: data.summary });
      }
    });
    return summariesArr;
  };

  const handleDeleteSummary = async (id) => {
    if (!window.confirm("Are you sure you want to delete this summary?")) return;
    try {
      await deleteDoc(doc(firestore, 'users', auth.currentUser.uid, 'conversations', id));
      setBundledSummaries(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert("Error deleting summary: " + err.message);
    }
  };

  const handleEditSummary = (id) => {
    alert("Edit functionality not implemented.");
  };

  useEffect(() => {
    if (conversationId) {
      generateSummary();
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId && auth.currentUser) {
      setLoadingBundled(true);
      getAllSummaries()
        .then(result => {
          setBundledSummaries(result);
          setLoadingBundled(false);
        })
        .catch(err => {
          setErrorBundled("Error fetching bundled summaries: " + err.message);
          setLoadingBundled(false);
        });
    }
  }, [conversationId]);

  useEffect(() => {
    const handleClickOutside = () => setDropdownSummaryId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return {
    summary,
    setSummary,
    title,
    setTitle,
    loading,
    error,
    messages,
    bundledSummaries,
    loadingBundled,
    errorBundled,
    dropdownSummaryId,
    setDropdownSummaryId,
    generateSummary,
    saveSummary,
    handleDeleteSummary,
    handleEditSummary,
  };
}