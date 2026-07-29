<template>
  <GenericDialog title="Demande " :model-value="modelValue" max-width="600" :show-actions="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <template #content>
      <div class="d-flex flex-column align-center mb-6">
        <h1 class="text-display-medium font-weight-bold">
          {{ getShiftName }}
        </h1>
        <div>
          <HourRange :hours="getShiftHours" :ends-next-day="getShiftEndsNextDay" />
        </div>
      </div>

      <v-card v-ripple="false" :hover="false" rounded="xl" color="background" elevation="0" class="mb-4 pa-4"
        @click="showUserDetails = !showUserDetails">
        <div class="d-flex justify-space-between align-center">
          <h3 class="text-body-large font-weight-medium mb-0" :class="isOwner ? 'text-primary' : ''">
            {{ poster?.name }} {{ poster?.lastName }}
          </h3>
          <div class="d-flex ga-2 align-center">
            <v-avatar size="32" variant="tonal">
              <v-img v-if="getUserById(demand?.posterId)?.avatar"
                :src="`${API_URL}${getUserById(demand?.posterId)?.avatar}`" alt="Avatar" />
              <v-icon v-else size="x-small">
                mdi-account
              </v-icon>
            </v-avatar>
            <v-icon icon="mdi-menu-down" :class="showUserDetails ? 'rotate-180' : ''" size="small" />
          </div>
        </div>
        <v-expand-transition>
          <div v-if="showUserDetails">
            <div class="d-flex flex-column">
              <div class="d-flex ga-1 align-center" @click.stop="copyEmail">
                <span class="pa-0 text-medium-emphasis" style="font-size: 14px;">
                  {{ poster?.email }}
                </span>
                <v-icon size="12">
                  mdi-content-copy
                </v-icon>
              </div>

              <span class="text-body-small opacity-70 font-weight-medium">
                {{ poster?.personalData?.phoneNumber }}
              </span>
            </div>
          </div>
        </v-expand-transition>
      </v-card>

      <v-card v-if="visibleComment" color="surfaceContainerHighest" rounded="xl" elevation="0" class="mb-4 pa-4">
        <div class="d-flex align-start ga-2">
          <v-icon size="18" color="primary" class="mt-1">mdi-comment-text-outline</v-icon>
          <div>
            <span class="text-body-small text-medium-emphasis d-block mb-1">Commentaire</span>
            <span class="text-body-medium font-weight-medium text-onBackground" style="white-space: pre-wrap;">{{ visibleComment }}</span>
          </div>
        </div>
      </v-card>

      <v-card rounded="xl" color="background" elevation="0" class="mb-4 pa-4">
        <div class="d-flex align-center justify-space-between">
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
          <span class="text-disabled text-body-medium font-weight-medium">{{ formatType(demand.type) }}</span>
        </div>
      </v-card>

      <v-card v-if="demand.accepterId" v-ripple="false" :hover="false" color="background" rounded="xl" elevation="0"
        class="mb-4 pa-4" @click="showAccepterDetails = !showAccepterDetails">
        <div class="d-flex justify-space-between align-center ">
          <span class="text-body-medium font-weight-medium text-medium-emphasis">Acceptée par </span>
          <div class="d-flex align-center ga-1">
            <v-avatar size="20" color="surfaceContainer" class="mr-1">
              <v-img v-if="accepter?.avatar" :src="`${API_URL}${accepter?.avatar}`" alt="Avatar" />
              <v-icon v-else size="16">
                mdi-account-check-outline
              </v-icon>
            </v-avatar>
            <div class="d-flex align-center text-left ga-1">
              <span class="font-weight-bold text-truncate" :class="isAccepter ? 'text-primary' : ''"
                style="max-width: 100px; font-size: .75rem;">
                {{ accepterName }}
              </span>
            </div>
            <v-icon icon="mdi-menu-down" :class="showAccepterDetails ? 'rotate-180' : ''" size="small" />
          </div>
        </div>
        <v-expand-transition>
          <div v-if="showAccepterDetails">
            <div class="d-flex flex-column">
              <div class="d-flex ga-1 align-center" @click.stop="copyEmail">
                <span class="pa-0 text-medium-emphasis" style="font-size: 14px;">
                  {{ accepter?.email }}
                </span>
                <v-icon size="12">
                  mdi-content-copy
                </v-icon>
              </div>

              <span class="text-body-small opacity-70 font-weight-medium">
                {{ accepter?.personalData?.phoneNumber }}
              </span>
            </div>
          </div>
        </v-expand-transition>
      </v-card>

      <v-card rounded="xl" elevation="0" class="mb-4 px-4 py-2" color="background">
        <div v-if="demand.type !== 'switch'" class="d-flex justify-space-between py-2 align-center"
          style="height: 48px;">
          <span class="text-body-medium font-weight-medium text-medium-emphasis">Points</span>
          <div class="d-flex ga-1 align-end">
            <span class="text-body-medium font-weight-medium text-disabled">{{ demand.points }}</span>
            <LogoCopy />
          </div>
        </div>
        <v-divider v-if="demand.acceptedSwitches.length > 0 && demand.type === 'hybrid'" />
        <div v-if="demand.acceptedSwitches.length > 0" class="d-flex justify-space-between py-2 align-center"
          style="height: 48px;">
          <span class="text-body-medium font-weight-medium text-medium-emphasis">Permutations</span>
          <div class="d-flex ga-2">
            <v-chip v-for="s in demand.acceptedSwitches" :key="s.shift" rounded="lg" size="small" variant="text">
              <div class="d-flex ga-2 align-center">
                <div class="d-flex ga-0 align-center">
                  <v-icon start size="small">
                    mdi-swap-horizontal
                  </v-icon>
                  <span class="text-body-small font-weight-medium ">{{ getShiftNameById(s.shift) }}</span>
                </div>
                <span class="text-body-medium font-weight-medium text-disabled">{{ s.points }}</span>
              </div>
            </v-chip>
            <LogoCopy />
          </div>
        </div>
      </v-card>

      <v-card color="background" rounded="xl" elevation="0" class="mb-4 pa-4">
        <div class="d-flex justify-space-between align-center text-disabled">
          <span class="text-body-medium font-weight-medium text-medium-emphasis">Date</span>
          <span class="text-body-medium text-disabled">{{ formatDate(demand.posterShift?.date) }}</span>
        </div>
      </v-card>

      <v-card color="background" rounded="xl" elevation="0" class="mb-4 pa-4">
        <div class="d-flex align-center ga-2">
          <v-icon size="12" icon="mdi-eye-outline" />
          <span class="text-body-medium text-medium-emphasis">
            Vue par {{ demand.seenBy?.length }} personnes
          </span>
        </div>
      </v-card>

      <v-card v-if="isMailingEnabled && (isOwner || isAccepter)" color="background" rounded="xl" elevation="0"
        class="mb-4 pa-4">
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center ga-2">
            <v-icon :icon="demand?.mailStatus === 'sent' ? 'mdi-email-check-outline' : 'mdi-email-outline'"
              :color="demand?.mailStatus === 'sent' ? 'success' : 'medium-emphasis'" size="small" />
            <span class="text-body-medium text-medium-emphasis">
              Mail administration : {{ demand?.mailStatus === 'sent' ? 'Envoyé' : 'Non envoyé' }}
            </span>
          </div>
          <v-btn size="small" variant="tonal" color="primary" rounded="xl" :loading="sendingMail"
            @click="sendAdminMailAction">
            {{ demand?.mailStatus === 'sent' ? 'Renvoyer' : 'Envoyer' }}
          </v-btn>
        </div>
      </v-card>

      <v-card v-if="isOwner && hasVariations" color="background" rounded="xl" elevation="0" class="mb-4 pa-4">
        <span class="text-body-medium font-weight-medium text-medium-emphasis d-block mb-2">Vacation élémentaire</span>
        <div class="d-flex flex-wrap ga-2">
          <v-chip size="small" rounded="lg" variant="flat" :color="!hasSelectedVariation ? 'primary' : 'surface'"
            class="cursor-pointer" :loading="loadingVariation" @click="selectVariationForDemand(null)">
            Non précisée
            <template v-if="shiftDefault">
              ({{ shiftDefault.startTime }}-{{ shiftDefault.endTime }})
            </template>
          </v-chip>
          <v-chip v-for="v in variationsList" :key="v._id" size="small" rounded="lg" variant="flat"
            :color="isVariationSelected(v) ? 'primary' : 'surface'" class="cursor-pointer" :loading="loadingVariation"
            @click="selectVariationForDemand(v)">
            {{ v.name }} ({{ v.startTime }}-{{ v.endTime }})
          </v-chip>
        </div>
      </v-card>

      <v-card class="pa-0 rounded-xl" color="background" elevation="0">
        <GraphWrapper :demand="demand" />
      </v-card>

      <div v-if="!isAccepted && !isOwner" class="mx-n6 d-flex flex-column my-4 text-body-medium font-weight-medium">
        <div v-if="demand.type !== 'switch'" v-ripple class="px-6 d-flex align-center justify-space-between py-3 ga-2"
          @click="handleReplacement">
          <span>Remplacer</span>
          <v-icon icon="mdi-chevron-right" />
        </div>
        <v-divider v-if="demand.type === 'hybrid'" class="mx-6" />
        <div v-if="demand.type === 'hybrid' || demand.type === 'switch'" v-ripple
          class="px-6 d-flex align-center justify-space-between py-3 ga-2" :class="{ 'text-disabled': !canSwitch }"
          @click="handleSwitch">
          <div class="d-flex align-center ga-2">
            <span>Permuter</span>
            <v-btn v-if="!canSwitch" icon density="comfortable" variant="text" size="small" color="medium-emphasis">
              <v-icon icon="mdi-information-outline" />
              <v-tooltip activator="parent" location="bottom">
                Cet utilisateur n'accepte pas cette permutation
              </v-tooltip>
            </v-btn>
          </div>
          <v-icon icon="mdi-chevron-right" />
        </div>
      </div>


      <v-card v-if="isOwner || isAccepter" v-ripple rounded="xl" elevation="0" class="mb-4 mt-4" color="error"
        @click="cancelOrWithdraw">
        <v-list bg-color="error">
          <v-list-item v-if="isAccepter" color="error" append-icon="mdi-chevron-right">
            <v-list-item-title class="text-body-medium font-weight-medium">
              Se désister
            </v-list-item-title>
          </v-list-item>
          <v-list-item v-if="isOwner" color="error" append-icon="mdi-chevron-right">
            <v-list-item-title class="text-body-medium font-weight-medium">
              Annuler
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>

      <div class="text-center mt-4 text-disabled text-body-small">
        <span> Créée il y a {{ timeSinceCreation }}

        </span>
      </div>
    </template>
  </GenericDialog>
