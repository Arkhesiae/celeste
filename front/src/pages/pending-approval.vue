<template>
  <v-container class="d-flex fill-height">
    <v-row justify="center" align-content="center">
      <v-col cols="12" md="8" lg="6">
        <v-card class="pa-6" rounded="xl" elevation="0">
          <v-card-title class=" mb-4">En attente d'approbation</v-card-title>
          
          <v-card-text>
            <div class="d-flex flex-column align-center mb-6">
              <v-icon
                icon="mdi-clock-outline"
                size="24"
                color="warning"
                class="mb-4"
              ></v-icon>
              
              <p class="text-body-1  mb-4">
                Votre compte est en attente d'approbation par un administrateur.
                Vous recevrez une notification dès que votre compte sera approuvé.
              </p>
              
              <p class="text-body-2 text-center text-medium-emphasis">
                Si vous avez des questions, n'hésitez pas à contacter votre administrateur.
              </p>
            </div>

            <v-btn
              block
              color="error"
              rounded="xl"
              variant="tonal"
              @click="handleLogout"
              class="mt-4"
              height="48"
            >
              Se déconnecter
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = async () => {
  await authStore.logOut();
  router.push('/login');
};
</script> 