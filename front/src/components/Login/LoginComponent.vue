<template>
  <v-container v-if="isReady" class="d-flex fill-height">
    <v-row justify="center" align-content="center">
      <v-slide-y-reverse-transition hide-on-leave appear>
        <v-card width="100%" class="mt-n16 pa-6 pt-10" :color="smAndDown ? 'transparent' : ''" rounded="xl"
          elevation="0" style="max-width: 900px; z-index: 34 !important;">
          <v-card-title class="pl-0 text-overline font-weight-bold">CéLESTE</v-card-title>

          <v-row>
            <v-col cols="12" md="6">
              <div class="d-flex align-center">
                <v-btn v-if="currentStep === 2 && smAndDown" variant="text" color="onBackground"
                  @click="currentStep = 1" prepend-icon="mdi-arrow-left" rounded="xl" class="back-button me-2">

                </v-btn>
                <div>


                  <v-card-title class="pa-0 text-h5 text-md-h4">Se connecter</v-card-title>
                  <v-card-subtitle class="pa-0">
                    <v-fade-transition mode="out-in">
                      <span v-if="currentStep === 1">Entrez votre adresse e-mail</span>
                      <span v-if="currentStep === 2">Entrez votre mot de passe</span>
                    </v-fade-transition>
                  </v-card-subtitle>
                </div>
              </div>

            </v-col>

            <v-col cols="12" md="6">

              <v-window v-model="currentStep">
                <v-window-item :value="1">
                  <v-text-field color="tertiary" variant="outlined" label="Adresse e-mail" type="email"
                    @update:model-value="backToStep1" rounded="xl" v-model="email"
                    :rules="[rules.required, rules.email]" :error-messages="emailError" :loading="isCheckingEmail"
                    required class="mobile-input mt-2" @input="emailError = ''" @keyup.enter="tryGoToStep2">
                    <template v-slot:append-inner v-if="email && stayConnected">
                      <v-btn icon="mdi-close" variant="text" size="small" @click="clearRememberedEmail"
                        class="text-medium-emphasis" />
                    </template>
                  </v-text-field>
                </v-window-item>

                <v-window-item :value="2">
                  <v-card rounded="xl" flat="" :color="smAndDown ? 'surfaceContainer' : 'background'"
                    @click="currentStep = 1">
                    <v-fade-transition>
                      <v-card-text class="pa-4">
                        <v-progress-circular v-if="isLoadingUserInfo" indeterminate color="primary"
                          class="mb-4"></v-progress-circular>
                        <template v-else>
                          <div class="d-flex align-center justify-start">

                            <v-avatar color="primary" size="48">
                              <template v-if="userInfo?.avatar">
                                <v-img :src="`${API_URL}${userInfo.avatar}`" alt="Avatar de l'utilisateur"></v-img>
                              </template>
                              <template v-else>
                                {{ userInfo?.name ? userInfo.name.charAt(0).toUpperCase() :
                                  email.charAt(0).toUpperCase() }}
                              </template>
                            </v-avatar>
                            <div class="d-flex flex-column align-start ml-3">
                              <div class="text-subtitle-1 font-weight-medium mb-1">{{ userInfo?.name || email }}</div>
                              <div class="text-caption text-medium-emphasis">
                                {{ userInfo?.center ? `${userInfo.center}` : 'Bienvenue ! Veuillez entrer votre mot de passe' }}
                              </div>
                            </div>
                            <v-spacer></v-spacer>
                            <v-icon icon="mdi-chevron-right" size="24" color="onBackground"></v-icon>
                          </div>

                        </template>
                      </v-card-text>
                    </v-fade-transition>
                  </v-card>
                  <v-text-field variant="outlined" color="primary" class="mt-3 mobile-input" label="Mot de passe"
                    required rounded="xl" v-model="password" type="password" autocomplete="new-password"
                    :rules="[rules.required]" @keyup.enter="handleLogin" />


                  <div
                    class="remember-me d-flex align-center justify-center mb-4 ga-3 overflow-hidden cursor-pointer position-relative"
                    :class="{ 'active': stayConnected, 'desktop': !smAndDown }" @click="stayConnected = !stayConnected">
                    <div class="d-flex align-center ga-3 overflow-hidden cursor-pointer position-relative">
                      <!-- Conteneur avec largeur fixe pour l'icône pour éviter le décalage -->
                      <div class="icon-container d-flex align-center justify-center"
                        style="width: 24px; transition: all 0.5s ease;"
                        :style="{ 'width': stayConnected ? '24px' : '0px' }">
                        <v-slide-x-reverse-transition mode="out-in">
                          <div v-if="stayConnected" key="icon">
                            <v-icon color="primary" icon="mdi-identifier" size="16" />
                          </div>
                          <div v-else key="empty" style="width: 16px; height: 16px;"></div>
                        </v-slide-x-reverse-transition>
                      </div>
                      <div class="d-flex align-center ga-3 overflow-hidden cursor-pointer position-relative">
                        <span class="text-body-2 position-relative" style="transition: all 0.3s ease;">Se souvenir de
                          moi</span><span class="text-body-2 position-relative"
                          :style="{ 'opacity': stayConnected ? 0 : 1 }">?</span>
                      </div>

                    </div>


                  </div>
                  <!-- <v-checkbox label="Se souvenir de moi" v-model="stayConnected" class="mobile-checkbox" /> -->

                  <v-btn variant="text" color="primary" @click="openForgotPasswordDialog" class="mb-4 ps-1">
                    Mot de passe oublié ?
                  </v-btn>
                </v-window-item>
              </v-window>

              <v-card-actions class="pa-0 mt-4" :class="smAndDown ? 'd-flex flex-column ' : ' justify-end'">


                <v-btn v-if="currentStep === 1" variant="text" color="onBackground"
                  @click="router.push({ path: '/creation' })" append-icon="mdi-chevron-right" rounded="xl"
                  class="create-account-button">
                  Créer un compte
                </v-btn>

                <div class="d-flex align-center">
                  <v-btn v-if="currentStep === 2 && !smAndDown" variant="text" color="onBackground"
                    @click="currentStep = 1" prepend-icon="mdi-arrow-left" rounded="xl" class="back-button me-2">
                    Retour
                  </v-btn>
                  <v-spacer></v-spacer>

                  <v-btn v-if="currentStep === 1" class="my-2 px-4" variant="flat" rounded="lg" color="onBackground"
                    append-icon="mdi-arrow-right" :class="smAndDown ? 'login-button-mobile' : 'login-button'"
                    :loading="loggingIn" type="button" @click="tryGoToStep2">
                    Continuer
                  </v-btn>

                  <v-btn v-if="currentStep === 2" class="my-2 px-4" variant="flat" rounded="lg" color="onBackground"
                    append-icon="mdi-login" :class="smAndDown ? 'login-button-mobile' : 'login-button'"
                    :disabled="!validStep2 || loggingIn" :loading="loggingIn" type="button" @click="handleLogin">
                    Se connecter
                  </v-btn>

                  <!-- <v-btn variant="flat" prepend-icon="mdi-fingerprint" color="onBackground" rounded="lg" class="my-2 px-4" @click="loginWithBiometrics">
                    Connexion biométrique
                  </v-btn> -->
                </div>
              </v-card-actions>
            </v-col>
          </v-row>
          <img v-if="!smAndDown" src="@/assets/Orly1.png" alt="landing" class="position-absolute"
            :class="{ 'img-mobile': smAndDown, 'img-desktop': !smAndDown }" />
        </v-card>
      </v-slide-y-reverse-transition>
    </v-row>
    <ForgotPasswordDialog v-model="showForgotPasswordDialog" @success="handlePasswordResetSuccess"
      @error="handlePasswordResetError" />
    <div class="position-absolute top-0 d-flex justify-end align-center w-100" style="height: 70vh;">

      <img v-if="smAndDown" src="@/assets/Orly1.png" class="img-mobile" :class="{ 'img-mobile-xs': xs }" />

    </div>

    <!-- <img  v-if="smAndDown" src="@/assets/Orly1.png" alt="landing"
    :class="{'img-mobile': smAndDown, 'img-desktop': !smAndDown}"/> -->
  </v-container>
