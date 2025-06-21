<template>
  <v-card 
    class="px-2 ma-0" 
    :rounded="smAndDown ? 'lg' : 'xl'" 
    variant="flat" 
    @click="$emit('click', user)" 
    :color="smAndDown ? 'transparent ' : 'surface'"
  >
    <v-card-item>
      <v-card-title class="d-flex justify-space-between align-center">
        <div class="d-flex align-center">
          <v-avatar color="primary" variant="tonal" size="40" class="mr-2">
            {{ user.name.charAt(0) }}{{ user.lastName.charAt(0) }}
          </v-avatar>
          <div>
            <div class="text-subtitle-1">{{ user.name }} {{ user.lastName.toUpperCase() }}</div>
            <div class="text-caption text-medium-emphasis">{{ user.email }}</div>
          </div>
        </div>
        <v-menu color="onBackground" rounded="lg">
          <template v-slot:activator="{ props }">
            <v-btn icon variant="text" v-bind="props" @click.stop>
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-list color="onBackground" bg-color="onBackground" rounded="xl" class="pa-4">
            <v-list-item 
              rounded="lg" 
              @click.stop="$emit('approve', user)" 
              v-if="user.registrationStatus === 'pending' && (isLocalAdmin || isMasterAdmin)"
            >
              <v-list-item-title>Approuver</v-list-item-title>
            </v-list-item>
            <v-list-item 
              rounded="lg" 
              @click.stop="$emit('makeAdmin', user)" 
              v-if="!user.isAdmin && isMasterAdmin"
            >
              <v-list-item-title>Octroyer statut admin</v-list-item-title>
            </v-list-item>
            <v-list-item 
              rounded="lg" 
              @click.stop="$emit('removeAdmin', user)" 
              v-if="user.isAdmin && isMasterAdmin"
            >
              <v-list-item-title>Enlever statut admin</v-list-item-title>
            </v-list-item>
            <v-list-item 
              rounded="lg" 
              @click.stop="$emit('assignCenter', user)" 
              v-if="isMasterAdmin"
            >
              <v-list-item-title>Modifier le centre</v-list-item-title>
            </v-list-item>
            <v-list-item 
              rounded="lg" 
              @click.stop="$emit('delete', user)" 
              v-if="isLocalAdmin || isMasterAdmin"
            >
              <v-list-item-title class="text-onError">Supprimer</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-card-title>
    </v-card-item>
    <v-card-text class="pt-0 d-flex justify-start">
      <div 
        v-if="user.isAdmin" 
        class="d-flex mr-2"
        :class="user.adminType === 'master' ? 'block' : ''"
      >
        <v-chip
          rounded="lg"
          variant="flat"
          color="surface"
          size="small"
        > 
          <v-icon 
            class="mr-2" 
            v-if="user.isAdmin && user.adminType === 'master'" 
            color="primary"
          >
            mdi-star-four-points
          </v-icon>
          <v-icon 
            class="mr-2" 
            v-else 
            color="secondary"
          >
            mdi-shield-crown-outline
          </v-icon>
          Admin
        </v-chip>
      </div>
     
      <v-chip
        color="onBackground"
        rounded="lg"
        size="small"
        class="mr-2"
      >
        {{ getCenterById(user.centerId)?.name || "No center" }}
      </v-chip>

      <v-chip
        color="onBackground"
        rounded="lg"
        size="small"
        class="mr-2"
      >
        Equipe {{ getTeamName(user.currentTeam?.teamId) || "No team" }}
      </v-chip>

      <v-chip
        v-if="user.status === 'pending'"
        :color="user.status === 'pending' ? 'warning' : 'success'"
        size="small"
      >
        {{ user.status === 'pending' ? 'En attente' : 'Approuvé' }}
      </v-chip>
    </v-card-text>
  </v-card>
  <v-divider v-if="smAndDown" opacity="0.05" class="ma-0 pa-0"></v-divider>
</template>

<script setup>
import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/authStore';
import { useCenterStore } from '@/stores/centerStore';
import { useTeamStore } from '@/stores/teamStore';

const { smAndDown } = useDisplay();
const authStore = useAuthStore();
const centerStore = useCenterStore();
const teamStore = useTeamStore();

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['click', 'approve', 'makeAdmin', 'removeAdmin', 'assignCenter', 'delete']);

const isMasterAdmin = computed(() => authStore.isAdmin && authStore.adminType === 'master');
const isLocalAdmin = computed(() => authStore.isAdmin && authStore.adminType === 'local');

const getCenterById = (centerId) => {
  return centerStore.centers.find(center => center._id === centerId) || null;
};

const getTeamName = (team) => {
  if (!team) return "No team";
  if (isMasterAdmin.value) {
    return teamStore.teams.find(t => t._id === team)?.name || team;
  } else {
    return teamStore.centerTeams.find(t => t._id === team)?.name || team;
  }
};
</script>

<style scoped>
.block {
  position: relative;
  z-index: 0;
  overflow: visible !important;
  opacity: 1 !important;
}

.block:after, .block:before {
  content: '';
  position: absolute;
  left: -1.5px;
  top: -1.5px;
  border-radius: 10px;
  background: linear-gradient(45deg, #ffc0d4, rgba(237, 202, 255, 0.94), rgba(250, 152, 248, 0.05),
  rgba(159, 159, 248, 0.22), #ffccdd);
  background-size: 400%;
  width: calc(100% + 3px);
  height: calc(100% + 3px);
  z-index: -1;
  animation: steam 7s linear infinite;
}

@keyframes steam {
  0% {
    background-position: 0 0;
  }
  80% {
    background-position: 400% 0;
  }
  100% {
    background-position: 400% 0;
  }
}

.block:after {
  filter: blur(5px);
}

.v-card {
  cursor: pointer;
  transition: transform 0.2s;
}
</style> 