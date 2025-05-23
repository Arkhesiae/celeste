<script setup>
import {useAuthStore} from "@/stores/authStore.js";
import { ref, computed, onMounted, watch } from 'vue';
import { useDate } from 'vuetify';
import CalendarMobile from "@/components/Calendar/CalendarMobile.vue";
import PointsCard from "@/components/Profile/PointsCard.vue";

import { useDisplay } from "vuetify";
import { useTeamStore } from "@/stores/teamStore.js";
import { useSubstitutionStore } from "@/stores/substitutionStore.js";
import { useSnackbarStore } from "@/stores/snackbarStore.js";
import { useCalendar } from '@/composables/useCalendar';
import {vacationService} from "@/services/vacationService.js";

const authStore = useAuthStore()
const teamStore = useTeamStore()
const substitutionStore = useSubstitutionStore()
const snackbarStore = useSnackbarStore()
const userName = authStore.name
const { smAndDown } = useDisplay();

// État pour le calendrier
const selectedDate = ref(new Date());
const currentMonth = ref(new Date().getMonth());
const currentYear = ref(new Date().getFullYear());
const daysOfWeek = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const vacationsOfUser = ref(new Map());
const rotationsMap = ref(new Map());

// Utilisation du composable useCalendar
const { calendarDays } = useCalendar(currentYear, currentMonth);

// Fonctions pour le calendrier
const isSelected = (date) => {
  if (!selectedDate.value) return false;
  return date.toISOString() === selectedDate.value.toISOString();
};

const isWorkDay = (date) => {
  const shift = vacationsOfUser.value.get(date.toISOString())?.shift?.name;
  return shift ? shift !== 'Rest Day' : false;
};

const isToday = (date) => {
  const today = new Date();
  return date.getDate() === today.getDate() && 
         date.getMonth() === today.getMonth() && 
         date.getFullYear() === today.getFullYear();
};

// Fonction pour obtenir la vacation actuelle ou la prochaine
const getVacation = computed(() => {
  const today = new Date();
  const todayISO = new Date(today.toISOString().split('T')[0]);
  
  // Vérifier d'abord la vacation d'aujourd'hui
  const todayVacation = vacationsOfUser.value.get(todayISO.toISOString());
  if (todayVacation && todayVacation.shift.name !== 'Rest Day') {
    return todayVacation;
  }

  
  // Si pas de vacation aujourd'hui, chercher la prochaine
  const sortedDates = Array.from(vacationsOfUser.value.keys())
    .map(date => new Date(date))
    .filter(date => date > today)
    .sort((a, b) => a - b);
    
  if (sortedDates.length > 0) {
    const nextDate = sortedDates[0].toISOString();
    return vacationsOfUser.value.get(nextDate);
  }
  
  return null;
});

// Fonction pour obtenir la vacation de demain
const getTomorrowVacation = computed(() => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = new Date(tomorrow.toISOString().split('T')[0]);
  
  return vacationsOfUser.value.get(tomorrowISO.toISOString());
});

// Fonction pour obtenir la prochaine substitution
const nextSubstitution = computed(() => {
  const today = new Date();
  const allSubstitutions = [

  ];
  
  // Filtrer les substitutions futures et les trier par date
  const futureSubstitutions = allSubstitutions
    .filter(sub => new Date(sub.posterShift.date) > today)
    .sort((a, b) => new Date(a.posterShift.date) - new Date(b.posterShift.date));
    
  return futureSubstitutions[0] || null;
});


// Chargement des données
const isLoading = ref(true);

// Statistiques
const stats = ref({
  remplacements: 0,
  permutations: 0,
  points: 0
});

// Actions rapides
const quickActions = [
  { icon: 'mdi-calendar-plus', label: 'Créer un remplacement', route: '/exchange/replace' },
  { icon: 'mdi-swap-horizontal', label: 'Proposer une permutation', route: '/exchange/switch' },
  { icon: 'mdi-calendar-clock', label: 'Voir le calendrier', route: '/calendar' }
];

