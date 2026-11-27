<template>
  <GenericDialog
    v-model="modelValue"
    title="Demande "
    max-width="800"
    :show-actions="false"
  >
    <template #content>
      <!-- Après avoir ouvert une demande liée : retour à celle d'où l'on vient -->
      <v-btn v-if="trail.length" variant="text" size="small" prepend-icon="mdi-arrow-left" class="mb-2" @click="backToChild">
        Retour à la demande
      </v-btn>

      <div class="d-flex flex-column align-center mb-6">
        <h1 class="text-display-medium font-weight-bold">
          {{ getShiftName }}
        </h1>
        <div>
          <HourRange :hours="getShiftHours" :ends-next-day="getShiftEndsNextDay" />
        </div>
      </div>

      <v-card
        v-ripple="false"
        :hover="false"
        color="background"
        elevation="0"
        class="mb-4 pa-4"
        @click="showUserDetails = !showUserDetails"
      >
        <div class="d-flex justify-space-between align-center">
          <h3 class="text-body-large font-weight-medium mb-0" :class="isOwner ? 'text-primary' : ''">
            {{ poster?.name }} {{ poster?.lastName }}
          </h3>
          <div class="d-flex ga-2 align-center">
            <v-avatar size="32" variant="tonal">
              <v-img
                v-if="getUserById(demand?.posterId)?.avatar"
                :src="`${API_URL}${getUserById(demand?.posterId)?.avatar}`"
                alt="Avatar"
              />
              <v-icon v-else size="x-small"> mdi-account </v-icon>
            </v-avatar>
            <v-icon icon="mdi-menu-down" :class="showUserDetails ? 'rotate-180' : ''" size="small" />
          </div>
        </div>
        <v-expand-transition>
          <div v-if="showUserDetails">
            <div class="d-flex flex-column">
              <div class="d-flex ga-1 align-center" @click.stop="copyEmail">
                <span class="pa-0 text-medium-emphasis" style="font-size: 14px">
                  {{ poster?.email }}
                </span>
                <v-icon size="12"> mdi-content-copy </v-icon>
              </div>

              <span class="text-body-small opacity-70 font-weight-medium">
                {{ poster?.personalData?.phoneNumber }}
              </span>
            </div>
          </div>
        </v-expand-transition>
      </v-card>

      <!-- Type, acceptation, points, date, commentaire et vues : un seul groupe, grands arrondis aux extrémités, petits entre deux cartes -->
      <div class="connected-cards mb-4">
        <v-card color="background" elevation="0" class="pa-4">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center position-relative" style="width: 20px;">
              <div v-if="demand?.type === 'switch'" class="d-flex align-center ga-2">
                <v-icon class="" style="top: 1px; font-size: 14px" icon="mdi-swap-horizontal" />
              </div>
              <div v-if="demand?.type === 'substitution'" class="d-flex align-center ga-2">
                <v-icon class="" style="top: 1px; font-size: 14px" icon="mdi-account-arrow-left-outline " />
              </div>
              <div v-if="demand?.type === 'hybrid'" class="d-flex align-center ga-2 position-relative">
                <v-icon class="ml-n1" style="top: 1px; font-size: 14px" icon="mdi-account-arrow-left-outline " />
                <v-icon
                  class="ml-n2 position-absolute"
                  style="top: 2px; font-size: 14px; left: 10px;"
                  icon="mdi-swap-horizontal"
                />
              </div>
            </div>
            <div class="d-flex align-center ga-2">
            <!-- Cette demande dépend d'une autre (celle qui lui a donné sa vacation) : un clic l'affiche -->
            <v-chip
              v-for="(parentId, index) in demand.dependsOn ?? []"
              :key="parentId"
              size="small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-link-variant"
              :loading="loadingParentId === parentId"
              :aria-label="'Afficher la demande liée'"
              @click.stop="openParent(parentId)"
            >
              Demande liée{{ demand.dependsOn.length > 1 ? ` ${index + 1}` : '' }}
            </v-chip>
            <span class="text-disabled text-body-medium font-weight-medium">{{ formatType(demand.type) }}</span>
          </div>
          </div>
        </v-card>

        <v-card
          v-if="demand.accepterId"
          v-ripple="false"
          :hover="false"
          color="background"
          elevation="0"
          class="pa-4"
          @click="showAccepterDetails = !showAccepterDetails"
        >
          <div class="d-flex justify-space-between align-center">
            <span class="text-body-medium font-weight-medium text-medium-emphasis">Acceptée par </span>
            <div class="d-flex align-center ga-1">
              <v-avatar size="20" color="surfaceContainer" class="mr-1">
                <v-img v-if="accepter?.avatar" :src="`${API_URL}${accepter?.avatar}`" alt="Avatar" />
                <v-icon v-else size="16"> mdi-account-check-outline </v-icon>
              </v-avatar>
              <div class="d-flex align-center text-left ga-1">
                <span
                  class="font-weight-bold text-truncate"
                  :class="isAccepter ? 'text-primary' : ''"
                  style="max-width: 100px; font-size: 0.75rem"
                >
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
                  <span class="pa-0 text-medium-emphasis" style="font-size: 14px">
                    {{ accepter?.email }}
                  </span>
                  <v-icon size="12"> mdi-content-copy </v-icon>
                </div>

                <span class="text-body-small opacity-70 font-weight-medium">
                  {{ accepter?.personalData?.phoneNumber }}
                </span>
              </div>
            </div>
          </v-expand-transition>
        </v-card>

        <v-card elevation="0" class="px-4 py-2" color="background">
          <div
            v-if="demand.type !== 'switch'"
            class="d-flex justify-space-between py-2 align-center"
            style="height: 48px"
          >
            <span class="text-body-medium font-weight-medium text-medium-emphasis">Points</span>
            <div class="d-flex ga-1 align-end">
              <span class="text-body-medium font-weight-medium text-disabled">{{ demand.points }}</span>
              <LogoCopy />
            </div>
          </div>
          <v-divider v-if="demand.acceptedSwitches.length > 0 && demand.type === 'hybrid'" />
          <div
            v-if="demand.acceptedSwitches.length > 0"
            class="d-flex justify-space-between py-2 align-center"
            style="height: 48px"
          >
            <span class="text-body-medium font-weight-medium text-medium-emphasis">Permutations</span>
            <div class="d-flex ga-2">
              <v-chip v-for="s in demand.acceptedSwitches" :key="s.shift" rounded="lg" size="small" variant="text">
                <div class="d-flex ga-2 align-center">
                  <div class="d-flex ga-0 align-center">
                    <v-icon start size="small"> mdi-swap-horizontal </v-icon>
                    <span class="text-body-small font-weight-medium">{{ getShiftNameById(s.shift) }}</span>
                  </div>
                  <span class="text-body-medium font-weight-medium text-disabled">{{ s.points }}</span>
                </div>
              </v-chip>
              <LogoCopy />
            </div>
          </div>
        </v-card>

        <v-card color="background" elevation="0" class="pa-4">
          <div class="d-flex justify-space-between align-center text-disabled">
            <span class="text-body-medium font-weight-medium text-medium-emphasis">Date</span>
            <span class="text-body-medium text-disabled">{{ formatDate(posterDay(demand)) }}</span>
          </div>
        </v-card>

        <v-card v-if="demand.comment" color="background" elevation="0" class="pa-4">
          <span class="text-disabled text-body-medium font-weight-medium">{{ demand.comment }}</span>
        </v-card>

        <v-card color="background" elevation="0" class="pa-4">
          <div class="d-flex align-center ga-2">
            <v-icon size="12" icon="mdi-eye-outline" />
            <span class="text-body-medium text-medium-emphasis"> Vue par {{ demand.seenBy?.length }} personnes </span>
          </div>
        </v-card>

      </div>

      <v-card
        v-if="isMailingEnabled && (isOwner || isAccepter)"
        color="background"
        elevation="0"
        class="mb-4 pa-4"
      >
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center ga-2">
            <v-icon
              :icon="demand?.mailStatus === 'sent' ? 'mdi-email-check-outline' : 'mdi-email-outline'"
              :color="demand?.mailStatus === 'sent' ? 'success' : 'medium-emphasis'"
              size="small"
            />
            <span class="text-body-medium text-medium-emphasis">
              Mail administration : {{ demand?.mailStatus === 'sent' ? 'Envoyé' : 'Non envoyé' }}
            </span>
          </div>
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            rounded="xl"
            :loading="sendingMail"
            @click="sendAdminMailAction"
          >
            {{ demand?.mailStatus === 'sent' ? 'Renvoyer' : 'Envoyer' }}
          </v-btn>
        </div>
      </v-card>

      <!-- Pense-bête des déclarations à faire une fois la demande acceptée : deux cases à deux états, pour l'instant sans enregistrement -->
      <div v-if="isAccepted && (isOwner || isAccepter)" class="mb-4">
        <span class="text-body-small text-medium-emphasis mb-2 d-block">Déclarations à faire</span>
        <div class="declaration-tiles">
          <button
            v-for="declaration in declarations"
            :key="declaration.key"
            type="button"
            class="tile declaration-tile"
            :aria-pressed="declarationsDone[declaration.key]"
            @click="declarationsDone[declaration.key] = !declarationsDone[declaration.key]"
          >
            <v-icon size="24" aria-hidden="true">
              {{ declarationsDone[declaration.key] ? 'mdi-check-circle-outline' : declaration.icon }}
            </v-icon>
            <span class="text-label-medium font-weight-bold">{{ declaration.title }}</span>
            <span class="declaration-tile__subtitle text-label-small">
              {{ declarationsDone[declaration.key] ? declaration.doneText : declaration.todoText }}
            </span>
          </button>
        </div>
      </div>

      <v-card class="pa-0 rounded-xl" color="background" elevation="0">
        <GraphWrapper :demand="demand" />
      </v-card>

      <div v-if="!isAccepted && !isOwner" class="mx-n6 d-flex flex-column my-4 text-body-medium font-weight-medium">
        <div
          v-if="demand.type !== 'switch'"
          v-ripple
          class="px-6 d-flex align-center justify-space-between py-3 ga-2"
          @click="handleReplacement"
        >
          <span>Remplacer</span>
          <v-icon icon="mdi-chevron-right" />
        </div>
        <v-divider v-if="demand.type === 'hybrid'" class="mx-6" />
        <div
          v-if="demand.type === 'hybrid' || demand.type === 'switch'"
          v-ripple
          class="px-6 d-flex align-center justify-space-between py-3 ga-2"
          :class="{ 'text-disabled': !canSwitch }"
          @click="handleSwitch"
        >
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

      <v-card
        v-if="isOwner || isAccepter"
        v-ripple
        elevation="0"
        class="mb-4 mt-4"
        color="error"
        @click="cancelOrWithdraw"
      >
        <v-list bg-color="error">
          <v-list-item v-if="isAccepter" color="error" append-icon="mdi-chevron-right">
            <v-list-item-title class="text-body-medium font-weight-medium"> Se désister </v-list-item-title>
          </v-list-item>
          <v-list-item v-if="isOwner" color="error" append-icon="mdi-chevron-right">
            <v-list-item-title class="text-body-medium font-weight-medium"> Annuler </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>

      <div class="text-center mt-4 text-disabled text-body-small">
        <span> Créée il y a {{ timeSinceCreation }} </span>
      </div>
    </template>
  </GenericDialog>
