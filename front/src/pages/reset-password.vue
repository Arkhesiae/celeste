<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align-content="center">
      <v-col cols="12" sm="8" md="6" lg="4" align-self="center">
        <v-card class="rounded-xl pa-6" flat>
          <v-card-title class="text-h5 mb-4 pa-0">
            Réinitialisation du mot de passe
          </v-card-title>

          <v-card-text class="pa-0 py-4">
            <v-window v-model="step">
              <v-window-item :value="1">
                <v-form ref="form" v-model="valid" @submit.prevent="submit">
                  <v-text-field
                    v-model="password"
                    :rules="passwordRules"
                    label="Nouveau mot de passe"
                    type="password"
                  
                    variant="solo-filled"
                    flat
                    color="primary"
                    rounded="xl"
                    bg-color="surface"
                    hide-details="auto"
                    class="mb-4"
                  ></v-text-field>

                  <v-text-field
                    v-model="confirmPassword"
                    :rules="confirmPasswordRules"
                    label="Confirmer le mot de passe"
                    type="password"
                  
                    variant="solo-filled"
                    flat
                    color="primary"
                    rounded="xl"
                    bg-color="surface"
                    hide-details="auto"
                  ></v-text-field>
                </v-form>
              </v-window-item>

              <v-window-item :value="2">
                <div class="text-center py-4">
                  <v-icon
                    color="primary"
                    size="24"
                    class="mb-4"
                  >
                    mdi-check-circle-outline
                  </v-icon>
                  <h3 class="text-h6 mb-2">Mot de passe réinitialisé avec succès !</h3>
                  <span class="text-body-1 mb-4 text-medium-emphasis">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</span>
                </div>
              </v-window-item>
            </v-window>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              v-if="isDev"
              color="info"
              variant="text"
              class="me-2"
              @click="step = step === 1 ? 2 : 1"
            >
              Dev: Switch Window ({{ step }})
            </v-btn>
            <v-btn
              v-if="step === 1"
              color="primary"
              :loading="loading"
              :disabled="!valid"
              class="rounded-xl"
              @click="submit"
            >
              Réinitialiser
            </v-btn>
            <v-btn
              v-else
              color="primary"
              class="rounded-xl"
              @click="goToLogin"
            >
              Aller à la connexion
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authService } from '@/services/authService'
import { useSnackbarStore } from '@/stores/snackbarStore'

const route = useRoute()
const router = useRouter()
const snackbarStore = useSnackbarStore()

const isDev = ref(import.meta.env.DEV);

const form = ref(null)
const valid = ref(false)
const loading = ref(false)
const password = ref('')
const confirmPassword = ref('')
const step = ref(1)

const passwordRules = [
  v => !!v || 'Le mot de passe est requis',
  v => v.length >= 8 || 'Le mot de passe doit contenir au moins 8 caractères',

]

const confirmPasswordRules = [
  v => !!v || 'La confirmation du mot de passe est requise',
  v => v === password.value || 'Les mots de passe ne correspondent pas'
]

onMounted(() => {
  if (!route.query.token) {
    snackbarStore.showNotification('Token de réinitialisation manquant', 'error', 'mdi-alert-circle')
 
  }
})

const submit = async () => {
  if (!form.value?.validate()) return

  loading.value = true
  try {
    await authService.resetPassword(route.query.token, password.value)
    step.value = 2
  } catch (error) {
    snackbarStore.showNotification(
      error.message || 'Une erreur est survenue lors de la réinitialisation',
      'error',
      'mdi-alert-circle'
    )
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>

.v-btn {
  text-transform: none;
  letter-spacing: 0;
}
</style> 