<template>

<v-container  class="d-flex fill-height">
  <v-row justify="center" align-content="center">
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
            <v-scroll-y-transition appear hide-on-leave>
              <div v-if="step < 6 || step === 7 ">
                <v-card-title class="pl-0 text-h4">Créer mon compte</v-card-title>
                <span class="text-body-2 text-medium-emphasis pl-0">
                  Accéder à toutes vos demandes de remplacements, permutations et bien d'autres nouvelles fonctionnalités !
                </span>
                <a
                    class="text-caption d-flex align-center"
                    style="color: rgb(var(--v-theme-pendingDemand)); text-decoration: none; cursor: pointer"
                    @click="router.push('/account-recovery')"
                  >
                    
                    J'ai déjà un compte et je souhaite le récupérer ?
                    
                  </a>
              </div>
              <div v-else-if="step === 6">
                <v-card-title class=" pl-0 text-h4">Collecte des données</v-card-title>
                <span class="text-body-2 text-medium-emphasis pl-0">
                  Où vont mes données ?
                 </span>
              </div>
            </v-scroll-y-transition>
          </v-col>

          <v-col cols="12" :md="step === 8 ? 12 : 6">
            <v-form ref="form">
              <v-window v-model="step">
                <!-- Étape 1: Organisme -->
                <v-window-item :value="1">
                  <v-select
                    class="mt-2"
                    label="Organisme"
                    v-model="user.centerId"
                    :items="centers"
                    item-value="_id"
                    variant="underlined"
                    rounded="xl"
                    required
                    :item-props="itemProps"
                    :loading="loadingCenters"
                    :disabled="loadingCenters"
                    :error-messages="stepErrors[1]"
                    @update:modelValue="onCenterSelect"
                  />
                  <!-- <v-radio-group 
                    inline
                    
                    v-model="user.zone"
                    @update:modelValue="validateStep(5)"
                  >
                    <v-radio label="Est" value="east"></v-radio>
                    <v-radio label="Ouest" value="west"></v-radio>
                  </v-radio-group> -->
                  <span class="text-caption text-grey-darken-1">
                    Vous ne trouvez pas votre organisme dans la liste ?
                  </span>
                  <a
                    class="text-caption d-flex align-center text-remplacement"
                    style="color: #85cde8; text-decoration: none; cursor: pointer"
                    @click="router.push('/contact-admin')"
                  >
                    Contacter un administrateur
                    <v-icon>mdi-chevron-right</v-icon>
                  </a>
                </v-window-item>

                <!-- Étape 2: Email -->
                <v-window-item :value="2">
                  <v-text-field
                    variant="outlined"
                    class="mt-2"
                    rounded="xl"
                    label="Adresse e-mail"
                    v-model="user.email"
                    :rules="[rules.email]"
                    :error-messages="stepErrors[2]"
                    :append-icon="emailExists ? 'mdi-alert-circle' : ''"
                    :loading="checkingEmail"
                    :disabled="checkingEmail"
                    @blur="validateStep(2)"
                    @update:modelValue="onEmailChange"
                  />
                  <span class="text-caption text-grey-darken-1">Veuillez entrer votre adresse e-mail</span>
                  <v-slide-y-transition>
                  <v-alert v-if="showLegacyAlert" color="error" rounded="lg"  variant="tonal"  class="mt-2">
                    <p class="text-caption" >Cette adresse email correspond à un compte <b>REMPLACER.OVH</b></p>
                    <a
                    class="text-caption d-flex align-center"
                    style="color: rgb(var(--v-theme-onBackground)); text-decoration: none; cursor: pointer"
                    @click="router.push('/account-recovery')"
                  >
                    
                    Récupérer mon compte <v-icon>mdi-chevron-right</v-icon>
                    
                  </a>
                  </v-alert>
                  </v-slide-y-transition>
                </v-window-item>

                <!-- Étape 3: Mot de passe -->
                <v-window-item :value="3">
                  <v-text-field
                    class="mt-2"
                    label="Mot de passe"
                    type="password"
                    rounded="xl"
                    variant="outlined"
                    v-model="user.password"
                    hint="Le mot de passe doit contenir 8 caractères au minimum"
                    :rules="[rules.min(8)]"

                    @update:modelValue="validateStep(3)"
                  />
                  <v-text-field
                    class="mt-2"
                    variant="outlined"
                    rounded="xl"
                    label="Confirmez mot de passe"
                    type="password"
                    v-model="user.confirmPassword"
                    :rules="[rules.matchPassword]"

                    @update:modelValue="validateStep(3)"
                  />
                </v-window-item>

                <!-- Étape 4: Informations personnelles -->
                <v-window-item :value="4">

                  <v-text-field
                    label="Prénom"
                    flat
                    v-model="user.name"
                    required
                    variant="solo-filled"
                    rounded="xl"
                    :rules="[rules.required]"

                    @update:modelValue="validateStep(4)"
                  />
                  <v-text-field
                    label="Nom"
                    flat
                    v-model="user.lastName"
                    required
                    variant="solo-filled"
                    rounded="xl"
                    :rules="[rules.required]"

                    @update:modelValue="validateStep(4)"
                  />
               
                </v-window-item>

                <!-- Étape 5: Equipe -->
                <v-window-item :value="5">
                  <v-select
                    class="mt-2"
                    label="Equipe"
                    v-model="user.team"
                    :items="centerTeams"
                    :loading="loadingTeams"
                    :disabled="loadingTeams"
                    variant="underlined"
                    rounded="xl"
                    :rules="[rules.required]"
                    :item-props="itemProps"
                    @update:modelValue="validateStep(5)"
                  />
                
                </v-window-item>

                <!-- Étape 6: Données -->
                <v-window-item :value="6">
                  <v-checkbox
                    label="J'accepte que mes données de remplacement soient collectées et utilisées par CELESTE"
                    v-model="acceptedTerms"
                    required
                    @update:modelValue="validateStep(6)"
                  />
                  <span class="text-caption text-grey-darken-1">
                    Toutes les données collectées ne sont utilisées qu'à des fins de statistiques pour le bon fonctionnement du site.
                  </span>
                  <a
                    class="text-caption d-flex align-center text-remplacement"
                    style="text-decoration: none; cursor: pointer"
                    @click="showSidePanel('privacy')"
                  >
                    En savoir plus sur l'utilisation des données
                    <v-icon>mdi-chevron-right</v-icon>
                  </a>
                </v-window-item>

                <!-- Étape 7: Vérification OTP -->
                <v-window-item :value="7">
                  <v-fade-transition mode="out-in">
                    <v-card v-if="otpValid">
                    <v-card-text>
                      <span class="text-h6 font-weight-bold">Addresse email vérifiée</span>
                    </v-card-text>
                  </v-card>
                  <OTPVerification
                    v-else
                    :email="user.email"
                    title="Vérification de votre email"
                    
                    @verified="onOtpVerified"
                
                  />
                  </v-fade-transition>
                
                </v-window-item>

                <!-- Étape 8: Confirmation de création du compte -->
                <v-window-item :value="8">
                  <div class="text-center pt-6">
                    <div class="success-animation mb-6">
                      <v-avatar size="64" color="onPrimary" class="success-circle">
                        <v-avatar size="50" color="onPrimary">
                          <v-icon size="40" color="onBackground">mdi-check</v-icon>
                        </v-avatar>
                      </v-avatar>
                    </div>

                    <p class="text-subtitle-1 text-overline">Votre compte a été créé</p>

                    <p class="text-caption text-medium-emphasis mb-8">
                      Bienvenue {{ user.name }}. Vous pouvez maintenant vous connecter pour accéder à toutes les fonctionnalités.
                    </p>
                  </div>
                </v-window-item>
              </v-window>

              <!-- Boutons -->
              <v-card-actions class="mt-6 pa-0">
                <v-btn
                  v-if="step > 1 && step < 8"
                  variant="text"
                  color="onSurface"
                  @click="step--"
                >
                  Retour
                </v-btn>

                <v-spacer></v-spacer>

                <v-btn
                  v-if="step < 7"
                  @click="step++"
                  color="remplacement"
                  variant="flat"
                  rounded="xl"
                  class="px-6 text-background"
                  :disabled="!stepValid[step]"
                >
                  Suivant
                </v-btn>

                <v-btn
                  v-if="step < 7 && isDev"
                  @click="step++"
                  color="warning"
                  variant="flat"
                  rounded="xl"
                  class="px-6 ml-2"
                >
                  Passer
                </v-btn>

                <v-btn
                  v-if="step === 8"
                  color="onBackground"
                  rounded="lg"
                  class="px-4"
                  variant="flat"
                  prepend-icon="mdi-login"
                  @click="navigateToLogin"
                >
                  Se connecter
                </v-btn>

                <v-scale-transition>

                
                <div v-if="step === 7 && otpValid" class="block d-flex">
                  <v-btn
                    @click="handleCreateAccount"
                    :disabled="(!stepValid[6] || isSubmitting) && !isDev"
                    color="surface"
                    variant="flat"
                    rounded="xl"
                    class="px-6"
                    :loading="isSubmitting"
                  >
                    Créer mon compte
                  </v-btn>
                </div>
              </v-scale-transition>
              </v-card-actions>
            </v-form>
          </v-col>
        </v-row>

        <v-progress-linear
          color="primary"
          class="position-absolute left-0"
          :model-value="progressValue"
          :style="step === 8 ? 'display: none' : ''"
        ></v-progress-linear>
      </v-card>
    </v-slide-y-reverse-transition>

    <!-- Side Panel for additional information -->
    <v-navigation-drawer
      v-model="sidePanelOpen"
      order="10"
      location="right"
      temporary

      width="500"
      floating
    >
      <v-card flat class="h-100 pa-4">


        <v-card-text class="pa-4">
       
          <div v-if="activeSidePanel === 'contact'">
            <div class="d-flex justify-start align-center">
              <v-btn @click="sidePanelOpen = false" icon="mdi-arrow-left" variant="text" rounded="xl" ></v-btn>
              <p class="text-h5 font-weight-bold ">Contacter un administrateur</p>
              
            </div>
            <p class="text-medium-emphasis mb-4">Vous ne trouvez pas votre organisme dans la liste ? Contactez un administrateur pour ajouter votre organisme à notre plateforme.</p>
            <ContactAdminForm admins="master" color="transparent"></ContactAdminForm>
      

         
          </div>

          <div v-else-if="activeSidePanel === 'privacy'" class="privacy-content">
            <p class="text-h5 font-weight-bold mb-4">Utilisation des données</p>

            <v-expansion-panels variant="accordion" rounded="xl" color="surfaceContainerHigh" flat bg-color="surfaceContainerHigh" class="pa-6">
              <v-expansion-panel  >
                <v-expansion-panel-title>Quelles données sont collectées ?</v-expansion-panel-title>
                <v-expansion-panel-text class="text-caption text-medium-emphasis" >
                  <p>CELESTE collecte uniquement les données nécessaires au bon fonctionnement du service :</p>
                  <ul>
                    <li>Informations personnelles (nom, prénom)</li>
                    <li>Coordonnées professionnelles (adresse e-mail)</li>
                    <li>Données liées à votre organisme et équipe</li>
                    <li>Informations relatives aux remplacements et permutations</li>
                  </ul>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel>
                <v-expansion-panel-title>Comment sont utilisées vos données ?</v-expansion-panel-title>
                <v-expansion-panel-text class="text-caption text-medium-emphasis">
                  <p>Vos données sont utilisées pour :</p>
                  <ul>
                    <li>Gérer votre compte et vos accès</li>
                    <li>Faciliter les remplacements et permutations</li>
                    <li>Générer des statistiques anonymisées</li>
                    <li>Améliorer la qualité du service</li>
                  </ul>
                  <p>Nous ne partageons jamais vos données avec des tiers sans votre consentement explicite.</p>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel>
                <v-expansion-panel-title>Combien de temps sont conservées vos données ?</v-expansion-panel-title>
                <v-expansion-panel-text class="text-caption text-medium-emphasis">
                  <p>Vos données sont conservées :</p>
                  <ul>
                    <li>Pendant toute la durée de votre utilisation du service</li>
                    <li>Jusqu'à 12 mois après la suppression de votre compte pour les données de base</li>
                    <li>Les données statistiques anonymisées peuvent être conservées indéfiniment</li>
                  </ul>
                </v-expansion-panel-text>
              </v-expansion-panel>

             
            </v-expansion-panels>
          </div>
        </v-card-text>
      </v-card>
    </v-navigation-drawer>
  </v-row>
  </v-container>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import { useCenterStore } from "@/stores/centerStore.js";
