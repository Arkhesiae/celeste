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

        <div
          style="height: 14px; width: 14px; border-radius: 50%; border: 1px solid rgba(var(--v-theme-primary), .02); background-color: rgba(var(--v-theme-primary), .1);"
          class="d-flex align-center justify-center">
          <span class="text-truncate" style="font-size: .6250rem; font-weight: 700; opacity: .8;">{{ posterTeamName
          }}</span>
        </div>
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
        <v-chip class=" text-medium-emphasis px-0" size="small" rounded="pill" variant="text">
          {{ timeSinceCreation }}
        </v-chip>
        <div v-if="demand.isNew" class="new-dot" />
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
            <div>
              <span style="position: relative; top: 1px; font-size: 1.2rem; font-weight: 600;">{{ getShiftName
              }}</span>
            </div>
          </div>
          <div class="d-flex align-start flex-column justify-space-between">
            <HourRange :hours="getShiftHours" :ends-next-day="getShiftEndsNextDay" />
            <div class="py-0 text-caption text-disabled" style="line-height: 1.2; font-size: 11px !important;">
              Dans
              équipe {{ teamName }}
            </div>
            <div v-if="compatibleInfoText" class="text-caption font-weight-medium"
              style="line-height: 1.2; font-size: 10px !important; color: rgb(var(--v-theme-primary));">
              {{ compatibleInfoText }}
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
              <template #activator="{ props }">
                <v-btn v-if="demand.type === 'hybrid' || demand.type === 'switch'" v-bind="props" icon
                  :class="{ 'disabled': !canSwitch, 'main-btn': canSwitch }" flat variant="text" size="small"
                  rounded="xl" @click.stop="handleSwitch">
                  <v-icon>
                    mdi-swap-horizontal
                  </v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </div>
          <div v-if="!isSwitch(demand)" :class="canSwitch ? 'order-1' : 'order-2'">
            <v-btn icon :class="replaceClasses(demand)" flat variant="text" size="small" rounded="xl"
              @click.stop="handleReplace">
              <v-icon>
                mdi-account-arrow-left-outline
              </v-icon>
            </v-btn>
          </div>
        </div>
      </div>
    </div>
    <div class="d-flex align-center justify-end ga-1 text-disabled">
      <v-icon size="12" color="onBackground" class="text-disabled" style="opacity: 0.5;">
        mdi-eye-outline
      </v-icon>
      <span class="text-caption font-weight-medium text-disabled">{{ demand?.seenBy?.length || 0 }}</span>
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
import { useShiftStore } from '@/stores/shiftStore'
import { API_URL } from '@/config/api'
import { useDisplay } from 'vuetify'
import { getDisplayShiftName, getEffectiveShiftTimes } from '@/utils/getEffectiveShiftTimes'
import { formatPairsForDate, formatDateLabel, formatDateSuffix } from '@/utils/compatiblePairsFormat'

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
const shiftStore = useShiftStore()
const date = useDate()
const loading = ref({
  accept: false,
  interest: false
})



const openDetails = () => {
  emit('open-details', props.demand)
}

const getShiftName = computed(() => {
  const ps = props.demand?.posterShift;
  return ps?.shift?.name || ''
})

const getShiftHours = computed(() => {
  const ps = props.demand?.posterShift;
  const effective = ps?.shift ? getEffectiveShiftTimes(ps.shift, ps?.selectedVariation) : null;
  return effective ? { startTime: effective.startTime, endTime: effective.endTime } : { startTime: '', endTime: '' }
})

const getShiftEndsNextDay = computed(() => {
  const ps = props.demand?.posterShift;
  const effective = ps?.shift ? getEffectiveShiftTimes(ps.shift, ps?.selectedVariation) : null;
  return effective?.endsNextDay ?? false
})

const compatibleVariationNames = computed(() => {
  const vars = props.demand?.compatibleVariations;
  if (!vars?.length) return '';
  const baseName = props.demand?.posterShift?.shift?.name || '';
  return vars.map(v => baseName + (v?.name || '')).join(', ');
})

