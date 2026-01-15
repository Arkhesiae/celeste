<template>
  <v-container>
    <v-row class="mb-16">
      <!-- Colonne principale -->
      <v-col
        cols="12"
        sm="12"
        md="6"
        lg="7"
        xl="8"
      >
        <v-row>
          <v-col cols="12">
            <div class="d-flex align-center justify-space-between">
              <FilterChipGroup
                v-model="availableFilter"
                :filters="availableFilterOptions"
              />
              <ListHeaderV2
                v-model:search="searchQuery"
                v-model:sort="sortBy"
                :sort-options="sortOptions"
                :initial-sort="sortOptions[1]"
              />
            </div>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <AvailableDemands
              :filter="availableFilter"
              :sort-by="sortBy.value"
              @open-details="openDemandDetails"
            />
          </v-col>
        </v-row>
      </v-col>

      <!-- Colonne latérale -->
      <v-col
        v-if="!smAndDown"
        cols="12"
        sm="12"
        md="6"
        lg="5"
        xl="4"
      >
        <v-row>
          <v-col cols="12">
            <FilterChipGroup
              v-model="ownFilter"
              :filters="ownFilterOptions"
            />
          </v-col>
        </v-row>


        <v-row>
          <v-col cols="12">
            <OwnDemands
              :selected-filter="ownFilter"
              @open-details="openDemandDetails"
            />
          </v-col>
        </v-row>
      </v-col>
    </v-row>

 

    <v-dialog
      v-model="loadingDemands"
      persistent
      width="300"
    >
      <v-card
        rounded="xl"
        class="pa-2"
      >
        <v-card-text class="d-flex align-center">
          <v-progress-circular
            indeterminate
            color="primary"
          />
          <p class="ml-4">
            Chargement...
          </p>
        </v-card-text>
      </v-card>
    </v-dialog>

    <RulesDialog v-model="showRulesDialog" />

    <DemandModal
      v-model="showDemandDetailsModal"
      :demand="selectedDemand"
    />
  </v-container>
</template>


<script setup>
import { ref } from "vue";
import { useDisplay } from "vuetify";



const { smAndDown} = useDisplay();
// État local
const loadingDemands = ref(false);
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


const showDemandDetailsModal = ref(false);
const selectedDemand = ref(null);

const openDemandDetails = (demand) => {
  console.log('openDemandDetails', demand);
  selectedDemand.value = demand;
  showDemandDetailsModal.value = true;
};

// Options de filtre
const ownFilterOptions = [
  { label: 'Tous', value: 'tous' },
  { label: 'En attente', value: 'en attente' },
  { label: 'A venir', value: 'a venir' },
  { label: 'Je me fais remplacer', value: 'je me fais remplacer' }
];

// Options de filtre
const availableFilterOptions = [
  { label: 'Remplaçables', value: 'remplacables' },
  { label: 'Permutables', value: 'permutables' },
  { label: 'Incompatibles', value: 'incompatibles', color: 'error' }
];

const availableFilter = ref('permutables');
const ownFilter = ref('tous');



</script>

<style scoped>

</style>
