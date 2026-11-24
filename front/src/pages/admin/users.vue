<template>
  <UsersSections base-path="/admin/users" />
</template>

<script setup>
// Les utilisateurs côté administration (layout `alternative` seul, voir pages/admin.vue) ; ceux du centre sont dans pages/center/users*
definePage({ meta: { layout: 'alternative' } });
</script>
