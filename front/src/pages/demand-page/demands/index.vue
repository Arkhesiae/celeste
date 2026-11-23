<template>

    <!-- Mobile : une seule liste à la fois, les demandes des autres par défaut ; deux boutons-icônes reliés pour passer de l'une à l'autre -->
    <div v-if="smAndDown" class="d-flex justify-center mb-4">
      <v-btn-toggle
        v-model="mobileView"
        mandatory
        connected
        size="small"
        variant="flat"
        color="primary"
        aria-label="Choisir la liste de demandes"
      >
        <v-btn value="others" aria-label="Demandes des autres" title="Demandes des autres">
          
            <v-icon icon="mdi-account-group-outline" />
       
        </v-btn>
        <v-btn value="mine" aria-label="Mes demandes" title="Mes demandes">
        
            <v-icon icon="mdi-account-outline" />
       
        </v-btn>
      </v-btn-toggle>
    </div>

    <v-row class="mb-16">
      <v-col v-if="!smAndDown || mobileView === 'others'" cols="12" sm="12" md="6" lg="7" xl="8">
        <AvailableDemands
          @open-details="openDemandDetails"
          @handle-replacement="handleReplacement"
          @handle-switch="handleSwitch"
        />
      </v-col>

      <v-col v-if="!smAndDown || mobileView === 'mine'" cols="12" sm="12" md="6" lg="5" xl="4">
        <OwnDemands
          @open-details="openDemandDetails"
          @cancel-demand="(demand) => demandDeps.handleCancel(demand)"
          @withdraw-demand="(demand) => demandDeps.handleWithdraw(demand)"
        />
      </v-col>
    </v-row>

    <v-dialog :model-value="demandStore.loading" persistent width="300">
      <v-card class="pa-2">
        <v-card-text class="d-flex align-center">
          <v-progress-circular indeterminate color="primary" />
          <p class="ml-4">Chargement...</p>
        </v-card-text>
      </v-card>
    </v-dialog>

    <RulesDialog v-model="showRulesDialog" />

    <DemandDependencies ref="demandDeps" />

</template>

<script setup>
import { ref } from 'vue';
import { useDisplay } from 'vuetify';
import { useDemandStore } from '@/stores/demandStore.js';

const { smAndDown } = useDisplay();
const demandStore = useDemandStore();
const demandDeps = ref(null);
const showRulesDialog = ref(false);

// Mobile : liste affichée, les demandes des autres par défaut
const mobileView = ref('others');

// Pastilles des deux boutons : demandes que je peux prendre (remplacement ou permutation), demandes à moi encore en attente
const availableCount = computed(() => demandStore.availableSubstitutions.length + demandStore.availableSwitches.length);
const ownPendingCount = computed(
  () =>
    demandStore.ownPendingHybridSubstitutions.length +
    demandStore.ownPendingTrueSubstitutions.length +
    demandStore.ownPendingTrueSwitches.length,
);

const handleReplacement = (demand) => {
  demandDeps.value.handleReplacement(demand);
};

const handleSwitch = (demand) => {
  demandDeps.value.handleSwitch(demand);
};

const openDemandDetails = (demand) => {
  demandDeps.value.openDemandDetails(demand);
};
</script>

<style scoped></style>
