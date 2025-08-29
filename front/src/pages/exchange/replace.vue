<template>
  <v-container>
    <!-- En-tête -->
    <MainTitle title="Remplacements" subtitle="Créer et consulter les demandes de rempla">
      <template #actions>

        <!-- Bouton pour afficher/masquer la colonne latérale sur mobile -->
        <div v-if="smAndDown" class="d-flex position-relative flex-column align-end ga-1">
          <v-btn size="small" variant="flat" rounded="lg" color="surfaceContainerHigh" @click="showSidebar = !showSidebar" class="d-flex align-center">
             Mes demandes
            <template #prepend>
              <div class="d-flex  ga-1" style="right: 0px; top: -18px;">
              <div v-if="pendingDemands.length > 0" class="category-indicator pending"
                :title="`${pendingDemands.length} demande(s) en attente`">
                {{ pendingDemands.length }}
              </div>
              <div v-if="acceptedAsPoster?.length > 0" class="category-indicator accepted"
                :title="`${acceptedAsPoster.length} demande(s) acceptée(s)`">
                {{ acceptedAsPoster.length }}
              </div>
              <div v-if="acceptedAsAccepter.length > 0" class="category-indicator todo"
                :title="`${acceptedAsAccepter.length} remplacement(s) à faire`">
                {{ acceptedAsAccepter.length }}
              </div>
              
          </div>
            </template>
          </v-btn>
          
          <v-btn color="onSurface" size="small" variant="text" prepend-icon="mdi-book-open-variant"
                  @click="showRulesDialog = true">
                  Règles de travail
                </v-btn>
            
        </div>
        <div v-else>
          <v-btn color="onSurface"  rounded="lg" prepend-icon="mdi-book-open-variant"
                  @click="showRulesDialog = true">
                  Règles de travail
                </v-btn>
        </div>
      </template>
    </MainTitle>


    <!-- Indicateurs de catégories sur mobile -->


    <v-alert v-if="!activeRotation" color="error" variant="tonal" rounded="xl" class="mb-4 pa-4"
      icon="mdi-alert-outline" style="cursor: pointer;" @click="router.push('/profile/' + authStore.userId)">
      <div class="d-flex align-center justify-space-between">
        <div>
          <v-card-title class="text-h6 font-weight-medium">Aucun tour de service actif</v-card-title>
          <v-card-text>
            <div class="text-medium-emphasis">
              Aucun tour de service n'est actuellement actif.
            </div>
            <div>
              Sans tour de service actif, vous ne pourrez pas effectuer de remplacements ou de permutations. Veuillez
              contacter un administrateur pour activer un tour de service.
            </div>
          </v-card-text>
        </div>


      </div>
    </v-alert>
    <v-row class="mb-16">
      <!-- Colonne principale -->
      <v-col cols="12" sm="12" md="8">
        
          <!-- Filtres et recherche -->
          <!-- <ListHeader :filters="[
            { label: 'Permutations', value: 'switch' },
            { label: 'Remplacements', value: 'substitution', color: 'tertiary' },
            { label: 'Hybrides', value: 'hybrid' },
            { label: 'Tout', value: 'all' }
          ]" :sort-options="sortOptions" v-model:filter="selectedFilter" v-model:search="searchQuery"
            v-model:sort="sortBy" /> -->

          <ListHeaderV2 :filters="[
            { label: 'Permutations', value: 'switch' },
            { label: 'Remplacements', value: 'substitution'},
        
          ]" :sort-options="sortOptions" v-model:filter="selectedFilter" v-model:search="searchQuery"
            v-model:sort="sortBy" />

 
          <div class="d-flex justify-center align-center my-16" v-if="filteredSubstitutions.length === 0 && filteredSwitches.length === 0">
          <span class="text-medium-emphasis text-subtitle-2">
            Aucune demande disponible
          </span>
     
          </div>

          <!-- Liste des demandes -->

          <!-- Demandes remplaçables -->
          
          <div v-else class="mt-8">
            <v-row class="ma-0 pa-0">
              <v-col cols="12" class="pa-0 ma-0">
                <v-chip color="remplacement" v-if="filteredSubstitutions.length > 0" rounded="lg"
                  class="text-h7 font-weight-medium">Remplaçable</v-chip>
                <div v-if="filteredSubstitutions.length > 0" class="d-flex flex-column ga-2 mt-8">
                  <DemandCard v-for="demand in filteredSubstitutions" :key="demand._id" :demand="demand"
                    class="pa-0 ma-0 my-2" />
                </div>

              </v-col>
            </v-row>
            <!-- Demandes permutables -->
            <v-row class="ma-0 pa-0">
              <v-col cols="12" class="pa-0 ma-0">
                <v-chip color="permutation" v-if="filteredSwitches.length > 0" rounded="lg"
                  class="text-h7 mt-16 font-weight-medium" variant="tonal">
                  Permutables
                </v-chip>
                <div v-if="filteredSwitches.length > 0" class="d-flex flex-column ga-2 mt-8">
                  <DemandCard v-for="demand in filteredSwitches" :key="demand._id" :demand="demand" class="pa-0 ma-0" />
                </div>
              </v-col>
            </v-row>
          </div>
      
          <!-- Autres demandes -->
          <div v-if="filteredOthers.length > 0" class="mt-8">
          <v-row class="ma-0 pa-0">
            <v-col cols="12" class="pa-0 ma-0">
              
              <div class="d-flex align-center ga-2">
                <v-chip color="error" v-if="filteredOthers.length > 0" rounded="lg"
                  class="flex-shrink-0 text-h7 font-weight-medium">
                  Demandes incompatibles
                </v-chip>
                <!-- Bouton pour ouvrir les règles de travail -->
         
              </div>

              <div v-if="filteredOthers.length > 0" class="mt-8 d-flex flex-column ga-4">
                <DemandCard v-for="demand in filteredOthers" :key="demand._id" :demand="demand" />
              </div>
            </v-col>
          </v-row>
          </div>

        
      </v-col>

      <!-- Colonne latérale -->
      <v-col cols="12" sm="12" md="4" v-if="!smAndDown">
        <UserDemandsSidebar :pending-demands="pendingDemands" :accepted-as-poster="acceptedAsPoster"
          :accepted-as-accepter="acceptedAsAccepter" />
      </v-col>
    </v-row>

    <SidebarDrawer v-if="smAndDown" v-model="showSidebar">
      <UserDemandsSidebar :pending-demands="pendingDemands" :accepted-as-poster="acceptedAsPoster"
        :accepted-as-accepter="acceptedAsAccepter" />
    </SidebarDrawer>

    <v-dialog v-model="loadingDemands" persistent width="300">
      <v-card rounded="xl" class="pa-2">
        <v-card-text class="d-flex align-center">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="ml-4">Chargement...</p>
        </v-card-text>
      </v-card>
    </v-dialog>
    <!-- Bouton flottant pour mobile -->
    <!-- <v-fab v-if="smAndDown" prepend-icon="mdi-plus" class="fab" height="60px" rounded="0" flat color="remplacement"
      location="bottom end" text="Nouvelle demande" extended app @click="showAddDialog = true" /> -->

    <!-- Dialog pour ajouter une demande -->

  

    <!-- Dialogue pour les règles de travail -->
    <RulesDialog v-model="showRulesDialog" />

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
import RulesDialog from "@/components/Dialogs/RulesDialog.vue";
import { useRotationStore } from "@/stores/rotationStore.js";


