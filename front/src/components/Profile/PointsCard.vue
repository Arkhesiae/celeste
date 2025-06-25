<template>
  <v-card :class="smAndDown ? 'points-card-mobile' : 'points-card'" rounded="xl" elevation="0" class="pa-6">
    <v-card-text class="pa-0 height-transition" style="height: 100%">
      <Logo color="remplacement"
        style="width: 100%; height: 100%; position: absolute; bottom: -60; left: 0; opacity: 0.05; filter: blur(10px);"  />
      <div class="d-flex flex-column justify-space-between height-transition" style=" height: 100% ">
        <!-- En-tête avec l'icône et le menu -->
        <div class="d-flex justify-space-between align-center mb-4">
          <div class="points-icon d-flex justify-center align-center">
            <Logo color="remplacement" style="margin-top: -2px; margin-left: 2px; " />
          </div>
          <!-- <v-btn icon variant="text">
            <v-icon>mdi-dots-horizontal</v-icon>
          </v-btn> -->
        </div>

        <!-- Section des points -->
        <div class="points-section justify-center align-center flex-column mb-6">
          
          <transition v-if="points || points === 0" name="slide-points" mode="out-in">
            <div v-if="points > 99999" class="text-center text-h6 ">
                <v-icon class="mb-1" size="x-large">mdi-infinity</v-icon>
              </div>
            <div v-else :key="points" class="text-h3 font-weight-bold text-center"> 
              {{ points }}
            </div>
          </transition>
          <div class="text-subtitle-1 text-center mb-1 mt-n1" style="opacity: 0.5;"> points</div>
        </div>

        <!-- Boutons d'action -->
        <div class="d-flex justify-center align-center">
          <v-btn prepend-icon="mdi-transfer" color="background" variant="flat" rounded="lg" height="40"
            class="transaction-button" @click="$emit('transfer')">
            Transférer
          </v-btn>

        </div>

        <!-- Historique des transactions -->
        <div class="mt-6 pa-0">
          <div class="d-flex justify-space-between align-center mb-3">
            <div class="text-h6">Dernière activité</div>
            <v-btn variant="text" density="compact" color="auto"
              @click="$router.push('/profile/' + authStore.userId + '/transaction-history')">
              Voir tout
              <v-icon end>mdi-chevron-right</v-icon>
            </v-btn>
          </div>
          <v-progress-circular v-if="isLoading" indeterminate color="primary"
            class="mx-auto my-4"></v-progress-circular>
          <div v-else-if="transactions.length > 0" class="ga-2 d-flex flex-column">
            <TransactionItem v-for="(transaction, index) in processedTransactions.slice(0, 2)" :key="index"
              color="background" :transaction="transaction" />
          </div>
          <div v-else class="text-center opacity-50 text-body-2 mt-4">
            Aucune transaction récente
          </div>

          <!-- Transactions en attente -->
          <div v-if="pendingTransactions.length > 0" class="mt-4 ga-2 d-flex flex-column">
            <div class="text-subtitle-2 opacity-50 mb-2">Prochaines transactions en attente</div>
            <TransactionItem v-for="(transaction, index) in pendingTransactions.slice(0, 2)" :key="index"
              :transaction="transaction" />
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { onMounted } from 'vue';
import { usePointStore } from '@/stores/pointStore';
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/authStore';
import { tr } from 'vuetify/locale';

const pointStore = usePointStore();
const { smAndDown } = useDisplay();
const authStore = useAuthStore();
const points = computed(() => pointStore.points);
const transactions = computed(() => pointStore.transactions);
const pendingTransactions = computed(() => pointStore.pendingTransactions);
const processedTransactions = computed(() => pointStore.processedTransactions);
const isLoading = computed(() => pointStore.isLoading);


const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

onMounted(() => {

  // pointStore.fetchUserPoints();
  try {
    // pointStore.fetchTransactions();
  } catch (error) {
    console.error('Erreur lors de la récupération des transactions:', error);
  }
});
</script>

<style scoped>
.points-card {

  transition: height 0.4s ease-in-out;
  /* border: 2px solid rgba(0, 0, 0, 0.027); */
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.height-transition {
  transition: height 0.4s ease-in-out !important;
}

.points-card-mobile {

  /* background: linear-gradient(180deg, 
    rgba(255, 255, 255, 0) 0%,
    rgba(var(--v-theme-surface), 0.4) 15%,
    rgba(var(--v-theme-surface), 0.9) 100%
  ); */
  /* border: 2px solid rgba(0, 0, 0, 0.027); */
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.1);
}


.transaction-button {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.096), 0 0 0 1px rgba(255, 255, 255, 0.007), 0 4px 8px rgba(0, 0, 0, 0.048);
}

.transaction-button:hover {
  transform: scale(1.07);
  background: rgba(var(--v-theme-background), 1);
  transition: transform 0.2s ease-in-out;
}

.points-icon {
  background: rgba(var(--v-theme-background), 1);
  padding: 8px;
  width: 48px;
  height: 48px;
  border-radius: 118px;
}



.transaction-item:last-child {
  border-bottom: none;
}


.slide-points-enter-active,
.slide-points-leave-active {
  transition: all 0.4s ease-in-out;
  /* Adjust duration and easing as needed */


}

.slide-points-enter-from {
  transform: translateY(-50%);
  /* Slide from/to the top */
  opacity: 0;
}

.slide-points-leave-to {
  transform: translateY(50%);
  /* Slide from/to the top */
  opacity: 0;
}

.pending-transaction {
  border-left: 3px solid rgb(var(--v-theme-warning));
  background: rgba(var(--v-theme-warning), 0.05);
}

.pending-transaction:hover {
  background: rgba(var(--v-theme-warning), 0.1);
}
</style>