import { useTeamStore } from "@/stores/teamStore.js";
import { accountCreationService } from "@/services/accountCreationService.js";
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useSnackbarStore } from "@/stores/snackbarStore.js";
import OTPVerification from '@/components/OTPVerification.vue';
import ContactAdminForm from "@/components/Forms/ContactAdminForm.vue";

const router = useRouter();
const centerStore = useCenterStore();
const snackbarStore = useSnackbarStore();
const teamStore = useTeamStore();

// Form data
const user = ref({
  email: "",
  password: "",
  confirmPassword: "",
  name: "",
  lastName: "",
  centerId: "",
  team: "",
  zone: "east", // Default value
});

// OTP state
const otp = ref("");
const otpValid = ref(false);

// Responsive display
const {smAndDown} = useDisplay();
const isDev = ref(import.meta.env.DEV);

// UI state
const step = ref(1);
const acceptedTerms = ref(false);
const emailExists = ref(false);
const stepValid = ref({1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false});
const stepErrors = ref({1: "", 2: "", 3: "", 4: "", 5: "", 6: "", 7: "", 8: ""});
const form = ref(null);

// Loading states
const loadingCenters = ref(false);
const loadingTeams = ref(false);
const isSubmitting = ref(false);
const checkingEmail = ref(false);
const showLegacyAlert = ref(false);

