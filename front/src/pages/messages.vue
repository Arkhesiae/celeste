<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card class="pa-6" rounded="xl" color="transparent" flat>
          <div class="d-flex justify-space-between align-start mb-4">
            <div>
              <h1 class="text-h4 mb-2">Messages</h1>
              <v-chip
                v-if="messageStore.unreadCount > 0"
                color="remplacement"
                class="mt-1"
                rounded="lg"
              >
                {{ messageStore.unreadCount }} message(s) non lu(s)
              </v-chip>
            </div>
            <div class="d-flex ga-2 align-center">
              <v-btn
                color="primary"
                prepend-icon="mdi-plus"
                @click="openNewMessageDialog"
                rounded="xl "
                height="48"
              >
                Nouveau message
              </v-btn>
              <v-btn
                icon="mdi-filter-variant"
                color="onBackground"
                @click="showFilters = !showFilters"
      
                height="48"
              >
              </v-btn>
            </div>
          </div>

          <!-- Filtres -->
          <v-expand-transition>
            <div v-if="showFilters" class="mb-4">
              <v-row>
                <v-col cols="12" sm="4">
                  <v-select
                    v-model="filters.type"
                    :items="messageTypes"
                    label="Type de message"
                    clearable
                    variant="solo-filled"
                    flat
                    rounded="xl"
                    density="comfortable"
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="4">
                  <v-select
                    v-model="filters.status"
                    :items="[
                      { title: 'Tous', value: 'all' },
                      { title: 'Non lus', value: 'unread' },
                      { title: 'Lus', value: 'read' }
                    ]"
                    label="Statut"
                    variant="solo-filled"
                    flat
                    rounded="xl"
                    density="comfortable"
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model="filters.search"
                    label="Rechercher"
                    prepend-inner-icon="mdi-magnify"
                    variant="solo-filled"
                    flat
                    rounded="xl"
                    density="comfortable"
                    clearable
                  ></v-text-field>
                </v-col>
              </v-row>
            </div>
          </v-expand-transition>

          <!-- Liste des messages -->
          <v-list v-if="!messageStore.loading" bg-color="transparent" class="message-list pa-0 ma-0 mt-16">
            <v-list-item
              color="surfaceContainerHigh"
              v-for="message in filteredMessages"
              :key="message._id"
              rounded="lg"
              :class="{ 'unread': !message.isRead }"
              class="mb-2 py-3 message-item"
              @click="openMessageDetails(message)"
            >
              <template v-slot:prepend>
                <v-badge
                  v-if="!message.isRead"
                  v-model="message.isRead"
                  color="primary"
                  class="mr-2"
                >
                  <v-icon
                    :icon="getMessageIcon(message.type)"
                    :color="getMessageColor(message.type)"
                  ></v-icon>
                </v-badge>
              </template>

              <v-list-item-title class="text-h6 d-flex align-center">
                {{ message.title }}
                <v-chip
                  v-if="message.type"
                  size="small"
                  rounded="lg"
                  :color="getMessageColor(message.type)"
                  class="ml-2"
                >
                  {{ getMessageTypeLabel(message.type) }}
                </v-chip>
              </v-list-item-title>

              <v-list-item-subtitle class="mt-1">
                <div class="d-flex align-center opacity-50">
                  <v-icon size="small" class="mr-1">mdi-email-outline</v-icon>
                  {{ message.senderEmail }}
                  <v-icon size="small" class="mx-1">mdi-clock-outline</v-icon>
                  {{ formatDate(message.createdAt) }}
                </div>
              </v-list-item-subtitle>

              <template v-slot:append>
                <div class="d-flex align-center">
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    color="error"
                    @click.stop="confirmDelete(message)"
                    class="mr-2"
                  ></v-btn>
                  <v-btn
                    v-if="!message.isRead"
                    icon="mdi-check"
                    variant="text"
                    color="primary"
                    @click.stop="markAsRead(message._id)"
                  ></v-btn>
                </div>
              </template>
            </v-list-item>

            <v-list-item v-if="filteredMessages.length === 0" class="text-center py-4">
              <v-list-item-title class="text-grey">
                Aucun message trouvé
              </v-list-item-title>
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

    <!-- Dialog de détails du message -->
    <v-dialog v-model="messageDialog" max-width="600px">
      <v-card v-if="selectedMessage" rounded="xl" class="pa-6">
        <v-card-title class="d-flex align-center pa-0 mb-4  ">
          <v-icon
            :icon="getMessageIcon(selectedMessage.type)"
            :color="getMessageColor(selectedMessage.type)"
            class="mr-2"
          ></v-icon>
          {{ selectedMessage.title }}
          <v-spacer></v-spacer>
          <v-chip
            size="small"
            rounded="lg"
            v-if="selectedMessage.type"
            :color="getMessageColor(selectedMessage.type)"
            class="ml-2"
          >
            {{ getMessageTypeLabel(selectedMessage.type) }}
          </v-chip>
        </v-card-title>

        <v-card-text class="pa-0">
          <div class="mb-4">
            <div class="text-subtitle-2 mb-1">De</div>
            <div class="d-flex align-center">
              <v-icon size="small" class="mr-1">mdi-email-outline</v-icon>
              {{ selectedMessage.senderEmail }}
            </div>
          </div>

          <div class="mb-4">
            <div class="text-subtitle-2 mb-1">Date</div>
            <div class="d-flex align-center">
              <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
              {{ formatDate(selectedMessage.createdAt) }}
            </div>
          </div>

          <v-divider class="my-4"></v-divider>

          <div class="text-subtitle-2 mb-2">Message</div>
          <div class="message-content pa-4 rounded-lg">
            {{ selectedMessage.content }}
          </div>
        </v-card-text>

        <v-card-actions class="pa-0">
          <v-spacer></v-spacer>
          <v-btn
            color="error"
            variant="text"
            @click="confirmDelete(selectedMessage)"
          >
            Supprimer
          </v-btn>
          <v-btn
            v-if="!selectedMessage.isRead"
            color="primary"
            @click="markAsRead(selectedMessage._id)"
          >
            Marquer comme lu
          </v-btn>
          <v-btn
            color="grey"
            variant="text"
            @click="messageDialog = false"
          >
            Fermer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog de confirmation de suppression -->
    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card rounded="xl" class="pa-6">
        <v-card-title class="pa-0">Confirmer la suppression</v-card-title>
        <v-card-text class="pa-0">
          Êtes-vous sûr de vouloir supprimer ce message ?
        </v-card-text>
        <v-card-actions class="pa-0">
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="deleteDialog = false"
          >
            Annuler
          </v-btn>
          <v-btn
            color="error"
            @click="confirmDeleteAction"
            :loading="deleting"
          >
            Supprimer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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