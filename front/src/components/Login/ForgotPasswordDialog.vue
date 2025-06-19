<template>
  <v-dialog v-model="dialog" max-width="500px" transition="dialog-bottom-transition">
    <v-card class="rounded-xl pa-2">
      <v-card-title class="text-h5 pa-6 pb-2">

        Mot de passe oublié
      </v-card-title>

      <v-card-text class="pa-6 pt-4">
        <p class="text-body-2 text-medium-emphasis mb-4">
          Entrez votre adresse e-mail pour recevoir un lien de réinitialisation de votre mot de passe.
          Si cet email existe, vous recevrez un lien de réinitialisation de votre mot de passe.
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
          ></v-text-field>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-6 pt-2">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="text"
          rounded="xl"
          @click="closeDialog"

        >
          Annuler
        </v-btn>
        <v-btn
          color="primary"
          variant="tonal"
          rounded="xl"
          :loading="loading"
          :disabled="!valid"
          @click="submit"
         
        >
          <v-icon icon="mdi-send" class="me-1"></v-icon>
          Réinitialiser
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { authService } from '@/services/authService'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success', 'error'])

const form = ref(null)
const valid = ref(false)
const loading = ref(false)
const email = ref('')

const emailRules = [
  v => !!v || 'L\'email est requis',
  v => /.+@.+\..+/.test(v) || 'L\'email doit être valide'
]

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
    if (!value) {
      resetForm()
    }
  }
})

const resetPassword = async (email) => {
  try {
    await authService.requestPasswordReset(email)
    return true
  } catch (error) {
    throw new Error(error.message || 'Une erreur est survenue lors de la demande de réinitialisation')
  }
}

const resetForm = () => {
  email.value = ''
  form.value?.reset()
}

const closeDialog = () => {
  dialog.value = false
}

const submit = async () => {
  // Validate form before submitting
  const { valid: formValid } = await form.value.validate()
  
  if (!formValid) {
    return
  }

  loading.value = true
  try {
    await resetPassword(email.value)
    emit('success', 'Un email de réinitialisation a été envoyé')
    closeDialog()
  } catch (error) {
    emit('error', error.message || 'Une erreur est survenue')
  } finally {
    loading.value = false
  }
}
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