</template>
<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/authStore';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { accountCreationService } from '@/services/accountCreationService';
import { useAppInitialization } from '@/composables/useAppInitialization';
import { useBiometricLogin } from '@/utils/useBiometric';

const router = useRouter();
const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();
const { initializeApp } = useAppInitialization();
const { smAndDown, xs } = useDisplay();
const API_URL = import.meta.env.VITE_API_URL;

const email = ref('');
const password = ref('');
const currentStep = ref(null);   // 👈 Étape inconnue au départ
const isReady = ref(false);      // 👈 Bloque le rendu tant qu’on n’a pas fini
const stayConnected = ref(false);
const isCheckingEmail = ref(false);
const emailError = ref('');
const validStep1 = ref(false);
const validStep2 = computed(() => !!password.value);
const loggingIn = ref(false);
const showForgotPasswordDialog = ref(false);
const userInfo = ref(null);
const isLoadingUserInfo = ref(false);

// Constantes pour la mémorisation de l'email
const REMEMBERED_EMAIL_KEY = 'rememberedEmail';
const REMEMBER_EMAIL_KEY = 'rememberEmail';

const rules = {
  required: value => !!value || 'Champ requis',
  email: value => /.+@.+\..+/.test(value) || 'Adresse e-mail invalide'
};

