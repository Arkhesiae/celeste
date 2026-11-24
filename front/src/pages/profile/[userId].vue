<template>
  <router-view />
</template>

<script setup>
// Racine du profil : la page du profil (`[userId]/index.vue`) et ses sous-pages (paramètres, historique des changements d'équipe, historique des
// transactions) en dépendent. Layout `user`, sauf les sous-pages qui nomment `alternative` (barre avec retour vers l'onglet).
definePage({ meta: { layout: 'user' } });
</script>
