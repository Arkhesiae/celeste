<template>
  <GenericDialog :title="currentStep === 1 ? 'Modifier l\'adresse email' : 'Vérification OTP'" v-model="modelValue"
    :fullscreen="smAndDown">
    <template #content>
      <div class="d-flex align-center justify-space-between mb-4">
        <div>
          <span>Adresse email actuelle</span>
          <v-list-item-subtitle>{{ authStore.userData.email }}</v-list-item-subtitle>
        </div>
      </div>

      <v-window v-model="currentStep">
        <v-window-item :value="1">
          <v-form ref="emailForm" v-model="emailValid" @submit.prevent="handleNext">
            <v-text-field v-model="email" flat :rules="emailRules" label="Nouvelle adresse email" required type="email"
              prepend-inner-icon="mdi-email-outline" variant="solo-filled" color="primary" rounded="xl"
              bg-color="surface" hide-details="auto" />
          </v-form>
        </v-window-item>

        <v-window-item :value="2">
          <OTPVerification :email="email" title="Vérification de votre email" @verified="onOtpVerified"
            @error="onOtpError" />
        </v-window-item>
      </v-window>
    </template>

    <template #footer>
      <div class="d-flex justify-space-between align-center">
        <v-btn color="primary" variant="text" rounded="xl" :disabled="loading" @click="handleBack">
          {{ currentStep === 1 ? 'Annuler' : 'Retour' }}
        </v-btn>
        <v-btn v-if="currentStep === 1" color="primary" variant="tonal" rounded="xl" :loading="loading"
          :disabled="!emailValid" @click="handleNext">
          Continuer
        </v-btn>
      </div>
    </template>
  </GenericDialog>
</template>

<script setup>
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/authStore'
import { profileService } from '@/services/profileService'
import OTPVerification from '@/components/OTPVerification.vue'

const authStore = useAuthStore()
const { smAndDown } = useDisplay()

const modelValue = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['success', 'error'])

const emailForm = ref(null)
const emailValid = ref(false)
const loading = ref(false)
const email = ref('')
const currentStep = ref(1)

const emailRules = [
  v => !!v || 'L\'email est requis',
  v => /.+@.+\..+/.test(v) || 'L\'email doit être valide',
]

watch(modelValue, (value) => {
  if (!value) resetForm()
})

const resetForm = () => {
  email.value = ''
  currentStep.value = 1
  emailForm.value?.reset()
}

const close = () => {
  modelValue.value = false
}

const handleBack = () => {
  if (currentStep.value === 1) close()
  else currentStep.value--
}

const handleNext = async () => {
  if (currentStep.value === 1) {
    const { valid } = await emailForm.value.validate()
    if (!valid) return
  }
  currentStep.value++
}

const onOtpVerified = async () => {
  loading.value = true
  try {
    await profileService.updateEmail(email.value)
    authStore.userData.email = email.value


    emit('success', 'L\'email a été mis à jour avec succès')
    close()
  } catch (error) {
    emit('error', error.message || 'Une erreur est survenue lors de la mise à jour de l\'email')
  } finally {
    loading.value = false
  }
}

const onOtpError = (error) => {
  emit('error', error.message || 'Une erreur est survenue lors de la vérification')
}
</script>