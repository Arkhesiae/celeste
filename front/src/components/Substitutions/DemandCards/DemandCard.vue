<template>
  <v-card color="transparent" rounded="sm" elevation="0">
    <v-card-item class="pa-0 my-1">
      <v-card-title class="text-body-2 d-flex align-center">
        <div class="d-flex align-center opacity-50">
        <v-icon icon="mdi-calendar" size="16" class="mx-2 " color="onSurface"></v-icon>
        </div>
        <span class="opacity-70 font-weight-bold" style="font-weight: 800;">
          {{ formatDate(demand?.posterShift?.date) }}
        </span>
        <v-chip v-if="timeSinceCreation && !xs" class="ms-2" rounded="pill" size="x-small" variant="flat" color="surfaceContainerHigh">
          {{ timeSinceCreation }}
        </v-chip>
      </v-card-title>
      <template #append>
        <div class="d-flex align-center ga-2">
          <div class="d-flex align-center ga-2 cursor-pointer" v-if="!smAndDown && !small" @click="showUserDialog = true">
            <v-avatar size="24" variant="tonal">
              <v-img v-if="getUserById(demand?.posterId)?.avatar"
                :src="`${API_URL}${getUserById(demand?.posterId)?.avatar}`" alt="Avatar" />
              <v-icon size="x-small" v-else>mdi-account</v-icon>
            </v-avatar>
            <span v-if="!smAndDown && !small" class="text-medium-emphasis font-weight-bold text-caption me-2">
              {{ getUserById(demand?.posterId)?.name }} {{ abreviatedLastname }} ({{ getTeamName }})
            </span>



          </div>
          <div>
            <div class="d-flex align-center justify-end">
              <v-chip v-if="demand?.type === 'switch'" class="type-chip " color="surfaceContainerHighest" variant="flat"
                size="small" rounded="lg">
                <v-icon class="" style="top: 1px; font-size: 16px;" icon="mdi-swap-horizontal"></v-icon>
                <span v-if="!smAndDown && !small">Permutation</span>
              </v-chip>
              <v-chip v-if="demand?.type === 'hybrid'" class="type-chip " color="surfaceContainerHighest" variant="flat"
                size="small" rounded="lg">
                <v-icon class="ml-n1" icon="mdi-account-arrow-left-outline "></v-icon>
                <v-icon class="ml-n2" style="top: 1px; font-size: 16px;" icon="mdi-swap-horizontal"></v-icon>
                <span v-if="!smAndDown && !small">Hybride</span>
              </v-chip>
              <v-chip v-if="demand?.type === 'substitution'" class="type-chip" color="surfaceContainerHighest"
                variant="flat" size="small" rounded="lg">
                <v-icon class="" icon="mdi-account-arrow-left-outline "></v-icon>
                <span v-if="!smAndDown && !small">Remplacement</span>
              </v-chip>


            </div>


          </div>

          <div class="d-flex align-center">
            <v-chip variant="flat" size="small" rounded="lg" class="font-weight-bold point-chip"
              @click.stop="showPointsDialog = true" color="surfaceContainerHigh">
              <LogoCopy color="remplacement" style="top:-2px; position: relative; " />
              <span v-if="demand?.type === 'switch' && demand?.acceptedSwitches.length > 0"> </span>
              <span v-else>
                {{ demand?.points }}
              </span>
              <v-icon v-if="demand?.acceptedSwitches.length > 0" icon="mdi-tune-variant"></v-icon>
            </v-chip>
          </div>
          <v-chip v-if="demand?.comment" class=" text-medium-emphasis " size="small" rounded="pill" color="remplacement"
            variant="flat" @click="showCommentDialog = true" style="cursor: pointer">
            <v-icon>mdi-comment-text-outline</v-icon>
          </v-chip>
          <v-chip class=" text-medium-emphasis px-3" prepend-icon="mdi-eye-outline" size="small" rounded="pill"
            color="surfaceContainerHigh" variant="flat">
            {{ demand?.seenBy?.length || 0 }}
          </v-chip>
          <!-- <v-btn variant="text" class="ms-2" color="onBackground" icon="mdi-dots-vertical" size="small">

          </v-btn> -->
        </div>
      </template>
    </v-card-item>

    <v-divider color="primary" opacity="0.01" class="my-0"></v-divider>

   
      <div class="d-flex align-center bg-surfaceContainer rounded-xl justify-space-between pr-4 cursor-pointer" @click="isExpanded = !isExpanded">
        <div class=" pa-4 pl-8 pr-0 flex-shrink-0 position-relative" >
          <div class="d-flex align-center flex-shrink-0   ga-3">
            <div class="pb-0 mb-0 flex-shrink-0">
              <span class="text-h5 font-weight-medium" style="position: relative; top: 1px;">{{ getShiftName }}</span>
            </div>
            <div class="d-flex align-start flex-column justify-space-between">
              <div>
                <span class="text-caption font-weight-bold">{{ getShiftHours.startTime }} - {{ getShiftHours.endTime
                }}</span>
                <span class="text-caption font-weight-bold opacity-50 ml-1"
                  style="font-size: 10px !important; top: -2px; position: relative;"
                  v-if="getShiftEndsNextDay">+1</span>
              </div>
              <div class="py-0 text-caption opacity-70" style="margin-top: -8px; font-size: 11px !important;">Dans
                équipe {{
                getTeamName }}</div>

            </div>



          </div>




        </div>


        <div class="d-flex justify-end flex-shrink-0 flex-column ga-2">
          <div v-if="smAndDown || small" class="d-flex align-center ga-2 justify-end cursor-pointer" @click.stop="showUserDialog = true">
            <v-avatar size="24" variant="tonal">
              <v-img v-if="getUserById(demand?.posterId)?.avatar"
                :src="`${API_URL}${getUserById(demand?.posterId)?.avatar}`" alt="Avatar" />
              <v-icon size="x-small" v-else>mdi-account</v-icon>
            </v-avatar>
            <span class="text-medium-emphasis font-weight-bold text-caption me-2">
              {{ getUserById(demand?.posterId)?.name }} {{ !xs ? getUserById(demand?.posterId)?.lastName : abreviatedLastname }} ({{ getTeamName }})
            </span>



          </div>
        </div>
      </div>
 

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
              <div class="d-flex align-center ga-1">
                <v-icon>mdi-alert-circle-outline</v-icon>
                <span style="font-size: 11px;">{{demand?.limit?.length}}</span>
              </div>

            </v-chip>
            <div v-else class="d-flex align-center ga-2">
              <v-tooltip style="z-index: 3001 !important" class="rounded-lg" v-for="limit in demand?.limit"
                :text="basicRules.find(rule => rule.code === limit)?.text" location="top">
                <template #activator="{ props }">
                  <v-chip rounded="lg" variant="tonal" color="error" size="small" v-bind="props">
                    <v-icon class="mr-1">{{basicRules.find(rule => rule.code === limit)?.icon}}</v-icon>
                    {{basicRules.find(rule => rule.code === limit)?.shortName}}
                  </v-chip>
                </template>
              </v-tooltip>

            </div>
          </div>
          <!-- <v-chip rounded="lg" variant="tonal"
            v-if="(demand?.type === 'switch' || demand?.type === 'hybrid') && !smAndDown"
            :color="demand?.canSwitch ? 'permutation' : 'error'" size="small">
            {{ demand?.canSwitch ? 'Peut permuter' : 'Ne peut pas permuter' }}
          </v-chip> -->


          <v-spacer></v-spacer>
          <v-btn v-if="demand?.status === 'open'" rounded="lg" :variant="isInterested ? 'elevated' : 'outlined'"
            size="small" :slim="true" class="faint-border me-2" color="onBackground"
            :prepend-icon="isInterested ? 'mdi-heart' : 'mdi-heart-outline'" @click="handleInterest"
            :loading="loading.interest">
            Intéressé
          </v-btn>
          <div v-if="demand?.status === 'open'" class="d-flex align-center  justify-end ga-2">
            <v-btn v-if="demand?.status === 'open' && (demand?.type === 'substitution' || demand?.type === 'hybrid')"
              rounded="lg" color="onBackground" size="small" :slim="true" variant="flat" ref="remplacementButton"
              prepend-icon="mdi-account-arrow-left-outline" @click="handleAccept" :loading="loading.accept">
              Remplacer
            </v-btn>
            <div v-if="demand?.status === 'open' && (demand?.type === 'hybrid' || demand?.type === 'switch')">
              <v-btn v-if="demand?.canSwitch" rounded="lg" color="surfaceContainerHigh" size="small" :slim="true"
                variant="flat" prepend-icon="mdi-swap-horizontal" @click="handleSwap" :loading="loading.accept">
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

    <v-dialog v-model="showConfirmationDialog" max-width="500" persistent style="z-index: 1000000 !important">
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

    <v-dialog v-model="showConfirmationSwapDialog" max-width="500" style="z-index: 1000000 !important">
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
    <v-dialog v-model="showPointsDialog" max-width="300px" attach="body" style="z-index: 1000000 !important">
      <v-card class="pa-6" rounded="xl" style="z-index: 1000000 !important">
        <v-card-title class="text-h6 pa-0 mb-2">
          Points de {{ shift?.name }}
        </v-card-title>
        <v-card-text class="pa-0 d-flex flex-column ga-2 align-center">
          <span class="text-overline" v-if="demand?.acceptedSwitches.length > 0"> Permutation(s) </span>
          <v-chip v-for="switchDay in demand?.acceptedSwitches" :key="switchDay" color="surfaceContainerHigh"
            variant="flat" size="small" rounded="lg" class="font-weight-bold point-chip flex-shrink-1">
            <v-icon class="mr-1" icon="mdi-swap-horizontal"></v-icon>
            <span class="font-weight-bold mr-2">{{ getDayName(switchDay.shift) }}</span>
            <LogoCopy color="remplacement" style="top:-2px; position: relative; " />
            <span class="font-weight-bold">{{ switchDay.points }}</span>
          </v-chip>
          <span class="text-overline" v-if="demand?.points > 0 && demand?.type !== 'switch'"> Remplacement </span>
          <v-chip v-if="demand?.points > 0 && demand?.type !== 'switch'" color="surfaceContainerHigh" variant="flat"
            size="small" rounded="lg" class="font-weight-bold point-chip flex-grow-1">
            <v-icon class="mr-1" icon="mdi-account-arrow-left-outline"></v-icon>
            <span>{{ }}</span>
            <LogoCopy color="remplacement" style="top:-2px; position: relative; " />
            <span class="font-weight-bold">{{ demand?.points }}</span>
          </v-chip>


        </v-card-text>
      </v-card>
    </v-dialog>


    <!-- Dialog d'informations utilisateur -->
    <v-dialog v-model="showUserDialog" max-width="300" attach="body" style="z-index: 1000000 !important">
      <v-card rounded="xl" color="surfaceContainer" class="pa-6" style="z-index: 1000000 !important">
        <div class="d-flex flex-column  ga-2 pl-3">
        <div class="d-flex align-center ga-2 ">
   
            <v-avatar size="32" variant="tonal" class="">
              <v-img v-if="getUserById(demand?.posterId)?.avatar"
                :src="`${API_URL}${getUserById(demand?.posterId)?.avatar}`" alt="Avatar" />
              <v-icon size="x-small" v-else>mdi-account</v-icon>
            </v-avatar>
     
          <span class="text-h7 font-weight-medium pa-0">
            {{ getUserById(demand?.posterId)?.name }} {{ getUserById(demand?.posterId)?.lastName }} ({{ getTeamName }})
          </span>
          </div>

          <div>
          <v-card-subtitle class="pa-0">
            {{ getUserById(demand?.posterId)?.email }}
          </v-card-subtitle>
          <span class="text-caption opacity-70 font-weight-medium">  
            {{ getUserById(demand?.posterId)?.personalData?.phoneNumber}}
          </span>
          </div>
          </div>

      </v-card>
    </v-dialog>

    <!-- Dialog des limites -->
    <v-dialog v-model="showLimitsDialog" max-width="300" attach="body" style="z-index: 1000000 !important">
      <v-card rounded="xl" color="surfaceContainer" class="pa-4" style="z-index: 1000000 !important">
        <v-card-title class="text-h6 pa-0">
          Limites de la demande
        </v-card-title>
        <v-card-text class="pa-0 mt-4">
          <div v-for="limit in demand?.limit" :key="limit" class="d-flex align-center mb-2 ga-2">
            <v-icon size="16" color="error" >{{basicRules.find(rule => rule.code === limit)?.icon}}</v-icon>
            <span class="text-body-2">
              {{basicRules.find(rule => rule.code === limit)?.shortName}}

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
          Commentaire de {{ shift?.name }}
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
  },
  small: {
    type: Boolean,
    default: false
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
const { xs } = useDisplay()

console.log(props.demand.limit)


const getShiftName = computed(() => {
  return props.demand?.posterShift?.shift?.name || props.demand?.posterShift?.name || ''
})

const getShiftHours = computed(() => {
  return { startTime: props.demand?.posterShift?.shift?.default?.startTime, endTime: props.demand?.posterShift?.shift?.default?.endTime }
})

const getShiftEndsNextDay = computed(() => {
  return props.demand?.posterShift?.shift?.default?.endsNextDay
})

const abreviatedLastname = computed(() => {
  const lastName = getUserById.value(props.demand?.posterId)?.lastName
  if (!lastName) return ''
  
  return lastName
    .split(/[\s-]+/)
    .map(word => word[0]+'.')
    .join('')
})

let intervalId = null

const shift = computed(() => {
  if (props.demand?.posterShift?.shift) {
    return props.demand?.posterShift?.shift;
  }
  else {
    return props.demand?.posterShift;
  }
});

const snackbarStore = useSnackbarStore()

const teamStore = useTeamStore()

const formatDate = (dateString) => {
  if (!dateString) return ''
  
  const currentYear = new Date().getFullYear()
  const dateYear = new Date(dateString).getFullYear()
  let formattedDate = date.format(dateString, 'fullDate')
  console.log(formattedDate)


  if (dateYear !== currentYear) {
    return formattedDate
  } else {
    return date.format(dateString, 'normalDate')
  }
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
// Règles de base avec propriété computed
const basicRules = [
  {
    id: 0,
    shortName: 'Travaille ce jour',
    icon: 'mdi-account-arrow-left-outline',
    text: 'Une vacation est déjà prévue pour ce jour',
    code: 'alreadyWorking'
  },
  {
    id: 1,
    shortName: 'Pas assez de repos',
    icon: 'mdi-clock-outline',
    text: 'Une période de repos minimale de 11 heures après une période de service.',
    code: 'insufficientRest'
  },
  {
    id: 2,
    shortName: 'Repos <35h consécutives/7j',
    icon: 'mdi-calendar-week',
    text: 'Un agent doit bénéficier d\'une période de repos de 35 heures consécutives pour toute période de 7 jours glissants.',
    code: '35limit'
  },
  {
    id: 3,
    shortName: 'Travail >48h max/7j',
    icon: 'mdi-chart-timeline-variant',
    text: 'Une durée hebdomadaire du travail effectif ne pouvant excéder ni 48 heures sur 7 jours glissants',
    code: '48hLimit'
  }
]

// Règles supplémentaires avec propriété computed
const additionalRules = [
  {
    id: 4,
    icon: 'mdi-calendar-remove',
    text: 'Un agent ne peut travailler plus de 5 jours consécutifs, temps de trajet exclu.',
    computed: false
  },
  {
    id: 5,
    icon: 'mdi-bed',
    text: 'Un agent bénéficie d\'une période de repos minimale de 12 heures après une vacation de contrôle de nuit.',
    computed: false
  },
  {
    id: 6,
    icon: 'mdi-bread-slice',
    text: 'Un agent ne peut exercer plus de deux vacations de contrôle consécutives empiétant sur la plage 00 h 00-06 h 00.',
    computed: false
  },
  {
    id: 7,
    icon: 'mdi-moon-waning-crescent ',
    text: 'Un agent bénéficie d\'une période de repos minimale de 48 heures après deux vacations consécutives de contrôle de nuit.',
    computed: false
  }
]


const isInterested = computed(() => {
  return props.demand?.interested?.includes(authStore.userData.userId)
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
    snackbarStore.showNotification('Remplacement accepté', "onRemplacement", "mdi-account-arrow-left-outline")
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
    snackbarStore.showNotification('Échange de shifts effectué avec succès', "onRemplacement  ", "mdi-swap-horizontal")
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
  return props.demand?.posterShift?.teamId.name
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

<style>
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