</template>

<script setup>
import { posterDay } from '@/utils/dayFields.js';
import { useUserStore } from '@/stores/userStore';
import { useDate } from 'vuetify';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { API_URL } from '@/config/api';
import { useAuthStore } from '@/stores/authStore';
import { useRotationStore } from '@/stores/rotationStore';
import { useDemandStore } from '@/stores/demandStore';
import { getEffectiveShiftTimes } from '@/utils/getEffectiveShiftTimes';

const userStore = useUserStore();
const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();
const date = useDate();
const rotationStore = useRotationStore();
const demandStore = useDemandStore();

const emit = defineEmits([
  'handle-replacement',
  'handle-switch',
  'withdraw-demand',
  'cancel-demand',
  'update-demand',
]);
const showUserDetails = ref(false);

const props = defineProps({
  demand: {
    type: Object,
    default: null,
  },
});

const modelValue = defineModel({ type: Boolean, required: true });

const getUserById = userStore.getUser;

let intervalId;

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
  return props.demand?.posterId === authStore.userData.userId;
});

const isAccepter = computed(() => {
  return props.demand?.accepterId === authStore.userData.userId;
});

const isAccepted = computed(() => {
  return props.demand?.accepterId;
});

const isMailingEnabled = computed(() => demandStore.isMailingEnabled);
const sendingMail = ref(false);

