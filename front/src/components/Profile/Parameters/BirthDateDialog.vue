<template>
  <v-dialog transition="scroll-x-reverse-transition" v-model="localDialogVisible" max-width="500px" :fullscreen="smAndDown">
    <v-card :rounded="smAndDown ? '' : 'xl'" class="pa-0 pt-6">
      <v-card-item class="py-1 px-6 mb-2">
        <v-card-title class="d-flex justify-space-between align-center">
          Modifier la date de naissance
        </v-card-title>
        <template #append v-if="!smAndDown">
          <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
        </template>
        <template #prepend v-else>
          <v-btn icon="mdi-arrow-left" variant="text" @click="close"></v-btn>
        </template>
      </v-card-item>

      <v-card-text class="px-6">
        <div class="d-flex align-center justify-space-between mb-4">
          <div>
            <span>Date de naissance actuelle </span>
            <v-list-item-subtitle>{{ formatbirthDate(authStore.userData.birthDate) || 'Non renseignée' }}</v-list-item-subtitle>
          </div>
        </div>

        <v-form ref="birthDateForm" v-model="birthDateValid" @submit.prevent="handleSubmit">
          <v-text-field
            flat
            v-model="birthDate"
            :rules="birthDateRules"
            label="Date de naissance"
            required
            type="date"
            prepend-inner-icon="mdi-calendar"
            variant="solo-filled"
            color="primary"
            rounded="xl"
            bg-color="surface"
            hide-details="auto"
            :max="maxDate"
          ></v-text-field>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-6">
        <v-btn
          color="primary"
          variant="text"
          rounded="xl"
          @click="close"
          :disabled="loading"
        >
          Annuler
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="tonal"
          rounded="xl"
          @click="handleSubmit"
          :loading="loading"
          :disabled="!birthDateValid"
        >
          Enregistrer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useDisplay } from 'vuetify'
import { profileService } from '@/services/profileService'

const STORAGE_KEY = 'authData';

const authStore = useAuthStore()
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success', 'error'])

const { smAndDown } = useDisplay()
const birthDateForm = ref(null)
const birthDateValid = ref(false)
const loading = ref(false)
const birthDate = ref('')

// Date maximale (aujourd'hui)
const maxDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const birthDateRules = [
  v => !!v || 'La date de naissance est requise',
  v => {
    const selectedDate = new Date(v)
    const today = new Date()
    return selectedDate <= today || 'La date de naissance ne peut pas être dans le futur'
  }
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
  birthDate.value = ''
  birthDateForm.value?.reset()
}

const close = () => {
  localDialogVisible.value = false
}

const formatbirthDate = (date) => {
  if (!date) return null
  const birthDate = new Date(date)
  return birthDate.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const handleSubmit = async () => {
  const { valid } = await birthDateForm.value.validate()
  if (!valid) {
    return
  }

  loading.value = true
  try {
    await profileService.updateBirthDate(birthDate.value)

    const existingData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    existingData.userData = { ...existingData.userData, birthDate: birthDate.value };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));

    authStore.userData.birthDate = birthDate.value
    emit('success', 'La date de naissance a été mise à jour avec succès')
    close()
  } catch (error) {
    emit('error', error.message || 'Une erreur est survenue lors de la mise à jour de la date de naissance')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.v-btn {
  text-transform: none;
  letter-spacing: 0;
}
</style> 