// Side panel state
const sidePanelOpen = ref(false);
const activeSidePanel = ref(null);
const sidePanelTitle = computed(() => {
  if (activeSidePanel.value === 'contact') return "Contacter un administrateur";
  if (activeSidePanel.value === 'privacy') return "Politique de confidentialité";
  return "";
});

// Contact form
const contactForm = ref({
  subject: "",
  message: "",
  submitting: false
});

// Computed properties
const progressValue = computed(() => ((step.value - 1) * 100) / 8);
const centers = computed(() => centerStore.centers);
const centerTeams = computed(() => teamStore.centerTeams);

// Functions for handling side panel
const showSidePanel = (panelType) => {
  activeSidePanel.value = panelType;
  sidePanelOpen.value = true;
};

// Item props for select inputs
const itemProps = (item) => ({
  title: item.name,
  subtitle: item.OACI,
});



const fetchCenterTeams = async () => {
  if (!user.value.centerId) return;

  loadingTeams.value = true;
  try {
    await teamStore.fetchCenterTeams(user.value.centerId);
  } catch (error) {
    stepErrors.value[5] = "Erreur lors de la récupération des équipes";
    console.error("Erreur lors de la récupération des équipes", "error");
  } finally {
    loadingTeams.value = false;
  }
};

// Event handlers
const onCenterSelect = () => {
  validateStep(1);
  fetchCenterTeams();
  user.value.team = ""; // Reset team when center changes
};

