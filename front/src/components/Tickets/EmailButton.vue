<template>
  <div>
    <!-- Version bouton pour TicketDetails -->
    <v-btn 
      v-if="variant === 'button'"
      color="surfaceContainerHigh" 
      variant="flat" 
      @click="copyToClipboard" 
      rounded="xl"
      :height="height"
      :size="size"
    >
      <div class="d-flex align-center">
        <v-icon size="small" class="mr-1">mdi-email-outline</v-icon>
        {{ email }}
        <v-icon size="small" class="ml-1">mdi-content-copy</v-icon>
      </div>
    </v-btn>

    <!-- Version span pour TicketList -->
   
  </div>
</template>

<script setup>
import { useSnackbarStore } from '@/stores/snackbarStore';

const snackbarStore = useSnackbarStore();

const props = defineProps({
  email: {
    type: String,
    required: true
  },
  variant: {
    type: String,
    default: 'button',
    validator: (value) => ['button', 'span'].includes(value)
  },
  height: {
    type: String,
    default: '32'
  },
  size: {
    type: String,
    default: 'small'
  }
});

const copyToClipboard = async () => {
  try {

      await navigator.clipboard.writeText(props.email);
      snackbarStore.showNotification('Email copié dans le presse-papiers', 'success', 'mdi-check');
    
  } catch (error) {
    console.error('Erreur lors de la copie :', error);
    snackbarStore.showNotification('Erreur lors de la copie de l\'email', 'error', 'mdi-alert-circle');
  }
};
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.hover-underline:hover {
  text-decoration: underline;
}

.text-email {
  font-size: 0.75rem !important;
}
</style>
