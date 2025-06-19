<template>
  <v-container>
    <!-- En-tête -->
    <div class="d-flex justify-space-between">
      <div class="my-16 d-flex flex-column">
        <span class="text-h4 font-weight-medium">Remplacements</span>
        <span class="text-h4 text-overline text-medium-emphasis">Créer et consulter les demandes de rempla</span>
      </div>
    </div>

    <v-row class="mb-16">
      <!-- Colonne principale -->
      <v-col cols="12" sm="12" md="8">
          <div>
          <!-- Filtres et recherche -->
          <ListHeader :filters="[
            { label: 'Permutations', value: 'switch' },
            { label: 'Remplacements', value: 'substitution', color: 'tertiary' },
            { label: 'Hybrides', value: 'hybrid' },
            { label: 'Tout', value: 'all' }
          ]" :sort-options="sortOptions" v-model:filter="selectedFilter" v-model:search="searchQuery"
            v-model:sort="sortBy" />


          <span v-if="filteredSubstitutions.length === 0 && filteredSwitches.length === 0"
            class="text-medium-emphasis text-subtitle-2 ">
            Aucune demande disponible
          </span>


          <!-- Liste des demandes -->

          <!-- Demandes remplaçables -->
          <div v-else>
          <v-row class="ma-0 pa-0">
            <v-col cols="12" class="pa-0 ma-0">
              <v-chip color="remplacement" v-if="filteredSubstitutions.length > 0" rounded="lg"
                class="text-h7 font-weight-medium">Remplaçable</v-chip>
              <DemandCard v-for="demand in filteredSubstitutions" :key="demand._id" :demand="demand"
                class="pa-0 ma-0 my-2" />

            </v-col>
          </v-row>
          <!-- Demandes permutables -->
          <v-row class="ma-0 pa-0">
            <v-col cols="12" class="pa-0 ma-0">
              <v-chip color="permutation" v-if="filteredSwitches.length > 0" rounded="lg"
                class="text-h7 mt-16 font-weight-medium" variant="tonal">
                Permutables
              </v-chip>
              <DemandCard v-for="demand in filteredSwitches" :key="demand._id" :demand="demand" class="pa-0 ma-0" />
            </v-col>
          </v-row>
          </div>
          <!-- Autres demandes -->
          <!-- Demandes permutables -->
          <v-row class="ma-0 pa-0" >
            <v-col cols="12" class="pa-0 ma-0">
              <v-divider color="primary" opacity="0.01" class="my-0" />
              <v-chip color="error" v-if="filteredOthers.length > 0" rounded="lg"
                class="mt-16 text-h7 font-weight-medium">
                Autres demandes
              </v-chip>
              <DemandCard v-for="demand in filteredOthers" :key="demand._id" :demand="demand" />
            </v-col>
          </v-row>

        </div>
      </v-col>

      <!-- Colonne latérale -->
      <v-col cols="12" sm="12" md="4">
        <!-- <v-btn v-if="!smAndDown" class="mb-4" prepend-icon="mdi-plus" variant="tonal" color="remplacement" height="80px"
          width="100%" elevation="0" @click="showAddDialog = true">
          Ajouter une demande
        </v-btn> -->

        <div class="mb-8 d-flex flex-column">
          <span class="text-h5 font-weight-medium">Mes demandes</span>
          <span class="opac text-subtitle-2 text-medium-emphasis">Toutes mes demandes</span>
        </div>

        <v-card v-if="pendingDemands.length > 0" rounded="xl" elevation="0" color="transparent" class="pa-0 position-sticky"
          style="position: sticky !important; top: 100px !important;">
          <v-card-item @click="displayPending = !displayPending">
            <v-card-title>En attente</v-card-title>
            <!-- <template #append>
              <v-icon icon="mdi-chevron-down"
                :style="{ transform: displayPending ? 'rotate(-180deg)' : '', transition: 'all ease-in-out 0.2s' }" />
            </template> -->
          </v-card-item>

          <v-expand-transition>
            <v-card-text class="pa-0" v-if="pendingDemands.length > 0">
              <div v-if="pendingDemands.length > 0">
                <OwnDemandCard :isPoster="true" v-for="demand in pendingDemands" :key="demand.id" :demand="demand" />
              </div>
              <div v-else class="text-center py-4">
                <v-icon icon="mdi-check-circle-outline" color="success" size="large" class="mb-2" />
                <div class="text-body-1">Aucune demande en attente</div>
              </div>
            </v-card-text>
          </v-expand-transition>
        </v-card>

        
        <v-card v-if="acceptedAsPoster?.length > 0" rounded="xl" elevation="0" color="transparent" class="pa-0 mt-4 position-sticky"
          style="position: sticky !important; top: 400px !important;">
          <v-card-item @click="displayAccepted = !displayAccepted">
            <v-card-title>Acceptées</v-card-title>
            <!-- <template #append>
              <v-icon icon="mdi-chevron-down"
                :style="{ transform: displayAccepted ? 'rotate(-180deg)' : '', transition: 'all ease-in-out 0.2s' }" />
            </template> -->
          </v-card-item>

          <v-expand-transition>
            <v-card-text class="pa-0" v-if="acceptedAsPoster?.length > 0">
              <div v-if="acceptedAsPoster.length > 0">
                <OwnDemandCard :isPoster="true" v-for="demand in acceptedAsPoster" :key="demand.id" :demand="demand" />
              </div>
              <div v-else class="text-center py-4">
                <v-icon icon="mdi-check-circle-outline" color="success" size="large" class="mb-2" />
                <div class="text-body-1">Aucune demande en attente</div>
              </div>
            </v-card-text>
          </v-expand-transition>
        </v-card>

        <div class="my-8 d-flex flex-column">
          <span class="text-h5 font-weight-medium">A venir</span>
          <span class="opac text-subtitle-2 text-medium-emphasis">Les vacations que je dois faire</span>
        </div>

        <v-card rounded="xl" elevation="0" color="transparent" class="pa-0 mt-4 position-sticky"
          style="position: sticky !important; top: 400px !important;">
          <v-card-item @click="displayAccepted = !displayAccepted">
            <v-card-title v-if="acceptedAsAccepter.length > 0">Acceptées</v-card-title>
            <v-card-title v-else>  <div class="text-body-1">Aucune demande acceptée</div></v-card-title>
            <!-- <template #append>
              <v-icon icon="mdi-chevron-down"
                :style="{ transform: displayAccepted ? 'rotate(-180deg)' : '', transition: 'all ease-in-out 0.2s' }" />
            </template> -->
          </v-card-item>

          <v-expand-transition>
            <v-card-text class="pa-0">
              <div v-if="acceptedAsAccepter.length > 0">
                <OwnDemandCard :isPoster="false" v-for="demand in acceptedAsAccepter" :key="demand.id" :demand="demand" />
              </div>
              
            </v-card-text>
          </v-expand-transition>
        </v-card>
      </v-col>
    </v-row>

    <!-- Bouton flottant pour mobile -->
    <!-- <v-fab v-if="smAndDown" prepend-icon="mdi-plus" class="fab" height="60px" rounded="0" flat color="remplacement"
      location="bottom end" text="Nouvelle demande" extended app @click="showAddDialog = true" /> -->

    <!-- Dialog pour ajouter une demande -->

      <AddSubstitutionForm 
        dialogMode="add" 
        v-model:dialogVisible="showAddDialog"
      />
 
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useSubstitutionStore } from "@/stores/substitutionStore.js";
import { useUserStore } from "@/stores/userStore.js";
import { useAuthStore } from "@/stores/authStore.js";
import { toUTCNormalized } from "@/utils.js";
import { useDisplay } from "vuetify";
import DemandCard from "@/components/Remplacer/DemandCard.vue";
import ListHeader from "@/components/common/ListHeader.vue";
import AddSubstitutionForm from "@/components/Dialogs/AddSubstitutionForm.vue";

