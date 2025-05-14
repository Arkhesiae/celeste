<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card class="pa-4">
          <div class="d-flex justify-space-between align-center mb-4">
            <h1 class="text-h4">Messages</h1>
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="openNewMessageDialog"
            >
              Nouveau message
            </v-btn>
          </div>

          <v-list v-if="!messageStore.loading">
            <v-list-item
              v-for="message in messageStore.sortedMessages"
              :key="message.id"
              :class="{ 'unread': !message.isRead }"
              class="mb-2"
            >
              <template v-slot:prepend>
                <v-badge
                  :color="message.isRead ? 'grey' : 'primary'"
                  :dot="!message.isRead"
                  class="mr-2"
                >
                  <v-icon :icon="message.isRead ? 'mdi-email-outline' : 'mdi-email'"></v-icon>
                </v-badge>
              </template>

              <v-list-item-title class="text-h6">
                {{ message.title }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ new Date(message.createdAt).toLocaleDateString() }}
              </v-list-item-subtitle>

              <template v-slot:append>
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  color="error"
                  @click="deleteMessage(message.id)"
                ></v-btn>
              </template>
            </v-list-item>
          </v-list>

          <v-progress-circular
            v-else
            indeterminate
            color="primary"
            class="ma-4"
          ></v-progress-circular>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog pour nouveau message -->
    <v-dialog v-model="newMessageDialog" max-width="600px">
      <v-card>
        <v-card-title>Nouveau message</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="createMessage">
            <v-text-field
              v-model="newMessage.title"
              label="Titre"
              required
            ></v-text-field>
            <v-textarea
              v-model="newMessage.content"
              label="Contenu"
              required
            ></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="newMessageDialog = false"
          >
            Annuler
          </v-btn>
          <v-btn
            color="primary"
            @click="createMessage"
            :loading="messageStore.loading"
          >
            Envoyer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMessageStore } from '@/stores/messageStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';

const messageStore = useMessageStore();
const authStore = useAuthStore();
const router = useRouter();

const newMessageDialog = ref(false);
const newMessage = ref({
  title: '',
  content: ''
});

onMounted(async () => {
  if (!authStore.isAdmin || authStore.adminType !== 'master') {
    router.push('/dashboard');
    return;
  }
  await messageStore.fetchMessages();
});

const openNewMessageDialog = () => {
  newMessage.value = {
    title: '',
    content: ''
  };
  newMessageDialog.value = true;
};

const createMessage = async () => {
  try {
    await messageStore.createMessage({
      ...newMessage.value,
      senderId: authStore.userId
    });
    newMessageDialog.value = false;
  } catch (error) {
    console.error('Erreur lors de la création du message:', error);
  }
};

const deleteMessage = async (messageId) => {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
    try {
      await messageStore.deleteMessage(messageId);
    } catch (error) {
      console.error('Erreur lors de la suppression du message:', error);
    }
  }
};
</script>

<style scoped>
.unread {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.v-list-item {
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.v-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}
</style> 