<template>
  <v-container>
    <MainTitle title="Messages" :subtitle="`Consultez ici les messages envoyés par les utilisateurs`">
      <template #actions>
        <div class="d-flex ga-2 align-center">
          <v-btn
color="surfaceContainerHigh" variant="flat" prepend-icon="mdi-plus" rounded="xl " flat height="32"
            size="small" @click="openNewMessageDialog">
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









const openNewMessageDialog = () => {
  messageDialog.value = true;
};

// Lifecycle
onMounted(async () => {
  if (!authStore.userData.isAdmin) {
    router.push('/dashboard');
    return;
  }
  try {
    await messageStore.fetchMessages();
  } catch {
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