// Stores
const substitutionStore = useSubstitutionStore();
const userStore = useUserStore();
const authStore = useAuthStore();
const { smAndDown, md, xs, sm } = useDisplay();
const rotationStore = useRotationStore();
// État local
const loadingUsers = ref(true);
const loadingDemands = ref(false);
const userShift = ref(null);
const showSidebar = ref(false);

const displayPending = ref(false);
const displayAccepted = ref(false);
const searchQuery = ref('');
const sortBy = ref('createdAt');
const selectedFilter = ref('all');
const showAddDialog = ref(false);
const showRulesDialog = ref(false);

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


const activeRotation = computed(() => {
  return rotationStore.sortedRotations.find(rotation => rotation.status === 'active') || null;

});


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
    filteredDemands = filteredDemands.filter(demand => demand.type === selectedFilter.value || demand.type === 'hybrid');
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
    loadingDemands.value = true;
  
  } catch (err) {
    console.error("Erreur lors du chargement initial:", err);
  } finally {
    loadingUsers.value = false;
    loadingDemands.value = false;
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

/* Indicateurs de catégories */
.category-indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 8px;

  cursor: pointer;
  transition: all 0.2s ease;
}

.category-indicator:hover {
  transform: scale(1.1);
}

.category-indicator.pending {
  background-color: rgb(var(--v-theme-pendingDemand));
  color: rgb(var(--v-theme-onPendingDemand));
}

.category-indicator.accepted {
  background-color: rgb(var(--v-theme-acceptedDemand));
  color: rgb(var(--v-theme-onAcceptedDemand));
}

.category-indicator.todo {
  background-color: rgb(var(--v-theme-remplacement));
  color: rgb(var(--v-theme-background));
}
</style>
