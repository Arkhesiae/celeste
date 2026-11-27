<template>
  <BaseDialog
    :model-value="dialogStore.isOpen(NAME)"
    title="Compte désactivé"
    icon="mdi-account-off-outline"
    max-width="420"
    persistent
  >
    <p class="text-body-medium text-center">{{ dialogStore.props.message }}</p>

    <template #actions>
      <v-btn variant="text" @click="contactAdmin">Contacter un administrateur</v-btn>
      <v-spacer />
      <v-btn color="primary" variant="flat" @click="dialogStore.close()">Fermer</v-btn>
    </template>
  </BaseDialog>
</template>

<script setup>
import BaseDialog from '@/components/common/BaseDialog.vue';
import { useDialogStore } from '@/stores/dialogStore';
import { useAssistanceStore } from '@/stores/assistanceStore';

const NAME = 'inactiveAccount';
const dialogStore = useDialogStore();
const assistanceStore = useAssistanceStore();

const contactAdmin = () => {
  dialogStore.close();
  assistanceStore.open();
};
</script>
