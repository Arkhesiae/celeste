<template>
  <router-view />
</template>


<route lang="yaml">
  meta:
    layout: false
</route>


<script setup>  

import { useRoute } from 'vue-router';

const route = useRoute();
console.log('Route meta:', route.meta)
console.log('Layout:', route.meta.layout)

</script>