<template>
  <v-dialog transition="scroll-x-reverse-transition" v-model="localDialogVisible" max-width="500px" :fullscreen="smAndDown">
    <v-card :rounded="smAndDown ? '' : 'xl'" class="pa-0 pt-6">
      <v-card-item class="py-1 px-6 mb-2">
        <v-card-title class="d-flex justify-space-between align-center">
          {{ currentStep === 1 ? 'Modifier l\'adresse email' : 'Vérification OTP' }}
        </v-card-title>
        <template #append v-if="!smAndDown">
          <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
        </template>
        <template #prepend v-else>
          <v-btn icon="mdi-arrow-left" variant="text" @click="close"></v-btn>
        </template>
      </v-card-item>

      <v-card-text class="px-6">
        <v-window v-model="currentStep">
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <span>Addresse email actuelle </span>
              <v-list-item-subtitle>{{ authStore.email }}</v-list-item-subtitle>
            </div>
            
          </div>
          <!-- Étape 1: Email -->
          <v-window-item :value="1">
            <v-form ref="emailForm" v-model="emailValid" @submit.prevent="handleNext">
              <v-text-field
                flat
                v-model="email"
                :rules="emailRules"
                label="Nouvelle adresse email"
                required
                type="email"
                prepend-inner-icon="mdi-email-outline"
                variant="solo-filled"
                color="primary"
                rounded="xl"
                bg-color="surface"
                hide-details="auto"
              ></v-text-field>
            </v-form>
          </v-window-item>

          <!-- Étape 2: OTP -->
          <v-window-item :value="2">
            <OTPVerification
              :email="email"
              title="Vérification de votre email"
              @verified="onOtpVerified"
              @error="onOtpError"
            />
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-card-actions class="pa-6">
      
        <v-btn
          color="primary"
          variant="text"
          rounded="xl"
          @click="handleBack"
          :disabled="loading"
        >
          {{ currentStep === 1 ? 'Annuler' : 'Retour' }}
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          v-if="currentStep === 1"
          color="primary"
          variant="tonal"
          rounded="xl"
          @click="handleNext"
          :loading="loading"
          :disabled="!emailValid"
        >
          Continuer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useDisplay } from 'vuetify'
import OTPVerification from '@/components/OTPVerification.vue'
import { profileService } from '@/services/profileService'

const authStore = useAuthStore()
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success', 'error'])

const { smAndDown } = useDisplay()
const emailForm = ref(null)
const emailValid = ref(false)
const loading = ref(false)
const email = ref('')
const currentStep = ref(1)

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
  currentStep.value = 1
  emailForm.value?.reset()
}

const close = () => {
  localDialogVisible.value = false
}

const handleBack = () => {
  if (currentStep.value === 1) {
    close()
  } else {
    currentStep.value--
  }
}

const handleNext = async () => {
  if (currentStep.value === 1) {
    // Valider le formulaire email avant de passer à l'étape suivante
    const { valid } = await emailForm.value.validate()
    if (!valid) {
      return
    }
  }
  
  currentStep.value++
}

const onOtpVerified = async () => {
  loading.value = true
  try {
    await profileService.updateEmail(email.value)
    authStore.email = email.value
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

<style scoped>


.v-btn {
  text-transform: none;
  letter-spacing: 0;
}
</style> 