<template>
  <GenericDialog :title="'Modifier la date de naissance'" v-model="modelValue">
    <template #content>
      <div class="d-flex align-center justify-space-between mb-4">
        <div>
          <span>Date de naissance actuelle </span>
          <v-list-item-subtitle>{{ formatbirthDate(authStore.userData.birthDate) || 'Non renseignée'}}
          </v-list-item-subtitle>
        </div>
      </div>

        <v-form ref="birthDateForm" v-model="birthDateValid" @submit.prevent="handleSubmit">
          <v-text-field v-model="birthDate" flat :rules="birthDateRules" label="Date de naissance" required type="date"
            prepend-inner-icon="mdi-calendar" variant="solo-filled" color="primary" rounded="xl" bg-color="surface"
            hide-details="auto" :max="maxDate" />
        </v-form>
    </template>
    <template #footer>
      <div class="d-flex justify-space-between align-center">
      <v-btn color="primary" variant="text" rounded="xl" :disabled="loading" @click="close">
        Annuler
      </v-btn>
      <v-btn color="primary" variant="tonal" rounded="xl" :loading="loading" :disabled="!birthDateValid"
        @click="handleSubmit">
        Enregistrer
      </v-btn>
      </div>
    </template>
  </GenericDialog>
</template>

<script setup>
import { useAuthStore } from '@/stores/authStore'
import { profileService } from '@/services/profileService'

const STORAGE_KEY = 'authData';

const authStore = useAuthStore()
const modelValue = defineModel({
  type: Boolean,
  default: false
})

const emit = defineEmits(['success', 'error'])

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

watch(modelValue, (value) => {
  if (!value) {
    resetForm()
  }
})

const resetForm = () => {
  birthDate.value = ''
  birthDateForm.value?.reset()
}

const close = () => {
  modelValue.value = false
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