</template>

<script setup>
import { useUserStore } from '@/stores/userStore';
import { useDate } from 'vuetify'
import { useSnackbarStore } from '@/stores/snackbarStore';
import { API_URL } from '@/config/api';
import { useAuthStore } from '@/stores/authStore';
import { useRotationStore } from '@/stores/rotationStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useShiftStore } from '@/stores/shiftStore';
import { planningModificationService } from '@/services/planningModificationService';
import { getDisplayShiftName, getEffectiveShiftTimes } from '@/utils/getEffectiveShiftTimes';
import { getVisibleDemandComment } from '@/utils/demandComment';

const userStore = useUserStore();
const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();
const date = useDate()
const rotationStore = useRotationStore();
const substitutionStore = useSubstitutionStore();
const shiftStore = useShiftStore();

const emit = defineEmits(['update:modelValue', 'handle-replacement', 'handle-switch', 'withdraw-demand', 'cancel-demand', 'update-demand']);
const showUserDetails = ref(false)



const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  demand: {
    type: Object,
    default: null
  }
})

const visibleComment = computed(() =>
  getVisibleDemandComment(props.demand?.comment)
)

const getUserById = (userId) => userStore.users.find((user) => user._id === userId);

let intervalId

const poster = computed(() => {
  if (!props.demand?.posterId) return null;
  if (typeof props.demand.posterId === 'object' && props.demand.posterId !== null) {
    return props.demand.posterId;
  }
  return getUserById(props.demand.posterId);
});

