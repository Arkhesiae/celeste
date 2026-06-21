<template>
    <!-- Mobile: Swiper -->
    <div class="d-flex justify-space-between align-start w-100 flex-column ga-4" style="width: 100%; max-width: 100%;">
        <span class="text-title-large font-weight-medium pa-0">
            Mes demandes à venir
        </span>

        <div v-if="smAndDown" class="w-100">
            <Swiper :modules="[Pagination]" :pagination="{ clickable: true }" :slides-per-view="1" :space-between="16"
                class="vacation-swiper">
                <SwiperSlide v-for="(demand, index) in demandList" :key="index">
                    <OwnDemandCard :demand="demand" :dot="false" @open-details="emit('openDetails', $event)" />
                </SwiperSlide>

            </Swiper>
        </div>

        <!-- Desktop: side by side -->
        <div v-else class="w-100 ga-4 d-flex flex-wrap" style="width: 100%; max-width: 100%;">
            <OwnDemandCard v-for="(demand, index) in demandList" :key="index" class="flex-1-1" style="max-width: 400px;"
                :demand="demand" :dot="false" @open-details="emit('openDetails', $event)" />
        </div>
    </div>
</template>

<script setup>
import { useDisplay } from 'vuetify';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

import { useSubstitutionStore } from "@/stores/substitutionStore.js";

const substitutionStore = useSubstitutionStore();

// Props
const props = defineProps({
    selectedFilter: {
        type: String,
        default: 'tous'
    }
});

const ownFilter = ref('tous');

// Emits
const emit = defineEmits(['openDetails']);

const pendingDemands = computed(() => [
    ...substitutionStore.ownPendingHybridSubstitutions,
    ...substitutionStore.ownPendingTrueSubstitutions,
    ...substitutionStore.ownPendingTrueSwitches
]);

const acceptedAsPoster = computed(() => substitutionStore.acceptedAsPoster);
const acceptedAsAccepter = computed(() => substitutionStore.acceptedAsAccepter);

// Demandes acceptées (section "A venir")
const upcomingDemands = computed(() => {
    const asPoster = acceptedAsPoster.value.filter(d => d.accepterShift !== null);
    return [
        ...asPoster,
        ...acceptedAsAccepter.value
    ].sort((a, b) => new Date(a.posterShift.date) - new Date(b.posterShift.date));
});

// Demandes "Je me fais remplacer"
const replacementDemands = computed(() => {
    return acceptedAsPoster.value.filter(d => d.accepterShift === null);
});

// Définition des sections
const sectionDefinitions = [
    {
        demands: pendingDemands,
        isVisible: () => ownFilter.value === 'tous' || ownFilter.value === 'en attente'
    },
    {
        demands: upcomingDemands,
        isVisible: () => ownFilter.value === 'tous' || ownFilter.value === 'a venir'
    },
    {
        demands: replacementDemands,
        isVisible: () => ownFilter.value === 'tous' || ownFilter.value === 'je me fais remplacer'
    }
];

const demandList = computed(() => {
    return sectionDefinitions
        .filter(s => s.isVisible())
        .flatMap(s => s.demands.value);
});


const { smAndDown } = useDisplay();


</script>

<style scoped>
.vacation-swiper {
    padding-bottom: 32px !important;
}

.vacation-swiper :deep(.swiper-pagination) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.vacation-swiper :deep(.swiper-pagination-bullet) {
    width: 6px;
    height: 6px;
    border-radius: 50px;
    background: rgba(var(--v-theme-onSurfaceVariant), 0.4);
    opacity: 1;
    margin: 0 !important;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        background 0.3s ease;
}

.vacation-swiper :deep(.swiper-pagination-bullet-active) {
    width: 24px;
    background: rgba(var(--v-theme-primary), 1);
}
</style>