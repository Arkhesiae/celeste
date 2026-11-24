<template>
  <RotationsView :center-id="centerId" />
</template>

<script setup>
import { useCenterQuery } from '@/composables/useCenterQuery.js';

// Tours de service : layout `alternative` (voir pages/center.vue). Ceux du centre de l'utilisateur ; `?center=` (le lien de la page d'un
// centre) en désigne un autre pour un administrateur principal
definePage({ meta: { layout: 'alternative' } });

const centerId = useCenterQuery();
</script>
