

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
              <v-chip :color="authStore.userData.phone ? 'remplacement' : 'error'" variant="flat" class="rounded-pill py-0 position-absolute" size="small" style="right: 16px; top: 50%; transform: translateY(-50%);">
                <v-icon>mdi-phone</v-icon>
              </v-chip>
              <span class="text-h7">Numéro de téléphone</span>
              
            </v-btn>  

            <v-btn block height="64" class="rounded-lg py-4" color="surface" elevation="0"  @click="showBirthDateDialog = true">
              <v-chip :color="authStore.userData.birthDate ? 'remplacement' : 'error'" variant="flat" class="rounded-pill py-0 position-absolute" size="small" style="right: 16px; top: 50%; transform: translateY(-50%);">
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
        <v-card rounded="xl" elevation="0" class="pa-0" color="background">
          <div class="d-flex align-center justify-start ga-2">
            <v-card-title class="text-h5">Emails</v-card-title>
            <v-chip v-if="noCategoryEnabled" color="error" variant="flat" class="rounded-pill py-0 " size="small">
                <v-icon class="mr-2">mdi-email-alert-outline</v-icon>
                <span class="text-caption">Aucune catégorie sélectionnée</span>
              </v-chip></div>
          <v-card-text>
            <v-btn
              block
              height="64"
              class="rounded-lg py-4 mb-4 d-flex"
              variant="flat"
              color="surface"
              elevation="0"
              @click="toggleGlobal"
            >
            <template #prepend>
              <v-switch inset class="ml-2" v-model="emailGlobalEnabled" hide-details false-icon="mdi-close"
                true-icon="mdi-email-multiple"></v-switch>
              </template>
              <span class="text-h7">Recevoir les emails</span>
             
            </v-btn>

      

            <div class="d-flex flex-column ">

              <div v-for="(option, index) in emailOptions" :key="option.value" >
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center justify-space-between ga-2" :style="{ opacity: !emailGlobalEnabled ? 0.5 : 1 }">
                    <v-icon :icon="option.icon" size="small"></v-icon>
                    <span style="font-size: 12px; font-weight: 500;">{{ option.label }}</span>
                  </div>
                  <v-switch :disabled="!emailGlobalEnabled" density="compact" inset class="ml-2" v-model="emailCategories[option.value]" hide-details false-icon="mdi-close"
                  true-icon="mdi-email-multiple"></v-switch>
                  
                </div>
                <v-divider v-if="index !== emailOptions.length - 1"></v-divider>
              </div>  
          </div>
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

  
  </v-container>
</template>

<script setup>


import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/authStore'
import { ref, computed, watch, onMounted } from 'vue'


import { useSnackbarStore } from '@/stores/snackbarStore';




const snackbarStore = useSnackbarStore();

// Theme synchronization
const isDarkTheme = computed({
  get: () => theme.global.current.value.dark,
  set: (value) => {
    authStore.updateUserPreferences({ theme: value })
    theme.global.name.value = value ? 'darkTheme' : 'lightTheme'
  }
})

const emailOptions = ref([
  {
    label: 'Demandes - Remplacement',
    value: 'emailDemandReplacement',
    icon: 'mdi-account-arrow-left-outline',
  },
  {
    label: 'Demandes - Switch',
    value: 'emailDemandSwitch',
    icon: 'mdi-swap-horizontal-hidden',
  },
  {
    label: 'Annonces',
    value: 'emailAnnouncements',
    icon: 'mdi-bullhorn-outline',
  },
])

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



const emailCategories = ref({
  emailDemandReplacement: authStore.userData.preferences.emails.categories.replacement !== undefined ? authStore.userData.preferences.emails.categories.replacement : true,
  emailDemandSwitch: authStore.userData.preferences.emails.categories.switch !== undefined ? authStore.userData.preferences.emails.categories.switch : true,
  emailAnnouncements: authStore.userData.preferences.emails.categories.announcements !== undefined ? authStore.userData.preferences.emails.categories.announcements : true,
})
const emailGlobalEnabled = ref(authStore.userData.preferences.emails.all !== undefined ? authStore.userData.preferences.emails.all : true)


const noCategoryEnabled = computed( () => {
  
  return emailGlobalEnabled.value && !emailCategories.value.emailDemandReplacement && !emailCategories.value.emailDemandSwitch && !emailCategories.value.emailAnnouncements
})

// Fonction pour mettre à jour les préférences dans le backend
const updateEmailPreferences = async () => {
  try {
    const currentPreferences = authStore.userData.preferences || {}
    const emailPrefs = {
      all: emailGlobalEnabled.value,
      categories: {
        replacement: emailCategories.value.emailDemandReplacement,
        switch: emailCategories.value.emailDemandSwitch,
        announcements: emailCategories.value.emailAnnouncements,
      }
    }
    
    await authStore.updateUserPreferences({
      ...currentPreferences,
      emails: emailPrefs
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences email:', error)
    snackbarStore.showNotification(
      'Erreur lors de la mise à jour des préférences email',
      'onError',
      'mdi-close-circle'
    )
  }
}




// Sync global with individual switches et mise à jour backend
watch(emailGlobalEnabled, async (enabled) => {
  if (!enabled) {
    emailCategories.value.emailDemandReplacement = false
    emailCategories.value.emailDemandSwitch = false
    emailCategories.value.emailAnnouncements = false
  }
  // Mettre à jour le backend
  await updateEmailPreferences()
})

// Watcher pour mettre à jour le backend quand les catégories changent
watch(
  emailCategories,
  async () => {
    const anyEnabled =
      emailCategories.value.emailDemandReplacement ||
      emailCategories.value.emailDemandSwitch ||
      emailCategories.value.emailAnnouncements
    if (anyEnabled && !emailGlobalEnabled.value) {
      emailGlobalEnabled.value = true
    }
    // Mettre à jour le backend
    await updateEmailPreferences()
  },
  { deep: true }
)

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



// Actions de bascule
const toggleGlobal = async () => {
  emailGlobalEnabled.value = !emailGlobalEnabled.value
  if (!emailGlobalEnabled.value) {
    emailCategories.value.emailDemandReplacement = false
    emailCategories.value.emailDemandSwitch = false
    emailCategories.value.emailAnnouncements = false
  }
  // La mise à jour backend est gérée par le watcher sur emailGlobalEnabled
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
