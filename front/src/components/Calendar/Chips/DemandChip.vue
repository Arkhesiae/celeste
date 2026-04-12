<script setup>

import { getDemandIcon } from '@/utils/demandToIcon';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { API_URL } from '@/config/api';

const authStore = useAuthStore();
const userStore = useUserStore();
const props = defineProps({
  demand: { type: Object, required: true },
  date : { type: Date, required: true },
  text: { type: String },

  order: { type: Number, required: true },
});

const acceptedAsPoster = computed(() => {
  return props.demand.status === 'accepted' && props.demand.posterId === authStore.userData.userId;
});

const accepterUser = computed(() => {
  return userStore.users.find(u => u._id === props.demand.accepterId);
});

</script>

<template>
  <div
 
    :style="`z-index: ${props.order}; transform: translateY(${(props.order - 1) * -5}px); box-shadow: 0 2px 1px 0px rgba(0,0,0, 0.2);`"
    class="clip d-flex align-center justify-center bg-primary rounded-lg pa-1 position-absolute bottom-0 right-0"
  >
    <v-icon
      size="14px"
      color="onPrimary"
    >
     {{ getDemandIcon(props.demand, authStore.userData.userId) }}
    </v-icon>
    <div v-if="acceptedAsPoster" class="d-flex align-center justify-center">
      <v-avatar size="16px" class="" variant="tonal">
        <v-img v-if="accepterUser?.avatar" :src="`${API_URL}${accepterUser.avatar}`" alt="Avatar" />
        <span v-else class="text-caption font-weight-bold" style="font-size: 8px !important;">{{ accepterUser ?
          `${accepterUser.name.charAt(0)}${accepterUser.lastName.charAt(0)}` : '?' }}</span>
      </v-avatar>
    </div>
  </div>
</template>

<style scoped>
/* 
.clip {
  clip-path: path('M 8 0 L 312 0 Q 320 0 320 8 L 320 24 Q 320 32 312 32 L 8 32 Q 0 32 0 24 L 0 22 A 16 16 0 0 0 0 10 L 0 8 Q 0 0 8 0 Z ');
} */

.chip {
  width: 20px;
  height: 20px;
}
</style>
