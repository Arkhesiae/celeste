<template>
  <v-dialog v-model="localDialogVisible" max-width="500px" :fullscreen="smAndDown">
    <v-card :rounded="smAndDown ? '' : 'xl'" elevation="0" class="pa-0 pt-6">
      <v-card-item class="py-1 px-6 mb-2">
        <v-card-title class="d-flex justify-space-between align-center">Modifier l'adresse email</v-card-title>
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
            v-model="email"
            :rules="emailRules"
            label="Nouvelle adresse email"
            required
            type="email"
            prepend-inner-icon="mdi-email-outline"
            variant="outlined"
            color="primary"
            rounded="xl"
            bg-color="surface"
            hide-details="auto"
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
const email = ref('')

const emailRules = [
  v => !!v || 'L\'email est requis',
  v => /.+@.+\..+/.test(v) || 'L\'email doit être valide'
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
  email.value = ''
  form.value?.reset()
}

const close = () => {
  localDialogVisible.value = false
}

const submit = async () => {
  if (!form.value?.validate()) return

  loading.value = true
  try {
    // TODO: Implémenter l'appel API pour mettre à jour l'email
    await new Promise(resolve => setTimeout(resolve, 1000))
    emit('success', 'L\'email a été mis à jour avec succès')
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