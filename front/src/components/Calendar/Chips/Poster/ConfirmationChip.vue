<script setup>
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useUserStore } from '@/stores/userStore';
import { API_URL } from '@/config/api';
import { getDemandIcon } from '@/utils/demandToIcon';
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();
const substitutionStore = useSubstitutionStore();
const userStore = useUserStore();
const props = defineProps({
  date: { type: Date, required: true },
  text: { type: String },
  demand: { type: Object, required: true },
  order: { type: Number, required: true },

});

const acceptedAsPoster = computed(() => {
  return substitutionStore.findAcceptedAsPoster(props.date.toISOString());
});

const accepterUser = computed(() => {
  if (!acceptedAsPoster.value?.accepterId) return null;
  return userStore.users.find(user => user._id === acceptedAsPoster.value.accepterId);
});


</script>

<template>
  <div v-if="acceptedAsPoster" :style="`z-index: ${props.order}; transform: translateY(${(props.order-1) * -5}px); box-shadow: 0 2px 1px 0px rgba(0,0,0, 0.4);`" class="d-flex align-center justify-center bg-primary rounded-lg pa-1 position-absolute bottom-0 right-0">
    <!-- <v-icon v-if="acceptedAsPoster.length > 1" size="small" color="error">
      mdi-alert-circle-outline
    </v-icon> -->
    <v-icon size="14px" color="onPrimary">
      {{ getDemandIcon(props.demand, authStore.userData.userId) }}
    </v-icon>
    

  </div>
</template>
