<template>
  <GenericDialog v-model="isOpen" title="Envoyer une réponse" :max-width="600" persistent>
    <template #content>
      <div class="mb-4 d-flex align-center ga-3">
        <div class="text-title-small">Destinataire</div>
        <v-chip size="small" rounded="lg" color="surfaceContainerHigh" class="bg-surfaceContainerHigh" variant="flat">
          <v-icon start size="small"> mdi-email </v-icon>
          {{ ticket?.senderEmail }}
        </v-chip>
      </div>

      <div class="mb-4 d-flex align-center ga-3">
        <div class="text-title-small">Sujet</div>
        <v-chip size="small" rounded="xl" color="secondary" variant="outlined">
          <v-icon start size="small"> mdi-tag </v-icon>
          Re: {{ ticket?.title }}
        </v-chip>
      </div>

      <v-form ref="form" v-model="isFormValid">
        <v-textarea
          v-model="replyContent"
          label="Votre réponse"
          placeholder="Tapez votre réponse ici..."
          rows="2"
          variant="solo-filled"
          flat
          rounded="xl"
          hide-details="auto"
          :rules="replyRules"
          counter
          maxlength="2000"
          auto-grow
          required
        />
      </v-form>
    </template>

    <template #footer>
      <v-spacer />
      <v-btn variant="text" :disabled="isLoading" @click="closeDialog">Annuler</v-btn>
      <v-btn
        :loading="isLoading"
        :disabled="!isFormValid || !replyContent.trim()"
        prepend-icon="mdi-send"
        @click="sendReply"
      >
        Envoyer
      </v-btn>
    </template>
  </GenericDialog>
</template>

<script setup>
// import { ticketService } from '@/services/ticketService';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { useTicketStore } from '@/stores/ticketStore';

const snackbarStore = useSnackbarStore();
const ticketStore = useTicketStore();

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  ticket: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'reply-sent']);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const replyContent = ref('');
const isLoading = ref(false);
const isFormValid = ref(false);
// const form = ref(null);

const replyRules = [
  (v) => !!v || 'Le contenu de la réponse est requis',
  (v) => (v && v.length >= 10) || 'La réponse doit contenir au moins 10 caractères',
  (v) => (v && v.length <= 2000) || 'La réponse ne peut pas dépasser 2000 caractères',
];

const closeDialog = () => {
  replyContent.value = '';
  isOpen.value = false;
};

const sendReply = async () => {
  if (!isFormValid.value || !replyContent.value.trim()) {
    return;
  }

  isLoading.value = true;

  try {
    await ticketStore.replyToTicket(props.ticket?._id, replyContent.value);

    snackbarStore.showNotification('Réponse envoyée avec succès', 'success', 'mdi-check-circle');

    emit('reply-sent');
    closeDialog();
  } catch (error) {
    console.error("Erreur lors de l'envoi de la réponse:", error);
    snackbarStore.showNotification("Erreur lors de l'envoi de la réponse : " + error.message, 'error', 'mdi-alert');
  } finally {
    isLoading.value = false;
  }
};

// Réinitialiser le contenu quand le dialog s'ouvre
watch(isOpen, (newValue) => {
  if (newValue) {
    replyContent.value = '';
  }
});
</script>

<style scoped>
.v-textarea :deep(.v-field__input) {
  min-height: 120px;
}
</style>