const sendAdminMailAction = async () => {
  if (!props.demand?._id) return;
  sendingMail.value = true;
  try {
    const response = await demandStore.sendAdminMail(props.demand._id);
    if (response?.demand) {
      emit('update-demand', response.demand);
    }
    snackbarStore.showNotification("Mail d'administration envoyé avec succès", 'success', 'mdi-email');
  } catch (error) {
    console.error("Erreur lors de l'envoi du mail:", error);
    snackbarStore.showNotification("Erreur d'envoi : " + error.message, 'error', 'mdi-alert');
  } finally {
    sendingMail.value = false;
  }
};

const accepterName = computed(() => {
  return accepter.value?.name + ' ' + accepter.value?.lastName.split(' ').map((word) => word[0] + '.') || 'Accepteur';
});

const showAccepterDetails = ref(false);

const getShiftName = computed(() => {
  const ps = props.demand?.posterShift;
  return ps?.shift?.name + (ps?.selectedVariation?.name ? ' - ' + ps?.selectedVariation?.name : '');
});

const getShiftHours = computed(() => {
  const ps = props.demand?.posterShift;
  const effective = ps?.shift ? getEffectiveShiftTimes(ps.shift, ps?.selectedVariation) : null;
  return effective ? { startTime: effective.startTime, endTime: effective.endTime } : { startTime: '', endTime: '' };
});