// Charger les données
const loadData = async () => {
  try {
    isLoading.value = true;
    
    // Charger l'équipe actuelle
    await teamStore.fetchCurrentTeamOfUser(authStore.userId);
    
    // Charger les substitutions
    await substitutionStore.fetchAllDemands({
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    // Charger les jours de travail
    const flatArray = calendarDays.value.flatMap(group => group.map(item => item.date));
    const result = await vacationService.fetchWorkdaysOfUser(authStore.userId, flatArray);
    result.forEach(({ date, shift, teamObject }) => {
      vacationsOfUser.value.set(date, { shift, teamObject });
    });

    // // Mettre à jour les statistiques
    // stats.value = {
    //   remplacements: substitutionStore.getOpenSubstitutions.length,
    //   permutations: substitutionStore.getOpenSwitches.length,
    //   points: authStore.points || 0
    // };

  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
    snackbarStore.showNotification("Erreur lors du chargement des données : "+ error.message, 'onError', 'mdi-alert-circle');
  } finally {
    isLoading.value = false;
  }
};

// Observer les changements de mois pour recharger les données
watch([currentMonth, currentYear], () => {
  loadData();
});

onMounted(loadData);
</script>

<route>
{
"meta": {
"requiresAuth": true
}
}
</route>

<template>
<v-container >
  <!-- En-tête -->
  <div class="d-flex justify-space-between align-center mb-8">
    <div class="d-flex flex-column">
      <span class="text-h4 font-weight-medium">Bienvenue {{userName}} !</span>
      <span class="text-h4 text-overline text-medium-emphasis">Tableau de bord</span>
    </div>
    <v-btn
      v-if="!smAndDown"
      color="remplacement"
      height="48px"
      class="px-6"
      style="border-radius: 16px !important"
      prepend-icon="mdi-plus"
   
      @click="$router.push('/exchange/replace')"
    >
      Nouveau remplacement
    </v-btn>
  </div>

  <!-- Grille principale -->
  <v-row>
    
    <v-col cols="12" md="6" class="pa-2">
    <!-- Carte des vacations -->
    <v-card rounded="xl" elevation="0" class="mb-4 smooth-shadow pa-4" color="surfaceContainer">
      <v-card-title class="text-h6 font-weight-medium">Aujourd'hui</v-card-title>
      <v-card-text>
        <div v-if="getVacation">
          <div class="d-flex align-center justify-space-between mb-2">
            <div>
              <div class="text-h5 font-weight-medium">{{ getVacation.shift.name }}</div>
              <div class="text-medium-emphasis">
                {{ getVacation.shift.startTime }} - {{ getVacation.shift.endTime }}
              </div>
            </div>
            <v-chip class="position-absolute ma-6" color="remplacement" variant="flat" size="small" rounded="lg" style="right: 0; top: 0;">
              Équipe {{ getVacation.teamObject.name }}
            </v-chip>
          </div>
        </div>
        <div v-else class="text-medium-emphasis">
          Pas de vacation aujourd'hui
        </div>
      </v-card-text>
    </v-card>

    <!-- Carte de la vacation de demain -->
    <v-card rounded="xl" elevation="0" class="mb-4 smooth-shadow pa-4" color="surfaceContainer">
      <v-card-title class="text-h6 font-weight-medium">Demain</v-card-title>
      <v-card-text>
        <div v-if="getTomorrowVacation">
          <div class="d-flex align-center justify-space-between mb-2">
            <div>
              <div class="text-h5 font-weight-medium">{{ getTomorrowVacation.shift.name }}</div>
              <div class="text-medium-emphasis">
                {{ getTomorrowVacation.shift.startTime }} - {{ getTomorrowVacation.shift.endTime }}
              </div>
            </div>
            <v-chip class="position-absolute ma-6" color="remplacement" variant="flat" size="small" rounded="lg" style="right: 0; top: 0;">
              Équipe {{ getTomorrowVacation.teamObject.name }}
            </v-chip>
          </div>
        </div>
        <div v-else class="text-medium-emphasis">
          Pas de vacation demain
        </div>
      </v-card-text>
    </v-card>

    <!-- Carte de la prochaine substitution -->
    <v-card rounded="xl" elevation="0" class="mb-4 smooth-shadow pa-4" color="surfaceContainer">
      <v-card-title class="text-h6 font-weight-medium">Prochaine substitution</v-card-title>
      <v-card-text>
        <div v-if="nextSubstitution">
          <div class="d-flex align-center justify-space-between mb-2">
            <div>
              <div class="text-h5 font-weight-medium">{{ nextSubstitution.type === 'replacement' ? 'Remplacement' : 'Permutation' }}</div>
              <div class="text-medium-emphasis">
                {{ new Date(nextSubstitution.posterShift.date).toLocaleDateString() }}
              </div>
              <div class="text-medium-emphasis">
                {{ nextSubstitution.posterShift.shift.name }}
              </div>
            </div>
            <v-chip :color="nextSubstitution.type === 'replacement' ? 'remplacement' : 'permutation'" variant="flat" size="small" rounded="lg">
              {{ nextSubstitution.type === 'replacement' ? 'Remplacement' : 'Permutation' }}
            </v-chip>
          </div>
        </div>
        <div v-else class="text-medium-emphasis">
          Aucune substitution à venir
        </div>
      </v-card-text>
    </v-card>
    </v-col>

    

    <!-- Section Points et Équipe -->
    <v-col cols="12" md="6" :class="smAndDown ? 'pa-0' : 'pa-2'">
      <v-card rounded="xl" elevation="0" class="pa-4" :color="smAndDown ? 'surfaceContainerHigh' : 'surfaceContainer'">



      <!-- Carte des points -->
      <div class="mb-4 smooth-shadow rounded-xl">
          <PointsCard variant="tonal" :points="stats.points" :transactions="[]" color="remplacement"/>
      </div>

      <!-- Section Calendrier -->

      <v-card rounded="xl" flat class="mb-4 v-card-dashboard smooth-shadow pa-2"  color="surfaceContainer">
        <v-card-title class="text-h6 font-weight-medium">Calendrier</v-card-title>
        <v-card-text>
          <CalendarMobile
            :daysOfWeek="daysOfWeek"
            :calendarDays="calendarDays"
            :isSelected="isSelected"
            :isWorkDay="isWorkDay"
            :isToday="isToday"
            :hasAvailableSubstitution="hasAvailableSubstitution"
            :hasOpenSubstitution="hasOpenSubstitution"
            :hasAcceptedSubstitutionAsPoster="hasAcceptedSubstitutionAsPoster"
            :hasAcceptedSubstitutionAsAccepter="hasAcceptedSubstitutionAsAccepter"
            :hasAvailableSwitch="hasAvailableSwitch"
            :vacationsOfUser="vacationsOfUser"
            :rotationsMap="rotationsMap"
            @select-day="selectedDate = $event"
            @swipe-left="currentMonth = (currentMonth + 1) % 12"
            @swipe-right="currentMonth = (currentMonth - 1 + 12) % 12"
          />
        </v-card-text>
      </v-card>

      <!-- Carte de l'équipe -->
      <v-card rounded="xl" elevation="0" class="mb-4">
        <v-card-title class="text-h6 font-weight-medium">Mon équipe</v-card-title>
        <v-card-text>
          <div v-if="teamStore.currentTeam" class="d-flex flex-column align-center">
            <v-avatar color="background" size="64" class="mb-4 smooth-shadow">
              <v-icon icon="mdi-account-group" size="32"></v-icon>
            </v-avatar>
            <div class="text-h5 font-weight-bold mb-2">{{ teamStore.currentTeam.name }}</div>
            <div class="text-medium-emphasis text-center">
              <v-icon icon="mdi-calendar-start" class="mr-2"></v-icon>
              Cycle depuis le {{ new Date(teamStore.currentTeam.cycleStartDate).toLocaleDateString() }}
            </div>
          </div>
          <div v-else class="text-center text-medium-emphasis">
            Aucune équipe assignée
          </div>
        </v-card-text>
      </v-card>

      <!-- Actions rapides -->
      <v-card rounded="xl" elevation="0">
        <v-card-title class="text-h6 font-weight-medium">Actions rapides</v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item
              v-for="action in quickActions"
              :key="action.label"
              :prepend-icon="action.icon"
              :title="action.label"
              @click="$router.push(action.route)"
              class="mb-2 rounded-lg"
              variant="tonal"
            />
          </v-list>
        </v-card-text>
      </v-card>
    </v-card>
    </v-col>

  </v-row>

  <!-- Statistiques -->
  <v-row class="mt-4">
    <v-col cols="12" md="4">
      <v-card rounded="xl" elevation="0">
        <v-card-text class="text-center">
          <v-icon color="primary" size="48" class="mb-4">mdi-account-clock</v-icon>
          <div class="text-h4 font-weight-bold">{{ stats.remplacements }}</div>
          <div class="text-medium-emphasis">Remplacements</div>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card rounded="xl" elevation="0">
        <v-card-text class="text-center">
          <v-icon color="secondary" size="48" class="mb-4">mdi-swap-horizontal</v-icon>
          <div class="text-h4 font-weight-bold">{{ stats.permutations }}</div>
          <div class="text-medium-emphasis">Permutations</div>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card rounded="xl" elevation="0">
        <v-card-text class="text-center">
          <v-icon color="tertiary" size="48" class="mb-4">mdi-star</v-icon>
          <div class="text-h4 font-weight-bold">{{ stats.points }}</div>
          <div class="text-medium-emphasis">Points</div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</v-container>
</template>

<style scoped>
.smooth-shadow {
    
  box-shadow: 0 10px 10px rgba(0, 0, 0, 0.062), 0 0px 0 1px rgba(255, 255, 255, 0.007), 0 0px 0px 1px rgba(0, 0, 0, 0.014) ;
}

.v-card-dashboard {
  background: rgba(var(--v-theme-background), 0.4);
 
 
}
</style>