const accepter = computed(() => {
  if (!props.demand?.accepterId) return null;
  // Si accepterId est déjà un objet (populated), le retourner directement
  if (typeof props.demand.accepterId === 'object' && props.demand.accepterId !== null) {
    return props.demand.accepterId;
  }
  // Sinon, c'est un ID, chercher l'utilisateur
  return getUserById(props.demand.accepterId);
});

const isOwner = computed(() => {
  return props.demand?.posterId === authStore.userData.userId
})

const isAccepter = computed(() => {
  return props.demand?.accepterId === authStore.userData.userId
})

const isAccepted = computed(() => {
  return props.demand?.accepterId
})

const isMailingEnabled = computed(() => substitutionStore.isMailingEnabled);
const sendingMail = ref(false);

const sendAdminMailAction = async () => {
  if (!props.demand?._id) return;
  sendingMail.value = true;
  try {
    const response = await substitutionStore.sendAdminMail(props.demand._id);
    if (response?.demand) {
      emit('update-demand', response.demand);
    }
    snackbarStore.showNotification('Mail d\'administration envoyé avec succès', 'success', 'mdi-email');
  } catch (error) {
    console.error('Erreur lors de l\'envoi du mail:', error);
    snackbarStore.showNotification('Erreur d\'envoi : ' + error.message, 'error', 'mdi-alert');
  } finally {
    sendingMail.value = false;
  }
};

