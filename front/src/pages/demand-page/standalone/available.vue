<template>
  <v-container>
    <SimpleTitle
      title="Disponibles"
      back-button
      subtitle="Consulter les demandes disponibles"
    />
    <v-row class="mt-16">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between"> 
          <FilterChipGroup
            v-model="selectedFilter"
            :filters="filters"
          />
          <ListHeaderV2
            v-model:filter="selectedFilter"
            v-model:search="searchQuery"
            v-model:sort="sortBy"
            :sort-options="sortOptions"
            :initial-sort="sortOptions[1]"
          />
        </div>    
      </v-col>
    </v-row>
    <v-row v-if="visible">
      <v-col cols="12">
        <AvailableDemands
          :filter="selectedFilter"
          :sort-by="sortBy.value"
          @open-details="openDemand"
        />
      </v-col>
    </v-row>

    <DemandModal
      v-model="showDemandDetailsModal"
      :demand="selectedDemand"
    />
  </v-container>
</template>



<script setup>
import { ref } from "vue";


const searchQuery = ref('');
const showDemandDetailsModal = ref(false);
const selectedDemand = ref(null);
const selectedFilter = ref('remplacables');
const visible = ref(false);

// Options de tri
const sortOptions = [
    { text: 'Type', value: 'type' },
    { text: 'Date', value: 'date' },
    { text: 'Nom du shift', value: 'shift.name' },
    { text: 'Statut', value: 'status' },
];

const sortBy = ref({ value: "date", label: "Date" });
// Données de la demande


// Options de filtre
const filters = [
    { label: 'Remplaçables', value: 'remplacables' },
    { label: 'Permutables', value: 'permutables' },
    { label: 'Incompatibles', value: 'incompatibles', color: 'error' }
];


const openDemand = (demand) => {
    selectedDemand.value = demand;
    showDemandDetailsModal.value = true;
}

onMounted(() => {
    setTimeout(() => {
        visible.value = true
    }, 200)
})
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

.content-custom {
    background-color: rgba(var(--v-theme-on-surface), 0.1);
    display: flex;
    gap: 8px;

}
</style>