const getShiftEndsNextDay = computed(() => {
  const ps = props.demand?.posterShift;
  const effective = ps?.shift ? getEffectiveShiftTimes(ps.shift, ps?.selectedVariation) : null;
  return effective?.endsNextDay ?? false;
});

const canSwitch = computed(() => {
  return props.demand?.canSwitch;
});

const timeSinceCreation = computed(() => {
  if (!props.demand?.createdAt) return '';

  const createdAt = new Date(props.demand.createdAt).getTime();
  const diffInMinutes = Math.floor((now.value - createdAt) / 60000);

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
});

const formatDate = (dateString) => {
  if (!dateString) return '';
  // const currentYear = new Date().getFullYear()
  // const dateYear = new Date(dateString).getFullYear()
  const formattedDate = date.format(dateString, 'fullDate');
  return formattedDate;
};

const formatType = (type) => {
  switch (type) {
    case 'switch':
      return 'Permutation';
    case 'substitution':
      return 'Remplacement';
    case 'hybrid':
      return 'Remplacement ou permutation';
    default:
      return type;
  }
};

const getShiftNameById = (shift) => {
  if (shift.name) return shift.name;
  const rotation = rotationStore.findRotationOfShift(shift._id);
  if (rotation) {
    const day = rotation.days.find((day) => day._id === shift._id);
    return day?.name || 'No shift';
  }
  return 'No shift';
};

