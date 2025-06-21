<template>
  <v-menu color="primary" :close-on-content-click="false" location="bottom end" offset="10">
    <template v-slot:activator="{ props }">
      <v-tooltip location="bottom" text="Profil">
        <template v-slot:activator="{ props: tooltipProps }">
          <v-btn 
            icon="mdi-account-outline" 
            color="primary" 
            variant="tonal" 
            class="mr-2" 
            v-bind="{ ...props, ...tooltipProps }"
          >
            <v-avatar size="40" variant="tonal">
              <v-img v-if="avatar" :src="`${API_URL}${avatar}`" alt="Avatar" />
              <v-icon v-else>mdi-account</v-icon>
            </v-avatar>
          </v-btn>
        </template>
      </v-tooltip>
    </template>
    
    <v-card min-width="300" class="pa-4" color="onBackground" rounded="xl">
      <!-- Informations utilisateur -->
      <v-list class="bg-onBackground">
        <v-list-item>
          <template v-slot:prepend>
            <v-avatar size="40" variant="tonal">
              <v-img v-if="avatar" :src="`${API_URL}${avatar}`" alt="Avatar" />
              <v-icon v-else>mdi-account</v-icon>
            </v-avatar>
          </template>
          <v-list-item-title class="text-h6">{{ username }}</v-list-item-title>
          <v-list-item-subtitle>{{ email }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>
      
      <v-divider />
      
      <!-- Points et équipe -->
      <v-list class="bg-onBackground">
        <v-list-item>
          <div class="d-flex justify-space-between align-center">
            <div class="d-flex align-center">
              <v-icon color="onPrimary" icon="mdi-unicorn-variant"></v-icon>
              <div class="d-flex justify-space-between flex-column align-center ml-4">
                <v-list-item-title class="text-h5 font-weight-bold mb-0 pa-0">
                  {{ points }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption font-weight-bold mt-n2 pa-0">
                  Points
                </v-list-item-subtitle>
              </div>
            </div>
            <div class="d-flex align-center">
              <v-icon color="onPrimary" icon="mdi-crowd"></v-icon>
              <v-list-item-title class="text-subtitle-1 font-weight-bold ml-2">
                Équipe
              </v-list-item-title>
              <v-list-item-subtitle class="ml-2">
                {{ currentTeam?.name || 'Non assigné' }} 
                {{ currentTeam?.type === 'Renfort' ? '(Renfort)' : '' }}
              </v-list-item-subtitle>
            </div>
          </div>
        </v-list-item>
      </v-list>
      
      <v-divider />
      
      <!-- Actions -->
      <v-list class="bg-onBackground">
        <v-list-item @click="$emit('navigate-profile')" rounded="lg" prepend-icon="mdi-account-cog">
          <v-list-item-title>Profil</v-list-item-title>
        </v-list-item>
        <v-list-item @click="$emit('navigate-parameter')" rounded="lg" prepend-icon="mdi-cog">
          <v-list-item-title>Paramètres</v-list-item-title>
        </v-list-item>
        <v-list-item @click="$emit('logout')" rounded="lg" prepend-icon="mdi-logout" color="error">
          <v-list-item-title>Se déconnecter</v-list-item-title>
        </v-list-item>
      </v-list>
      
      <div class="d-flex justify-end">
        <v-btn 
          prepend-icon="mdi-information-outline" 
          variant="text" 
          color="background" 
          class="text-body-2" 
          @click="$emit('navigate-contact')"
        >
          Assistance
        </v-btn>
      </div>
    </v-card>
  </v-menu>
</template>

<script setup>
import { API_URL } from '@/config/api';

// Props
defineProps({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: null
  },
  points: {
    type: Number,
    default: 0
  },
  currentTeam: {
    type: Object,
    default: null
  }
});

// Emits
defineEmits([
  'navigate-profile',
  'navigate-parameter',
  'logout',
  'navigate-contact'
]);
</script>

<style scoped>
:deep(.v-list-item) .v-list-item__overlay {
  background-color: transparent !important;
}
</style> 