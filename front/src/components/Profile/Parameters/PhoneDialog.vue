<template>
  <GenericDialog v-model="modelValue" title="Modifier le numéro de téléphone" :fullscreen="smAndDown">
    <template #content>
      <div class="d-flex align-center justify-space-between mb-4">
        <div>
          <span>Numéro de téléphone actuel</span>
          <v-list-item-subtitle>{{ authStore.userData.phone || 'Non renseigné' }}</v-list-item-subtitle>
        </div>
        <v-btn v-if="authStore.userData.phone" size="small" variant="text" color="error" @click="deletePhone">
          Supprimer
        </v-btn>
      </div>

      <v-form ref="phoneForm" v-model="phoneValid" @submit.prevent="handleSubmit">
        <v-text-field v-model="phone" flat :rules="phoneRules" label="Nouveau numéro de téléphone" required type="tel"
          prepend-inner-icon="mdi-phone-outline" variant="solo-filled" color="primary" rounded="xl" bg-color="surface"
          hide-details="auto" placeholder="06 12 34 56 78" />
      </v-form>
    </template>

    <template #footer>
      <div class="d-flex justify-space-between align-center">
        <v-btn color="primary" variant="text" rounded="xl" :disabled="loading" @click="close">
          Annuler
        </v-btn>
        <v-btn color="primary" variant="tonal" rounded="xl" :loading="loading" :disabled="!phoneValid"
          @click="handleSubmit">
          Enregistrer
        </v-btn>
      </div>
    </template>
  </GenericDialog>
</template>

<script setup>
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/authStore'
import { profileService } from '@/services/profileService'

const STORAGE_KEY = 'authData'

const authStore = useAuthStore()
const { smAndDown } = useDisplay()

const modelValue = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['success', 'error'])

const phoneForm = ref(null)
const phoneValid = ref(false)
const loading = ref(false)
const phone = ref('')

const phoneRules = [
  v => !!v || 'Le numéro de téléphone est requis',
  v => /^(\+33|0)[1-9](\d{8})$/.test(v.replace(/\s/g, '')) || 'Le numéro de téléphone doit être valide (format français)',
]

watch(modelValue, (value) => {
  if (!value) resetForm()
})

const resetForm = () => {
  phone.value = ''
  phoneForm.value?.reset()
}

const close = () => {
  modelValue.value = false
}

const updateLocalStorage = (patch) => {
  const existingData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  existingData.userData = { ...existingData.userData, ...patch }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData))
}

const handleSubmit = async () => {
  const { valid } = await phoneForm.value.validate()
  if (!valid) return

  loading.value = true
  try {
    await profileService.updatePhone(phone.value)
    authStore.userData.phone = phone.value
    updateLocalStorage({ phone: phone.value })
    emit('success', 'Le numéro de téléphone a été mis à jour avec succès')
    close()
  } catch (error) {
    emit('error', error.message || 'Une erreur est survenue lors de la mise à jour du numéro de téléphone')
  } finally {
    loading.value = false
  }
}

const deletePhone = async () => {
  loading.value = true
  try {
    await profileService.deletePhone()
    authStore.userData.phone = ''
    updateLocalStorage({ phone: '' })
    emit('success', 'Le numéro de téléphone a été supprimé avec succès')
    close()
  } catch (error) {
    emit('error', error.message || 'Une erreur est survenue lors de la suppression du numéro de téléphone')
  } finally {
    loading.value = false
  }
}
</script>