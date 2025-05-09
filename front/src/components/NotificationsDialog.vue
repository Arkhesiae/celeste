<template>
  <v-dialog :model-value="dialogOpen" @update:model-value="dialogOpen = $event" :fullscreen="smAndDown"  width="900px" z-index="2100"
             transition="fade-transition"  style="z-index: 2100 !important;">
    <v-card class="pa-0 pt-6" :rounded="smAndDown ? '' : 'xl'">
      <v-card-item class="py-1 px-6 mb-2">
        <v-card-title class="d-flex justify-space-between align-center">Notifications</v-card-title>
        <template #append v-if="!smAndDown">
          <v-btn icon="mdi-close" variant="text" @click="dialogOpen = false"></v-btn>
        </template>
        <template #prepend v-else>
          <v-btn icon="mdi-arrow-left" variant="text" @click="dialogOpen = false"></v-btn>
        </template>
      </v-card-item>
      <v-card-text class="px-6 overflow-y-scroll">
        <v-slide-y-transition group appear>
          <v-card v-if="dialogOpen" elevation="0" v-for="(notification, index) in notifications"
                  :key="notification.id" class="pa-0">
            <v-card-item :prepend-icon="notification.icon">
              <v-card-title class="">{{ notification.title }}</v-card-title>
              <v-card-subtitle class="">
                {{ notification.message }}
              </v-card-subtitle>
              <template #append>
                <v-btn icon="mdi-close" size="small" variant="text" class="mr-2"
                       @click="markAsRead(notification.id)" :disabled="notification.isRead">
                </v-btn>
              </template>
            </v-card-item>
            <v-card-text>
              <v-chip v-if="notification.link" prepend-icon="mdi-open-in-new" rounded="lg">{{ notification.link }}</v-chip>
            </v-card-text>
            <v-divider/>
          </v-card>
        </v-slide-y-transition>
        
      </v-card-text>
      <v-card-actions class="pa-6">
          <v-spacer/>
          <v-btn color="error" class="text-capitalize" variant="tonal" rounded="lg" @click="clearNotifications">
            Tout effacer
          </v-btn>
        </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useDisplay } from "vuetify";
import { computed } from "vue";

const props = defineProps({
  isDialogOpen: {
    type: Boolean,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  notifications: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['update:isDialogOpen', 'markAsRead', 'clearNotifications']);

const dialogOpen = computed({
  get: () => props.isDialogOpen,
  set: (value) => emit('update:isDialogOpen', value)
});

const { smAndDown } = useDisplay();

const markAsRead = (id) => {
  emit('markAsRead', id);
};

const clearNotifications = () => {
  emit('clearNotifications');
};
</script> 