// Demande liée : un clic charge celle dont cette demande dépend et la montre à la place (l'hôte la reçoit par `update-demand`) ;
// « Retour » rétablit la précédente. La pile est vidée à la fermeture.
const trail = ref([]);
const loadingParentId = ref(null);

const openParent = async (parentId) => {
  loadingParentId.value = parentId;
  try {
    const parent = await demandStore.fetchDemand(parentId);
    trail.value.push(props.demand);
    emit('update-demand', parent);
  } catch (error) {
    snackbarStore.showNotification(error.message || 'Demande liée introuvable', 'onError', 'mdi-alert-circle-outline');
  } finally {
    loadingParentId.value = null;
  }
};

const backToChild = () => {
  const previous = trail.value.pop();
  if (previous) emit('update-demand', previous);
};

watch(
  modelValue,
  (open) => {
    if (!open) trail.value = [];
  },
);

// Pense-bête des déclarations : l'état n'est pas enregistré, il repart à « non renseigné » quand on change de demande
const declarations = [
  {
    key: 'olaf',
    title: 'OLAF renseigné',
    icon: 'mdi-airplane',
    todoText: 'À déclarer sur OLAFATCO',
    doneText: 'Déclaré sur OLAFATCO',
  },
  {
    key: 'icnagenda',
    title: 'ICNAGENDA renseigné',
    icon: 'mdi-calendar-account-outline',
    todoText: 'À reporter sur ICNAGENDA',
    doneText: 'Reporté sur ICNAGENDA',
  },
];
const declarationsDone = reactive({ olaf: false, icnagenda: false });

watch(
  () => props.demand?._id,
  () => {
    declarationsDone.olaf = false;
    declarationsDone.icnagenda = false;
  },
);

const now = ref(Date.now());

onMounted(() => {
  intervalId = setInterval(() => {
    now.value = Date.now();
  }, 60000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});

watch(
  modelValue,
  async (newVal) => {
    if (newVal && props.demand && props.demand.isNew) {
      try {
        await demandStore.consultDemand(props.demand._id);
      } catch (error) {
        console.error('Erreur lors du marquage comme consulté:', error);
      }
    }
  },
);

const handleReplacement = () => {
  emit('handle-replacement', props.demand);
};

const handleSwitch = () => {
  emit('handle-switch', props.demand);
};

const cancelOrWithdraw = () => {
  if (isAccepter.value) {
    withdrawDemand();
  } else if (isOwner.value) {
    cancelDemand();
  } else {
    snackbarStore.showSnackbar("Vous n'êtes pas le propriétaire ou l'accepteur", 'error');
  }
};

const cancelDemand = () => {
  emit('cancel-demand', props.demand);
};

const withdrawDemand = () => {
  emit('withdraw-demand', props.demand);
};

const copyEmail = async () => {
  try {
    await navigator.clipboard.writeText(poster.value?.email);
    snackbarStore.showNotification('Email copié dans le presse-papiers', 'success', 'mdi-check');
  } catch (error) {
    console.error('Erreur lors de la copie :', error);
    snackbarStore.showNotification("Erreur lors de la copie de l'email", 'error', 'mdi-alert-circle');
  }
};
</script>

<style scoped>
.connected-cards {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.connected-cards > .v-card {
  border-radius: 8px;
}

.connected-cards > .v-card:first-child {
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
}

.connected-cards > .v-card:last-child {
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
}

.declaration-tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/* Tuile globale (styles/tile.css), disposée comme celles des entrées de planning : icône, titre, puis une ligne qui dit où en est la déclaration */
.declaration-tile {
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 96px;
  padding: 12px 8px;
  text-align: center;
}

.declaration-tile__subtitle {
  line-height: 1.2;
  opacity: 0.7;
}

.list-item {
  height: 48px;
  padding: 4px 16px;
}

.rotate-180 {
  transform: rotate(180deg);
}
</style>
