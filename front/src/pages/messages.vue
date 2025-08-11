<template>
  <v-container>
    <MainTitle title="Messages" :subtitle="`Consultez ici les messages envoyés par les utilisateurs`"  >
      <template v-slot:actions>
        <div class="d-flex ga-2 align-center">
        <v-btn
          color="surfaceContainerHigh"
          variant="flat"
          prepend-icon="mdi-plus"
          @click="openNewMessageDialog"
          rounded="xl " 
          flat
          height="32"
          size="small"
          >
            Nouveau message
          </v-btn>
          <!-- <v-btn
                prepend-icon="mdi-filter-variant"
                color="onBackground"
                @click="showFilters = !showFilters"
                rounded="lg"
                flat
                size="small"
                height="32"
              > Filtres
              </v-btn> -->
        </div>
      </template>
    </MainTitle>
  
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMessageStore } from '@/stores/messageStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';
import { useSnackbarStore } from '@/stores/snackbarStore';

const messageStore = useMessageStore();
const authStore = useAuthStore();
const router = useRouter();
const snackbarStore = useSnackbarStore();

// États
const messageDialog = ref(false);
const deleteDialog = ref(false);
const showFilters = ref(false);
const selectedMessage = ref(null);
const messageToDelete = ref(null);
const deleting = ref(false);

const filters = ref({
  type: null,
  status: 'all',
  search: ''
});

const messageTypes = [
  { title: 'Demande d\'assistance', value: 'assistance' },
  { title: 'Signaler un bug', value: 'review' },
  { title: 'Autre', value: 'other' }
];

// Computed
const filteredMessages = computed(() => {
  let messages = messageStore.sortedMessages;

  if (filters.value.type) {
    messages = messages.filter(msg => msg.type === filters.value.type);
  }

  if (filters.value.status !== 'all') {
    const isUnread = filters.value.status === 'unread';
    messages = messages.filter(msg => msg.isRead !== isUnread);
  }

  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    messages = messages.filter(msg => 
      msg.title.toLowerCase().includes(search) ||
      msg.content.toLowerCase().includes(search) ||
      msg.senderEmail.toLowerCase().includes(search)
    );
  }

  return messages;
});

// Méthodes
const getMessageIcon = (type) => {
  switch (type) {
    case 'assistance':
      return 'mdi-help-circle';
    case 'review':
      return 'mdi-bug';
    default:
      return 'mdi-email';
  }
};

const getMessageColor = (type) => {
  switch (type) {
    case 'assistance':
      return 'onBackground' ;
    case 'review':
      return 'onBackground' ;
    default:
      return 'primary';
  }
};

const getMessageTypeLabel = (type) => {
  const found = messageTypes.find(t => t.value === type);
  return found ? found.title : type;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const openMessageDetails = (message) => {
  selectedMessage.value = message;
  messageDialog.value = true;
  if (!message.isRead) {
    markAsRead(message._id);
  }
};

const markAsRead = async (messageId) => {
  try {
    await messageStore.markAsRead(messageId);

  } catch (error) {
    snackbarStore.showNotification('Erreur lors du marquage du message', 'error', 'mdi-alert-circle');
  }
};

const confirmDelete = (message) => {
  messageToDelete.value = message;
  deleteDialog.value = true;
  messageDialog.value = false;
};

const confirmDeleteAction = async () => {
  if (!messageToDelete.value) return;
  
  deleting.value = true;
  try {
    await messageStore.deleteMessage(messageToDelete.value._id);
    snackbarStore.showNotification('Message supprimé', 'onPrimary', 'mdi-delete');
    deleteDialog.value = false;
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de la suppression du message', 'error', 'mdi-alert-circle');
  } finally {
    deleting.value = false;
    messageToDelete.value = null;
  }
};

const openNewMessageDialog = () => {
  messageDialog.value = true;
};

// Lifecycle
onMounted(async () => {
  if (!authStore.isAdmin) {
    router.push('/dashboard');
    return;
  }
  try {
    await messageStore.fetchMessages();
  } catch (error) {
    snackbarStore.showNotification('Erreur lors du chargement des messages', 'error', 'mdi-alert-circle');
  }
});
</script>

<style scoped>


.message-item {
  border-radius: 16px !important;
  transition: all 0.2s ease;
  background-color: rgba(var(--v-theme-surfaceContainerHigh), 0.5);
  border: 1px solid rgba(var(--v-theme-surfaceContainerHigh), 0.1);
}

.message-item:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
  transform: translateY(0px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.unread {
  background-color: rgba(var(--v-theme-primary), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.2);
}

.message-content {
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
  white-space: pre-wrap;
  line-height: 1.6;
}

.gap-2 {
  gap: 8px;
}
</style> 