<template>
  <router-view />
</template>

<script setup>
// Racine de la section administrateur (tout `pages/admin/`) : la règle d'accès et le layout `admin` de ses pages, sauf celles qui en nomment un
// autre (`admin/users`, `admin/tickets` : `alternative`, voir `inheritLayouts` dans router/index.js).
definePage({
  meta: {
    layout: 'admin',
    requiresAdmin: true,
  },
});
</script>
