<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import OTPVerification from '@/components/OTPVerification.vue'
import { API_URL, handleResponse } from '@/config/api.js'
import { useCenterStore } from '@/stores/centerStore'
import { useDisplay } from 'vuetify'
const { smAndDown } = useDisplay()

const router = useRouter()
const step = ref(1)
const centerStore = useCenterStore()
// Étape 1 : Identification
const form = ref({
  email: '',
  center: ''
})
const step1Error = ref('')

const centers = computed(() => {
  return centerStore.centers
})




// Étape 2 : Affichage infos + choix email
const oldAccount = ref(null)
const useOldEmail = ref(true)
const newEmail = ref('')
const step2Error = ref('')

// Étape 3 : OTP
const otpVerified = ref(false)
const otpError = ref('')

// Étape 4 : Nouveau mot de passe
const newPassword = ref('')
const confirmPassword = ref('')
const step4Error = ref('')
const passwordRules = [
  v => !!v || 'Le mot de passe est requis',
  v => v.length >= 8 || 'Le mot de passe doit contenir au moins 8 caractères',
]
const confirmPasswordRules = [
  v => !!v || 'La confirmation du mot de passe est requise',
  v => v === newPassword.value || 'Les mots de passe ne correspondent pas'
]

// Étape 5 : Confirmation
const successMessage = ref('Votre compte a été récupéré !')

const canGoNext = computed(() => {
  if (step.value === 1) {
    return form.value.login && form.value.center
  }
  if (step.value === 2) {
    return useOldEmail.value || (newEmail.value && /.+@.+\..+/.test(newEmail.value))
  }
  if (step.value === 3) {
    return otpVerified.value
  }
  if (step.value === 4) {
    return newPassword.value && confirmPassword.value && newPassword.value === confirmPassword.value && newPassword.value.length >= 8
  }
  return true
})

async function goNext() {
  if (step.value === 1) {
    step1Error.value = ''
    try {
      if (!form.value.login || !form.value.center) throw new Error('Veuillez remplir tous les champs.')

      const params = new URLSearchParams()
      params.append('login', form.value.login )
      params.append('center', form.value.center)
      // Possibilité d'ajouter login ici si besoin
      const res = await fetch(`${API_URL}/account-recovery/legacy-user?${params.toString()}`)
      const userData = await handleResponse(res)
      // On prend le premier utilisateur trouvé
      const user = userData.user
      const newCenter = userData.newCenter
   
      oldAccount.value = {
        firstName: user.prenom || '',
        lastName: user.nom || '',
        email: user.email || '',
        points: user.compte || '',  
        center: newCenter || '',
        equipe: Math.abs(user.equipe) || '',
        tel: user.tel || '',
        mailing: user.mailing || '',
        rappel: user.rappel || '',
     
      }
      step.value = 2
    } catch (e) {
      step1Error.value = e.message || 'Erreur lors de la récupération du compte.'
    }
    return
  }
  if (step.value === 3 && !otpVerified.value) return
  if (step.value < 5) step.value++
}
function goBack() {
  if (step.value > 1) step.value--
}

function handleOtpVerified() {
  otpVerified.value = true
  otpError.value = ''
}
function handleOtpError(e) {
  otpError.value = e?.message || 'Erreur OTP'
}




function getCenterName(center) {
  return centers.value.find(c => c._id === center)?.name
}

