

<template>
  <v-container>
    <MainTitle title="Paramètres" subtitle="Gérez vos paramètres" :back-button="true" />

    <v-row>
      <v-col cols="12" md="6">
        <v-card rounded="xl" elevation="0" class="pa-0" color="transparent">
          <v-card-title class="text-h5">Profil</v-card-title>
          <v-card-text class="d-flex flex-column ga-4">
            <v-btn block height="64" class="rounded-lg py-4" color="surface" elevation="0" @click="showEmailDialog = true">
              <span class="text-h7">Modifier l'adresse email</span>
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
            <v-btn block height="64" class="rounded-lg py-4" color="surface" elevation="0" @click="showAvatarDialog = true">
              <span class="text-h7">Modifier l'avatar</span>
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
            <v-btn block height="64" class="rounded-lg py-4" color="surface" elevation="0" @click="showPhoneDialog = true"> 
              <v-chip :color="authStore.phone ? 'remplacement' : 'error'" variant="flat" class="rounded-pill py-0 position-absolute" size="small" style="right: 16px; top: 50%; transform: translateY(-50%);">
                <v-icon>mdi-phone</v-icon>
              </v-chip>
              <span class="text-h7">Numéro de téléphone</span>
              
            </v-btn>  

            <v-btn block height="64" class="rounded-lg py-4" color="surface" elevation="0"  @click="showBirthDateDialog = true">
              <v-chip :color="authStore.birthDate ? 'remplacement' : 'error'" variant="flat" class="rounded-pill py-0 position-absolute" size="small" style="right: 16px; top: 50%; transform: translateY(-50%);">
                <v-icon>mdi-baby</v-icon>
              </v-chip>
              <span class="text-h7">Date de naissance</span>
              
            </v-btn>  
            <!-- <v-btn block height="64" class="rounded-lg py-4 opacity-10" color="surface" elevation="0" :disabled="true">
              <v-chip color="error" variant="flat" class="rounded-pill py-0 position-absolute" size="small" style="right: 16px; top: 50%; transform: translateY(-50%);">
                <v-icon>mdi-account-key</v-icon>
              </v-chip>
              <span class="text-h7">Connexion ICNAGENDA</span>
              
            </v-btn> -->
          </v-card-text>
        </v-card>
        <v-card rounded="xl" elevation="0" class="pa-0" color="background">
          <v-card-title class="text-h5">Apparence</v-card-title>
          <v-card-text>
            <v-btn block height="64" class="rounded-lg py-4" color="surface" elevation="0">
              <template #prepend>
                <v-switch inset class="ml-2" v-model="isDarkTheme" hide-details false-icon="mdi-weather-sunny"
                true-icon="mdi-weather-night"></v-switch>
              </template>
              <span class="text-h7">Changer le thème</span>
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card rounded="xl" elevation="0" color="background" class="pa-0">
          <v-card-title class="text-h5">Sécurité</v-card-title>
          <v-card-text>
            <v-btn block height="64" class="rounded-lg py-4" color="surface" elevation="0" @click="showPasswordDialog = true">
              <span class="text-h7">Modifier le mot de passe</span>
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
          </v-card-text>
        </v-card>
        <v-card rounded="xl" elevation="0" color="background" class="pa-0">
          <v-card-title class="text-h5">Changement de centre</v-card-title>
          <v-card-text>
            <v-btn block height="64" class="rounded-lg py-4" color="surface" elevation="0" @click="showTransferRequestDialog = true">
              <span class="text-h7">Demander une mutation</span>
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
          </v-card-text>
        </v-card>
        <!-- <v-card rounded="xl" elevation="0" class="pa-0" color="background">
          <v-card-title class="text-h5">Notifications</v-card-title>
          <v-card-text>
            <v-btn block height="64" class="rounded-lg py-4 mb-4 d-flex " color="surface" elevation="0">
              <div class="d-flex align-center justify-space-between">
                <span class="text-h7">Notifications par email</span>
                <v-switch hide-details v-model="notificationsByEmail"  class="ml-16"></v-switch>
              </div>
            </v-btn>
            <v-btn block height="64" class="rounded-lg py-4 " color="surface" elevation="0">
              <div class="d-flex align-center justify-space-between">
                <span class="text-h7">Notifications application</span>
                <v-switch hide-details v-model="notificationsByApp"  class="ml-16"></v-switch>
              </div>
            </v-btn>
          </v-card-text>
        </v-card> -->
      </v-col>
    </v-row>

    <!-- Dialogues -->
    <EmailDialog
      v-model="showEmailDialog"
      @success="handleEmailSuccess"
      @error="handleEmailError"
    />
    <PasswordDialog
      v-model="showPasswordDialog"
      @success="handlePasswordSuccess"
      @error="handlePasswordError"
    />
    <AvatarDialog
      v-model="showAvatarDialog"
      @success="handleAvatarSuccess"
      @error="handleAvatarError"
    />
    <PhoneDialog
      v-model="showPhoneDialog"
      @success="handlePhoneSuccess"
      @error="handlePhoneError"
    />
    <BirthDateDialog
      v-model="showBirthDateDialog"
      @success="handleBirthDateSuccess"
      @error="handleBirthDateError"
    />
    <TransferRequestDialog
      v-model="showTransferRequestDialog"
  
    />
    <GlobalSnackbar />
  
  </v-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/authStore'
