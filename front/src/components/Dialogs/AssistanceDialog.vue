<template>
  <GenericDialog v-model="assistance.isOpen" title="Contacter un administrateur" max-width="840">
    <template #content>
      <p class="text-body-medium text-medium-emphasis mb-4">Besoin d'aide ? Envoyez un message à un administrateur.</p>
      <ContactAdminForm admins="both" />
    </template>
  </GenericDialog>
</template>

<script setup>
import ContactAdminForm from '@/components/Forms/ContactAdminForm.vue';
import { useAssistanceStore } from '@/stores/assistanceStore.js';

// L'assistance vit dans cette fenêtre, ouverte de partout par `useAssistanceStore().open()` (elle remplace la page /contact-admin)
const assistance = useAssistanceStore();
</script>
