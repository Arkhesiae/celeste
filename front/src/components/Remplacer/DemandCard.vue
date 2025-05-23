<template>
  <v-card 
    color="transparent"
    rounded="xl"
    elevation="0"
    class="pa-4 mb-2"
  >
    <v-card-item class="pa-0">
      <v-card-title class="text-body-2 d-flex align-center">
        <v-icon  icon="mdi-calendar" size="small" class="mx-2"></v-icon>
        <span class="text-medium-emphasis font-weight-bold">
          {{ formatDate(demand?.posterShift?.date) }}
        </span>
        <v-chip
          v-if="timeSinceCreation"
          class="ms-2"
          rounded="pill"
          size="x-small"
            
          variant="tonal"
        >
          {{ timeSinceCreation }}
        </v-chip>
      </v-card-title>
      <template #append>
        <div class="d-flex align-center">
          <span class="text-medium-emphasis font-weight-bold me-2">
            {{ getUserById(demand?.posterId)?.name }} {{ getUserById(demand?.posterId)?.lastName }}
          </span>
          <v-avatar
            :image="getUserById(demand?.posterId)?.avatar ? `${API_URL}${getUserById(demand?.posterId)?.avatar}` : 'https://cdn.vuetifyjs.com/images/john-smirk.png'"
            size="x-small"
          ></v-avatar>
          <v-chip
            class="ms-2 text-medium-emphasis px-3"
            prepend-icon="mdi-eye-outline"
            size="small"
            
            rounded="pill"
            color="onBackground"
            variant="tonal"
          >
            {{ demand?.seenBy?.length || 0 }}
          </v-chip>
          <v-btn
            variant="text"
            class="ms-2"
            color="onBackground"
            icon="mdi-dots-vertical"
            size="small"
           
          >
          
          </v-btn>
        </div>
      </template>
    </v-card-item>

    <v-divider color="primary" opacity="0.01" class="my-0"></v-divider>

    <v-card rounded="xl" color="background" class="mb-0 card-shadow" elevation="0">
        <v-card-item>
          <v-card-title class="pb-0 mb-0">
            <h2 class="text-h4 font-weight-medium">{{ demand?.posterShift?.name }}</h2>
          </v-card-title>
          <v-card-subtitle class="pt-0 text-caption">Dans équipe {{ getTeamName }}</v-card-subtitle>
          <v-card-subtitle class="pt-0">
            {{ demand?.posterShift?.startTime }} - {{ demand?.posterShift?.endTime }}
          </v-card-subtitle>
        </v-card-item>
      </v-card>

    <v-card-text class="pa-0 ma-0">
 

      

      <div v-if="demand?.comment" class="mt-4">
        <v-icon color="primary" icon="mdi-comment-text-outline" class="me-2"></v-icon>
        <span class="text-body-2 text-medium-emphasis">{{ demand?.comment }}</span>
      </div>
    </v-card-text>

    <v-card-actions class="pa-0">
      <v-spacer></v-spacer>
      <v-btn
        v-if="demand?.status === 'open'"
        rounded="lg"
     
       
        :variant="isInterested ? 'elevated' : 'outlined'"
        size="small"
        :slim="false"
        class="faint-border me-2"
        color="onBackground"
        :prepend-icon="isInterested ? 'mdi-heart' : 'mdi-heart-outline'"
        @click="handleInterest"
        :loading="loading.interest"
      >
        Intéressé
      </v-btn>
      <v-btn
        v-if="demand?.status === 'open'"
        rounded="xl"
        color="remplacement"
        size="small"
        :slim="false"
        variant="flat"
        prepend-icon="mdi-account-arrow-left-outline"
        @click="handleAccept"
        :loading="loading.accept"
      >
        Remplacer
      </v-btn>
      <v-chip
        v-else-if="demand?.status === 'accepted'"
        color="success"
        variant="tonal"
        prepend-icon="mdi-check-circle"
      >
        Acceptée
      </v-chip>
    </v-card-actions>

    <!-- Dialog de confirmation -->
    <v-dialog v-model="showConfirmationDialog" max-width="500" style="z-index: 1000000 !important">
      <v-card rounded="xl" color="surfaceContainer" class="pa-6">
        <v-card-title class="text-h5 pa-0">
          Confirmation de remplacement
        </v-card-title>
        <v-card-text class="pa-0 mb-6">
          <p v-if="userHasShift">
            Vous travaillez déjà ce jour
          </p>
          <p v-else>
            Êtes-vous sûr de vouloir accepter ce remplacement ?
          </p>
        </v-card-text>
        <v-card-actions class="pa-0">
          <v-btn
            color="secondary"
            variant="text"
            rounded="xl"
            @click="showConfirmationDialog = false"
            size="large"
            :slim="false"
          >
            Annuler
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            v-if="userHasShift"
            color="permutation"
            variant="tonal"
            rounded="xl"
            @click="handleSwap"
            :loading="loading.accept"
            size="large"
            :slim="false"
          >
            Permuter
          </v-btn>
          <v-btn
            color="remplacement"
            variant="tonal"
            rounded="xl"
            @click="handleConfirmAccept"
            :loading="loading.accept"
            size="large"
            :slim="false"
          >
            {{ userHasShift ? 'Remplacer' : 'Confirmer' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { computed, onMounted, ref, onUnmounted } from 'vue'
import { useUserStore } from "@/stores/userStore.js"
import { useDate } from 'vuetify'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { useSubstitutionStore } from '@/stores/substitutionStore'
import { useAuthStore } from '@/stores/authStore'
import { useTeamStore } from '@/stores/teamStore'
import { API_URL } from '@/config/api'

const props = defineProps({
  demand: {
    type: Object,
    required: true
  }
})

const authStore = useAuthStore()
const substitutionStore = useSubstitutionStore()
const date = useDate()
const timeSinceCreation = ref('')
const loading = ref({
  accept: false,
  interest: false
})
let intervalId = null

const snackbarStore = useSnackbarStore()

const teamStore = useTeamStore()

const formatDate = (dateString) => {
  if (!dateString) return ''
  return date.format(dateString, 'fullDate')
}

const calculateTimeSinceCreation = () => {
  if (!props.demand?.createdAt) return ''
  
  const now = new Date()
  const createdAt = new Date(props.demand.createdAt)
  const diffInHours = Math.floor((now - createdAt) / (1000 * 60 * 60))
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now - createdAt) / (1000 * 60))
    return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`
  } else if (diffInHours < 24) {
    return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`
  } else {
    const diffInDays = Math.floor(diffInHours / 24)
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`
  }
}

const showConfirmationDialog = ref(false)
const userHasShift = ref(false)
const userShift = ref(null)

const isInterested = computed(() => {
  console.log('demand', props.demand)
  return props.demand?.interested?.includes(authStore.userId)
})

const handleAccept = async () => {
  try {
    // Vérifier si l'utilisateur a un shift ce jour-là
    const response = await substitutionStore.checkUserShift(props.demand.posterShift.date)
    userHasShift.value = response.hasShift
    userShift.value = response.shift
    showConfirmationDialog.value = true
 
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de la vérification des shifts', 'onError', "mdi-alert-circle-outline")
    console.error('Erreur lors de la vérification des shifts:', error)
  }
}

const handleConfirmAccept = async () => {
  loading.value.accept = true
  try {
    await substitutionStore.acceptDemand(props.demand._id)
    snackbarStore.showNotification('Remplacement accepté avec succès', "onPrimary", "mdi-check-circle-outline")
    showConfirmationDialog.value = false
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de l\'acceptation du remplacement : ' + error.message, 'onError', "mdi-alert-circle-outline")
    console.error('Erreur lors de l\'acceptation:', error)
  } finally {
    loading.value.accept = false
  }
}

const handleSwap = async () => {
  loading.value.accept = true
  try {
    await substitutionStore.swapShifts(props.demand._id, userShift.value._id)
    snackbarStore.showNotification('Échange de shifts effectué avec succès')
    showConfirmationDialog.value = false
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de l\'échange des shifts', 'onError', "mdi-alert-circle-outline")
    console.error('Erreur lors de l\'échange:', error)
  } finally {
    loading.value.accept = false
  }
}

const handleInterest = async () => {
  loading.value.interest = true;
  try {
    const response = await substitutionStore.markInterest(props.demand._id)
    if (response.message === 'Interest added') {
      snackbarStore.showNotification('Intérêt marqué', "onPrimary", "mdi-check-circle-outline")
    } else {
      snackbarStore.showNotification('Intérêt retiré', "onPrimary", "mdi-check-circle-outline")
    }
  } catch (error) {
    snackbarStore.showNotification('Erreur lors du marquage de l\'intérêt : ' + error.message, 'onError', "mdi-alert-circle-outline")
    console.error('Erreur lors du marquage de l\'intérêt:', error)
  } finally {
    loading.value.interest = false
  }
}

onMounted(async () => {
  timeSinceCreation.value = calculateTimeSinceCreation()
  intervalId = setInterval(() => {
    timeSinceCreation.value = calculateTimeSinceCreation()
  }, 60000)
  

})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})

defineEmits(['accept', 'interest', 'update:demand'])

const userStore = useUserStore()
const getUserById = computed(() => (userId) => userStore.users.find((user) => user._id === userId))

const getTeamName = computed(() => {
  const team = teamStore.centerTeams.find(team => team._id === props.demand?.posterShift?.teamId)
  return team?.name || props.demand?.posterShift?.teamId
})
</script>

<style scoped>
.dashed {
  border-style: dashed;
}

.faint-border {
  border-color: rgba(243, 243, 243, 0.05);
}

.card-shadow {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.096), 0 0 0 1px rgba(121, 121, 121, 0.034), 0 4px 8px rgba(0, 0, 0, 0.048) !important;
}
</style>

