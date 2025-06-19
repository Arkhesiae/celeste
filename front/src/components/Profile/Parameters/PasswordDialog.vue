<template>
  <v-dialog v-model="localDialogVisible" max-width="500px" :fullscreen="smAndDown">
    <v-card :rounded="smAndDown ? '' : 'xl'"  class="pa-0 pt-6">
      <v-card-item class="py-1 px-6 mb-2">
        <v-card-title class="d-flex justify-space-between align-center">
          {{ step === 1 ? 'Vérification du mot de passe' : 'Modifier le mot de passe' }}
        </v-card-title>
        <template #append v-if="!smAndDown">
          <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
        </template>
        <template #prepend v-else>
          <v-btn icon="mdi-arrow-left" variant="text" @click="close"></v-btn>
        </template>
      </v-card-item>

      <v-card-text class="px-6">
        <v-form ref="form" v-model="valid" @submit.prevent="handleStepAction">
          <!-- Étape 1 : Vérification du mot de passe actuel -->
          <template v-if="step === 1">
            <v-text-field
              v-model="currentPassword"
              :rules="[v => !!v || 'Le mot de passe actuel est requis']"
              label="Mot de passe actuel"
              type="password"
            
              variant="outlined"
              color="primary"
              rounded="xl"
              bg-color="surface"
              hide-details="auto"
            ></v-text-field>
          </template>

          <!-- Étape 2 : Nouveau mot de passe -->
          <template v-else>
            <v-text-field
              v-model="newPassword"
              :rules="passwordRules"
              label="Nouveau mot de passe"
              type="password"
              variant="solo-filled"
              flat
              color="primary"
              rounded="xl"
              bg-color="surface"
              hide-details="auto"
            ></v-text-field>

            <v-text-field
              v-model="confirmPassword"
              :rules="confirmPasswordRules"
              label="Confirmer le nouveau mot de passe"
              type="password"
              variant="solo-filled"
              flat
              color="primary"
              rounded="xl"
              bg-color="surface"
              hide-details="auto"
              class="mt-4"
            ></v-text-field>
          </template>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-6">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="text"
          rounded="xl"
          @click="close"
          :disabled="loading"

        >
          Annuler
        </v-btn>
        <v-btn
          color="primary"
          variant="tonal"
          rounded="xl"
          @click="handleStepAction"
          :loading="loading"
          :disabled="!valid"

        >
          {{ step === 1 ? 'Vérifier' : 'Modifier' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { authService } from '@/services/authService'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success', 'error'])

const { smAndDown } = useDisplay()
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
  v => v === newPassword.value || 'Les mots de passe ne correspondent pas'
]

const localDialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
    if (!value) {
      resetForm()
    }
  }
})

const resetForm = () => {
  step.value = 1
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  form.value?.reset()
}

const close = () => {
  localDialogVisible.value = false
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
  if (!form.value?.validate()) return
  
  if (step.value === 1) {
    await verifyCurrentPassword()
  } else {
    await updatePassword()
  }
}
</script>

<style scoped>
.v-btn {
  text-transform: none;
  letter-spacing: 0;
}
</style> 