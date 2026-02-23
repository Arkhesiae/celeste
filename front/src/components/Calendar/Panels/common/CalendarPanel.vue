<template>
  <v-sheet
    :rounded="rounded"
    :elevation="elevation"
    class="py-4 px-4 position-relative safe-area-bottom"
    color="surfaceContainer"
  >
    <div class="d-flex align-center justify-end mb-4 mx-2">
      <span class="text-body-2 font-weight-bold">{{ formattedDate }}</span>
    </div>
    <div
      v-if="!isRestDay"
      class="d-flex align-end flex-column mx-2 ga-1"
    >
      <v-btn
        :disabled="!hasNoDemand"
        color="error"
        rounded="lg"
        size="small"
        :variant="getVacation?.isOff ? 'flat' : 'outlined'"
        class="text-none "
        @click="registerAbsence"
      >
        <v-icon start>
          mdi-bag-carry-on-off
        </v-icon>
        <span v-if="!getVacation?.isOff">Absence ?</span>
        <span v-else>Absent</span>
      </v-btn>
      <span
        v-if="hasNoDemand"
        style="font-size: 10px !important; opacity: 0.6;"
      >Une absence, un congé ?</span>
      <span
        v-else
        style="font-size: 10px !important; opacity: 0.6;"
      >Impossible si demandes en cours</span>
    </div>
    <div
      class="my-10 rounded-xl bg-background pa-4 px-8 position-relative"
      :class="getVacation?.isOff ? 'offDay' : ''"
    >
      <div class="d-flex align-center  ga-3">
        <div class="pb-0 mb-0">
          <span
            v-if="isRestDay"
            class="text-h6 font-weight-medium"
          >Repos</span>
          <span
            v-else
            class="text-h5 font-weight-medium"
            style="position: relative; top: 2px;"
          >{{ getShiftName
          }}</span>
        </div>
        <div class="d-flex align-start flex-column justify-space-between">
          <div v-if="!isRestDay">
            <span class="text-caption font-weight-bold">{{ getShiftHours.startTime }} - {{ getShiftHours.endTime
            }}</span>
            <span
              v-if="getShiftEndsNextDay"
              class="text-caption font-weight-bold opacity-50 ml-1"
              style="font-size: 10px !important; top: -2px; position: relative;"
            >+1</span>
          </div>
          <div
            v-if="!isRestDay && getShiftTeam"
            class="py-0 text-caption opacity-70"
            style="margin-top: -8px; font-size: 11px !important;"
          >
            Dans l'équipe {{ getShiftTeam }}
          </div>
        </div>
      </div>

      <!-- Sélecteur de vacation élémentaire (pour la compatibilité des demandes) -->
      <div v-if="!isRestDay && !inPast" class="mt-4">
        <span class="text-caption d-block mb-2 opacity-70">
          Indiquez quelle vacation vous ferez (améliore la compatibilité des demandes)
        </span>
        <template v-if="hasVariationsInCalendar">
          <div class="d-flex flex-wrap ga-2">
            <v-chip
              size="small"
              rounded="lg"
              variant="flat"
              :color="!hasSelectedVariation ? 'primary' : 'surface'"
              class="ma-1 cursor-pointer"
              @click="selectVariationForDay(null)"
            >
              Non précisée ({{ shiftWithVariationsFromRotation?.default?.startTime }}-{{ shiftWithVariationsFromRotation?.default?.endTime }})
            </v-chip>
            <v-chip
              v-for="v in (shiftWithVariationsFromRotation?.variations || shiftWithVariationsFromRotation?.variation || [])"
              :key="v._id"
              size="small"
              rounded="lg"
              variant="flat"
              :color="isVariationSelected(v) ? 'primary' : 'surface'"
              class="ma-1 cursor-pointer"
              @click="selectVariationForDay(v)"
            >
              {{ v.name }} ({{ v.startTime }}-{{ v.endTime }})
            </v-chip>
          </div>
        </template>
        <v-alert v-else type="info" density="compact" variant="tonal" class="mt-1">
          Ce shift n'a pas de variantes configurées. Ajoutez-en dans la gestion des rotations.
        </v-alert>
      </div>



      <div
        class="mr-4"
        style=" position: absolute; right: 0px; top: 0px; height: 100%; display: flex; align-items: center; justify-content: center;"
      >
        <div
          v-if="getVacation?.isOff"
          class="d-flex align-center justify-center ga-2"
        >
          <span style="font-size: 10px !important; opacity: 0.6;">
            Absence
          </span>
          <div
            v-if="getVacation?.isOff"
            class="small-pin off-pin"
          >
            <v-icon
              size="12"
              color="background"
            >
              mdi-bag-carry-on
            </v-icon>
          </div>
        </div>

        <div
          v-else-if="isRestDay"
          class="d-flex align-center justify-center ga-2"
        >
          <span style="font-size: 10px !important; opacity: 0.6;">
            Repos
          </span>
          <div
            v-if="isRestDay"
            class="small-pin rest-pin"
          >
            <v-icon
              size="12"
              color="background"
            >
              mdi-sleep
            </v-icon>
          </div>
        </div>


        <div
          v-else
          class="d-flex align-center justify-center ga-2"
        >
          <span style="font-size: 10px !important; opacity: 0.6;">
            Travail
          </span>
          <div
            v-if="!isRestDay"
            class="small-pin work-pin"
          >
            <v-icon
              size="12"
              color="background"
            >
              mdi-airport
            </v-icon>
          </div>
        </div>
      </div>





      <div
        class="d-flex flex-column align-end justify-end position-absolute"
        style="top:-24px !important  ; right:0px !important ;"
      >
        <ConfirmationChipExtended
          v-if="substitutionStore.hasAcceptedAsPoster(new Date(selectedDate).toISOString())"
          :date="new Date(selectedDate)"
        />
        <PendingChipExtended
          v-if="substitutionStore.hasOwnPendingDemand(new Date(selectedDate).toISOString())"
          :date="new Date(selectedDate)"
        />
        <AccepterChipExtended
          v-if="substitutionStore.hasAcceptedAsAccepter(new Date(selectedDate).toISOString())"
          :date="new Date(selectedDate)"
        />
      </div>
    </div>




    <div
      v-if="isRestDay || isOff"
      class="d-flex align-center justify-center mb-4 mx-4"
    >
      <span style="font-size: 10px !important; opacity: 0.6;">Impossible si absent ou repos</span>
    </div>
    <div
      v-if="!substitutionStore.hasOwnPendingDemand(selectedDate) && !substitutionStore.hasAcceptedAsPoster(selectedDate)"
      class="d-flex align-center ga-2 mb-8 px-4"
    >
      <v-btn
        height="36px"
        color="surfaceContainerHighest"
        text-color="permutation"
        class="flex-grow-1 d-flex text-none text-subtitle-2"
        :disabled="isRestDay || inPast || isOff"
        :class="{ 'opacity-10': isRestDay || inPast || isOff }"
        flat
        rounded="xl"
        @click="$emit('openRemplaDialog', 'switch')"
      >
        <template #prepend>
          <v-icon>mdi-swap-horizontal-hidden</v-icon>
        </template>
        Permutation
      </v-btn>
      <v-btn
        height="36px"
        color="surfaceContainerHighest"
        :disabled="isRestDay || inPast || isOff"
        class="flex-grow-1 text-none text-subtitle-2"
        flat
        rounded="xl"
        :class="{ 'opacity-10': isRestDay || inPast || isOff }"
        @click="$emit('openRemplaDialog', 'substitution')"
      >
        <template #prepend>
          <v-icon>mdi-account-arrow-left-outline</v-icon>
        </template>
        Remplacement
      </v-btn>
    </div>

    <div
      v-if="pendingDemand || acceptedAsPoster"
      class="d-flex align-center justify-center mb-4 mx-4"
    >
      <v-btn
        color="error"
        height="48px"
        variant="tonal"
        :disabled="inPast || isOff"
        class="flex-grow-1 d-flex flex-column rounded-xl text-none"
        @click="$emit('cancel', substitutionId)"
      >
        Annuler ma demande
      </v-btn>
    </div>

    

    <div
      v-if="acceptedAsAccepter"
      class="d-flex align-center justify-center mb-4 mx-4"
    >
      <v-btn
        color="error"
        height="48px"
        variant="tonal"
        :disabled="inPast"
        class="flex-1-1 d-flex flex-column rounded-xl text-none"
        rounded="lg"
        @click="emit('withdraw', acceptedAsAccepter)"
      >
        Se désister
      </v-btn>
    </div>

    <div class="d-flex  ga-1 mb-2">
      <div class="category-indicator">
        <v-icon
          icon="mdi-account-arrow-left-outline"
          size="small"
          color="primary"
        />
        {{ availableSubstitutions.length }}
      </div>
      <div class="category-indicator">
        <v-icon
          icon="mdi-swap-horizontal"
          size="small"
          color="primary"
        />
        {{ availableSwitches.length }}
      </div>
      <div class="category-indicator">
        <v-icon
          icon="mdi-close"
          size="small"
          color="error"
        />
        {{ otherDemands.length }}
      </div>
    </div>

    <v-btn
      :class="{
        'opacity-10': availableSubstitutions.length === 0 && availableSwitches.length === 0 && otherDemands.length === 0
      }"
      :disabled="availableSubstitutions.length === 0 && availableSwitches.length === 0 && otherDemands.length === 0"
      width="100%"
      flat
      rounded="xl"
      height="64px"
      color="background"
      append-icon="mdi-chevron-right"
      class="justify-space-between d-flex align-center  text-subtitle-2"
      @click="$emit('openDrawer', 'substitutions')"
    >
      <span v-if="availableSubstitutions.length > 0 || availableSwitches.length > 0 || otherDemands.length > 0">
        Voir les demandes disponibles
      </span>
      <span v-else>
        Aucune demande disponible
      </span>
    </v-btn>
  </v-sheet>
