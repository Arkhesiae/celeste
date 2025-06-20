<template>
  <v-container class="pa-4">
    <div class="d-flex justify-space-between my-16 flex-column">
      <div class="d-flex align-center"> 
        <v-btn icon="mdi-arrow-left" variant="text" @click="router.back()" />
        <span class="text-h4 font-weight-medium">Historique des transactions</span>

      </div>
      <span class="text-h4 text-overline text-medium-emphasis">
        Voir toutes les transactions
      </span>
    </div>
    <v-row class=" ma-0">
      <div class="d-flex justify-center chip-container pa-2">
        <v-chip-group v-model="selectedTransactionType" class="pa-0 ma-0 ga-2 d-flex justify-center">
          <v-chip class="pa-0 ma-0 mr-2 px-4 text-body-2 " value="all" size="large" rounded="lg"
            color="primary" variant="text">Toutes</v-chip>
          <v-chip class="pa-0 ma-0 mr-2 px-4 text-body-2 " value="received" size="large" rounded="lg"
            color="primary" variant="text">Reçues</v-chip>
          <v-chip class="pa-0 ma-0 px-4 text-body-2 " value="sent" size="large" rounded="lg"
            color="primary" variant="text">Envoyées</v-chip>
        </v-chip-group>
      </div>
    </v-row>

    <v-row class="">
      <!-- Colonne de gauche : Historique des transactions -->
      <v-col cols="12" md="8">
        <transition name="fade" mode="out-in">
          <v-card :key="selectedTransactionType"  elevation="0" class="mb-4 pa-0" color="background">
            <v-card-text class="pa-0">
             
              <v-progress-circular v-if="isLoading" indeterminate color="primary"
                class="mx-auto my-4"></v-progress-circular>

              <div v-else-if="filteredTransactions.length > 0" class="ga-2 d-flex flex-column">
                <TransactionItem 
                  v-for="(transaction, index) in filteredTransactions" 
                  :key="index"
                  :transaction="transaction"
                />
              </div>
              <div v-else class="text-center text-medium-emphasis text-body-2 mt-4">
                Aucune transaction trouvée
              </div>
            </v-card-text>
          </v-card>
        </transition  >
      </v-col>

      <!-- Colonne de droite : Transactions en attente -->
      <v-col cols="12" md="4">
        <v-card rounded="xl" elevation="0" color="background">
          <v-card-text class="pa-1">
            <h2 class="text-h5 mb-6">Transactions en attente</h2>

            <v-progress-circular v-if="isLoadingPending" indeterminate color="primary"
              class="mx-auto my-4"></v-progress-circular>

            <div v-else-if="pendingTransactions.length > 0" class="ga-2 d-flex flex-column">
              <TransactionItem 
                v-for="(transaction, index) in pendingTransactions.slice(0, 2)" 
                :key="'pending-'+index"
                :transaction="transaction"
              />
            </div>
            <div v-else class="text-center text-medium-emphasis text-body-2 mt-4">
              Aucune transaction en attente
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { usePointStore } from '@/stores/pointStore';
import { useRouter } from 'vue-router';

import TransactionItem from '@/components/Transaction/TransactionItem.vue';

const router = useRouter();
const pointStore = usePointStore();
const selectedTransactionType = ref('all');


const transactions = computed(() => pointStore.transactions);
const pendingTransactions = computed(() => pointStore.pendingTransactions);
const isLoading = computed(() => pointStore.isLoading);
const isLoadingPending = computed(() => pointStore.isLoadingPending);

const filteredTransactions = computed(() => {
  let filtered = selectedTransactionType.value === 'all' 
    ? transactions.value 
    : transactions.value.filter(t => t.flow === selectedTransactionType.value);
 
  const sorted = filtered.sort((b, a) => {
    const dateA = a.effectiveDate;
    const dateB = b.effectiveDate;
    
    // Conversion du format dd/mm/yyyy en Date
    const [dayA, monthA, yearA] = dateA.split('/');
    const [dayB, monthB, yearB] = dateB.split('/');
    
    const dateObjA = new Date(yearA, monthA - 1, dayA);
    const dateObjB = new Date(yearB, monthB - 1, dayB);
    
    return dateObjA - dateObjB;
  });
  
  return sorted;
});

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

onMounted(() => {

  pointStore.fetchTransactions();
});
</script>

<style scoped>
.chip-container {
  background-color: rgba(var(--v-theme-surface), 1);
  margin-bottom: 16px;
  border-radius: 20px;

}



.transaction-item:last-child {
  border-bottom: none;
}


.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;

}
</style>