import { ref } from 'vue'
import EmailDialog from '@/components/Profile/Parameters/EmailDialog.vue'
import PasswordDialog from '@/components/Profile/Parameters/PasswordDialog.vue'
import AvatarDialog from '@/components/Profile/Parameters/AvatarDialog.vue'
import PhoneDialog from '@/components/Profile/Parameters/PhoneDialog.vue'
import BirthDateDialog from '@/components/Profile/Parameters/BirthDateDialog.vue'
import TransferRequestDialog from '@/components/Profile/Parameters/TransferRequestDialog.vue'

import { useSnackbarStore } from '@/stores/snackbarStore';
import GlobalSnackbar from '@/layouts/components/GlobalSnackbar.vue'


const snackbarStore = useSnackbarStore();

// Theme synchronization
const isDarkTheme = computed({
  get: () => theme.global.current.value.dark,
  set: (value) => {
    authStore.updateUserPreferences({ theme: value })
    theme.global.name.value = value ? 'darkTheme' : 'lightTheme'
  }
})

const router = useRouter()
const theme = useTheme()
const authStore = useAuthStore()

// États des dialogues
const showEmailDialog = ref(false)
const showPasswordDialog = ref(false)
const showAvatarDialog = ref(false)
const showPhoneDialog = ref(false)
const showBirthDateDialog = ref(false)
const showTransferRequestDialog = ref(false)

// États des notifications
const notificationsByEmail = ref(true)
const notificationsByApp = ref(true)


const handleEmailSuccess = (message) => {
  snackbarStore.showNotification(message, 'onPrimary', 'mdi-check-circle')
}

const handleEmailError = (message) => {
  snackbarStore.showNotification(message, 'onError', 'mdi-close-circle')
}

const handlePasswordSuccess = (message) => {
  snackbarStore.showNotification(message, 'onPrimary', 'mdi-check-circle')
}

const handlePasswordError = (message) => {
  snackbarStore.showNotification(message, 'onError', 'mdi-close-circle')
}

const handleAvatarSuccess = (message) => {
  snackbarStore.showNotification(message, 'onPrimary', 'mdi-check-circle')
}

const handleAvatarError = (message) => {
  snackbarStore.showNotification(message, 'onError', 'mdi-close-circle')
}

const handlePhoneSuccess = (message) => {
  snackbarStore.showNotification(message, 'onPrimary', 'mdi-check')
}

const handlePhoneError = (message) => {
  snackbarStore.showNotification(message, 'onError', 'mdi-close-circle')
}

const handleBirthDateSuccess = (message) => {
  snackbarStore.showNotification(message, 'onPrimary', 'mdi-check-circle')
}

const handleBirthDateError = (message) => {
  snackbarStore.showNotification(message, 'onError', 'mdi-close-circle')
}
</script>

<style scoped>
.v-container {
  min-height: 100vh;
}

:deep(.v-switch__track) {
  height: 24px !important;
  border: 1px solid rgba(173, 154, 154, 0.21);
  min-width: 44px !important;
  background: rgba(255, 255, 255, 0.05) !important;
}

:deep(.v-switch__thumb) {
  height: 20px !important;
  width: 20px !important;
}
</style>