const compatiblePairsText = computed(() => {
  const byDate = props.demand?.compatiblePairsByFetcherDate;
  if (!byDate?.length) return '';
  const demandDate = props.demand?.posterShift?.date;
  const filtered = byDate.filter(({ date, pairs }) => !isUserAlreadyCompatibleForPairsDate(date, pairs));
  if (!filtered.length) return '';
  return filtered.map((entry) => {
    const { date, shiftName, baseShiftName, pairs, totalDemandVariations, totalFetcherVariations } = entry;
    const dateLabel = formatDateLabel(date, demandDate);
    const suffix = formatDateSuffix(dateLabel);
    const pairsText = formatPairsForDate({ pairs, baseShiftName, shiftName, totalDemandVariations, totalFetcherVariations });
    return pairsText ? pairsText + suffix : '';
  }).filter(Boolean).join(' • ');
})

/** Retourne true si l'utilisateur est déjà compatible pour cette date (sa vacation actuelle fait partie des variations compatibles) */
const isUserAlreadyCompatibleForDate = (dateStr, variations) => {
  const map = shiftStore.persistentVacationsMap;
  const vacation = (map?.value ?? map)?.get?.(dateStr);
  if (!vacation || !variations?.length) return false;
  const userVar = vacation.selectedVariation;
  const userKey = !userVar ? 'default' : (userVar._id || userVar)?.toString?.() ?? null;
  return variations.some(v =>
    v?.isDefault ? userKey === 'default' : (v._id || v)?.toString?.() === userKey
  );
};

/** Pour compatiblePairsByFetcherDate : true si la vacation actuelle de l'utilisateur correspond à une fetcherVariation des pairs */
const isUserAlreadyCompatibleForPairsDate = (dateStr, pairs) => {
  const map = shiftStore.persistentVacationsMap;
  const vacation = (map?.value ?? map)?.get?.(dateStr);
  if (!vacation || !pairs?.length) return false;
  const userVar = vacation.selectedVariation;
  const userKey = !userVar ? 'default' : (userVar._id || userVar)?.toString?.() ?? null;
  return pairs.some(p => {
    const fv = p?.fetcherVariation;
    const fvKey = fv?.isDefault ? 'default' : (fv?._id || fv)?.toString?.();
    return fvKey === userKey;
  });
};

const compatibleFetcherVariationNames = computed(() => {
  const byDate = props.demand?.compatibleFetcherVariationsByDate;
  if (!byDate?.length) return '';
  const demandDate = props.demand?.posterShift?.date;
  const filtered = byDate.filter(({ date, variations }) => !isUserAlreadyCompatibleForDate(date, variations));
  if (!filtered.length) return '';
  return filtered.map(({ date, shiftName, variations }) => {
    const names = (variations || [])
      .map(v => v?.isDefault ? shiftName : shiftName + (v?.name || ''))
      .filter(Boolean);
    if (!names.length) return '';
    const dateLabel = date === demandDate ? '' : formatDateLabel(date, demandDate);
    return dateLabel ? `${names.join(', ')} (${dateLabel})` : names.join(', ');
  }).filter(Boolean).join(' • ');
})

const compatibleInfoText = computed(() => {
  const hasPosterVariation = !!props.demand?.posterShift?.selectedVariation;
  if (hasPosterVariation) {
    const names = compatibleFetcherVariationNames.value;
    return names ? `Compatible si vous êtes en : ${names}` : '';
  }
  const pairs = compatiblePairsText.value;
  if (pairs) return `Compatible avec : ${pairs}`;
  const names = compatibleVariationNames.value;
  return names ? `Compatible avec : ${names}` : '';
})

const canSwitch = computed(() => {
  return props.demand?.canSwitch
})

const getTeamById = (teamId) => teamStore.centerTeams.find((team) => team._id === teamId);
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
  if (typeof teamId === 'object' && teamId !== null) {
    return teamId.name;
  }
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
  const formattedDate = date.format(dateString, 'fullDate')
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
  background: linear-gradient(to right, rgba(var(--v-theme-permutation), 1), rgba(var(--v-theme-primary), 1) 50%);
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

.new-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-primary), 0.5);
  box-shadow: 0 0 5px rgba(33, 150, 243, 0.5);
  animation: pulse-blue 2s infinite;
}

@keyframes pulse-blue {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7);
  }

  70% {
    transform: scale(1);
    box-shadow: 0 0 0 5px rgba(33, 150, 243, 0);
  }

  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(33, 150, 243, 0);
  }
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
