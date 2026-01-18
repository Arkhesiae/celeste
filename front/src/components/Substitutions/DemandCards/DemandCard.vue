<template>
  <div>
    <div class="d-flex justify-space-between">
      <div class="d-flex align-center mr-3 ga-2">
        <v-avatar size="16" variant="tonal">
          <v-img v-if="getUserById(demand?.posterId)?.avatar"
            :src="`${API_URL}${getUserById(demand?.posterId)?.avatar}`" alt="Avatar" />
          <v-icon v-else size="12">
            mdi-account
          </v-icon>
        </v-avatar>
        <span style="font-weight: 800; font-size: .75rem;">{{ posterName
        }}</span>
        <span class="text-truncate" style="max-width: 80px; font-size: .70rem; font-weight: 600;">({{
          posterTeamName }})</span>
        <div class="small-dot" />
        <span class="text-caption font-weight-medium text-medium-emphasis">{{ formatDate(demand?.posterShift?.date)
        }}</span>

        <v-icon v-if="demand?.comment" size="x-small" color="onBackground" style="opacity: 0.8;">
          mdi-comment-text-outline
        </v-icon>

        <v-icon v-if="isInterested" size="x-small" color="primary" style="opacity: 0.8;">
          mdi-heart
        </v-icon>
      </div>

      <div class="d-flex align-center ga-2">
        <v-chip class=" text-medium-emphasis px-1 font-weight-medium" prepend-icon="mdi-eye-outline" size="small"
          rounded="pill" variant="text">
          {{ demand?.seenBy?.length || 0 }}
        </v-chip>
        <v-chip class=" text-medium-emphasis px-0" size="small" rounded="pill" variant="text">
          {{ timeSinceCreation }}
        </v-chip>
      </div>
    </div>

    <div v-long-press:500="handleInterest" v-ripple
      class="long-press-target d-flex align-center bg-surfaceContainer demand justify-space-between pr-4 cursor-pointer"
      @click="openDetails" @contextmenu.prevent>
      <div class=" pa-4 pl-8 pr-0 flex-shrink-0 position-relative">
        <div class="d-flex align-center flex-shrink-0   ga-3">
          <div class="pb-0 mb-0 d-flex align-center ga-2">
            <div class="d-flex align-center ga-2">
              <div class="d-flex align-center " style="position: relative; width: 20px;">
                <div v-if="demand?.type === 'switch'" class="d-flex align-center ga-2">
                  <v-icon class="" style="top: 1px; font-size: 14px;" icon="mdi-swap-horizontal" />
                </div>
                <div v-if="demand?.type === 'substitution'" class="d-flex align-center ga-2">
                  <v-icon class="" style="top: 1px; font-size: 14px;" icon="mdi-account-arrow-left-outline " />
                </div>
                <div v-if="demand?.type === 'hybrid'" class="d-flex align-center ga-2 position-relative">
                  <v-icon class="ml-n1" style="top: 1px; font-size: 14px;" icon="mdi-account-arrow-left-outline " />
                  <v-icon class="ml-n2" style="top: 2px; font-size: 14px; position: absolute; left: 10px;"
                    icon="mdi-swap-horizontal" />
                </div>
              </div>
            </div>
            <div> <span style="position: relative; top: 1px; font-size: 1rem; font-weight: 600;">{{ getShiftName
                }}</span></div>
          </div>
          <div class="d-flex align-start flex-column justify-space-between">
            <div>
              <span class="text-caption font-weight-bold text-medium-emphasis">{{ getShiftHours.startTime }} - {{
                getShiftHours.endTime
              }}</span>
              <span v-if="getShiftEndsNextDay" class="text-caption font-weight-bold opacity-50 ml-1"
                style="font-size: 10px !important; top: -2px; position: relative;">+1</span>
            </div>
            <div class="py-0 text-caption text-disabled" style="margin-top: -8px; font-size: 11px !important;">
              Dans
              équipe {{ teamName }}
            </div>
          </div>
          <v-chip variant="outlined" size="small" rounded="lg" class="font-weight-bold point-chip mr-2">
            <LogoCopy color="onBackground" style="top:-2px; position: relative; transform: scale(0.87);" />
            <span style="font-size: .875rem; font-weight: 600;">{{ totalPoints }}</span>
            <v-icon v-if="hasVariablePoints" color="primary" style="position: relative; top: 0px;" icon="mdi-tune" />
          </v-chip>
        </div>
      </div>

      <div class="d-flex align-center ga-2">
        <v-icon v-if="smAndDown" size="small">
          mdi-chevron-right
        </v-icon>
        <div v-else class="d-flex align-center ga-2">
          <div :class="canSwitch ? 'order-2' : 'order-1'">
            <v-tooltip location="top" text="Cet utilisateur n'accepte pas cette permutation" :disabled="canSwitch">
              <template v-slot:activator="{ props }">
                <v-btn v-bind="props" @click.stop="handleSwitch" icon
                  v-if="demand.type === 'hybrid' || demand.type === 'switch'" :class="{ 'disabled': !canSwitch, 'main-btn': canSwitch }"
                  flat variant="text" size="small" rounded="xl">
                  <v-icon>
                    mdi-swap-horizontal
                  </v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </div>
          <div v-if="!isSwitch(demand)" :class="canSwitch ? 'order-1' : 'order-2'">
            <v-btn @click.stop="handleReplace" icon :class="replaceClasses(demand)" flat variant="text" size="small" rounded="xl">
              <v-icon>
                mdi-account-arrow-left-outline
              </v-icon>
            </v-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
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

