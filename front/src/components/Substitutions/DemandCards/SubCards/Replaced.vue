<template>
  <v-text>
    <div class="d-flex align-center ">
      <v-avatar size=" 24" variant="tonal" class="me-2">
        <v-img v-if="user?.avatar" :src="`${API_URL}${user?.avatar}`" alt="Avatar" />
        <v-icon size="x-small" v-else>mdi-account</v-icon>
      </v-avatar>
      <span class="text-caption font-weight-medium"> {{ props.user?.name }} {{ props.user?.lastName }} ({{ teamName }})
      </span>
    </div>
  </v-text>
</template>


<script setup>

import { useUserStore } from '@/stores/userStore'
const userStore = useUserStore();

const props = defineProps({
  user: {
    type: String,
    required: false,
  },
  teamName: {
    type: String,
    required: false
  }
})
const name = computed(() => {
  return props.user?.name;
});

</script>