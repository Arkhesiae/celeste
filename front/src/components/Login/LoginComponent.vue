<template>
  <v-container class="d-flex align-center justify-center" style="height: calc(100vh - 64px) !important">
    <v-slide-y-reverse-transition hide-on-leave appear>
      <v-card
        width="100%"
        class="mt-n16 pa-6 pt-10"
        :color="smAndDown ? 'transparent' : ''"
        rounded="xl"
        elevation="0"
        style="max-width: 900px;"
      >
        <v-card-title class="pl-0 text-overline font-weight-bold">CéLESTE</v-card-title>

        <v-row>
          <v-col cols="12" md="6">
            <v-card-title class="pa-0 text-h5 text-md-h4">Se connecter</v-card-title>
            <v-card-subtitle class="pa-0">
              Accéder à toutes vos demandes de remplas, swaps et bien d'autres
              nouvelles fonctionnalités !
            </v-card-subtitle>
          </v-col>

          <v-col cols="12" md="6">
            <v-form v-model="valid" class="mt-2" @submit.prevent="handleLogin">
              <v-text-field
                color="tertiary"
                variant="outlined"
                label="Adresse e-mail ou identifiant"
                type="email"
                rounded="xl"
                v-model="email"
                :rules="[rules.required]"
                required
                autocomplete="username"
                class="mobile-input"
              ></v-text-field>

              <v-text-field
                variant="outlined"
                color="primary"
                class="mt-3 mobile-input"
                label="Mot de passe"
                required
                rounded="xl"
                v-model="password"
                type="password"
                :rules="[rules.required]"
                autocomplete="current-password"
              ></v-text-field>

              <v-checkbox
                label="Se souvenir de moi"
                v-model="stayConnected"
                class="mobile-checkbox"
              ></v-checkbox>

              <v-btn
                variant="text"
                color="primary"
                @click="openForgotPasswordDialog"
                class="mb-4 ps-1"
              >
                Mot de passe oublié ?
              </v-btn>

              <v-card-actions class="pa-0 mt-4" :class="smAndDown ? 'd-flex flex-column' : ''">
                <v-spacer v-if="!smAndDown"></v-spacer>
                <v-btn
                  variant="text"
                  color=""
                  @click="router.push({path: '/creation'})"
                  append-icon="mdi-chevron-right"
                  rounded="xl"
                  class="create-account-button"
                >
                  Créer un compte
                </v-btn>

                <v-btn
                  class="my-2 px-4"
                  variant="flat"
                  rounded="lg"
                  color="onBackground"
                  append-icon="mdi-arrow-right"
                  :class="smAndDown ? 'login-button-mobile' : 'login-button'"
                  :disabled="!valid || loggingIn"
                  :loading="loggingIn"
                  type="submit"
                  @click="handleLogin"
                >
                  Se connecter
                </v-btn>
              </v-card-actions>
            </v-form>
          </v-col>
        </v-row>
      </v-card>
    </v-slide-y-reverse-transition>

    <ForgotPasswordDialog
      v-model="showForgotPasswordDialog"
      @success="handlePasswordResetSuccess"
      @error="handlePasswordResetError"
    />
  </v-container>
</template>

<script setup>
import {ref, reactive} from 'vue';
import {useAuthStore} from '@/stores/authStore';
import {useRouter} from 'vue-router';
import {useDisplay} from 'vuetify';
import {useSnackbarStore} from "@/stores/snackbarStore.js";



// Router
const router = useRouter();

// Reactive variables
const email = ref('');
const password = ref('');
const valid = ref(false);
const stayConnected = ref(false);
const loggingIn = ref(false);

// Stores
const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();

// Responsive display
const {smAndDown} = useDisplay();

// Dialog state
const showForgotPasswordDialog = ref(false);

// Validation rules
const rules = {
  required: (value) => !!value || 'Champ requis',
  email: (value) => /.+@.+\..+/.test(value) || 'Adresse e-mail invalide',
};


/**
 * Gère le processus de connexion utilisateur
 */
const handleLogin = async () => {
  if (!valid.value) return;

  loggingIn.value = true;
  try {
    const response = await authStore.logIn({
      email: email.value,
      password: password.value,
      stayConnected: stayConnected.value
    });
    console.log(response)
    // Notification de connexion réussie
    snackbarStore.showNotification('Connexion réussie', 'success', 'mdi-check');
    setTimeout(() => {
      // Redirection vers le tableau de bord
      router.push({path: '/dashboard', replace: true});
    }, 400)

  } catch (error) {
  
    // Gestion des différents types d'erreurs
    if (error.status === 401) {
      snackbarStore.showNotification('Identifiants incorrects', 'onError', 'mdi-alert-circle');
    } else {
      snackbarStore.showNotification(
        error.message || 'Erreur de connexion, veuillez réessayer plus tard',
        'onError',
        'mdi-alert-circle'
      );
    }
    console.error('Erreur de connexion:', error);
  } finally {
    loggingIn.value = false;
  }
};

/**
 * Ouvre le dialogue de réinitialisation du mot de passe
 */
const openForgotPasswordDialog = () => {
  showForgotPasswordDialog.value = true;
};

/**
 * Gère le succès de la réinitialisation du mot de passe
 */
const handlePasswordResetSuccess = (message) => {
  snackbarStore.showNotification(message, 'success', 'mdi-check');
};

/**
 * Gère l'erreur de la réinitialisation du mot de passe
 */
const handlePasswordResetError = (message) => {
  snackbarStore.showNotification(message, 'onError', 'mdi-alert-circle');
};

</script>

<style scoped>
.login-button, .create-account-button {
  border-radius: 12px !important;
  transition: transform 0.1s, opacity 0.2s;
}

.login-button-mobile {
  border-radius: 16px !important;
  width: 100%;
  height: 48px !important;
}

/* Effet de retour haptique */
.login-button:active, .create-account-button:active {
  transform: scale(0.98);
}

/* Suppression de la mise en évidence au toucher */
* {
  -webkit-tap-highlight-color: transparent;
}


</style>
