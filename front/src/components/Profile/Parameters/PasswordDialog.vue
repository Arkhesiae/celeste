<template>
  <GenericDialog v-model="modelValue" :title="step === 1 ? 'Vérification du mot de passe' : 'Modifier le mot de passe'"
    :fullscreen="smAndDown">
    <template #content>
      <v-form ref="form" v-model="valid" @submit.prevent="handleStepAction">
        <template v-if="step === 1">
          <v-text-field v-model="currentPassword" :rules="[v => !!v || 'Le mot de passe actuel est requis']"
            label="Mot de passe actuel" type="password" autocomplete="current-password" variant="outlined"
            color="primary" rounded="xl" bg-color="surface" hide-details="auto" />
        </template>

        <template v-else>
          <v-text-field v-model="newPassword" :rules="passwordRules" label="Nouveau mot de passe" type="password"
            autocomplete="new-password" variant="solo-filled" flat color="primary" rounded="xl" bg-color="surface"
            hide-details="auto" />
          <v-text-field v-model="confirmPassword" :rules="confirmPasswordRules"
            label="Confirmer le nouveau mot de passe" type="password" autocomplete="new-password" variant="solo-filled"
            flat color="primary" rounded="xl" bg-color="surface" hide-details="auto" class="mt-4" />
        </template>
      </v-form>
    </template>

    <template #footer>
      <div class="d-flex justify-space-between align-center">
        <v-btn color="primary" variant="text" rounded="xl" :disabled="loading" @click="close">
          Annuler
        </v-btn>
        <v-btn color="primary" variant="tonal" rounded="xl" :loading="loading" :disabled="!valid"
          @click="handleStepAction">
          {{ step === 1 ? 'Vérifier' : 'Modifier' }}
        </v-btn>
      </div>
    </template>
  </GenericDialog>
</template>

<script setup>
import { useDisplay } from 'vuetify'
import { authService } from '@/services/authService'

const { smAndDown } = useDisplay()

const modelValue = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['success', 'error'])

const form = ref(null)
const valid = ref(false)
const loading = ref(false)
const step = ref(1)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const passwordRules = [
  v => !!v || 'Le mot de passe est requis',
  v => v.length >= 8 || 'Le mot de passe doit contenir au moins 8 caractères',
]

const confirmPasswordRules = [
  v => !!v || 'La confirmation du mot de passe est requise',
  v => v === newPassword.value || 'Les mots de passe ne correspondent pas',
]

watch(modelValue, (value) => {
  if (!value) resetForm()
})

const resetForm = () => {
  step.value = 1
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  form.value?.reset()
}

const close = () => {
  modelValue.value = false
}

const verifyCurrentPassword = async () => {
  loading.value = true
  try {
    await authService.verifyCurrentPassword(currentPassword.value)
    step.value = 2
  } catch (error) {
    emit('error', error.message || 'Mot de passe actuel incorrect')
  } finally {
    loading.value = false
  }
}

const updatePassword = async () => {
  loading.value = true
  try {
    await authService.updatePassword(newPassword.value)
    emit('success', 'Le mot de passe a été mis à jour avec succès')
    close()
  } catch (error) {
    emit('error', error.message || 'Une erreur est survenue')
  } finally {
    loading.value = false
  }
}

const handleStepAction = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return
  if (step.value === 1) await verifyCurrentPassword()
  else await updatePassword()
}
</script>