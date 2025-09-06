<template>
  <v-dialog transition="scroll-x-reverse-transition" v-model="localDialogVisible" max-width="500px" :fullscreen="smAndDown">
    <v-card :rounded="smAndDown ? '' : 'xl'" class="pa-0 pt-6">
      <v-card-item class="py-1 px-6 mb-2">
        <v-card-title class="d-flex justify-space-between align-center">
          Modifier le numéro de téléphone
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
            <span>Numéro de téléphone actuel </span>
            <v-list-item-subtitle>{{ authStore.userData.phone || 'Non renseigné' }}</v-list-item-subtitle>
          </div>
          <v-btn v-if="authStore.userData.phone" size="small" variant="text" @click="deletePhone" color="error">Supprimer</v-btn>
        </div>

        <v-form ref="phoneForm" v-model="phoneValid" @submit.prevent="handleSubmit">
          <v-text-field
            flat
            v-model="phone"
            :rules="phoneRules"
            label="Nouveau numéro de téléphone"
            required
            type="tel"
            prepend-inner-icon="mdi-phone-outline"
            variant="solo-filled"
            color="primary"
            rounded="xl"
            bg-color="surface"
            hide-details="auto"
            placeholder="06 12 34 56 78"
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
          :disabled="!phoneValid"
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
const phoneForm = ref(null)
const phoneValid = ref(false)
const loading = ref(false)
const phone = ref('')

const phoneRules = [
  v => !!v || 'Le numéro de téléphone est requis',
  v => /^(\+33|0)[1-9](\d{8})$/.test(v.replace(/\s/g, '')) || 'Le numéro de téléphone doit être valide (format français)'
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
  phone.value = ''
  phoneForm.value?.reset()
}

const close = () => {
  localDialogVisible.value = false
}

const handleSubmit = async () => {
  const { valid } = await phoneForm.value.validate()
  if (!valid) {
    return
  }

  loading.value = true
  try {
    await profileService.updatePhone(phone.value)
    authStore.userData.phone = phone.value

    const existingData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    existingData.userData = { ...existingData.userData, phone: phone.value };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));

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

    const existingData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    existingData.userData = { ...existingData.userData, phone: '' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));

    emit('success', 'Le numéro de téléphone a été supprimé avec succès')
    close()
  } catch (error) {
    emit('error', error.message || 'Une erreur est survenue lors de la suppression du numéro de téléphone')
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