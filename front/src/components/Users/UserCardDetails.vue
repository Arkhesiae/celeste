<template>
  <v-dialog :model-value="dialogVisible" @update:model-value="$emit('update:dialogVisible', $event)" max-width="600">
    <v-card v-if="user" rounded="xl" variant="flat" class="pa-6">
      <v-card-title class="d-flex justify-space-between align-center pa-0">
        <div class="d-flex align-center">
          <v-avatar color="primary" size="60" class="mr-3">
            {{ user.name.charAt(0) }}{{ user.lastName.charAt(0) }}
          </v-avatar>
          <div>
            <div class="text-h5">{{ user.name }} {{ user.lastName.toUpperCase() }}</div>
            <div class="text-subtitle-1 text-medium-emphasis">{{ user.email }}</div>
          </div>
        </div>
        <v-btn variant="text" icon @click="$emit('update:dialogVisible', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-0 mt-6">
        <v-row>
          <v-col cols="12" md="6">
            <div class="text-subtitle-1 mb-2">Informations</div>
            <v-list>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon>mdi-account-check-outline</v-icon>
                </template>
             
                <v-list-item-subtitle>
                  <v-chip
                    rounded="lg"
                    color="onBackground"
                    :color="user.registrationStatus === 'pending' ? 'warning' : 'success'"
                    size="small"
                  >
                    {{ user.registrationStatus === 'pending' ? 'Candidature en attente' : 'Candidature approuvée' }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon>mdi-airport</v-icon>
                </template>
       
                <v-list-item-subtitle>
                  <v-chip
                    color="onBackground"
                    rounded="lg"
                    size="small"
                    class="mr-2"
                  >
                    {{ getCenterName?.name || "No center" }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon>mdi-calendar</v-icon>
                </template>
                <v-list-item-title>Date d'inscription</v-list-item-title>
                <v-list-item-subtitle>{{ new Date(user.createdAt).toLocaleDateString() }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="6">
            <v-card 
              flat 
              class="pa-4" 
              color="surfaceContainerHighest" 
              rounded="xl" 
              @click="$emit('makeAdmin', user)" 
              v-if="!user.isAdmin && isMasterAdmin"
            >
              <div class="d-flex align-center ga-3">
                <v-icon>mdi-shield-account</v-icon>
                <v-list-item-title>Octroyer statut admin</v-list-item-title>
              </div>
            </v-card>
            <v-card 
              flat 
              class="pa-4" 
              color="surfaceContainerHighest" 
              rounded="xl" 
              @click="$emit('removeAdmin', user)" 
              v-if="user.isAdmin && isMasterAdmin"
            >
              <div class="d-flex align-center ga-3">
                <v-icon>mdi-shield-crown-outline</v-icon>
                <v-list-item-title>Enlever statut admin</v-list-item-title>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card 
              flat 
              class="pa-4" 
              color="surfaceContainerHighest" 
              rounded="xl" 
              @click="$emit('assignCenter', userId)" 
              v-if="isMasterAdmin"
            > 
              <div class="d-flex align-center ga-3">
                <v-icon>mdi-airport</v-icon>
                <v-list-item-title>Modifier le centre</v-list-item-title>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" md="12">
            <v-card 
              flat 
              class="pa-4" 
              color="error" 
              rounded="xl" 
              @click="$emit('delete', user)" 
              v-if="isLocalAdmin || isMasterAdmin"
            >
              <div class="d-flex align-center ga-3">
                <v-icon>mdi-delete</v-icon>
                <v-list-item-title>Supprimer l'utilisateur</v-list-item-title>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useCenterStore } from '@/stores/centerStore';
import { useUserStore } from '@/stores/userStore';

const authStore = useAuthStore();
const centerStore = useCenterStore();
const userStore = useUserStore();
const props = defineProps({
  userId: {
    type: String,
    required: true
  },
  dialogVisible: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['update:dialogVisible', 'makeAdmin', 'removeAdmin', 'assignCenter', 'delete']);

const isMasterAdmin = computed(() => authStore.userData.isAdmin && authStore.userData.adminType === 'master');
const isLocalAdmin = computed(() => authStore.userData.isAdmin && authStore.userData.adminType === 'local');

const user = computed(() => {
  return userStore.users.find(user => user._id === props.userId) || null;
});

const getCenterName = computed(() => {
  return centerStore.centers.find(center => center._id === user.value.centerId) || null;
});
</script> 