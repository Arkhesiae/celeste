<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const form = ref({
  email: '',
  firstName: '',
  lastName: '',
  center: ''
})

const loading = ref(false)
const error = ref('')
const success = ref('')

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const response = await fetch('/api/account-recovery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(form.value)
    })

    if (!response.ok) {
      throw new Error('Une erreur est survenue lors de la soumission')
    }

    success.value = 'Votre demande de récupération a été enregistrée avec succès. Un administrateur vous contactera bientôt.'
    setTimeout(() => {
      router.push('/')
    }, 3000)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
  
        <v-card flat rounded="xl" class="pa-6" min-width="900px">
            <v-card-title class="pl-0 text-overline font-weight-bold">CéLESTE</v-card-title>

        <v-row>
          <v-col cols="12" md="6">
            <v-scroll-y-transition appear hide-on-leave>
                <div >
                <v-card-title class="pl-0 text-h4">Récupérer mon compte</v-card-title>
                <span class="text-body-2 text-medium-emphasis pl-0">
                    Remplissez les champs pour récupérer votre compte.
                </span>
              </div>
            
            </v-scroll-y-transition>
          </v-col>
    
          <v-col cols="12" md="6">
            <v-form @submit.prevent="handleSubmit" class="mt-4">
              <v-text-field
                v-model="form.email"
                label="Email de l'ancien compte"
                type="email"    
                required
                rounded="lg"
                variant="solo-filled"
                flat
                :rules="[v => !!v || 'L\'email est requis']"
                class="mb-4"
              />            
              <v-text-field
                v-model="form.firstName"
                label="Prénom"
                required
                rounded="xl"
                variant="solo-filled"
                flat
                :rules="[v => !!v || 'Le prénom est requis']"
                class="mb-4"
              />
              <v-text-field
                v-model="form.lastName"
                label="Nom"
                required
                rounded="xl"
                variant="solo-filled"
                flat
                :rules="[v => !!v || 'Le nom est requis']"
                class="mb-4"
              />
              <v-text-field
                v-model="form.center"
                label="Centre"
                    required
                rounded="lg"
                variant="solo-filled"
                flat
                :rules="[v => !!v || 'Le centre est requis']"
                class="mb-4"
              />
        
            </v-form>
          </v-col>
        </v-row>




        <v-card-actions>
         <v-spacer></v-spacer>
        <v-btn
                type="submit"
                color="primary"
              
                size="large"
                :loading="loading"
                :disabled="loading"

                class="mt-4"
              >
                Soumettre la demande
              </v-btn>
        </v-card-actions>
    
        </v-card>
    </v-row>
  </v-container>
</template>

<style scoped>

</style> 