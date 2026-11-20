<template>
  <v-container>
    <MainTitle title="Mutations" subtitle="Demandes de changement de centre" />

    <v-progress-linear v-if="transferStore.loading" indeterminate color="primary" />

    <v-card
      v-else-if="!transferStore.transfers.length"
      rounded="xl"
      variant="flat"
      color="surfaceContainer"
      class="pa-8 text-center"
    >
      <v-icon icon="mdi-swap-horizontal" size="48" class="mb-4 text-medium-emphasis" />
      <div class="text-title-medium">Aucune demande de mutation</div>
      <div class="text-body-medium text-medium-emphasis mt-2">
        Les demandes de changement de centre des agents de votre centre, ou vers votre centre, apparaîtront ici.
      </div>
    </v-card>

    <v-row v-else>
      <v-col v-for="transfer in transferStore.transfers" :key="transfer.userId" cols="12" md="6">
        <v-card rounded="xl" variant="flat" color="surfaceContainer" class="pa-4 h-100">
          <div class="d-flex align-center ga-3">
            <UserAvatar :size="40" :avatar="transfer.avatar ?? undefined" :name="transfer.name" />
            <div class="d-flex flex-column flex-grow-1 min-width-0">
              <span class="text-body-large font-weight-medium">{{ transfer.name }} {{ transfer.lastName.toUpperCase() }}</span>
              <span class="text-body-small text-medium-emphasis">Demandée le {{ formatDay(transfer.requestedAt) }}</span>
            </div>
            <!-- Entrante : le centre de l'administrateur reçoit l'agent ; sortante : il le perd, en lecture seule -->
            <v-chip
              size="small"
              variant="tonal"
              :color="transfer.direction === 'incoming' ? 'primary' : 'secondary'"
              :prepend-icon="transfer.direction === 'incoming' ? 'mdi-account-arrow-right-outline' : 'mdi-account-arrow-left-outline'"
            >
              {{ transfer.direction === 'incoming' ? 'Arrivée' : 'Départ' }}
            </v-chip>
          </div>

          <div class="d-flex align-center ga-2 my-4">
            <v-chip size="small" variant="flat" color="surface">{{ transfer.fromCenter?.name }}</v-chip>
            <v-icon icon="mdi-arrow-right" size="small" color="primary" />
            <v-chip size="small" variant="flat" color="surface">{{ transfer.toCenter?.name }}</v-chip>
          </div>

          <p class="text-body-medium mb-4">« {{ transfer.reason }} »</p>

          <v-alert
            v-if="transfer.points < 0"
            type="error"
            variant="tonal"
            density="compact"
            rounded="lg"
            icon="mdi-alert-circle-outline"
            class="mb-4"
          >
            Solde de points négatif ({{ transfer.points }})
          </v-alert>

          <v-btn v-if="transfer.canAccept" color="primary" variant="flat" block @click="askAccept(transfer)">
            Accepter la mutation
          </v-btn>
          <div v-else class="text-body-small text-medium-emphasis">
            En attente de l'administrateur de {{ transfer.toCenter?.name }}
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Confirmation : l'acceptation efface la période à venir de l'agent -->
    <ConfirmationDialog
      v-model="confirmDialog"
      title="Accepter la mutation"
      :text="confirmText"
      icon="mdi-swap-horizontal"
      confirm-text="Accepter"
      @confirm="accept"
    />
  </v-container>
</template>

<script setup>
import { useCenterTransferStore } from '@/stores/centerTransferStore';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { formatDay } from '@/utils/dayFields.js';

const transferStore = useCenterTransferStore();
const snackbarStore = useSnackbarStore();

const confirmDialog = ref(false);
const selected = ref(null);

const confirmText = computed(() =>
  selected.value
    ? `${selected.value.name} ${selected.value.lastName.toUpperCase()} rejoindra ${selected.value.toCenter?.name}. Sa période à venir sera nettoyée (entrées de calendrier et remplacements annulés), ses équipes retirées et ses points remis à zéro.`
    : '',
);

const askAccept = (transfer) => {
  selected.value = transfer;
  confirmDialog.value = true;
};

const accept = async () => {
  const transfer = selected.value;
  if (!transfer) return;
  try {
    await transferStore.accept(transfer.userId);
    snackbarStore.showNotification('Mutation acceptée', 'onPrimary', 'mdi-check-circle');
  } catch (error) {
    snackbarStore.showNotification(error.message || "Impossible d'accepter la mutation", 'onError', 'mdi-close-circle');
  } finally {
    selected.value = null;
  }
};

onMounted(() => transferStore.fetchAll().catch((error) => {
  snackbarStore.showNotification(error.message || 'Impossible de charger les mutations', 'onError', 'mdi-close-circle');
}));
</script>
