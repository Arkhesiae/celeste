<template>
  <v-dialog v-model="localDialogVisible" max-width="500px" :fullscreen="smAndDown">
    <v-card :rounded="smAndDown ? '' : 'xl'" elevation="0" class="pa-0 pt-6">
      <v-card-item class="py-1 px-6 mb-2">
        <v-card-title class="d-flex justify-space-between align-center">Modifier le mot de passe</v-card-title>
        <template #append v-if="!smAndDown">
          <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
        </template>
        <template #prepend v-else>
          <v-btn icon="mdi-arrow-left" variant="text" @click="close"></v-btn>
        </template>
      </v-card-item>

      <v-card-text class="px-6">
        <v-form ref="form" v-model="valid">
          <v-text-field
            v-model="currentPassword"
            :rules="[v => !!v || 'Le mot de passe actuel est requis']"
            label="Mot de passe actuel"
            type="password"
            prepend-inner-icon="mdi-lock-outline"
            variant="outlined"
            color="primary"
            rounded="xl"
            bg-color="surface"
            hide-details="auto"
          ></v-text-field>

          <v-text-field
            v-model="newPassword"
            :rules="passwordRules"
            label="Nouveau mot de passe"
            type="password"
            prepend-inner-icon="mdi-lock-outline"
            variant="outlined"
            color="primary"
            rounded="xl"
            bg-color="surface"
            hide-details="auto"
            class="mt-4"
          ></v-text-field>

          <v-text-field
            v-model="confirmPassword"
            :rules="confirmPasswordRules"
            label="Confirmer le nouveau mot de passe"
            type="password"
            prepend-inner-icon="mdi-lock-outline"
            variant="outlined"
            color="primary"
            rounded="xl"
            bg-color="surface"
            hide-details="auto"
            class="mt-4"
          ></v-text-field>
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
          @click="submit"
          :loading="loading"
          :disabled="!valid"
        >
          Enregistrer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'

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
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const passwordRules = [
  v => !!v || 'Le mot de passe est requis',
  v => v.length >= 8 || 'Le mot de passe doit contenir au moins 8 caractères',
  v => /[A-Z]/.test(v) || 'Le mot de passe doit contenir au moins une majuscule',
  v => /[0-9]/.test(v) || 'Le mot de passe doit contenir au moins un chiffre'
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
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  form.value?.reset()
}

const close = () => {
  localDialogVisible.value = false
}

const submit = async () => {
  if (!form.value?.validate()) return

  loading.value = true
  try {
    // TODO: Implémenter l'appel API pour mettre à jour le mot de passe
    await new Promise(resolve => setTimeout(resolve, 1000))
    emit('success', 'Le mot de passe a été mis à jour avec succès')
    close()
  } catch (error) {
    emit('error', error.message || 'Une erreur est survenue')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.v-card {
  border: 1px solid rgba(var(--v-theme-surface-variant), 0.12);
}

.v-btn {
  text-transform: none;
  letter-spacing: 0;
}
</style> 