/**
 * Charge l'email mémorisé depuis le localStorage et détermine l'étape initiale
 */
const loadRememberedEmail = async () => {
  try {
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    const shouldRemember = localStorage.getItem(REMEMBER_EMAIL_KEY) === 'true';

    if (rememberedEmail && shouldRemember) {
      email.value = rememberedEmail;
      stayConnected.value = true;

      try {
        const ok = await checkEmailExists();
        if (ok) {
          await fetchUserInfo();
          return 2; // Aller directement à l'étape 2 si l'email est valide
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'email:', error);
        return 1; // Rester à l'étape 1 en cas d'erreur
      }
    }

    return 1; // Par défaut, commencer à l'étape 1
  } catch (error) {
    console.error('Erreur lors du chargement de l\'email mémorisé:', error);
    return 1; // En cas d'erreur, commencer à l'étape 1
  }
};

/**
 * Vérifie si l'email existe dans la base.
 */
const checkEmailExists = async () => {
  if (!email.value || rules.email(email.value) !== true) {
    validStep1.value = false;
    emailError.value = 'Adresse e-mail invalide';
    return false;
  }

  isCheckingEmail.value = true;
  try {
    const response = await accountCreationService.checkEmailAvailability(email.value);
    const exists = !response.available;
    validStep1.value = exists;
    emailError.value = exists ? '' : 'Adresse e-mail introuvable';
    return exists;
  } catch (error) {
    emailError.value = 'Erreur lors de la vérification';
    return false;
  } finally {
    isCheckingEmail.value = false;
  }
};

/**
 * Récupère les informations de l'utilisateur.
 */
const fetchUserInfo = async () => {
  if (!email.value) return;

  isLoadingUserInfo.value = true;
  try {
    const response = await accountCreationService.getUserInfo(email.value);
    userInfo.value = response;
  } catch (error) {
    console.error('Erreur lors de la récupération des informations:', error);
    userInfo.value = null;
  } finally {
    isLoadingUserInfo.value = false;
  }
};

/**
 * Passe à l'étape 2 si l'email est correct et existant.
 */
const tryGoToStep2 = async () => {
  const ok = await checkEmailExists();
  if (ok) {
    currentStep.value = 2;
    await fetchUserInfo();
  } else {
    currentStep.value = 1;
  }
};

/**
 * Sauvegarde l'email si "Se souvenir de moi"
 */
