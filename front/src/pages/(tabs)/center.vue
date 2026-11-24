<template>
  <router-view />
</template>

<script setup>


// Racine de l'onglet « Mon centre » (tout `pages/(tabs)/center/`) : onglet du bas, il retrouve son défilement (router/scrollRestoration.js).
// Ses pages ont le layout `user` de `pages/(tabs).vue`, sauf celles qui nomment `alternative` (tours de service, utilisateurs).
definePage({ meta: { tab: 'center' } });

</script>
