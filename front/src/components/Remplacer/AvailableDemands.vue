<template>

    <v-slide-x-transition mode="out-in" appear>
        <div v-if="demands.length === 0">
            <span class="text-medium-emphasis text-subtitle-2">
                Aucune demande disponible
            </span>
        </div>
        <div v-else class="d-flex flex-column ga-2 mt-8">
            <DemandCard v-for="demand in demands" :key="demand._id" :demand="demand" class="pa-0 ma-0 my-2" />
        </div>
    </v-slide-x-transition>

</template>

<script setup>
import { useSubstitutionStore } from "@/stores/substitutionStore.js";
const substitutionStore = useSubstitutionStore();

const props = defineProps({
    filter: {
        type: String,
        required: true,
        default: 'substitution'
    },
    sortBy: {
        type: String,
        default: 'date'
   
    }
});

// Fonction utilitaire pour le filtrage et le tri
const filterAndSortDemands = (demands) => {
    let filteredDemands = [...demands] || [];

    // Tri
    if (props.sortBy) {
        filteredDemands.sort((a, b) => {
            if (props.sortBy === 'date') {
                return new Date(a.posterShift.date) - new Date(b.posterShift.date);
            }
            if (props.sortBy === 'shift.name') {
                return a.posterShift?.name?.localeCompare(b.posterShift?.name);
            }
            if (props.sortBy === 'status') {
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

const demands = computed(() => {
    if (props.filter === 'remplacables') return filteredSubstitutions.value;
    if (props.filter === 'permutables') return filteredSwitches.value;
    if (props.filter === 'incompatibles') return filteredOthers.value;
    return [];
});





</script>

<style scoped></style>