const emit = defineEmits(['accept', 'interest', 'update:demand', 'open-details', 'handle-replacement', 'handle-switch'])


const { smAndDown } = useDisplay()
const authStore = useAuthStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()
const teamStore = useTeamStore()
const substitutionStore = useSubstitutionStore()
const date = useDate()
const loading = ref({
  accept: false,
  interest: false
})



const openDetails = () => {
  emit('open-details', props.demand)
}

const getShiftName = computed(() => {
  return props.demand?.posterShift?.shift?.name || props.demand?.posterShift?.name || ''
})

const getShiftHours = computed(() => {
  return { startTime: props.demand?.posterShift?.shift?.default?.startTime, endTime: props.demand?.posterShift?.shift?.default?.endTime }
})

const getShiftEndsNextDay = computed(() => {
  return props.demand?.posterShift?.shift?.default?.endsNextDay
})

const canSwitch = computed(() => {
  return props.demand?.canSwitch
})

const getTeamById = (teamId) => teamStore.teams.find((team) => team._id === teamId);
const getUserById = (userId) => userStore.users.find((user) => user._id === userId);

const poster = computed(() => {
  if (!props.demand?.posterId) return null;
  if (typeof props.demand.posterId === 'object' && props.demand.posterId !== null) {
    return props.demand.posterId;
  }

  return getUserById(props.demand.posterId);
});

const posterName = computed(() => {
  return poster.value?.name + ' ' + poster.value?.lastName.split(' ').map(word => word[0] + '.') || 'Demandeur';
});

const posterTeamName = computed(() => {
  const teamId = poster.value?.currentTeam?.teamId;
  return teamId ? getTeamById(teamId)?.name : 'N/A';
});

const teamName = computed(() => {
  if (!props.demand?.posterShift?.teamId) return null;
  if (typeof props.demand.posterShift.teamId === 'object' && props.demand.posterShift.teamId !== null) {
    return props.demand.posterShift.teamId.name;
  }

  return getTeamById(props.demand.posterShift.teamId)?.name;
});



const replaceClasses = (demand) => {
  return {
    'secondary-btn': demand?.canSwitch,
    'main-btn': !demand?.canSwitch,
  }
}



let intervalId = null

const isSwitch = (demand) => demand?.type === 'switch'
const isHybrid = (demand) => demand?.type === 'hybrid'

const hasVariablePoints = computed(() => {
  const demand = props.demand
  if (!demand) return false

  if (isSwitch(demand)) {
    const points = demand.acceptedSwitches.map(s => s.points)
    return !points.every(p => p === points[0]) // true if values differ
  }

  if (isHybrid(demand)) return true

  return false
})

const totalPoints = computed(() => {
  const demand = props.demand
  if (!demand) return 0

  if (isSwitch(demand)) {
    return hasVariablePoints.value ? '' : '0'
  }

  if (isHybrid(demand)) return demand.points

  return demand.points || 0
})

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

const timeSinceCreation = computed(() => {
  if (!props.demand?.createdAt) return ''

  const createdAt = new Date(props.demand.createdAt).getTime()
  const diffInMinutes = Math.floor((now.value - createdAt) / 60000)

  if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`
})


const now = ref(Date.now())

onMounted(() => {
  intervalId = setInterval(() => {
    now.value = Date.now()
  }, 60000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})



const isInterested = computed(() => {
  return props.demand?.interested?.includes(authStore.userData.userId)
})

const handleInterest = async () => {
  loading.value.interest = true;
  try {
    const response = await substitutionStore.markInterest(props.demand._id)
    if (response.message === 'Interest added') {
      snackbarStore.showNotification('Intérêt marqué', "onPrimary", "mdi-check")
    }
  } catch (error) {
    snackbarStore.showNotification('Erreur lors du marquage de l\'intérêt : ' + error.message, 'onError', "mdi-alert-circle-outline")
    console.error('Erreur lors du marquage de l\'intérêt:', error)
  } finally {
    loading.value.interest = false
  }
}

const handleSwitch = () => {
  emit('handle-switch', props.demand)
}

const handleReplace = () => {
  emit('handle-replacement', props.demand)
}

</script>

<style>
.dashed {
  border-style: dashed;
}

.faint-border {
  border-color: rgba(243, 243, 243, 0.000005);
}

.demand {
  border-radius: 20px !important;
}

.hybrid-chip {
  background: linear-gradient(to right, rgba(var(--v-theme-permutation), 1), rgba(var(--v-theme-remplacement), 1) 50%);
}

.main-btn {
  border: 1px solid rgba(var(--v-theme-primary), 0.1) !important;
}

.dot-big {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-onBackground), 0.5);
}


.small-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-onBackground), 0.5);

}

.point-chip {
  border: 1px solid rgba(var(--v-theme-onBackground), 0.01) !important;
  background: transparent !important;
  color: rgba(var(--v-theme-primary), 0.99) !important;
}

.cursor-pointer {
  cursor: pointer;
}

.long-press-target {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: pan-y;
}

.disabled {
  opacity: 0.5;

}

.order-1 {
  order: 1;
}

.order-2 {
  order: 2;
}
</style>
