<template>
  <v-card color="transparent" rounded="sm" elevation="0">
    <v-card-item class="pa-0 my-1">
      <v-card-title class="text-body-2 d-flex align-center">
        <v-icon icon="mdi-calendar" size="small" class="mx-2"></v-icon>
        <span class="text-medium-emphasis font-weight-bold">
          {{ formatDate(demand?.posterShift?.date) }}
        </span>
        <v-chip v-if="timeSinceCreation" class="ms-2" rounded="pill" size="x-small" variant="tonal">
          {{ timeSinceCreation }}
        </v-chip>
      </v-card-title>
      <template #append>
        <div class="d-flex align-center">
          <div class="mr-2">
            <span v-if="!smAndDown" class="text-medium-emphasis font-weight-bold text-caption me-2">
              {{ getUserById(demand?.posterId)?.name }} {{ getUserById(demand?.posterId)?.lastName }}
            </span>
            <v-avatar
              :image="getUserById(demand?.posterId)?.avatar ? `${API_URL}${getUserById(demand?.posterId)?.avatar}` : 'https://cdn.vuetifyjs.com/images/john-smirk.png'"
              size="x-small" class="cursor-pointer" @click="showUserDialog = true"></v-avatar>
          </div>

          <div class="d-flex align-center">

            <v-chip variant="flat" size="small" rounded="lg" prepend-icon="mdi-unicorn-variant"
              class="font-weight-bold point-chip" @click.stop="showPointsDialog = true">
              <span v-if="demand?.type === 'switch' && demand?.acceptedSwitches.length > 1">

              </span>
              <span v-else>
                {{ demand?.points }}
              </span>
              <v-icon v-if="demand?.acceptedSwitches.length > 0" icon="mdi-tune-variant"></v-icon>

            </v-chip>

          </div>
          <v-chip v-if="demand?.comment" class="ms-2 text-medium-emphasis " size="small" rounded="pill"
            color="remplacement" variant="flat" @click="showCommentDialog = true" style="cursor: pointer">
            <v-icon>mdi-comment-text-outline</v-icon>
          </v-chip>
          <v-chip class="ms-2 text-medium-emphasis px-3" prepend-icon="mdi-eye-outline" size="small" rounded="pill"
            color="onBackground" variant="tonal">
            {{ demand?.seenBy?.length || 0 }}
          </v-chip>
          <!-- <v-btn variant="text" class="ms-2" color="onBackground" icon="mdi-dots-vertical" size="small">

          </v-btn> -->
        </div>
      </template>
    </v-card-item>

    <v-divider color="primary" opacity="0.01" class="my-0"></v-divider>

    <v-card color="surfaceContainerHigh" variant="flat" class="mb-0 card-shadow card-radius-16" elevation="0"
      @click="isExpanded = !isExpanded">
      <v-card-item>
        <div class="d-flex align-start ">
          <v-card-title class="pb-0 mb-0">
            <h2 class="text-h4 font-weight-medium">{{ demand?.posterShift?.name }}</h2>
          </v-card-title>
          <div class="d-flex align-start flex-column justify-space-between ml-2">
            <v-card-subtitle class="py-0">
              {{ demand?.posterShift?.startTime }} - {{ demand?.posterShift?.endTime }}
            </v-card-subtitle>
            <v-card-subtitle class="py-0 text-caption">Dans équipe {{ getTeamName }}</v-card-subtitle>

          </div>
        </div>



      </v-card-item>
      <div style="position :absolute ; top : 16px ; right : 16px" class="d-flex align-center">

        <v-chip v-if="demand?.type === 'switch'" color="permutation" variant="flat" size="small" rounded="lg"
          prepend-icon="mdi-swap-horizontal">
          Permutation
        </v-chip>
        <v-chip v-if="demand?.type === 'hybrid'" class="hybrid-chip" color="remplacement" variant="flat" size="small"
          rounded="lg" prepend-icon="mdi-account-arrow-left"> <v-icon color="background" class="ml-n1"
            icon="mdi-swap-horizontal"></v-icon>
          Hybride
        </v-chip>
        <v-chip v-if="demand?.type === 'substitution'" color="remplacement" variant="flat" size="small" rounded="lg"
          prepend-icon="mdi-account-arrow-left-outline">
          Remplacement
        </v-chip>
      </div>

    </v-card>

    <v-expand-transition>
      <div v-show="isExpanded">
        <v-card-text class="pa-0 ma-0">




          <!-- <div v-if="demand?.comment" class="mt-4">
            <v-icon color="primary" icon="mdi-comment-text-outline" class="me-2"></v-icon>
            <span class="text-body-2 text-medium-emphasis">{{ demand?.comment }}</span>
          </div> -->
        </v-card-text>

        <v-card-actions class="pa-0">
          <div v-if="demand?.limit?.length > 0">


            <v-chip v-if="smAndDown" rounded="lg" variant="tonal" color="error" size="small"
              @click="showLimitsDialog = true">
              <v-icon>mdi-alert-circle-outline</v-icon>
            </v-chip>
            <v-chip v-else v-for="limit in demand?.limit" rounded="lg" variant="tonal" color="error" size="small">
              <div v-if="limit === 'alreadyWorking'">
                Travaille ce jour
              </div>
              <div v-if="limit === 'insufficientRest'">
                Pas assez de repos {{ demand.rest.before }} {{ demand.rest.after }}
              </div>
              <div v-if="limit === 'consecutiveDaysLimit'">
                Plus de 3 jours consécutifs
              </div>
            </v-chip>
          </div>
          <v-chip rounded="lg" variant="tonal"
            v-if="(demand?.type === 'switch' || demand?.type === 'hybrid') && !smAndDown"
            :color="demand?.canSwitch ? 'permutation' : 'error'" size="small">
            {{ demand?.canSwitch ? 'Peut permuter' : 'Ne peut pas permuter' }}
          </v-chip>


          <v-spacer></v-spacer>
          <v-btn v-if="demand?.status === 'open'" rounded="lg" :variant="isInterested ? 'elevated' : 'outlined'"
            size="small" :slim="true" class="faint-border me-2" color="onBackground"
            :prepend-icon="isInterested ? 'mdi-heart' : 'mdi-heart-outline'" @click="handleInterest"
            :loading="loading.interest">
            Intéressé
          </v-btn>
          <div v-if="demand?.status === 'open'" class="d-flex align-center  justify-end ga-2">
            <v-btn v-if="demand?.status === 'open' && (demand?.type === 'substitution' || demand?.type === 'hybrid')"
              rounded="xl" color="remplacement" size="small" :slim="true" variant="flat" ref="remplacementButton"
              prepend-icon="mdi-account-arrow-left-outline" @click="handleAccept" :loading="loading.accept">
              Remplacer
            </v-btn>
            <div v-if="demand?.status === 'open' && (demand?.type === 'hybrid' || demand?.type === 'switch')">
              <v-btn v-if="demand?.canSwitch" rounded="xl" color="permutation" size="small" :slim="true" variant="flat"
                prepend-icon="mdi-swap-horizontal" @click="handleSwap" :loading="loading.accept">
                Permuter
              </v-btn>
              <v-btn v-else rounded="xl" color="error" size="small" :slim="true" variant="tonal"
                prepend-icon="mdi-cancel" @click="handleSwap" :loading="loading.accept">
                Permuter
              </v-btn>
            </div>


          </div>

          <v-chip v-else-if="demand?.status === 'accepted'" color="success" variant="tonal"
            prepend-icon="mdi-check-circle">
            Acceptée
          </v-chip>
        </v-card-actions>
      </div>
    </v-expand-transition>

    <!-- Dialog de confirmation -->

    <v-dialog v-model="showConfirmationDialog" max-width="500" persistent  style="z-index: 1000000 !important"> 
      <v-card rounded="xl" color="surfaceContainer" class="pa-6" style="z-index: 1000000 !important">
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
          <v-btn color="secondary" variant="text" rounded="xl" @click="showConfirmationDialog = false">
            Annuler
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn v-if="userHasShift && demand?.canSwitch" color="permutation" variant="tonal" rounded="xl"
            @click="handleSwap" :loading="loading.accept">
            Permuter
          </v-btn>
          <v-btn color="remplacement" variant="tonal" rounded="xl" @click="handleConfirmAccept"
            :loading="loading.accept">
            {{ userHasShift ? 'Remplacer' : 'Confirmer' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showConfirmationSwapDialog" max-width="500" style="z-index: 1000000 !important" >
      <v-card rounded="xl" color="surfaceContainer" class="pa-6" style="z-index: 1000000 !important">
        <v-card-title class="text-h5 pa-0">
          Confirmation de permutation
        </v-card-title>
        <v-card-text class="pa-0 mb-6">
          <p>
            Êtes-vous sûr de vouloir permuter ?
          </p>
        </v-card-text>
        <v-card-actions class="pa-0">
          <v-btn color="secondary" variant="text" rounded="xl" @click="showConfirmationSwapDialog = false">
            Annuler
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn color="permutation" variant="tonal" rounded="xl" @click="handleConfirmSwap" :loading="loading.accept">
            Permuter
          </v-btn>
        </v-card-actions>
      </v-card>

    </v-dialog>


    <!-- Dialog pour afficher les points -->
    <v-dialog v-model="showPointsDialog" max-width="500px" attach="body" style="z-index: 1000000 !important">
      <v-card class="pa-6" rounded="xl" style="z-index: 1000000 !important">
        <v-card-title class="text-h6 pa-0 mb-2">
          Points de {{ demand?.posterShift?.name }}
        </v-card-title>
        <v-card-text class="pa-0">
          <v-chip v-for="switchDay in demand?.acceptedSwitches" :key="switchDay" color="permutation" variant="flat"
            size="small" rounded="lg" class="mr-2">
            <span>{{ 'Permutation ' + getDayName(switchDay.shift) }}</span>
            <span class="ml-2">{{ switchDay.points }}</span>
          </v-chip>
          <v-chip v-if="demand?.points > 0 && demand?.type !== 'switch'" color="remplacement" variant="flat"
            size="small" rounded="lg" class="mr-2">
            <span>{{ 'Remplacement' }}</span>
            <span class="ml-2">{{ demand?.points }}</span>
          </v-chip>


        </v-card-text>
      </v-card>
    </v-dialog>


    <!-- Dialog d'informations utilisateur -->
    <v-dialog v-model="showUserDialog" max-width="300" attach="body" style="z-index: 1000000 !important">
      <v-card rounded="xl" color="surfaceContainer" class="pa-4" style="z-index: 1000000 !important">
        <v-card-item class="pa-0">
          <template #prepend>
            <v-avatar
              :image="getUserById(demand?.posterId)?.avatar ? `${API_URL}${getUserById(demand?.posterId)?.avatar}` : 'https://cdn.vuetifyjs.com/images/john-smirk.png'"
              class="me-3"></v-avatar>
          </template>
          <v-card-title class="text-h6 pa-0">
            {{ getUserById(demand?.posterId)?.name }} {{ getUserById(demand?.posterId)?.lastName }}
          </v-card-title>
          <v-card-subtitle class="pa-0">
            {{ getUserById(demand?.posterId)?.email }}
          </v-card-subtitle>
        </v-card-item>

      </v-card>
    </v-dialog>

    <!-- Dialog des limites -->
    <v-dialog v-model="showLimitsDialog" max-width="300" attach="body" style="z-index: 1000000 !important">
      <v-card rounded="xl" color="surfaceContainer" class="pa-4" style="z-index: 1000000 !important">
        <v-card-title class="text-h6 pa-0">
          Limites de la demande
        </v-card-title>
        <v-card-text class="pa-0 mt-4">
          <div v-for="limit in demand?.limit" :key="limit" class="d-flex align-center mb-2">
            <v-icon color="error" class="me-2">mdi-alert-circle-outline</v-icon>
            <span class="text-body-2">
              <template v-if="limit === 'alreadyWorking'">
                Travaille ce jour
              </template>
              <template v-if="limit === 'insufficientRest'">
                Pas assez de repos {{ demand.rest.before }} {{ demand.rest.after }}
              </template>
              <template v-if="limit === 'consecutiveDaysLimit'">
                Plus de 3 jours consécutifs
              </template>
            </span>
          </div>
        </v-card-text>
        <v-card-actions class="pa-0 mt-4">
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="showLimitsDialog = false">
            Fermer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showErrorDialog" max-width="400" attach="body" style="z-index: 1000000 !important">
      <v-card rounded="xl" color="surfaceContainer" class="pa-6" style="z-index: 1000000 !important">
        <v-card-title class="text-h6 pa-0">
          Vous ne pouvez pas permuter
        </v-card-title>
        <v-card-text class="pa-0 mt-4">
          <p>
            L'auteur de cette demande n'accepte pas cette permutation.
          </p>
        </v-card-text>
        <v-card-actions class="pa-0 mt-4">
          <v-btn color="primary" variant="text" @click="showErrorDialog = false">
            Fermer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog pour afficher le commentaire -->
    <v-dialog v-model="showCommentDialog" max-width="500px" attach="body" style="z-index: 1000000 !important">
      <v-card class="pa-6" rounded="xl" style="z-index: 1000000 !important">
        <v-card-title class="text-h6 pa-0">
          Commentaire de {{ demand?.posterShift?.name }}
        </v-card-title>
        <v-card-text class="pa-0">
          {{ demand?.comment }}
        </v-card-text>
        <v-card-actions class="pa-0">
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="showCommentDialog = false">
            Fermer
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
import { useDisplay } from 'vuetify'
import { useRotationStore } from '@/stores/rotationStore' 

const rotationStore = useRotationStore()

const props = defineProps({
  demand: {
    type: Object,
    required: true
  }
})
const { smAndDown } = useDisplay()
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
const showConfirmationSwapDialog = ref(false)
const userHasShift = ref(false)
const userShift = ref(null)
const showErrorDialog = ref(false)

const isInterested = computed(() => {
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
    snackbarStore.showNotification('Remplacement accepté', "onPrimary", "mdi-check")
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
    if (props.demand?.canSwitch) {
      showConfirmationSwapDialog.value = true
    } else {
      showErrorDialog.value = true
    }
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de l\'échange des shifts', 'onError', "mdi-alert-circle-outline")
    console.error('Erreur lors de l\'échange:', error)
  } finally {
    loading.value.accept = false
  }
}

const handleConfirmSwap = async () => {
  loading.value.accept = true
  try {
    await substitutionStore.swapShifts(props.demand._id)
    snackbarStore.showNotification('Échange de shifts effectué avec succès')
    showConfirmationSwapDialog.value = false
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de l\'échange des shifts', 'onError', "mdi-alert-circle-outline")
    console.error('Erreur lors de l\'échange:', error)
  }
  finally {
    loading.value.accept = false
  }
}

