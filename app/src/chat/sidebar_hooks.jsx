import { useCallback } from 'react';
import { auth, firestore } from '../firebase.jsx';
import { collection, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';

export const useSidebarHandlers = ({
  activeConversationId,
  conversations,
  setActiveConversationId,
  setConversations,
  setIsSidebarCollapsed,
  setDropdownVisibleId
}) => {
  const handleNewConversation = useCallback(async () => {
    if (activeConversationId) {
      const currentConv = conversations.find(conv => conv.id === activeConversationId);
      if (currentConv && currentConv.title === "New Conversation") {
        return;
      }
    }
    const user = auth.currentUser;
    if (!user) return;
    const convRef = collection(firestore, 'users', user.uid, 'conversations');
    const newConv = {
      title: "New Conversation",
      messages: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(convRef, newConv);
    setActiveConversationId(docRef.id);
  }, [activeConversationId, conversations, setActiveConversationId]);

  const handleDeleteWithMemories = useCallback(async (conv) => {
    if (!window.confirm("Are you sure you want to delete this conversation along with its memories?")) return;
    try {
      const user = auth.currentUser;
      if (!user || !conv) return;
      await deleteDoc(doc(firestore, 'users', user.uid, 'conversations', conv.id));
      setConversations(prev => prev.filter(c => c.id !== conv.id));
      setDropdownVisibleId(null);
    } catch (error) {
      console.error("Error deleting conversation with memories: ", error);
    }
  }, [setConversations, setDropdownVisibleId]);

  const handleConversationClick = useCallback((id) => {
    setActiveConversationId(id);
    setIsSidebarCollapsed(true);
  }, [setActiveConversationId, setIsSidebarCollapsed]);

  return { handleNewConversation, handleDeleteWithMemories, handleConversationClick };
};
