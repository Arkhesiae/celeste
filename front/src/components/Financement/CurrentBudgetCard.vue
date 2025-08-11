<template>
    <v-card rounded="xl" elevation="0" :class="!smAndDown ? 'pl-16' : 'pl-2 pr-2'" class="smooth-shadow pt-16 pb-4 overflow-visible d-flex flex-column" color="transparent" height="100%">
        <div class="d-flex align-center justify-start mb-4 mt-4">
            <div class="d-flex align-end text-h1 font-weight-bold">
                <v-slide-y-transition mode="out-in">
                    <span class="text-h1 font-weight-bold mr-2 " :key="remainingBudget" :class="{ 'text-error': remainingBudget < 0 }">{{
                        remainingBudget }}</span>
                </v-slide-y-transition>
                <span class="text-h5 font-weight-bold opacity-50">€</span>
            </div>
            <div class="ml-4">
                <h2 v-if="currentCampaign?.status === 'en_cours'" class="text-h5 font-weight-bold">Budget Actuel</h2>
                <h2 v-else-if="currentCampaign?.status === 'a_venir'" class="text-h5 font-weight-bold">Montant
                    prévisionnel</h2>
                <h2 v-else class="text-h5 font-weight-bold">Restant non utilisé</h2>
            </div>
        </div>
        <p class="text-medium-emphasis">État du financement et projections</p>
        <!-- Barre de progression -->
        <div class="d-flex flex-column justify-space-between flex-grow-1">
            <div class="my-16">
                <div class="d-flex justify-space-between align-center mb-2">
                    <span class="text-body-2 font-weight-medium">Enveloppe restante</span>
                    <span class="text-body-2 text-medium-emphasis">{{ progressPercentage }}%</span>
                </div>
                <!-- Barre de progression avec indicateur de budget utilisé -->
                <div class="position-relative mb-2">
                    <v-progress-linear :model-value="progressPercentage"
                        :bg-color="remainingBudget < 0 ? 'error' : 'remplacement'" color="remplacement" height="12"
                        rounded class="mb-2 animated-progress" />
                    <!-- Indicateur de budget utilisé -->
                    <div class="budget-used-indicator" v-if="previousCampaignsRemainder > 0"
                        :style="{ left: `${(previousCampaignsRemainder / (campaignAmount + previousCampaignsRemainder)) * 100}%` }">
                        <div class="indicator-dot"></div>
                        <div class="indicator-label">
                            <div class="text-body-2 font-weight-bold text-onSurface opacity-50 ">{{
                                previousCampaignsRemainder }}€</div>
                            <div class="label-subtitle">reste campagne précédente</div>
                        </div>
                    </div>
                </div>
                <div class="d-flex justify-space-between text-caption text-medium-emphasis">
                    <span>0€</span>
                    <span>{{ campaignAmount + previousCampaignsRemainder }}€</span>
                </div>

            </div>
            <!-- Informations détaillées du budget -->
            <div class="mt-12 pa-4 rounded-xl" style="background-color: rgba(var(--v-theme-surfaceContainer), 0.55);">
                <div class="d-flex justify-space-between align-center mb-2" v-if="previousCampaignsRemainder !== 0">
                    <span v-if="previousCampaignsRemainder > 0" class="text-onSurface text-body-2 font-weight-medium">Enveloppe
                        restante de la campagne précédente</span>
                    <span v-else class="text-body-2 font-weight-medium">Déficit de la campagne précédente</span>
                    <span class="text-body-2 font-weight-bold text-onSurface opacity-50 ">{{ previousCampaignsRemainder
                    }}€</span>
                </div>
                <div class="d-flex justify-space-between align-center mb-2">
                    <span class="text-onSurface text-body-2 font-weight-medium">Budget de la campagne {{ currentCampaignIndex }}</span>
                    <span class="text-body-2 font-weight-bold">{{ campaignAmount }}€</span>
                </div>
                <div class="d-flex justify-space-between align-center">
                    <span class="text-onSurface text-body-2 font-weight-medium">Dépenses de la campagne {{ currentCampaignIndex
                    }}</span>
                    <span class="text-body-2 font-weight-bold text-remplacement">-{{ campaignExpenses }}€</span>
                </div>
            </div>
        </div>
    </v-card>
</template>

<script setup>
import { useFundingStore } from '@/stores/financementStore';
import { useDisplay } from 'vuetify';
const { smAndDown } = useDisplay();


const fundingStore = useFundingStore();

const props = defineProps({
    remainingBudget: { type: Number, required: true },
    campaignAmount: { type: Number, required: true },
    campaignExpenses: { type: Number, required: true },
    previousCampaignsRemainder: { type: Number, required: true },
    currentCampaignIndex: { type: Number, required: true }
});


const currentCampaign = computed(() => {

    return fundingStore.campaignsWithStatus.find(c => c.index === props.currentCampaignIndex);
});


const progressPercentage = computed(() => {

    return Math.max(0, Math.min(100, Math.round((Math.max(0, props.remainingBudget) / (props.campaignAmount + props.previousCampaignsRemainder)) * 100)));
});


</script>

<style scoped>
.budget-used-indicator {
    position: absolute;
    top: 2px;
    transform: translateX(-50%);
    transition: all 0.3s ease;
    opacity: 1;
    z-index: 10;
}

.budget-used-indicator.visible {
    opacity: 1;
}

.indicator-dot {
    width: 8px;
    height: 8px;
    background: rgba(var(--v-theme-surface), 0.9);
    border: 1px solid rgba(var(--v-theme-onSurface), 0.5);
    border-radius: 50%;
    margin: 0 auto 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.indicator-label {
    background: rgb(var(--v-theme-surface));
    border: 1px solid rgba(var(--v-theme-remplacement), 0.02);
    border-radius: 8px;
    padding: 6px 10px;
    text-align: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    min-width: 80px;
}

.label-subtitle {
    font-size: 0.75rem;
    color: rgba(var(--v-theme-on-surface), 0.7);
    line-height: 1;
    margin-top: 2px;
}

/* Animation du gradient sur la barre de progression */
.animated-progress :deep(.v-progress-linear__determinate) {
    background: linear-gradient(90deg, 
        transparent 0%, 
        rgba(var(--v-theme-remplacement), 0.3) 15%, 
        rgba(255, 255, 255, 0.4) 50%, 
        rgba(var(--v-theme-remplacement), 0.3) 85%, 
        transparent 100%);
    background-size: 300px 100%;
    animation: gradient-shift 6s ease-in-out infinite;
}

@keyframes gradient-shift {
    0% {
        background-position: -300px 0;
    }
    100% {
        background-position: 100vw 0;
    }
}
</style>