</template>

<script setup>
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useTeamStore } from '@/stores/teamStore';
import { useUserStore } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useRotationStore } from '@/stores/rotationStore';
import { useAuthStore } from '@/stores/authStore';
import { planningModificationService } from '@/services/planningModificationService';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { getEffectiveShiftTimes, getDisplayShiftName } from '@/utils/getEffectiveShiftTimes';

const substitutionStore = useSubstitutionStore();
const teamStore = useTeamStore();
const userStore = useUserStore();
const snackbarStore = useSnackbarStore();
const rotationStore = useRotationStore();
const authStore = useAuthStore();

const props = defineProps({
  formattedDate: {
    type: String,
    required: true
  },

  selectedDate: {
    type: [Date, String, null],
    required: true
  },
  rounded: {
    type: String,
    default: 'xl'
  },
  elevation: {
    type: Number,
    default: 0
  },
  showChips: {
    type: Boolean,
    default: false
  },
});


const emit = defineEmits(['openRemplaDialog', 'openDrawer', 'cancel', 'openAbsenceDialog', 'withdraw']);

const shiftStore = useShiftStore();


const registerAbsence = async () => {
  try {
    // Vérifier si l'utilisateur est déjà en congé
    const isCurrentlyOff = getVacation.value?.isOff;
    const newIsOffStatus = !isCurrentlyOff; // Inverser le statut actuel


    // Utiliser la fonction utilitaire du service
    const data = await planningModificationService.registerModification(
      {
        type: 'absence',
        date: props.selectedDate.split('T')[0],
        isOff: newIsOffStatus,
        comment: isCurrentlyOff ? 'Retour de congé' : 'Absence enregistrée'
      }
    );


    shiftStore.addEntry(data.userShift[0], data.userShift[0].date);
    const substitutionStore = useSubstitutionStore();

    substitutionStore.recategorizeSubstitutions(data.userShift[0].date);


    // Afficher une notification de succès
    const message = isCurrentlyOff ? 'Absence annulée' : 'Absence enregistrée';
    snackbarStore.showNotification(message, 'onPrimary', 'mdi-check');

  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'absence:', error);
    // Afficher une notification d'erreur
    snackbarStore.showNotification('Erreur lors de l\'enregistrement de l\'absence : ' + error.message, 'onError', 'mdi-alert-circle-outline');
  }
};