// Stores
const substitutionStore = useSubstitutionStore();
const userStore = useUserStore();
const authStore = useAuthStore();
const { smAndDown } = useDisplay();

// État local
const loadingUsers = ref(true);
const userShift = ref(null);
const displayPending = ref(false);
const displayAccepted = ref(false);
const searchQuery = ref('');
const sortBy = ref('createdAt');
const selectedFilter = ref('all');
const showAddDialog = ref(false);

// Options de tri
const sortOptions = [
  { text: 'Type', value: 'type' },
  { text: 'Date', value: 'date' },
  { text: 'Nom du shift', value: 'shift.name' },
  { text: 'Statut', value: 'status' },
];

// Données de la demande
const demand = ref({
  shift: "",
  date: null,
  comment: "",
  points: 0,
});

// Computed properties
const userId = computed(() => authStore.userId);
const users = computed(() => userStore.users);
const pendingDemands = computed(() => [
  ...substitutionStore.ownPendingHybridSubstitutions,
  ...substitutionStore.ownPendingTrueSubstitutions,
  ...substitutionStore.ownPendingTrueSwitches
]);

const acceptedAsPoster = computed(() => substitutionStore.acceptedAsPoster);
const acceptedAsAccepter = computed(() => substitutionStore.acceptedAsAccepter);

