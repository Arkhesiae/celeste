<template>
  <v-dialog v-model="dialogVisible" max-width="300" attach="body" style="z-index: 1000000 !important">
    <v-card rounded="xl" color="surfaceContainer" class="pa-6" style="z-index: 1000000 !important">
      <div class="d-flex flex-column  ga-2 pl-3">
        <div class="d-flex align-center ga-2 ">

          <v-avatar size="32" variant="tonal" class="">
            <v-img v-if="user?.avatar" :src="`${API_URL}${user?.avatar}`" alt="Avatar" />
            <v-icon size="x-small" v-else>mdi-account</v-icon>
          </v-avatar>

          <span class="text-h7 font-weight-medium pa-0">
            {{ user?.name }} {{ user?.lastName }} ({{ teamName }})
          </span>
        </div>

        <div>
          <v-card-subtitle class="pa-0">
            {{ user?.email }}
          </v-card-subtitle>
          <span class="text-caption opacity-70 font-weight-medium">
            {{ user?.personalData?.phoneNumber }}
          </span>
        </div>
      </div>

    </v-card>
  </v-dialog>
</template>

<script setup>
import { useUserStore } from '@/stores/userStore'
const userStore = useUserStore();

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  user: {
    type: String,
    required: false,
  },
  teamName: {
    type: String,
    required: false
  }
})
const emit = defineEmits(["update:modelValue"]);
// Computed
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const getTeamName = computed(() => {
  return props.user.teamId.name;
})

</script>