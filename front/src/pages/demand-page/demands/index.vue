<template>
  <v-container>


    <v-row class="mb-16">
      <!-- Colonne principale -->
      <v-col cols="12" sm="12" md="12" lg="7" xl="8">
        <v-row >
          <v-col cols="12">
            <FilterChipGroup v-model="availableFilter" :filters="availableFilterOptions" />
            <ListHeaderV2 :sort-options="sortOptions"  v-model:search="searchQuery"
              v-model:sort="sortBy" :initialSort="sortOptions[1]" />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <AvailableDemands :filter="availableFilter" :sortBy="sortBy.value" />
          </v-col>
        </v-row>
      </v-col>

      <!-- Colonne latérale -->
      <v-col cols="12" sm="12" md="12" lg="5" xl="4" v-if="!mdAndDown">
        <v-row >
          <v-col cols="12">
            <FilterChipGroup v-model="ownFilter" :filters="ownFilterOptions" />
          </v-col>
        </v-row>


        <v-row>
          <v-col cols="12">
            <OwnDemands :selected-filter="ownFilter" />
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <SidebarDrawer v-if="smAndDown" v-model="showSidebar">
      <v-row >
        <v-col cols="12">
          <FilterChipGroup v-model="ownFilter" :filters="ownFilterOptions" />
        </v-col>
      </v-row>


      <v-row>
        <v-col cols="12">
          <OwnDemands :selected-filter="ownFilter" />
        </v-col>
      </v-row>
    </SidebarDrawer>

    <v-dialog v-model="loadingDemands" persistent width="300">
      <v-card rounded="xl" class="pa-2">
        <v-card-text class="d-flex align-center">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="ml-4">Chargement...</p>
        </v-card-text>
      </v-card>
    </v-dialog>

    <RulesDialog v-model="showRulesDialog" />

  </v-container>
</template>


<script setup>
import { ref } from "vue";
import { useDisplay } from "vuetify";



const { smAndDown, mdAndDown } = useDisplay();
// État local
const loadingDemands = ref(false);
const showSidebar = ref(false);
const searchQuery = ref('');

const showRulesDialog = ref(false);

// Options de tri
const sortOptions = [
  { text: 'Type', value: 'type' },
  { text: 'Date', value: 'date' },
  { text: 'Nom du shift', value: 'shift.name' },
  { text: 'Statut', value: 'status' },
];
const sortBy = ref(sortOptions[1]);



// Options de filtre
const ownFilterOptions = [
  { label: 'Tous', value: 'tous' },
  { label: 'En attente', value: 'en attente' },
  { label: 'A venir', value: 'a venir' },
  { label: 'Je me fais remplacer', value: 'je me fais remplacer' }
];

// Options de filtre
const availableFilterOptions = [
  { label: 'Permutables', value: 'permutables' },
  { label: 'Remplaçables', value: 'remplaçables' },
  { label: 'Incompatibles', value: 'incompatibles', color: 'error' }
];

const availableFilter = ref('permutables');
const ownFilter = ref('tous');



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
