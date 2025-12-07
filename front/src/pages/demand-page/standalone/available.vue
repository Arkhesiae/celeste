<template>
    <v-container>
        <SimpleTitle title="Disponibles" backButton subtitle="Consulter les demandes disponibles" />
        <v-row class="mt-16">
            <v-col cols="12">
                <FilterChipGroup v-model="selectedFilter" :filters="filters" />
                <ListHeaderV2 :sort-options="sortOptions" v-model:filter="selectedFilter" v-model:search="searchQuery"
                    v-model:sort="sortBy" :initialSort="sortOptions[1]" />
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="12">
                <AvailableDemands :filter="selectedFilter" :sortBy="sortBy.value" />
            </v-col>
        </v-row>
    </v-container>
</template>



<script setup>
import { ref } from "vue";


const searchQuery = ref('');

const selectedFilter = ref('permutables');


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
    { label: 'Permutables', value: 'permutables' },
    { label: 'Remplaçables', value: 'remplaçables' },
    { label: 'Incompatibles', value: 'incompatibles', color: 'error' }
];


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