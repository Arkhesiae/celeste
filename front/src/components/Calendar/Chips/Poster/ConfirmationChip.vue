<script setup>
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useUserStore } from '@/stores/userStore';
import { API_URL } from '@/config/api';


const substitutionStore = useSubstitutionStore();
const userStore = useUserStore();
const props = defineProps({
  date: { type: Date, required: true },
  text: { type: String },

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
  <v-chip
rounded="lg" color="primary" variant="flat" size="x-small"
    style="bottom: -10px; opacity: 1; transform: scale(1) ;" class="position-absolute ">
    <v-icon v-if="acceptedAsPoster.length > 1" size="small" color="error">
      mdi-alert-circle-outline
    </v-icon>
    <v-icon v-if="acceptedAsPoster.type === 'switch'" size="small" color="background">
      mdi-swap-horizontal-hidden
    </v-icon>
    <v-icon v-if="acceptedAsPoster.type === 'substitution'" size="small" color="background">
      mdi-account-arrow-left
    </v-icon>
    <div v-if="acceptedAsPoster.type === 'hybrid'">
      <v-icon v-if="!acceptedAsPoster.accepterShift" size="small" color="background">
        mdi-account-arrow-left
      </v-icon>
      <v-icon v-if="acceptedAsPoster.accepterShift" size="small" color="background">
        mdi-swap-horizontal
      </v-icon>
    </div>
    <div v-if="acceptedAsPoster" class="d-flex align-center justify-center">
      <v-avatar size="small" class="" variant="tonal">
        <v-img v-if="accepterUser?.avatar" :src="`${API_URL}${accepterUser.avatar}`" alt="Avatar" />
        <span v-else class="text-caption font-weight-bold" style="font-size: 8px !important;">{{ accepterUser ?
          `${accepterUser.name.charAt(0)}${accepterUser.lastName.charAt(0)}` : '?' }}</span>
      </v-avatar>
    </div>
  </v-chip>
</template>