const vacationsOfUser = computed(() => {
  return shiftStore.persistentVacationsMap;
});

const getVacation = computed(() => {
  if (!props.selectedDate) return null;
  return vacationsOfUser.value.get(new Date(props.selectedDate).toISOString().split('T')[0]);
});

const activeRotationForDate = computed(() => {
  const date = props.selectedDate ? new Date(props.selectedDate) : null;
  if (!date || !rotationStore.sortedRotations?.length) return null;
  for (const r of rotationStore.sortedRotations) {
    const start = new Date(r.startDate);
    const end = r.endDate ? new Date(r.endDate) : null;
    if (date >= start && (!end || date <= end)) {
      return rotationStore.rotations?.find(rot => rot._id === r._id) ?? null;
    }
  }
  return null;
});

/** Trouve un shift avec variations : rotation active > toutes les rotations > shift de la vacation (API) */
const shiftWithVariationsFromRotation = computed(() => {
  const shift = getVacation.value?.shift;
  if (!shift) return null;
  const shiftId = (shift._id || shift.id)?.toString?.();
  const shiftName = shift?.name;

  const findDayWithVariations = (days) => {
    if (!days?.length) return null;
    let day = days.find(d => (d._id || d)?.toString?.() === shiftId);
    if (!day && shiftName) day = days.find(d => d?.name === shiftName);
    return (day?.variations?.length || day?.variation?.length) ? day : null;
  };

  // 1. Rotation active pour la date
  let found = findDayWithVariations(activeRotationForDate.value?.days);
  if (found) return found;

  // 2. Toutes les rotations du centre (au cas où la rotation active ne matche pas)
  for (const rot of rotationStore.rotations || []) {
    found = findDayWithVariations(rot?.days);
    if (found) return found;
  }

  // 3. Shift de la vacation (API avec ensureShiftWithVariations)
  if (shift?.variations?.length || shift?.variation?.length) return shift;
  return null;
});

