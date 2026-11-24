<template>
  <UsersSections base-path="/center/users" />
</template>

<script setup>
// Les utilisateurs du centre : layout `alternative` ; la liste des membres est ouverte à tous, candidatures et mutations (pages enfants)
// demandent un administrateur
definePage({ meta: { layout: 'alternative' } });
</script>
