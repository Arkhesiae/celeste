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
        <v-card rounded="xl" elevation="0" class="pa-0" color="transparent">
          <!-- Filtres et recherche -->
          <v-row class="justify-space-between align-center mb-4">
            <v-col cols="12" md="6">
              <v-chip-group v-model="selectedFilter" column variant="flat" color="onBackground">
                <v-chip variant="text" rounded="lg" value="all">Disponible</v-chip>
                <v-chip variant="text" color="tertiary" rounded="lg" value="admin">Indisponible</v-chip>
                <v-chip variant="text" rounded="lg" value="pending">Tout</v-chip>
              </v-chip-group>
            </v-col>

            <v-col cols="12" md="6" class="d-flex justify-end gap-2">
              <v-text-field
                v-model="searchQuery"
                label="Rechercher"
                variant="solo"
                flat
                rounded="xl"
                single-line
                hide-details
                density="compact"
                class="search-field"
                style="max-width: 300px"
                clearable
              />
              <v-menu color="onBackground" rounded="lg">
                <template v-slot:activator="{ props }">
                  <v-btn color="remplacement" variant="text" rounded="lg" v-bind="props">
                    <span class="text-overline">Trier par</span>
                    <v-icon>mdi-chevron-down</v-icon>
                  </v-btn>
                </template>
                <v-list color="onBackground" bg-color="onBackground" rounded="xl" class="pa-4">
                  <v-list-item v-for="option in sortOptions" :key="option.value" rounded="lg" @click="sortBy = option.value">
                    <v-list-item-title>{{ option.label }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </v-col>
          </v-row>

          <!-- Liste des demandes -->
          <v-col class="pa-0 ma-0" cols="12">
            <!-- Demandes remplaçables -->
            <v-row class="ma-0 pa-0"> 
              <v-col cols="12" class="pa-0 ma-0">

            <v-chip color="remplacement" rounded="lg" class="text-h7 font-weight-medium">Remplaçable</v-chip>
            <DemandCard
              v-for="demand in demands"
              :key="demand._id"
              :demand="demand"
              class="pa-0 ma-0 my-2"
            />
            <span v-if="demands.length === 0" class="text-medium-emphasis text-subtitle-2 ml-4">
              Aucune demande disponible
            </span>
            </v-col>
          </v-row>
            <!-- Demandes permutables -->
            <v-chip color="permutation" rounded="lg" class="text-h7 mt-16 font-weight-medium" variant="tonal">
              Permutables
            </v-chip>
            <DemandCard
              v-for="demand in availableSwitches"
              :key="demand._id"
              :demand="demand"
              class="pa-0 ma-0"
            />

            <!-- Autres demandes -->
            <v-divider color="primary" opacity="0.01" class="my-0" />
            <v-chip color="error" rounded="lg" class="mt-16 text-h7 font-weight-medium">
              Autres demandes
            </v-chip>
            <DemandCard
              v-for="demand in otherDemands"
              :key="demand._id"
              :demand="demand"
            />
          </v-col>
        </v-card>
      </v-col>

      <!-- Colonne latérale -->
      <v-col cols="12" sm="12" md="4">
        <v-btn
          class="mb-4"
          prepend-icon="mdi-plus"
          variant="tonal"
          color="remplacement"
          height="80px"
          width="100%"
          elevation="0"
        >
          Ajouter une demande
        </v-btn>

        <div class="my-8 d-flex flex-column">
          <span class="text-h5 font-weight-medium">Mes demandes</span>
          <span class="opac text-subtitle-2 text-medium-emphasis">Toutes mes demandes</span>
        </div>

        <v-card
          rounded="xl"
          elevation="0"
          class="pa-1 position-sticky"
          style="position: sticky !important; top: 100px !important;"
        >
          <v-card-item @click="displayPending = !displayPending">
            <v-card-title>En attente</v-card-title>
            <template #append>
              <v-icon
                icon="mdi-chevron-down"
                :style="{ transform: displayPending ? 'rotate(-180deg)' : '', transition: 'all ease-in-out 0.2s' }"
              />
            </template>
          </v-card-item>

          <v-expand-transition>
            <v-card-text v-if="pendingDemands.length > 0 && displayPending">
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
                  color="success"
                  size="large"
                  class="mb-2"
                />
                <div class="text-body-1">Aucune demande en attente</div>
              </div>
            </v-card-text>
          </v-expand-transition>
        </v-card>
      </v-col>
    </v-row>

    <!-- Bouton flottant pour mobile -->
    <v-fab
      v-if="smAndDown"
      prepend-icon="mdi-plus"
      class="fab"
      height="60px"
      rounded="0"
      flat
      color="remplacement"
      location="bottom end"
      text="Nouvelle demande"
      extended
      app
      @click="showAddDialog = true"
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

// Stores
const substitutionStore = useSubstitutionStore();
const userStore = useUserStore();
const authStore = useAuthStore();
const { smAndDown } = useDisplay();

// État local
const loadingUsers = ref(true);
const userShift = ref(null);
const displayPending = ref(false);
const searchQuery = ref('');
const sortBy = ref('createdAt');
const selectedFilter = ref('all');
const showAddDialog = ref(false);

// Options de tri
const sortOptions = [
  { label: 'Nom', value: 'name' },
  { label: 'Prénom', value: 'lastName' },
  { label: 'Email', value: 'email' },
  { label: 'Statut', value: 'status' },
  { label: "Date d'inscription", value: 'createdAt' }
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
const otherDemands = computed(() => substitutionStore.otherDemands);
const availableSwitches = computed(() => substitutionStore.availableSwitches);
const pendingDemands = computed(() => [
  ...substitutionStore.ownPendingHybridSubstitutions,
  ...substitutionStore.ownPendingTrueSubstitutions,
  ...substitutionStore.ownPendingTrueSwitches
]);

const demands = computed(() => {
  let filteredDemands = substitutionStore.availableSubstitutions || [];

  // Filtrage par recherche
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filteredDemands = filteredDemands.filter(demand =>
      demand.shift?.name?.toLowerCase().includes(query) ||
      demand.date?.toLowerCase().includes(query)
    );
  }

  // Filtrage par statut
  if (selectedFilter.value !== 'all') {
    filteredDemands = filteredDemands.filter(demand => demand.status === selectedFilter.value);
  }

  // Tri
  if (sortBy.value) {
    filteredDemands.sort((a, b) => {
      const aValue = a[sortBy.value];
      const bValue = b[sortBy.value];
      return typeof aValue === 'string' ? aValue.localeCompare(bValue) : aValue - bValue;
    });
  }

  return filteredDemands;
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
      userStore.fetchUsers(),
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
