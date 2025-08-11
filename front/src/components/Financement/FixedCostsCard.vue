<template>
  <v-card rounded="xl" elevation="0" class="smooth-shadow pa-6" color="surfaceContainerLow">
    <h3 class="text-h6 font-weight-medium mb-4" style="font-family: 'Roboto', sans-serif; font-weight: 800 !important ; font-size: 1.2rem;">
      <v-icon icon="mdi-cog" color="primary" class="mr-2" size="16" />  
      Coûts Fixes
    </h3>
    <v-list class="bg-transparent">
      <v-list-item v-for="(cout, index) in fixedCosts" :key="index" class="mb-2 rounded-lg">
        <template v-slot:prepend>
          <v-icon :icon="cout.icon" :color="cout.color" size="20" />
        </template>
        <v-list-item-title class="font-weight-medium">{{ cout.nom }}</v-list-item-title>
        <v-list-item-subtitle class="mt-1">{{ cout.description }}</v-list-item-subtitle>
        <template v-slot:append>
          <span class="font-weight-bold">{{ cout.cout }}€</span>
        </template>
      </v-list-item>
    </v-list>
    <v-divider class="my-4" />
    <div class="d-flex justify-space-between align-center">
      <span class="text-h6 font-weight-medium">Total Fixes</span>
      <span class="text-h6 font-weight-bold">{{ fundingStore.totalFixedCosts }}€</span>
    </div>
  </v-card>
</template>

<script setup>
import { useFundingStore } from '@/stores/financementStore';
import { computed } from 'vue';

const fundingStore = useFundingStore();

const fixedCosts = computed(() => fundingStore.fixedCosts); 

</script> 