const handleInterest = async () => {
  loading.value.interest = true;
  try {
    const response = await substitutionStore.markInterest(props.demand._id)
    if (response.message === 'Interest added') {
      snackbarStore.showNotification('Intérêt marqué', "onPrimary", "mdi-check")
    } else {
      snackbarStore.showNotification('Intérêt retiré', "onPrimary", "mdi-check")
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

const isExpanded = ref(false)
const showUserDialog = ref(false)
const showLimitsDialog = ref(false)
const showCommentDialog = ref(false)
const showPointsDialog = ref(false)

const getDayName = (dayId) => {
  const rotation = rotationStore.rotations.find(rotation => 
    rotation.days?.find(day => day._id === dayId)
  ); 
  if (rotation) {
    const day = rotation.days.find(day => day._id === dayId);
    return day?.name || 'Aucune vacations';
  }
  
  return 'Aucune vacations';
};
</script>

<style scoped>
.dashed {
  border-style: dashed;
}

.faint-border {
  border-color: rgba(243, 243, 243, 0.000005);
}

.card-radius-16 {
  border-radius: 16px !important;
}


/* .card-shadow {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.000096), 0 0 0 1px rgba(121, 121, 121, 0.034), 0 4px 8px rgba(0, 0, 0, 0.00048) !important;
} */

.hybrid-chip {
  background: linear-gradient(to right, rgba(var(--v-theme-permutation), 1), rgba(var(--v-theme-remplacement), 1) 50%);
}

.cursor-pointer {
  cursor: pointer;
}
</style>
