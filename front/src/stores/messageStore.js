import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { messageService } from '@/services/messageService';


export const useMessageStore = defineStore('message', () => {
  // State
  const messages = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const unreadCount = computed(() => 
    messages.value.filter(msg => !msg.isRead).length
  );
  
  const sortedMessages = computed(() => 
    [...messages.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  );

  // Actions
  async function fetchMessages() {
    loading.value = true;
    try {
      messages.value = await messageService.fetchMessages();
      error.value = null;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function createMessage(messageData) {
    loading.value = true;
    try {
      const message = new Message(messageData);
      const createdMessage = await messageService.createMessage(message);
      messages.value.unshift(createdMessage);
      error.value = null;
      return createdMessage;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function markAsRead(messageId) {
    try {
      const updatedMessage = await messageService.markAsRead(messageId);
      const index = messages.value.findIndex(msg => msg.id === messageId);
      if (index !== -1) {
        messages.value[index] = updatedMessage;
      }
      error.value = null;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  }

  async function deleteMessage(messageId) {
    try {
      await messageService.deleteMessage(messageId);
      messages.value = messages.value.filter(msg => msg.id !== messageId);
      error.value = null;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  }

  return {
    // State
    messages,
    loading,
    error,
    // Getters
    unreadCount,
    sortedMessages,
    // Actions
    fetchMessages,
    createMessage,
    markAsRead,
    deleteMessage
  };
}); 