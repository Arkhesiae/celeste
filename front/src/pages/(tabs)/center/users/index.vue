<template>
  <UserList :center-id="centerId" />
</template>

<script setup>
import { useCenterQuery } from '@/composables/useCenterQuery.js';

// Les membres du centre de l'utilisateur ; `?center=` (le lien de la page d'un centre) en désigne un autre pour un administrateur principal
const centerId = useCenterQuery();
</script>