const onEmailChange = () => {
  emailExists.value = false;
  otpValid.value = false;
  stepErrors.value[2] = "";
};

const onOtpVerified = () => {
  otpValid.value = true;
}

const handleCreateAccount = async () => {
  isSubmitting.value = true;
  try {
    
    // Si l'OTP est valide, créer le compte
    await accountCreationService.createAccount(user.value);

    // Si la création du compte réussit, passer à l'étape 8 (confirmation)
    setTimeout(() => {
      step.value = 8;
    
    }, 1000);
  } catch (error) {
    snackbarStore.showNotification(
     "Erreur lors de la création du compte",
      "error",
      "mdi-alert-circle"
    );
    console.error("Erreur lors de la création du compte:", error);
    stepErrors.value[7] = "Erreur lors de la création du compte";
  } finally {
    isSubmitting.value = false;
  }
};

const navigateToLogin = () => {
  router.push('/login');
};

// Validation rules
const rules = {
  email: (value) => {
    if (!value) return "Adresse email requise";
    // Regex plus simple et performante pour valider les emails
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g;
    return emailRegex.test(value) || "Adresse email invalide";
  },
  min: (min) => (value) => value?.length >= min || `Doit contenir au moins ${min} caractères`,
  matchPassword: (value) => value === user.value.password || "Les mots de passe ne correspondent pas",
  required: (value) => !!value || "Champ requis"
};