async function handleRecovery() {
  try {
      if (!form.value.login || !form.value.center) throw new Error('Veuillez remplir tous les champs.')
   

    
      const newAccount = {
        login: form.value.login,
        firstName: oldAccount.value.firstName.charAt(0).toUpperCase() + oldAccount.value.firstName.slice(1),
        lastName: oldAccount.value.lastName.toUpperCase(),
        center: oldAccount.value.center,
        oldEmail: oldAccount.value.email,
        email: useOldEmail.value ? oldAccount.value.email : newEmail.value,
        password: newPassword.value,
        points: oldAccount.value.points,
        equipe: oldAccount.value.equipe
      }

      console.log("in handleRecovery", newAccount)

      // Possibilité d'ajouter login ici si besoin
      const res = await fetch(`${API_URL}/account-recovery/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },  
        body: JSON.stringify(newAccount)
      })

      const userData = await handleResponse(res)
      console.log(userData)
      step.value = 5
  
    } catch (e) {
      step4Error.value = e.message || 'Erreur lors de la récupération du compte.'
    }
    return
  
}
</script>

<template>
<v-container class="fill-height d-flex justify-center align-center"  >
   
  <v-row>
    <v-col cols="12" class="d-flex justify-center align-center" >
      <v-card flat rounded="xl" class="pa-6 smooth-height" max-width="1200px" :class="smAndDown ? 'bg-transparent px-0' : ''" style="transition: all 0.3s ease-in-out;">
        <v-card-title class="pl-0 text-overline font-weight-bold">CéLESTE</v-card-title>
        <v-row style="transition: all 0.3s ease-in-out;">
          <v-col cols="12" md="6">
        
            <v-scroll-y-transition appear hide-on-leave>
              <div class="d-flex flex-column justify-center align-start mt-8">
                <span class="pl-0 text-h4" style="font-weight: 500;">Récupérer mon compte</span>
                <span class="text-body-2 text-medium-emphasis pl-0">
                  Remplissez les champs pour récupérer votre compte.
                </span>
              </div>
            </v-scroll-y-transition>
            <v-alert  class="mt-4" color="pendingDemand" variant="tonal" rounded="xl" icon="mdi-mail">
              <span class="text-body-2 pl-0">
              Nous vous rappelons qu'il est préférable de ne pas utiliser l'adresse aviation-civile.gouv.fr.
              <br/>
              <b> Si vous ne recevez pas l'email, veuillez patienter quelques instants et réessayer  </b>
              </span>
            </v-alert>
          </v-col>
          <v-col cols="12" md="6" style="transition: all 0.3s ease-in-out;">
         
            <v-window v-model="step" class="mt-8" style="transition: all 0.3s ease-in-out;">
          <!-- Étape 1 : Identification -->
          <v-window-item :value="1">
            <v-card-title class="pl-0 text-h6 ">Mes identifiants</v-card-title>
            <span class="text-body-2 text-medium-emphasis pl-0 mb-4 d-block">
              Entrez l'email et le centre de votre ancien compte.
            </span>
            <v-form>
              <v-text-field
                v-model="form.login"
                label="Email ou login de l'ancien compte"
              
                required
                rounded="xl"
                variant="solo-filled"
                flat
                :rules="[v => !!v || 'L\'email est requis']"
                class="mb-4"
              />
              <v-select
                v-model="form.center"
                label="Centre"
                required
                rounded="xl"
                variant="solo-filled"
                flat
                :rules="[v => !!v || 'Le centre est requis']"
                class="mb-4"
                :items="centers"
                item-title="name"
                
                item-value="OACI"
              />
              <v-alert v-if="step1Error" color="error" rounded="xl" variant="tonal" class="mb-2 d-flex align-center">
                <v-icon color="error" size="24" class="mr-2">mdi-alert-circle</v-icon>
                {{ step1Error }}
              </v-alert>
            </v-form>
          </v-window-item>

          <!-- Étape 2 : Affichage infos + choix email -->
          <v-window-item :value="2" >
            <!-- <v-card-title class="pl-0 text-h5">Informations du compte</v-card-title> -->
            <v-card style="border-radius: 16px !important;" color="surfaceContainerHigh" flat class="pa-4 d-flex justify-space-between">
              <div class="d-flex flex-column">
              <div class="text-h7">  {{ oldAccount.firstName.charAt(0).toUpperCase() + oldAccount.firstName.slice(1) }} </div>
              <div class="text-h7"> <b>{{ oldAccount.lastName.toUpperCase() }}</b></div>
            </div>
              <div class="d-flex justify-space-between flex-column">
              <div class="text-h5 font-weight-bold"> {{ oldAccount.points }}</div>
              <div class="text-body-2 text-medium-emphasis mt-n3">Points </div>
             
            </div>
            </v-card>
            <div class="d-flex justify-space-between">
              <div class="text-body-2 text-medium-emphasis mt-1">Equipe : <b>{{ oldAccount.equipe }}</b></div>
              <div class="text-body-2 text-medium-emphasis mt-1">Centre : <b>{{ getCenterName(oldAccount.center) }}</b></div>
              
            </div>
          
            <div class="text-body-2 text-medium-emphasis mt-8">Email actuel : <b>{{ oldAccount.email }}</b></div>
       
           
            <v-radio-group v-model="useOldEmail" class="mt-4">
              <v-radio color="remplacement" :value="true" label="Garder l'adresse email actuelle" />
              <v-radio color="permutation" class="text-subtitle-1" :value="false" label="Utiliser une nouvelle adresse email" />
            </v-radio-group>
            <div class="mt-4" style="transition: all 0.3s ease-in-out;">
            <v-slide-y-transition>
            <v-text-field
              v-show="!useOldEmail"
              v-model="newEmail"
              label="Nouvelle adresse email"
              type="email"
              rounded="xl"
              variant="solo-filled"
              flat
              :rules="[v => !!v || 'L\'email est requis', v => /.+@.+\..+/.test(v) || 'Email invalide']"
              class="mb-2"
            />
            </v-slide-y-transition>
            </div>
            <v-alert v-if="step2Error" type="error" class="mb-2" color="error" variant="tonal" rounded="xl" icon="mdi-alert-outline">{{ step2Error }}</v-alert>
          </v-window-item>

          <!-- Étape 3 : OTP -->
          <v-window-item :value="3">
            <v-slide-y-transition mode="out-in">
            <OTPVerification v-if="!otpVerified"
              :email="useOldEmail ? oldAccount.email : newEmail"
              @verified="handleOtpVerified"
              @error="handleOtpError"
            />
           <div v-else>
            <span class="text-h5 text-medium-emphasis mt-1">Addresse email vérifiée</span>
           </div>
           </v-slide-y-transition>
          </v-window-item>

          <!-- Étape 4 : Nouveau mot de passe -->
          <v-window-item :value="4">
            <v-card-title class="pl-0 text-h5">Définir un nouveau mot de passe</v-card-title>
            <v-form>
              <v-text-field
                v-model="newPassword"
                rounded="xl"
                variant="solo-filled"
                flat
                label="Nouveau mot de passe"
                type="password"
                :rules="passwordRules"
                class="mb-2"
              />
              <v-text-field
                v-model="confirmPassword"
                rounded="xl"
                variant="solo-filled"
                flat
                label="Confirmer le mot de passe"
                type="password"
                :rules="confirmPasswordRules"
                class="mb-2"
              />
              <v-alert v-if="step4Error" type="error" class="mb-2" color="error" variant="tonal" rounded="xl" icon="mdi-alert-outline">{{ step4Error }}</v-alert>
            </v-form>
          </v-window-item>

          <!-- Étape 5 : Confirmation -->
          <v-window-item :value="5">
            <v-card-title class="pl-0 text-h5">Confirmation</v-card-title>
            <div class="my-6 text-center">
              <v-icon color="remplacement" size="48">mdi-check</v-icon>
              <div class="mt-4">{{ successMessage }}</div>
            </div>
           
          </v-window-item>
        </v-window>
        </v-col>
      </v-row>
     
      <v-row >
        <v-col cols="12" md="6" offset-md="6">
            <v-card-actions class="mt-4"> 
              <v-btn variant="text" color="onSurface" v-if="step > 1" @click="goBack">
               
                Retour
              </v-btn>
              <v-spacer></v-spacer>
              <v-btn variant="flat" color="onBackground" rounded="lg" append-icon="mdi-arrow-right" :disabled="!canGoNext" v-if="step < 4" @click="goNext">
                Continuer
           
              </v-btn>
              <v-btn variant="flat" color="onBackground" rounded="lg" append-icon="mdi-arrow-right" :disabled="!canGoNext" v-if="step === 4" @click="handleRecovery">
                Récupérer 
           
              </v-btn>
              <v-btn variant="flat" color="onBackground" rounded="lg" append-icon="mdi-arrow-right" v-if="step === 5" @click="router.push('/login')">
                Se connecter
              </v-btn>

            </v-card-actions>
            </v-col>
          
      </v-row>
      </v-card>
    </v-col>
  </v-row>
     
    
  </v-container>
</template>

<style scoped>
.smooth-height {
  transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
</style> 