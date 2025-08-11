<template>
  <v-card
    color="surfaceContainer "
    flat
   
    class="transaction-item pa-2 px-3  d-flex align-center justify-space-between"
  >
    <div v-if="!isMobile" class="d-flex align-center flex-shrink-1">
      <div class="d-flex align-center justify-center avatar-container mr-2">
      <v-avatar size="36" class="">
        <template v-if="avatar">
          <v-img :src="`${API_URL}${avatar}`" alt="avatar" />
        </template>
        <template v-else>
          <span class="avatar-fallback text-body-2">{{ getInitials(transaction.userName) }}</span>
        </template>
      </v-avatar>
      </div>
      <div class="d-flex flex-column">
        <div class="d-flex align-center">
          <span class="font-weight-bold text-body-2 text-truncate">{{ transaction.userName }}</span>
         
        </div>
        <div class="text-caption text-medium-emphasis text-truncate">
          {{ transaction.description }}
        </div>
      </div>
    </div>
    <div v-else class="d-flex flex-column align-start flex-shrink-1 ">
      <div class="d-flex align-center ga-2 justify-start">
        <v-avatar size="16" class="">
        <template v-if="avatar">
          <v-img :src="`${API_URL}${avatar}`" alt="avatar" />
        </template>
        <template v-else>
          <span class="avatar-fallback text-subtitle-2" style="font-size: 8px !important;">{{ getInitials(transaction.userName) }}</span>
        </template>
      </v-avatar>
        <span class="font-weight-bold text-subtitle-2 ">{{ transaction.userName }}</span>
      </div>
     
      <div class="text-caption text-medium-emphasis">
        {{ transaction.description }}
      </div>
    </div>
    <div class="d-flex flex-column align-end flex-shrink-0">
      <div class="d-flex ga-4 align-center">
        <v-chip
          v-if="transaction.status === 'completed'"
          color="success"
          rounded="lg"
          size="x-small"
          class="ml-2"
          label
        >
          Effectuée
        </v-chip>
        <v-chip
          v-if="transaction.status === 'pending'"
          color="pendingDemand"
          rounded="lg"
          size="x-small"
          class="ml-2"
          label
        >
          En attente
        </v-chip>
        <v-chip
          v-if="transaction.status === 'cancelled'"
          color="error"
          rounded="lg"
          size="x-small"
          class="ml-2"
          label
        >
          Annulée
        </v-chip>
        <span class="text-body-1" style="font-weight: 900;">
          {{ transaction.flow === 'received' ? '+' : '-' }}{{ transaction.amount }}
        </span>
      </div>
      <span class="text-caption text-medium-emphasis mt-1">{{ transaction.effectiveDate }}</span>
    </div>
  </v-card>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useAuthStore } from '@/stores/authStore';
import { API_URL } from '@/config/api';

const BREAKPOINT = 500;
const cardRef = ref(null);
const width = ref(window.innerWidth);

const updateWidth = () => {
  if (cardRef.value) {
    width.value = cardRef.value.offsetWidth;
  } else {
    width.value = window.innerWidth;
  }
};

onMounted(() => {
  updateWidth();
  window.addEventListener('resize', updateWidth);
});
onUnmounted(() => {
  window.removeEventListener('resize', updateWidth);
});

const isMobile = computed(() => width.value < BREAKPOINT);

const authStore = useAuthStore();
const userStore = useUserStore();

const avatar = computed(() => {
  const user = userStore.users.find(user => user._id === props.transaction.userId);
  return user ? user.avatar : '';
});

const props = defineProps({
  transaction: {
    type: Object,
    required: true,
  }
});

const userId = computed(() => {
  return authStore.userId;
});

const isSender = computed(() => {
  console.log(props.transaction, props.transaction);
  console.log( userId.value);
  return props.transaction.senderId === userId.value;
});

const senderName = computed(() => {
  const sender = userStore.users.find(user => user.id === props.transaction.senderId);
  return sender ? `${sender.name} ${sender.lastName}` : 'Utilisateur';
});

const receiverName = computed(() => {
  const receiver = userStore.users.find(user => user.id === props.transaction.receiverId);
  return receiver ? `${receiver.name} ${receiver.lastName}` : 'Utilisateur';
});

function getInitials(name) {
  if (!name) return '';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR');
}
</script>

<style scoped>
.transaction-item {
  border-radius: 16px !important;
  border-bottom: none;

}
.avatar-fallback {
  background: #bdbdbd;
  color: #fff;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
  font-size: 1.1rem;
}
.avatar-container {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-onBackground), .12);
}
</style> 