// Step validation
const validateStep = async (stepNum) => {
  let isValid = true;

  switch (stepNum) {
    case 1: // Organisme
      isValid = !!user.value.centerId;
      stepErrors.value[1] = isValid ? "" : "Veuillez sélectionner un organisme";
      break;

    case 2: // Email
      showLegacyAlert.value = false;
      // Check for email validity
      if (rules.email(user.value.email) !== true) {
        isValid = false;
        stepErrors.value[2] = "Adresse e-mail invalide";
        break;
      }
     
      // Check if email already exists
      checkingEmail.value = true;
      try {
        const data = await accountCreationService.checkEmailAvailability(user.value.email);
        if (!data.available || data.legacy) {
          emailExists.value = true;
          isValid = false;
          stepErrors.value[2] = "Adresse e-mail déjà utilisée";
        }
        if (data.legacy) {
          showLegacyAlert.value = true;
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de l'email :", error);
        stepErrors.value[2] = "Une erreur est survenue. Veuillez réessayer";
        isValid = false;
      } finally {
        checkingEmail.value = false;
      }
      break;

    case 3: // Mot de passe
      const passwordValid = rules.min(8)(user.value.password) === true;
      const passwordMatch = user.value.password && user.value.confirmPassword &&
        rules.matchPassword(user.value.confirmPassword) === true;

      isValid = passwordValid && passwordMatch;

      if (!passwordValid) {
        stepErrors.value[3] = "Le mot de passe doit contenir au moins 8 caractères";
      } else if (!passwordMatch) {
        stepErrors.value[3] = "Les mots de passe ne correspondent pas";
      } else {
        stepErrors.value[3] = "";
      }
      break;

    case 4: // Informations personnelles
      isValid = !!user.value.name && !!user.value.lastName;
      stepErrors.value[4] = isValid ? "" : "Veuillez remplir tous les champs";
      break;

    case 5: // Equipe et zone
      isValid = !!user.value.team && !!user.value.zone;
      stepErrors.value[5] = isValid ? "" : "Veuillez compléter toutes les informations";
      break;

    case 6: // Conditions
      isValid = acceptedTerms.value;
      stepErrors.value[6] = isValid ? "" : "Veuillez accepter les conditions";
      break;

    case 7: // OTP Verification
      isValid = otp.value.length === 6 && otpValid.value;
      stepErrors.value[7] = isValid ? "" : "Code OTP invalide";
      break;

    case 8: // Confirmation de création du compte
      isValid = true;
      stepErrors.value[8] = isValid ? "" : "Erreur lors de la confirmation de la création du compte";
      break;

    default:
      break;
  }

  stepValid.value[stepNum] = isValid;
  return isValid;
};



</script>

<style scoped>
.block {
  position: relative;
  z-index: 0;
  overflow: visible !important;
  opacity: 1 !important;
}

.block:after,
.block:before {
  content: '';
  position: absolute;
  left: -2px;
  top: -2px;
  border-radius: 24px;
  background: linear-gradient(45deg, #ffc0d4, rgba(237, 202, 255, 0.94), rgba(250, 152, 248, 0.05),
  rgba(159, 159, 248, 0.22), #ffccdd);
  background-size: 400%;
  width: calc(100% + 4px);
  height: calc(100% + 4px);
  z-index: -1;
  animation: steam 7s linear infinite;
}

@keyframes steam {
  0% {
    background-position: 0 0;
  }
  80% {
    background-position: 400% 0;
  }
  100% {
    background-position: 400% 0;
  }
}

.block:after {
  filter: blur(5px);
}

/* Success animation styling */
.success-animation {
  position: relative;
}

.success-circle {
  animation: pulse 3s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(110, 196, 227, 0.4);
  }
  70% {
    transform: scale(1.05);
    box-shadow: 0 0 0 15px rgba(76, 175, 80, 0);
  }
  100% {
    transform: scale(1);
  }
}

/* Privacy content styling */
.privacy-content ul {
  padding-left: 20px;
  margin-bottom: 16px;
}

.privacy-content p {
  margin-bottom: 12px;
}
</style>
