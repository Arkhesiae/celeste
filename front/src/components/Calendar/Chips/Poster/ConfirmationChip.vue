<script setup>
import { computed, onMounted } from 'vue';
import { useTeamStore } from '@/stores/teamStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { API_URL } from '@/config/api';

const teamStore = useTeamStore();
const substitutionStore = useSubstitutionStore();
const authStore = useAuthStore();
const userStore = useUserStore();
const props = defineProps({
  date : { type: Date, required: true },
  text: { type: String },

});

const acceptedAsPoster = computed(() => {
  return substitutionStore.findAcceptedAsPoster(props.date.toISOString());
});

const accepterUser = computed(() => {
  if (!acceptedAsPoster.value?.accepterId) return null;
  return userStore.users.find(user => user._id === acceptedAsPoster.value.accepterId);
});

onMounted(async () => {
  try {
    await userStore.fetchUsers();
  } catch (error) {
    console.error('Erreur lors du chargement des utilisateurs:', error);
  }
});

</script>

<template>

    <v-chip
 
      rounded="lg"
      color="acceptedDemand"
      variant="flat"
      size="x-small"
      style="bottom: -10px; opacity: 1; transform: scale(1) ; border-color: rgba(var(--v-theme-remplacement), 0.4);"
      class="text-caption font-weight-bold position-absolute px-2 overflow-visible d-flex align-center justify-center"
    >
      <v-icon color="error"  v-if="acceptedAsPoster.length > 1">mdi-alert-circle-outline</v-icon>
      <v-icon color="onAcceptedDemand"  v-if="acceptedAsPoster.type === 'switch'">mdi-swap-horizontal-hidden</v-icon>
      <v-icon color="onAcceptedDemand"  v-if="acceptedAsPoster.type === 'substitution'">mdi-account-arrow-left</v-icon>
      <div v-if="acceptedAsPoster.type === 'hybrid'">
        <v-icon color="onAcceptedDemand" v-if="!acceptedAsPoster.accepterShift">mdi-account-arrow-left</v-icon>
        <v-icon color="onAcceptedDemand" v-if="acceptedAsPoster.accepterShift">mdi-swap-horizontal</v-icon>
      </div>
      <div v-if="acceptedAsPoster" class="d-flex align-center justify-center">
        <v-avatar size="x-small" class="" variant="tonal">
          <v-img v-if="accepterUser?.avatar" :src="`${API_URL}${accepterUser.avatar}`" alt="Avatar" />
          <span v-else class="text-caption font-weight-bold" style="font-size: 8px !important;">{{ accepterUser ? `${accepterUser.name.charAt(0)}${accepterUser.lastName.charAt(0)}` : '?' }}</span>
        </v-avatar>
      </div>
    
    </v-chip>

</template>
