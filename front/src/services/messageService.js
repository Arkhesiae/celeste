import { API_URL } from '@/config/api';


export const messageService = {
  async fetchMessages() {
    const response = await fetch(`${API_URL}/messages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) throw new Error('Erreur lors de la récupération des messages');
    const data = await response.json();
  
  },

  async createMessage(message) {
    const response = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(message.toJSON())
    });
    if (!response.ok) throw new Error('Erreur lors de la création du message');
    const data = await response.json();
   
  },

  async markAsRead(messageId) {
    const response = await fetch(`${API_URL}/messages/${messageId}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) throw new Error('Erreur lors du marquage du message comme lu');
    const data = await response.json();
 
  },

  async deleteMessage(messageId) {
    const response = await fetch(`${API_URL}/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) throw new Error('Erreur lors de la suppression du message');
    return true;
  }
}; 