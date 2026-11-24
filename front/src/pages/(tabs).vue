<template>
  <router-view />
</template>

<script setup>
// Racine des quatre onglets du bas (tout `pages/(tabs)/` : dashboard, planning, demand-page, center ; groupe sans effet sur les adresses, les
// noms de route sont `/(tabs)/dashboard`...). Son layout est celui de ses pages, sauf pour celles qui en nomment un autre (voir `inheritLayouts`
// dans router/index.js : tours de service et utilisateurs du centre sont en `alternative`).
definePage({ meta: { layout: 'user' } });
</script>
