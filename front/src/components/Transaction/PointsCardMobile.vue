<script setup>
import { usePointStore } from '@/stores/pointStore';


const pointStore = usePointStore();


const points = computed(() => pointStore.points);
const pendingTransactions = computed(() => pointStore.pendingTransactions);


const props = defineProps({
    tier: { type: String, default: 'Silver' },
})
</script>

<template>
    <v-card rounded="xl" color="surfaceContainer" flat class="points-card" @click="$emit('click')">
        <div class="d-flex align-center pa-4 ga-4">

            <v-avatar color="surfaceContainer" size="40">
                <Logo color="primary" style="margin-top: -2px; margin-left: 2px;" />
            </v-avatar>

            <div class="d-flex align-center justify-space-between flex-grow-1">
                <div>
                    <p class="text-body-2 font-weight-bold mb-0">Mes points</p>
                    <p class="text-caption text-disabled mt-n1">Membre</p>
                </div>

                <div class="text-right">
                    <p class="text-body-2 font-weight-bold mb-0">{{ points.toLocaleString() }}</p>
                    <p class="text-caption text-medium-emphasis mt-n1">{{ pendingTransactions.length }} transactions en
                        attente</p>
                </div>
            </div>

            <v-icon color="medium-emphasis" size="16">mdi-chevron-right</v-icon>
        </div>
    </v-card>
</template>

<style scoped>
.points-card {
    cursor: pointer;
    transition: border-color 0.15s;
}

.points-card:active {
    transform: scale(0.98);
}
</style>