<template>
  <v-container class="pa-4" style="max-width: 600px; margin: auto;">
    <!-- Amount and date -->
    <div class="text-center mb-6">
      <h1 class="text-h3 font-weight-bold">- 50,00 €</h1>
      <p class="text-body-2 text-medium-emphasis">Jeudi 13 novembre 2025, 09h51</p>

      <div class="d-flex justify-center mt-3 gap-3">
        <v-chip color="green-lighten-4" class="px-4">
          Pointé
          <v-icon end>mdi-check</v-icon>
        </v-chip>
        <v-chip color="green-lighten-4" class="px-4">
          Confirmé
          <v-icon end>mdi-information-outline</v-icon>
        </v-chip>
      </div>
    </div>

    <!-- Card: Recipient -->
    <v-card rounded="xl" elevation="0" class="mb-4">
      <v-card-text>
        <div class="d-flex justify-space-between align-center">
          <h3 class="text-subtitle-1 font-weight-medium mb-0">Arnaud Serviere</h3>
          <v-avatar color="grey-lighten-3" size="40">
            <v-icon>mdi-account</v-icon>
          </v-avatar>
        </div>
      </v-card-text>
    </v-card>

    <!-- Category -->
    <v-card rounded="xl" elevation="0" class="mb-4">
      <v-list density="comfortable">
        <v-list-item>
          <v-list-item-title>Catégorie</v-list-item-title>
          <template #append>
            <v-select
              :items="['Lydia']"
              variant="plain"
              hide-details
              density="comfortable"
              v-model="category"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- Debit account -->
    <v-card rounded="xl" elevation="0" class="mb-4">
      <v-list density="comfortable">
        <v-list-item>
          <v-list-item-title>Compte débité</v-list-item-title>
          <v-list-item-subtitle>Porte-monnaie Lydia</v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- Photo / Motif / Facture -->
    <v-card rounded="xl" elevation="0" class="mb-4">
      <v-list density="comfortable">
        <v-list-item>
          <v-list-item-title>Photo</v-list-item-title>
          <template #append>
            <v-btn variant="text" icon="mdi-camera" @click="addPhoto" />
          </template>
        </v-list-item>

        <v-divider />

        <v-list-item>
          <v-list-item-title>Motif</v-list-item-title>
          <template #append>
            <v-text-field
              variant="plain"
              density="compact"
              hide-details
              class="text-right"
              v-model="reason"
            />
          </template>
        </v-list-item>

        <v-divider />

        <v-list-item>
          <v-list-item-title>Facture</v-list-item-title>
          <template #append>
            <v-btn variant="text" icon="mdi-link-variant" @click="addInvoice" />
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- Links -->
    <v-card rounded="xl" elevation="0">
      <v-list>
        <v-list-item @click="openPdf" append-icon="mdi-chevron-right">
          <v-list-item-title>Ouvrir le reçu PDF</v-list-item-title>
        </v-list-item>
        <v-list-item append-icon="mdi-chevron-right">
          <v-list-item-title>Détails</v-list-item-title>
        </v-list-item>
        <v-list-item append-icon="mdi-chevron-right">
          <v-list-item-title>Faire un Lydia à Arnaud Serviere</v-list-item-title>
        </v-list-item>
        <v-list-item append-icon="mdi-chevron-right">
          <v-list-item-title>Aide</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'

const category = ref('Lydia')
const reason = ref('Zjzjeje')

function addPhoto() {
  console.log('Ajout de photo')
}

function addInvoice() {
  console.log('Ajout de facture')
}

function openPdf() {
  console.log('Ouverture du PDF')
}
</script>

<style scoped>
.gap-3 {
  gap: 12px;
}
</style>
