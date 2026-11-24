<template>
  <GenericDialog v-model="modelValue" title="Historique des transactions" max-width="1000">
    <template #content>
      <TransactionHistory />
    </template>
  </GenericDialog>
</template>

<script setup>
import TransactionHistory from '@/components/Transaction/TransactionHistory.vue';

// Même contenu que la sous-page du profil (pages/profile/[userId]/transaction-history.vue), en fenêtre : tableau de bord
const modelValue = defineModel({ type: Boolean, default: false });
</script>
