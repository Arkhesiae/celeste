<template>
  <v-container>
    <v-row class="mb-16">
      <v-col
        cols="12"
        sm="12"
        md="6"
        lg="7"
        xl="8"
      >
        <AvailableDemands
          @open-details="openDemandDetails"
          @handle-replacement="handleReplacement"
          @handle-switch="handleSwitch"
        />
      </v-col>

      <v-col
        v-if="!smAndDown"
        cols="12"
        sm="12"
        md="6"
        lg="5"
        xl="4"
      >
        <OwnDemands
          @handle-replacement="handleReplacement"
          @handle-switch="handleSwitch"
          @open-details="openDemandDetails"
        />
      </v-col>
    </v-row>

    <v-dialog
      :model-value="substitutionStore.loading"
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

    <DemandDependencies ref="demandDeps" />
  </v-container>
</template>


<script setup>
import { ref } from "vue";
import { useDisplay } from "vuetify";
import { useSubstitutionStore } from "@/stores/substitutionStore.js";

const { smAndDown } = useDisplay();
const substitutionStore = useSubstitutionStore();
const demandDeps = ref(null);
const showRulesDialog = ref(false);

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