const hasVariationsInCalendar = computed(() => {
  const v = shiftWithVariationsFromRotation.value;
  return (v?.variations?.length || v?.variation?.length || 0) > 0;
});

const hasSelectedVariation = computed(() => !!getVacation.value?.selectedVariation);

const isVariationSelected = (variation) => {
  const current = getVacation.value?.selectedVariation;
  if (!current || !variation) return false;
  return (current._id || current)?.toString?.() === (variation._id || variation)?.toString?.();
};

const toDateKey = (d) => {
  if (!d) return null;
  const s = typeof d === 'string' ? d : d?.toISOString?.();
  return s?.split?.('T')[0] ?? null;
};

const selectVariationForDay = async (variation) => {
  const dateKey = toDateKey(props.selectedDate);
  if (!dateKey) return;
  try {
    const data = await planningModificationService.registerModification({
      type: 'selectedVariation',
      date: dateKey,
      selectedVariation: variation ? variation._id : null,
      shift: getVacation.value?.shift?._id,
      centerId: authStore.userData?.centerId
    });
    if (data?.userShift?.[0]) {
      shiftStore.addEntry(data.userShift[0], toDateKey(data.userShift[0].date));
    }
    if (data?.updatedDemand) {
      substitutionStore.updateDemandInStore(data.updatedDemand);
    }
    substitutionStore.recategorizeSubstitutions(dateKey);
    snackbarStore.showNotification('Vacation précisée', 'onPrimary', 'mdi-check');
  } catch (err) {
    snackbarStore.showNotification('Erreur : ' + err.message, 'onError', 'mdi-alert-circle-outline');
  }
};

const isRestDay = computed(() => {
  return getVacation.value?.shift?.type === 'rest';
});

const inPast = computed(() => {
  return new Date(props.selectedDate).toISOString().split('T')[0] < new Date().toISOString().split('T')[0];
});


