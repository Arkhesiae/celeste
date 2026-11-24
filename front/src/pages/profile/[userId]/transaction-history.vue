<template>
  <v-container class="pa-4">
    <MainTitle title="Historique des transactions" subtitle="Voir toutes les transactions" />

    <TransactionHistory class="mt-16" />
  </v-container>
</template>

<script setup>
// Sous-page du profil : layout `alternative`, dont la barre porte la flèche de retour vers l'onglet
definePage({ meta: { layout: 'alternative' } });
</script>