const getNestedValue = (obj, path) => {
  if (!path || typeof path !== 'string') {
    return obj;
  }
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Fonction utilitaire pour le filtrage et le tri
const filterAndSortDemands = (demands) => {
  let filteredDemands = [...demands] || [];

  // Filtrage par recherche
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filteredDemands = filteredDemands.filter(demand =>
      demand.shift?.name?.toLowerCase().includes(query) ||
      demand.posterShift?.date?.toLowerCase().includes(query)
    );
  }

  // Filtrage par statut
  if (selectedFilter.value && selectedFilter.value !== 'all') {
    filteredDemands = filteredDemands.filter(demand => demand.type === selectedFilter.value);
  }

  // Tri
  if (sortBy.value) {
    filteredDemands.sort((a, b) => {
      if (sortBy.value.value === 'date') {
        return new Date(a.posterShift.date) - new Date(b.posterShift.date);
      }
      if (sortBy.value.value === 'shift.name') {
        return a.posterShift?.name?.localeCompare(b.posterShift?.name);
      }
      if (sortBy.value.value === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });
  }

  return filteredDemands;
};

const filteredSubstitutions = computed(() =>
  filterAndSortDemands(substitutionStore.availableSubstitutions)
);

const filteredSwitches = computed(() =>
  filterAndSortDemands(substitutionStore.availableSwitches)
);

const filteredOthers = computed(() =>
  filterAndSortDemands(substitutionStore.otherDemands)
);

const sortedDemands = computed(() => {
  const sorted = [...filteredSubstitutions.value];
  if (sortBy.value === 'date') {
    return sorted.sort((a, b) => new Date(a.posterShift.date) - new Date(b.posterShift.date));
  }
  return sorted;
});

// Méthodes
const fetchUserShift = async () => {
  if (!userId.value || !demand.value.date) return;

  try {
    const response = await fetch(
      `http://192.168.1.36:3000/users/${userId.value}/get-vacations`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: toUTCNormalized(demand.value.date) }),
      }
    );
    if (!response.ok) throw new Error("Échec lors de la récupération des vacances");
    const data = await response.json();
    userShift.value = data[0]?.status || "Inconnu";
  } catch (err) {
    console.error(err.message || "Erreur inconnue lors de la récupération du shift.");
  }
};

const submitDemand = async () => {
  if (!userId.value) {
    console.error("Veuillez sélectionner un utilisateur avant de soumettre la demande.");
    return;
  }

  try {
    const newDemand = {
      ...demand.value,
      posterId: userId.value,
      shift: userShift.value,
      date: toUTCNormalized(demand.value.date)
    };
    await substitutionStore.createDemand(newDemand);
    demand.value = { shift: "", date: null, comment: "", points: 0 };
  } catch (err) {
    console.error("Erreur lors de l'envoi de la demande:", err);
  }
};

const deleteDemand = async (demandId) => {
  try {
    await substitutionStore.deleteDemand(demandId);
  } catch (err) {
    console.error("Erreur lors de la suppression de la demande:", err);
  }
};

// Watchers
watch(
  [() => demand.value.date, () => userId.value],
  async () => {
    if (userId.value && demand.value.date) {
      await fetchUserShift();
    }
  },
  { immediate: true }
);

// Lifecycle hooks
onMounted(async () => {
  try {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    await Promise.all([

      substitutionStore.fetchAllDemands({
        startDate: new Date().toISOString(),
        endDate: oneYearFromNow.toISOString()
      })
    ]);
  } catch (err) {
    console.error("Erreur lors du chargement initial:", err);
  } finally {
    loadingUsers.value = false;
  }
});
</script>

<style scoped>
:deep(.dashed > .v-timeline-divider > .v-timeline-divider__after) {
  border: none;
  margin-bottom: 3px;
  border-left: 2px dotted rgba(157, 194, 211, 0.21);
  background: none !important;
}

:deep(.dashed > .v-timeline-divider > .v-timeline-divider__before) {
  border: none;
  border-left: 2px dotted rgba(157, 194, 211, 0.23);
  background: none !important;
}

.remplacement-fab-tonal {
  background-color: #e5e4ec !important;
}

:deep(.fab > .v-fab__container > button) {
  border-radius: 16px !important;
}

:deep(.v-fab__container) {
  margin-right: 16px !important;
  margin-bottom: 96px !important;
}
</style>
