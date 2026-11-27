<template>
  <BaseDialog v-model="modelValue" title="Mot de passe oublié" max-width="500">
    <p class="text-body-medium text-medium-emphasis mb-4">
      Entrez votre adresse e-mail pour recevoir un lien de réinitialisation de votre mot de passe. Si cet email existe,
      vous recevrez un lien de réinitialisation de votre mot de passe.
    </p>
    <v-form ref="form" v-model="valid" @submit.prevent="submit">
      <v-text-field
        v-model="email"
        :rules="emailRules"
        label="Adresse e-mail"
        required
        type="email"
        prepend-inner-icon="mdi-email-outline"
        variant="solo-filled"
        flat
        color="primary"
        rounded="xl"
        bg-color="surface"
        hide-details="auto"
      />
    </v-form>

    <template #actions>
      <v-spacer />
      <v-btn color="primary" variant="text" @click="closeDialog">Annuler</v-btn>
      <v-btn
        color="primary"
        variant="tonal"
        prepend-icon="mdi-send"
        :loading="loading"
        :disabled="!valid"
        @click="submit"
      >
        Réinitialiser
      </v-btn>
    </template>
  </BaseDialog>
</template>

<script setup>
import { authService } from '@/services/authService';

const modelValue = defineModel({ type: Boolean, default: false });

const emit = defineEmits(['success', 'error']);

const form = ref(null);
const valid = ref(false);
const loading = ref(false);
const email = ref('');

const emailRules = [(v) => !!v || "L'email est requis", (v) => /.+@.+\..+/.test(v) || "L'email doit être valide"];

const resetPassword = async (email) => {
  try {
    await authService.requestPasswordReset(email);
    return true;
  } catch (error) {
    throw new Error(error.message || 'Une erreur est survenue lors de la demande de réinitialisation');
  }
};

const resetForm = () => {
  email.value = '';
  form.value?.reset();
};

const closeDialog = () => {
  modelValue.value = false;
};

// À la fermeture, quelle qu'en soit la façon, la saisie repart de zéro
watch(modelValue, (isOpen) => {
  if (!isOpen) resetForm();
});

const submit = async () => {
  // Validate form before submitting
  const { valid: formValid } = await form.value.validate();

  if (!formValid) {
    return;
  }

  loading.value = true;
  try {
    await resetPassword(email.value);
    emit('success', 'Un email de réinitialisation a été envoyé');
    closeDialog();
  } catch (error) {
    emit('error', error.message || 'Une erreur est survenue');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.v-card {
  border-radius: 16px;
}

.v-card-title {
  font-weight: 600;
}

.v-text-field :deep(.v-field__input) {
  padding-top: 16px;
}

.v-btn {
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0.0178571429em;
}

/* Animation de transition */
.dialog-bottom-transition-enter-active,
.dialog-bottom-transition-leave-active {
  transition: transform 0.3s ease-in-out;
}

.dialog-bottom-transition-enter-from,
.dialog-bottom-transition-leave-to {
  transform: translateY(100%);
}
</style>