const getShiftEndsNextDay = computed(() => {
  const shift = getVacation.value?.shift;
  const selectedVariation = getVacation.value?.selectedVariation;
  const effective = shift ? getEffectiveShiftTimes(shift, selectedVariation) : null;
  return effective?.endsNextDay ?? false;
});


const getShiftName = computed(() => getDisplayShiftName(getVacation.value));

const getShiftHours = computed(() => {
  const shift = isOff.value ? getVacation.value?.initialShift : getVacation.value?.shift;
  const selectedVariation = getVacation.value?.selectedVariation;
  const effective = shift ? getEffectiveShiftTimes(shift, selectedVariation) : null;
  return effective ? { startTime: effective.startTime, endTime: effective.endTime } : { startTime: '', endTime: '' };
});



const hasNoDemand = computed(() => {
  return !pendingDemand.value && !acceptedAsPoster.value && !acceptedAsAccepter.value;
});

const isOff = computed(() => {
  return getVacation.value?.isOff;
});

const pendingDemand = computed(() => [
  ...substitutionStore.ownPendingHybridSubstitutions,
  ...substitutionStore.ownPendingTrueSubstitutions,
  ...substitutionStore.ownPendingTrueSwitches
].find(d => d.posterShift.date === props.selectedDate));

const acceptedAsAccepter = computed(() => {
  if (!props.selectedDate) return null;
  return substitutionStore.acceptedAsAccepter.find(d => d.posterShift.date === props.selectedDate);
});

const acceptedAsPoster = computed(() => {
  if (!props.selectedDate) return null;
  return substitutionStore.acceptedAsPoster.find(d => d.posterShift.date === props.selectedDate);
});

const substitutionId = computed(() => {
  if (pendingDemand.value) return pendingDemand.value;
  if (acceptedAsPoster.value) return acceptedAsPoster.value;
});

const getShiftTeam = computed(() => {
  return getVacation.value?.teamObject?.name || '';
});

const substitutionTeam = computed(() => {
  const teamId = substitutionStore.hasAcceptedSubstitutionsAsAccepter(props.selectedDate)?.posterShift.teamId;
  if (!teamId) return '';
  const team = teamStore.centerTeams.find(t => t._id === teamId);
  return team?.name || '';
});

const substituteUser = computed(() => {
  const accepterId = substitutionStore.hasAcceptedSubstitutionsAsPoster(props.selectedDate)?.accepterId;
  if (!accepterId) return '';
  const user = userStore.users.find(u => u._id === accepterId);
  return user?.name + ' ' + user?.lastName.toUpperCase() || '';
});

const availableSubstitutions = computed(() => {
  return substitutionStore.availableSubstitutions.filter(d => d.posterShift.date === props.selectedDate);
});

const availableSwitches = computed(() => {
  return substitutionStore.availableSwitches.filter(d => d.posterShift.date === props.selectedDate);
});

const otherDemands = computed(() => {
  return substitutionStore.otherDemands.filter(d => d.posterShift.date === props.selectedDate);
});



</script>

<style scoped>
.card-shadow {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.096), 0 0 0 1px rgba(121, 121, 121, 0.007), 0 4px 8px rgba(0, 0, 0, 0.048) !important;
}

.safe-area-bottom {
  padding-bottom: calc(env(safe-area-inset-bottom) + 24px) !important;
}

.offDay {
  color: rgba(var(--v-theme-error), 0.8) !important;
  background-color: rgba(var(--v-theme-error), 0.05) !important;

}

.small-pin {
  width: 20px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  height: 20px;
  border-radius: 50%;
}

.off-pin {
  background-color: rgba(var(--v-theme-error), 1);
}

.rest-pin {
  background-color: rgba(var(--v-theme-onBackground), 1);
}

.work-pin {
  background-color: rgba(var(--v-theme-onBackground), 1);
}

.variation-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  margin-top: 4px;
  height: 16px;
  border-radius: 6px;
  background-color: rgba(var(--v-theme-onBackground), 1);
}

/* Indicateurs de catégories */
.category-indicator {
  padding: 0 2px;
  height: 16px;
  border-radius: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: .75rem;

  cursor: pointer;
  transition: all 0.2s ease;
}
</style>