const saveRememberedEmail = () => {
  try {
    if (stayConnected.value && email.value) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email.value);
      localStorage.setItem(REMEMBER_EMAIL_KEY, 'true');
    } else {
      clearRememberedEmail();
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'email:', error);
  }
};

/**
 * Efface l'email mémorisé
 */
const clearRememberedEmail = () => {
  try {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    localStorage.removeItem(REMEMBER_EMAIL_KEY);
    email.value = '';
    stayConnected.value = false;
  } catch (error) {
    console.error('Erreur lors de l\'effacement de l\'email mémorisé:', error);
  }
};

/**
 * Gère la tentative de connexion.
 */
const handleLogin = async () => {
  if (!validStep1.value || !validStep2.value) return;

  loggingIn.value = true;
  try {
    await authStore.logIn({
      email: email.value,
      password: password.value,
    });

    saveRememberedEmail();

    try {
      await initializeApp();
      snackbarStore.showNotification('Connexion réussie', 'onPrimary', 'mdi-check');

      if (authStore.userData.status === 'pending') {
        router.push({ path: '/pending-approval', replace: true });
      } else {
        router.push({ path: '/dashboard', replace: true });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      throw error;
    }
  } catch (error) {
    if (error.status === 401) {
      snackbarStore.showNotification('Identifiants incorrects', 'onError', 'mdi-alert-circle');
    } else {
      snackbarStore.showNotification(error.message || 'Erreur de connexion', 'onError', 'mdi-alert-circle');
    }
    console.error('Erreur de connexion:', error);
  } finally {
    loggingIn.value = false;
  }
};

const openForgotPasswordDialog = () => {
  showForgotPasswordDialog.value = true;
};

const handlePasswordResetSuccess = (message) => {
  snackbarStore.showNotification(message, 'onPrimary', 'mdi-check');
};

const handlePasswordResetError = (message) => {
  snackbarStore.showNotification(message, 'onError', 'mdi-alert-circle');
};

const backToStep1 = () => {
  if (currentStep.value === 2) {
    currentStep.value = 1;
  }
};

/**
 * Initialisation : déterminer l’étape avant rendu
 */
(async () => {
  const step = await loadRememberedEmail();
  currentStep.value = step;
  isReady.value = true; // 👈 maintenant on peut afficher
})();


</script>

<style scoped>
.login-button,
.create-account-button,
.back-button {
  border-radius: 12px !important;
  transition: transform 0.1s, opacity 0.2s;
}

.login-button-mobile {
  border-radius: 16px !important;
  display: flex;
  width: 100%;
  height: 48px !important;
}

.login-button:active,
.create-account-button:active,
.back-button:active {
  transform: scale(0.98);
}

* {
  -webkit-tap-highlight-color: transparent;
}

.img-desktop {
  z-index: -2;
  width: 70%;
  height: 100%;
  object-fit: cover;
  left: 25px;
  top: 0px;
  position: absolute;
}

.img-mobile {

  width: 330px;
  object-fit: cover;


}

.img-mobile-xs {
  width: 300px;
  object-fit: cover;
  position: absolute;
  right: -100px;
}

.remember-me {
  width: 100%;
  color: rgba(var(--v-theme-onSurface), .8);
  background-color: rgba(var(--v-theme-surfaceContainerHighest), 0.1);
  border-radius: 16px;
  border: 2px solid rgba(var(--v-theme-surfaceContainer), 0.3);
  height: 48px;

}

.remember-me.desktop {


  background-color: rgba(var(--v-theme-background), 0.4);

  border: 2px solid rgba(var(--v-theme-background), 0.6);



}

.remember-me.desktop.active {
  background-color: rgba(var(--v-theme-background), 1);
  color: rgba(var(--v-theme-onSurface), 1);
}

.remember-me.active {
  background-color: rgba(var(--v-theme-surfaceContainer), 1);
  color: rgba(var(--v-theme-onSurface), 1);

}
</style>
