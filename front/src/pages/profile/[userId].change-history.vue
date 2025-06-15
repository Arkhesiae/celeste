<template>
  <v-container class="pa-4">
    <div class="d-flex justify-space-between my-16 flex-column">
      <div class="d-flex align-center"> 
        <v-btn icon="mdi-arrow-left" variant="text" @click="router.back()" />
        <span class="text-h4 font-weight-medium">Historique des changements d'équipe</span>
      </div>
      <span class="text-h4 text-overline text-medium-emphasis">
        Voir tous les changements d'équipe
      </span>
    </div>

    <v-row class="ma-0">
      <div class="d-flex justify-center chip-container pa-2">
        <v-chip-group v-model="selectedChangeType" class="pa-0 ma-0 gap-2 d-flex justify-center">
          <v-chip class="pa-0 ma-0 mr-2 px-4 text-body-2" value="all" size="large" rounded="lg"
            color="primary" variant="text">Tous</v-chip>
          <v-chip class="pa-0 ma-0 mr-2 px-4 text-body-2" value="Changement" size="large" rounded="lg"
            color="primary" variant="text">Changements</v-chip>
          <v-chip class="pa-0 ma-0 px-4 text-body-2" value="Renfort" size="large" rounded="lg"
            color="primary" variant="text">Renforts</v-chip>
        </v-chip-group>
      </div>
    </v-row>

    <v-row>
      <v-col cols="12">
        <transition name="fade" mode="out-in">
          <v-card :key="selectedChangeType" elevation="0" class="mb-4 pa-0" color="background">
            <v-card-text class="pa-0">
              <v-progress-circular v-if="isLoading" indeterminate color="primary"
                class="mx-auto my-4"></v-progress-circular>

              <div v-else-if="filteredOccurrences.length > 0">
                <v-card v-for="(occurrence, index) in filteredOccurrences" :key="index" 
                  :color="occurrence.status === 'pending' ? 'surfaceContainerHigh' : 'surfaceContainer'" 
                  flat rounded="lg"
                  class="occurrence-item pa-4 d-flex justify-space-between align-center py-2 mb-2"
                  :class="occurrence.status === 'pending' ? 'opacity-50' : ''">
                  <div class="d-flex align-center">
                    <v-icon :color="occurrence.type === 'Renfort' ? 'primary' : 'secondary'" class="mr-2">
                      {{ occurrence.type === 'Renfort' ? 'mdi-handshake-outline' : 'mdi-account-switch-outline' }}
                    </v-icon>
                    <div>
                      <div class="text-body-2">
                        {{ occurrence.type === 'Renfort' ? 'Renfort de' : 'Changement vers' }} l'équipe {{ occurrence.teamName }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        <div v-if="occurrence.type === 'Renfort'">
                          Du {{ formatDate(occurrence.fromDate) }} au {{ formatDate(occurrence.toDate) }}
                        </div>
                        <div v-else>
                          À partir du {{ formatDate(occurrence.fromDate) }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-if="occurrence.status === 'cancelled'">
                    <span class="text-caption text-medium-emphasis mr-2">Annulé</span>
                    <v-icon color="error" class="mr-2">mdi-close-circle-outline</v-icon>
                  </div>
                  <div v-else-if="occurrence.type === 'Renfort' && occurrence.toDate > new Date().toISOString()" class="text-caption text-medium-emphasis">
                    En cours
                  </div>
                  <div v-else class="text-caption text-medium-emphasis">
                    Effectué
                  </div>
                </v-card>
              </div>
              <div v-else class="text-center text-medium-emphasis text-body-2 mt-4">
                Aucun changement d'équipe trouvé
              </div>
            </v-card-text>
          </v-card>
        </transition>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useTeamStore } from '@/stores/teamStore';
import { useRouter } from 'vue-router';

const router = useRouter();
const teamStore = useTeamStore();
const selectedChangeType = ref('all');

const occurrences = computed(() => {
  if (!teamStore.teamOccurrences?.allOccurrences) return [];
  return teamStore.teamOccurrences.allOccurrences.filter(o => new Date(o.fromDate) <= new Date());
});
const isLoading = computed(() => teamStore.isLoading);

const filteredOccurrences = computed(() => {
  let filtered = selectedChangeType.value === 'all' 
    ? occurrences.value 
    : occurrences.value.filter(o => o.type === selectedChangeType.value);
 
  return filtered.sort((a, b) => {
    const dateA = new Date(a.fromDate);
    const dateB = new Date(b.fromDate);
    return dateB - dateA;
  });
});

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

    
</script>

<style scoped>
.occurrence-item {
  border-radius: 16px !important;
}

.chip-container {
  background-color: rgba(var(--v-theme-surface), 1);
  margin-bottom: 16px;
  border-radius: 20px;
}

.occurrence-item:last-child {
  border-bottom: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style> 