const accepterName = computed(() => {
  return accepter.value?.name + ' ' + accepter.value?.lastName.split(' ').map(word => word[0] + '.') || 'Accepteur';
});

const showAccepterDetails = ref(false)

const getShiftName = computed(() => {
  const ps = props.demand?.posterShift;
  return ps?.shift?.name + (ps?.selectedVariation?.name ? ' - ' + ps?.selectedVariation?.name : '')
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

const canSwitch = computed(() => {
  return props.demand?.canSwitch
})

const variationsList = computed(() => {
  const shift = props.demand?.posterShift?.shift;
  return shift?.variations;
});

const hasVariations = computed(() => variationsList.value.length > 0);

const hasSelectedVariation = computed(() => !!props.demand?.posterShift?.selectedVariation);

const shiftDefault = computed(() => {
  const shift = props.demand?.posterShift?.shift;
  return shift?.default || null;
});

const isVariationSelected = (variation) => {
  const current = props.demand?.posterShift?.selectedVariation;
  if (!current || !variation) return false;
  return (current._id || current)?.toString?.() === (variation._id || variation)?.toString?.();
};

const loadingVariation = ref(false);

const toDateKey = (d) => {
  if (!d) return null;
  const s = typeof d === 'string' ? d : d?.toISOString?.();
  return s?.split?.('T')[0] ?? null;
};

const selectVariationForDemand = async (variation) => {
  const dateKey = toDateKey(props.demand?.posterShift?.date);
  const shiftId = props.demand?.posterShift?.shift?._id;
  if (!dateKey || !shiftId) return;
  loadingVariation.value = true;
  try {
    const data = await planningModificationService.registerModification({
      type: 'selectedVariation',
      date: dateKey,
      selectedVariation: variation ? variation._id : null,
      shift: shiftId
    });
    if (data?.userShift?.[0]) {
      shiftStore.addEntry(data.userShift[0], toDateKey(data.userShift[0].date));
    }
    if (data?.updatedDemand) {
      substitutionStore.updateDemandInStore(data.updatedDemand);
      emit('update-demand', data.updatedDemand);
    }
    substitutionStore.recategorizeSubstitutions(dateKey);
    snackbarStore.showNotification('Vacation précisée', 'onPrimary', 'mdi-check');
  } catch (err) {
    snackbarStore.showNotification('Erreur : ' + err.message, 'onError', 'mdi-alert-circle-outline');
  } finally {
    loadingVariation.value = false;
  }
};

const timeSinceCreation = computed(() => {
  if (!props.demand?.createdAt) return ''

  const createdAt = new Date(props.demand.createdAt).getTime()
  const diffInMinutes = Math.floor((now.value - createdAt) / 60000)

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} heure${diffInHours > 1 ? 's' : ''}`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} jour${diffInDays > 1 ? 's' : ''}`
})


const formatDate = (dateString) => {
  if (!dateString) return ''
  // const currentYear = new Date().getFullYear()
  // const dateYear = new Date(dateString).getFullYear()
  const formattedDate = date.format(dateString, 'fullDate')
  return formattedDate
}


const formatType = (type) => {
  switch (type) {
    case 'switch':
      return 'Permutation'
    case 'substitution':
      return 'Remplacement'
    case 'hybrid':
      return 'Remplacement ou permutation'
    default:
      return type
  }
}

const getShiftNameById = (shift) => {
  if (shift.name) return shift.name;
  const rotation = rotationStore.rotations.find(rotation =>
    rotation.days?.find(day => day._id === shift._id)
  );
  if (rotation) {
    const day = rotation.days.find(day => day._id === shift._id);
    return day?.name || 'No shift';
  }
  return 'No shift';
};

const now = ref(Date.now())

onMounted(() => {
  intervalId = setInterval(() => {
    now.value = Date.now()
  }, 60000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})


watch(() => props.modelValue, async (newVal) => {
  if (newVal && props.demand && props.demand.isNew) {
    try {
      await substitutionStore.consultDemand(props.demand._id);
    } catch (error) {
      console.error('Erreur lors du marquage comme consulté:', error);
    }
  }
})


const handleReplacement = () => {
  emit('handle-replacement', props.demand)
}

const handleSwitch = () => {
  emit('handle-switch', props.demand)
}


const cancelOrWithdraw = () => {
  if (isAccepter.value) {
    withdrawDemand()
  } else if (isOwner.value) {
    cancelDemand()
  } else {
    snackbarStore.showSnackbar('Vous n\'êtes pas le propriétaire ou l\'accepteur', 'error')
  }
}

const cancelDemand = () => {
  emit('cancel-demand', props.demand)
}

const withdrawDemand = () => {
  emit('withdraw-demand', props.demand)
}


const copyEmail = async () => {
  try {

    await navigator.clipboard.writeText(poster.value?.email);
    snackbarStore.showNotification('Email copié dans le presse-papiers', 'success', 'mdi-check');

  } catch (error) {
    console.error('Erreur lors de la copie :', error);
    snackbarStore.showNotification('Erreur lors de la copie de l\'email', 'error', 'mdi-alert-circle');
  }
};
</script>

<style scoped>
.list-item {
  height: 48px;
  padding: 4px 16px;
}

.dot-green {
  position: relative;
  background-color: rgb(75, 255, 75);
}

.dot-green::after {
  content: "";
  z-index: -1;
  position: absolute;
  top: -3px;
  left: -3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: rgb(147, 243, 147);
  filter: blur(4px);
}

.dot-red {
  position: relative;
  background-color: rgb(255, 75, 75);
}

.dot-red::after {
  content: "";
  z-index: -1;
  position: absolute;
  top: -3px;
  left: -3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: rgb(243, 147, 147);
  filter: blur(4px);
}

.rotate-180 {
  transform: rotate(180deg);
}
</style>
