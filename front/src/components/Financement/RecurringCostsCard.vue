<template>
  <v-card rounded="xl" elevation="0" class="smooth-shadow pa-6" color="surfaceContainerLow">
    <div class="d-flex align-center justify-space-between mb-8"> 
      <span class="text-body-2 font-weight-medium " style="font-family: 'Roboto', sans-serif; font-weight: 700 !important ; font-size: 1.2rem;">
      <v-icon icon="mdi-calendar-month" color="secondary" class="mr-2" size="16" />  
      Coûts Récurrents
    </span>
    </div>
  
    <v-list class="bg-transparent">
      <v-list-item v-for="(cout, index) in recurringCosts" :key="index" class="mb-2 rounded-lg">
        <div class="d-flex align-center ga-5">
         <v-icon :icon="cout.icon" :color="`rgba(var(--v-theme-remplacement), ${costPercentage(cout, totalAnnualCosts)})`" size="20" />
         <div class="d-flex flex-column">
          <v-list-item-title class="font-weight-medium">{{ cout.nom }}</v-list-item-title>
          <v-list-item-subtitle class="mt-1">{{ cout.description }}</v-list-item-subtitle>
         </div>
        </div>
        <template v-slot:append>
          <div class="text-right">
            <div class="font-weight-bold">{{ cout.cout }}€</div>
            <div class="text-caption text-medium-emphasis">{{ cout.periodicite }}</div>
          </div>
        </template>
      </v-list-item>
    </v-list>
    <v-divider class="my-4" />
    <div class="d-flex justify-space-between align-center">
      <span class="text-h6 font-weight-medium">Total Annuel</span>
      <span class="text-h6 font-weight-bold">{{ totalAnnualCosts }}€</span>
    </div>
    <!-- Métriques importantes -->

  </v-card>
  <v-row class="my-16">
      <v-col cols="12" md="6">
        <div class="text-center pa-4 rounded-xl bg-onBackground">
          <v-icon icon="mdi-account-group" size="32" class="mb-2" />
          <div class="text-h6 font-weight-bold">{{ userCount }}</div>
          <div class="text-caption">Utilisateurs actifs</div>
        </div>
      </v-col>
      <v-col cols="12" md="6">
        <div class="text-center pa-4 rounded-xl bg-surfaceContainerHighest">
          <v-icon icon="mdi-currency-eur" size="32" class="mb-2" />
          <div class="text-h6 font-weight-bold">{{ costPerUser }}€</div>
          <div class="text-caption">Coût par utilisateur/an</div>
        </div>
      </v-col>
    </v-row>
</template>

<script setup>
import { useFundingStore } from '@/stores/financementStore';
import { useStatStore } from '@/stores/statStore';
import { computed } from 'vue';

const costPercentage = computed(()=>(cout, totalAnnualCosts) => {
  if (!cout || !totalAnnualCosts) return 0;
  const occurence = cout?.periodicite === 'mois' ? 12 : cout?.periodicite === 'annuel' ? 1 : cout?.periodicite === 'semestriel' ? 2 : 1;
  const percentage = cout?.cout*occurence/totalAnnualCosts *100;

  return Math.min(1, Math.random()*.01 + 0.2 + percentage/100) ;
});

const fundingStore = useFundingStore();
const statStore = useStatStore();

const recurringCosts = computed(() => fundingStore.recurringCosts); 
const totalAnnualCosts = computed(() => fundingStore.totalAnnualCosts);

const costPerUser = computed(() => Math.round(totalAnnualCosts.value/statStore.totalUsers*100)/100);

const userCount = computed(() => statStore.totalUsers);

const getStats = async () => {
  const response = await statStore.fetchStats();
}

onMounted(() => {
  getStats();
})

</script> 