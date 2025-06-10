<script setup>
import { useAuthStore } from "@/stores/authStore.js";
import { ref, computed, onMounted, watch } from 'vue';
import { useDate } from 'vuetify';
import CalendarMobile from "@/components/Calendar/CalendarMobile.vue";
import PointsCard from "@/components/Profile/PointsCard.vue";

import { useDisplay } from "vuetify";
import { useTeamStore } from "@/stores/teamStore.js";
import { useSubstitutionStore } from "@/stores/substitutionStore.js";
import { useSnackbarStore } from "@/stores/snackbarStore.js";
import { useCalendar } from '@/composables/useCalendar';
import { vacationService } from "@/services/vacationService.js";
import { useRotationStore } from "@/stores/rotationStore.js";
import DemandCard from '@/components/OwnDemandCard.vue';
import OwnDemandCard from "@/components/OwnDemandCard.vue";
import TransferDialog from '@/components/Profile/TransferDialog.vue';

const authStore = useAuthStore()
const teamStore = useTeamStore()
const substitutionStore = useSubstitutionStore()
const snackbarStore = useSnackbarStore()
const userName = authStore.name
const { smAndDown } = useDisplay();
const showAnnouncement = ref(true);

// État pour le calendrier
const selectedDate = ref(new Date());
const currentMonth = ref(new Date().getMonth());
const currentYear = ref(new Date().getFullYear());
const daysOfWeek = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const vacationsOfUser = ref(new Map());
const rotationsMap = ref(new Map());
const currentActiveRotation = ref(null);

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

  if (todayVacation && todayVacation.shift) {
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

const vacationName = computed(() => (vacation) => {
  if (!vacation) return null;
  if (vacation.shift.type === 'rest') return 'Repos';
  return vacation.shift.name;
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

const pendingDemands = computed(() => {
  return substitutionStore.ownPendingHybridSubstitutions.concat(substitutionStore.ownPendingTrueSubstitutions).concat(substitutionStore.ownPendingTrueSwitches);
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

    // Charger le tour de service actif
    const rotationStore = useRotationStore();
    await rotationStore.fetchRotations(authStore.centerId);
    currentActiveRotation.value = rotationStore.sortedRotations.find(rotation => rotation.status === 'active') || null;

  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
 
  } finally {
    isLoading.value = false;
  }
};

// Observer les changements de mois pour recharger les données
watch([currentMonth, currentYear], () => {
  loadData();
});

onMounted(loadData);

const handleAcceptDemand = async (demand) => {
  try {
    await substitutionStore.acceptDemand(demand.id);
    snackbarStore.showMessage('Demande acceptée avec succès', 'success');
  } catch (err) {
    snackbarStore.showMessage('Erreur lors de l\'acceptation de la demande', 'error');
  }
};

const handleRejectDemand = async (demand) => {
  try {
    await substitutionStore.rejectDemand(demand.id);
    snackbarStore.showMessage('Demande refusée', 'info');
  } catch (err) {
    snackbarStore.showMessage('Erreur lors du refus de la demande', 'error');
  }
};

const transferDialog = ref(false);

const handleTransferSuccess = () => {
  pointStore.fetchUserPoints();
  pointStore.fetchTransactions();
};

const handleVacation = async (vacation) => {
  try {
    await vacationStore.updateVacation(vacation);
    snackbarStore.showMessage('Vacances mises à jour avec succès', 'success');
  } catch (err) {
    snackbarStore.showMessage('Erreur lors de la mise à jour des vacances', 'error');
  }
};
</script>

<route>
{
"meta": {
"requiresAuth": true
}
}
</route>

<template>
  <v-container>
    <!-- En-tête -->
    <div class="d-flex justify-space-between align-center mb-8">
      <div class="d-flex flex-column">
        <div class="d-flex align-center">
          <span class="text-h4 d-inline-block font-weight-medium font-weight-bold">Bienvenue </span>
          <span class="text-h4 d-inline-block font-weight-medium ml-2 gradient font-weight-bold">{{ userName }}</span>
        </div>
        <span class="text-h4 text-overline text-medium-emphasis">Tableau de bord</span>
      </div>
      <v-btn v-if="!smAndDown" color="remplacement" height="48px" class="px-6" style="border-radius: 16px !important"
        prepend-icon="mdi-plus" @click="$router.push('/exchange/replace')">
        Nouveau remplacement
      </v-btn>
    </div>

    <v-row>
      <v-col cols="12" class="pa-2">
        <v-card v-if="showAnnouncement" rounded="xl" elevation="0" class="mb-4 smooth-shadow pa-4"
          color="surfaceContainer">
          <v-icon icon="mdi-bell-outline" size="16" color="remplacement"
            style="position: absolute; top: 16px; left: 16px; transform: scale(12); filter: blur(0px); z-index: -1; opacity: 0.10;" />
          <div class="d-flex justify-space-between align-center">
            <div class="d-flex align-center ga-2 ml-4">
              <v-icon icon="mdi-bell-outline" size="16" color="remplacement" />
              <span class="font-weight-medium text-overline">Annonce</span>
            </div>
            <v-btn icon="mdi-close" variant="tonal" size="small" rounded="lg" color="remplacement"
              @click="showAnnouncement = false" />
          </div>
          <v-card-title class="text-h6 py-0 font-weight-medium ">Lancement du nouveau site</v-card-title>
          <v-card-text>
            <div class="text-medium-emphasis">
              Bienvenue à tous !
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Grille principale -->
    <v-row>

      <v-col cols="12" md="6" class="pa-2">
        <!-- Carte des vacations -->
        <v-card rounded="xl" elevation="0" class="mb-4 smooth-shadow sss pa-4" color="surfaceContainer">
          <v-card-title class="text-h6 font-weight-medium">Aujourd'hui</v-card-title>
          <v-card-text>
            <div v-if="getVacation && getVacation.shift.type === 'rest'">
              <div class="text-medium-emphasis position-absolute" style="bottom: 0; right: 0;">
                <v-icon icon="mdi-sleep" color="remplacement" size="128" class="mr-2" style="filter: blur(0px); z-index: -1; opacity: 0.070;"/>
              
              </div>
            </div>
            <div v-if="getVacation && getVacation.shift">
              <div class="d-flex align-center justify-space-between mb-2">
                <div>
                  <div class="text-h5 font-weight-medium">{{ vacationName(getVacation) }}</div>
                  <div class="text-medium-emphasis" v-if="getVacation.shift.type !== 'rest'">
                    {{ getVacation.shift.startTime }} - {{ getVacation.shift.endTime }}
                  </div>
                </div>
                <v-chip class="position-absolute ma-6" color="onBackground" variant="flat" size="small" rounded="lg"
                  style="right: 0; top: 0;">
                  Équipe {{ getVacation.teamObject.name }}
                </v-chip>
              </div>
            </div>
            <div v-else class="text-medium-emphasis"> 
              <v-icon icon="mdi-alert-circle-outline" color="remplacement" size="16" class="mr-2"/>
              Pas de vacation aujourd'hui 
            </div>
          </v-card-text>
        </v-card>


        <!-- Carte de la vacation de demain -->
        <v-card rounded="xl" elevation="0" class="mb-4 smooth-shadow pa-4" color="surfaceContainer">
          <v-card-title class="text-h6 font-weight-medium">Demain</v-card-title>
          <v-card-text>
            <div v-if="getVacation && getVacation.shift.type === 'rest'">
              <div class="text-medium-emphasis position-absolute" style="bottom: 0; right: 0;">
                <v-icon icon="mdi-sleep" color="remplacement" size="128" class="mr-2" style="filter: blur(0px); z-index: -1; opacity: 0.070;"/>
              
              </div>
            </div>
            <div v-if="getTomorrowVacation && getTomorrowVacation.shift">
              <div class="d-flex align-center justify-space-between mb-2">
                <div>
                  <div class="text-h5 font-weight-medium">{{ vacationName(getTomorrowVacation) }}</div>
                  <div class="text-medium-emphasis" v-if="getTomorrowVacation.shift.type !== 'rest'">
                    {{ getTomorrowVacation.shift.startTime }} - {{ getTomorrowVacation.shift.endTime }}
                  </div>
                </div>
                <v-chip class="position-absolute ma-6" color="onBackground" variant="flat" size="small" rounded="lg"
                  style="right: 0; top: 0;">
                  Équipe {{ getTomorrowVacation.teamObject.name }}
                </v-chip>
              </div>
            </div>
            <div v-else class="text-medium-emphasis">
              <v-icon icon="mdi-alert-circle-outline" color="remplacement" size="16" class="mr-2"/>
              Pas de vacation demain
            </div>
          </v-card-text>
        </v-card>

        <!-- Carte de la prochaine substitution -->
        <v-card rounded="xl" class="mb-4 shadow-alt pa-4" color="remplacement" z-index="-01000">
          <v-card-title class="text-h6 font-weight-medium">A venir</v-card-title>
          <v-card-text>
            <div v-if="nextSubstitution">
              <div class="d-flex align-center justify-space-between mb-2">
                <div>
                  <div class="text-h5 font-weight-medium">{{ nextSubstitution.type === 'replacement' ? 'Remplacement' :
                    'Permutation' }}</div>
                  <div class="text-medium-emphasis">
                    {{ new Date(nextSubstitution.posterShift.date).toLocaleDateString() }}
                  </div>
                  <div class="text-medium-emphasis" v-if="nextSubstitution.posterShift.shift.type !== 'rest'">
                    {{ nextSubstitution.posterShift.shift.name }}
                  </div>
                </div>
                <v-chip :color="nextSubstitution.type === 'replacement' ? 'remplacement' : 'permutation'" variant="flat"
                  size="small" rounded="lg">
                  {{ nextSubstitution.type === 'replacement' ? 'Remplacement' : 'Permutation' }}
                </v-chip>
              </div>
            </div>
            <div v-else class="text-onRemplacement">
              Aucun remplacement ou permutation à venir
            </div>
          </v-card-text>
        </v-card>

        <!-- Carte des demandes en attente -->
        <v-card rounded="xl" class="mb-4 shadow-alt pa-1" color="surfaceContainer"   z-index="-01000">
          <v-card-title class="text-h6 font-weight-medium">Demande en attente</v-card-title>
          <v-card-text>
            <div v-if="pendingDemands.length > 0">
              <OwnDemandCard
                v-for="demand in pendingDemands"
                :key="demand.id"
                :demand="demand"
              />
            </div>
            <div v-else class="text-center py-4">
              <v-icon
                icon="mdi-check-circle-outline"
                color="permutation"
                size="large"
                class="mb-2"
              />
              <div class="text-body-1">Aucune demande en attente</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>



      <!-- Section Points et Équipe -->
      <v-col cols="12" md="6" :class="smAndDown ? 'pa-0' : 'pa-2'">

        <!-- Carte du tour de service actif -->
        <v-card rounded="xl" elevation="0" class="mb-4 pa-6" :class="smAndDown ? 'mx-2' : 'mx-0'" color="surfaceContainer" @click="$router.push('/rotation')" style="cursor: pointer;">
          <div class="d-flex align-center justify-space-between">
            <div>
              <v-card-title class="text-h6 font-weight-medium pa-0">Tour de service actif</v-card-title>
              <v-card-text class="pa-0">
                <div v-if="currentActiveRotation">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div>
                      <div class="text-h5 font-weight-medium">{{ currentActiveRotation.name }}</div>
                      <div class="text-medium-emphasis">
                        Actif depuis le {{ new Date(currentActiveRotation.activationDate).toLocaleDateString() }}
                      </div>
                    </div>
                    <v-chip class="position-absolute ma-6" color="remplacement" variant="flat" size="small" rounded="lg"
                      style="right: 0; top: 0;">
                      Actif
                    </v-chip>
                  </div>
                </div>
                <div v-else class="text-medium-emphasis">
                  Aucun tour de service actif
                </div>
              </v-card-text>
            </div>
            <v-icon icon="mdi-chevron-right" color="remplacement" size="24" />
          </div>
        </v-card>


        <v-card rounded="xl" elevation="0" class="pa-4"
          :color="smAndDown ? 'surfaceContainerHigh' : 'surfaceContainer'">



          <!-- Carte des points -->
          <div class="mb-4 smooth-shadow rounded-xl">
            <PointsCard  :points="stats.points" :transactions="[]" color="onBackground" @transfer="transferDialog = true" />
          </div>

          <!-- Section Calendrier -->

          <v-card rounded="xl" flat class="mb-4 v-card-dashboard smooth-shadow pa-2" color="surfaceContainer">
            <v-card-title class="text-h6 font-weight-medium">Calendrier</v-card-title>
            <v-card-text>
              <CalendarMobile :daysOfWeek="daysOfWeek" :calendarDays="calendarDays" :isSelected="isSelected"
                :isWorkDay="isWorkDay" :isToday="isToday" :vacationsOfUser="vacationsOfUser" :rotationsMap="rotationsMap"
                @select-day="selectedDate = $event" @swipe-left="currentMonth = (currentMonth + 1) % 12"
                @swipe-right="currentMonth = (currentMonth - 1 + 12) % 12" />
            </v-card-text>
          </v-card>

          <!-- Carte de l'équipe -->
          <v-card rounded="xl" elevation="0" class="pa-2">
            <v-card-title class="text-h6 font-weight-medium">Mon équipe</v-card-title>
            <v-icon icon="mdi-crowd" size="16" color="onBackground"
              style="position: absolute; bottom: 40px; left: 16px; transform: scale(12); filter: blur(0px); z-index: -1; opacity: 0.10;" />
            <v-card-text>
              <div v-if="teamStore.currentTeam" class="d-flex flex-column align-center">
                <v-avatar color="background" size="64" class="mb-4 smooth-shadow">
                  <v-icon icon="mdi-crowd" size="32"></v-icon>
                </v-avatar>
                <div class="text-h5 font-weight-bold mb-2">Equipe {{ teamStore.currentTeam.name }}</div>
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

      

          <!-- Actions rapides
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
      </v-card> -->
        </v-card>
      </v-col>

    </v-row>
    <!-- <v-row :class="smAndDown ? 'my-16' : ''">
      
        
        <v-col cols="12" md="12" class="pa-2" >
          <div class="d-flex block " >
        <v-card rounded="xl" elevation="0" class="pa-6 flex-grow-1">
            <v-card-title class="text-h6 font-weight-medium pa-0">Soutenez le projet</v-card-title>
            <v-icon icon="mdi-coffee" size="16" color="onBackground"
              style="position: absolute; bottom: 40px; left: 16px; transform: scale(12); filter: blur(0px); z-index: -1; opacity: 0.050;" />
            <v-card-text class="pa-0">
              <div class="d-flex flex-column align-center">
                <v-avatar color="background" size="64" class="mb-4 smooth-shadow">
                  <v-icon icon="mdi-coffee" size="32" color="remplacement"></v-icon>
                </v-avatar>
                
                <div class="text-medium-emphasis text-center mb-4">
                  Si vous appréciez mon travail, vous pouvez m'offrir un café pour me soutenir
                </div>
                <v-btn
                  color="remplacement"
                  variant="flat"
                  rounded="lg"
                  prepend-icon="mdi-coffee"
                  style="  background: linear-gradient(45deg, #ffc0d4, rgba(237, 202, 255, 0.94), rgba(250, 152, 248, 0.05),
      rgba(159, 159, 248, 0.22));"
                  target="_blank"
                  class="px-6"
                >
                  Offrir un café
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </div>
        </v-col>
    </v-row> -->
    <!-- Statistiques -->
    <!-- <v-row class="mt-4">
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
    </v-row> -->
    <TransferDialog 
      :dialogVisible="transferDialog" 
      :userId="authStore.userId" 
      @update:dialogVisible="transferDialog = $event"
      @transfer-success="handleTransferSuccess" 
    />
  </v-container>
</template>

<style scoped>
.v-card-dashboard {
  background: rgba(var(--v-theme-background), 0.4);

}

.shadow {
  box-shadow:
    -31px -31px 43px 0 rgba(var(--v-theme-remplacement), 0.64),
    26px 26px 48px 0 rgba(0, 0, 0, 0.16);
}

.shadow-alt {

  box-shadow:

    0px 40px 50px 10px rgba(var(--v-theme-remplacement), .011);
}

.gradient {
  fill: transparent;
  color: #000;
  font-weight: 900 !important;
  background: linear-gradient(to right, rgb(var(--v-theme-remplacement)) 20%, #a779cd 40%, rgb(var(--v-theme-permutation)) 60%, #dc8474 80%);
  background-size: 200% auto;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-fill-color: transparent;
  animation: animatedTextGradient 15s linear infinite;
}

.block {
  position: relative;
  z-index: 0;
  overflow: visible !important;

}

.block:after,
.block:before {
  content: '';
  position: absolute;
  left: -1.5px;
  top: -1.5px;
  opacity: 0.81;
  border-radius: 24px;
  background: linear-gradient(45deg, #ffc0d4, rgba(237, 202, 255, 0.94), rgba(250, 152, 248, 0.05),
      rgba(159, 159, 248, 0.22), #ffccdd);
  background-size: 400%;
  width: calc(100% + 3px);
  height: calc(100% + 3px);
  z-index: -1;
  animation: steam 15s linear infinite;
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
  filter: blur(20px);
}

.block:before {
  filter: blur(3px);
}
</style>
