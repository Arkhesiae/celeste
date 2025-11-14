<template>
  <v-sheet :rounded="rounded" :elevation="elevation" class="py-4 px-4 position-relative safe-area-bottom" color="surfaceContainer">
    <div class="d-flex align-center justify-end mb-4 mx-2">
      <span class="text-body-2 font-weight-bold">{{ formattedDate }}</span>
    </div>
    <div class="d-flex align-end flex-column mx-2 ga-1" v-if="!isRestDay">
      <v-btn :disabled="!hasNoDemand"  color="error" rounded="lg" size="small" :variant="getVacation?.isOff ? 'flat' : 'outlined'"
        class="text-none "
        @click="registerAbsence">
        <v-icon start>mdi-bag-carry-on-off</v-icon>
        <span v-if="!getVacation?.isOff">Absence ?</span>
        <span v-else>Absent</span>
      </v-btn>
      <span style="font-size: 10px !important; opacity: 0.6;" v-if="hasNoDemand">Une absence, un congé ?</span>
      <span style="font-size: 10px !important; opacity: 0.6;" v-else>Impossible si demandes en cours</span>
    </div>
    <div class="my-10 rounded-xl bg-background pa-4 px-8 position-relative" :class="getVacation?.isOff ? 'offDay' : ''">
      <div class="d-flex align-center  ga-3">
        <div class="pb-0 mb-0">
          <span class="text-h6 font-weight-medium" v-if="isRestDay">Repos</span>
          <span class="text-h5 font-weight-medium" style="position: relative; top: 2px;" v-else>{{ getShiftName }}</span>
        </div>
        <div class="d-flex align-start flex-column justify-space-between">
          <div v-if="!isRestDay">
            <span class="text-caption font-weight-bold">{{ getShiftHours.startTime }} - {{ getShiftHours.endTime
            }}</span>
            <span class="text-caption font-weight-bold opacity-50 ml-1" style="font-size: 10px !important; top: -2px; position: relative;"  v-if="getShiftEndsNextDay">+1</span>
          </div>
          <div class="py-0 text-caption opacity-70" style="margin-top: -8px; font-size: 11px !important;"
            v-if="!isRestDay && getShiftTeam">Dans l'équipe {{ getShiftTeam }}</div>

        </div>
        <div v-if="getVacation?.shift?.variations?.length > 0 && !isRestDay"  class="variation-badge align-self-start" >
          <v-icon size="10" class="text-caption font-weight-bold text-background">mdi-clock</v-icon>
          <span class="text-caption font-weight-bold text-background">?</span>
         
        </div>


      </div>



      <div class="mr-4" style=" position: absolute; right: 0px; top: 0px; height: 100%; display: flex; align-items: center; justify-content: center;">
        <div v-if="getVacation?.isOff" class="d-flex align-center justify-center ga-2"> 
          <span style="font-size: 10px !important; opacity: 0.6;">
            Absence
          </span>
          <div class="small-pin off-pin" v-if="getVacation?.isOff">
          
          <v-icon size="12" color="background">mdi-bag-carry-on</v-icon>
        </div>
        </div>
       
        <div v-else-if="isRestDay" class="d-flex align-center justify-center ga-2"> 
          <span style="font-size: 10px !important; opacity: 0.6;">
            Repos
          </span>
          <div class="small-pin rest-pin" v-if="isRestDay">
          
          <v-icon size="12" color="background">mdi-sleep</v-icon>
        </div>
        </div>

       
        <div v-else class="d-flex align-center justify-center ga-2"> 
          <span style="font-size: 10px !important; opacity: 0.6;">
            Travail
          </span>
          <div class="small-pin work-pin" v-if="!isRestDay">
          
          <v-icon size="12" color="background">mdi-airport</v-icon>
        </div>
        </div>
       

      </div>

  
      


      <div class="d-flex flex-column align-end justify-end position-absolute" style="top:-24px !important  ; right:0px !important ;"  >

        <ConfirmationChipExtended v-if="substitutionStore.hasAcceptedAsPoster(new Date(selectedDate).toISOString())"
           :date="new Date(selectedDate)" />
        <PendingChipExtended v-if="substitutionStore.hasOwnPendingDemand(new Date(selectedDate).toISOString())"
          :date="new Date(selectedDate)" />
        <AccepterChipExtended v-if="substitutionStore.hasAcceptedAsAccepter(new Date(selectedDate).toISOString())"
         :date="new Date(selectedDate)" />
      </div>



  
    </div>
   



    <div v-if="false">
      <v-slide-group :mobile="smAndDown" class="mb-4 mx-2">
        <v-slide-group-item>
          <v-btn color="onBackground" rounded="lg" size="small" class="text-none mr-3"
            @click="$emit('openAbsenceDialog', 'Congé')">
            <v-icon start>mdi-beach</v-icon>
            Congé
          </v-btn>
        </v-slide-group-item>
        <!-- <v-slide-group-item>
          <v-btn color="onBackground" rounded="lg" size="small" class="text-none mr-3"
            @click="$emit('openAbsenceDialog', 'VIC')">
            <v-icon start>mdi-calendar-clock</v-icon>
            VIC
          </v-btn>
        </v-slide-group-item> -->
        <v-slide-group-item>
          <v-btn color="onBackground" rounded="lg" size="small" class="text-none mr-2"
            @click="$emit('openAbsenceDialog', 'Stage')">
            <v-icon start>mdi-school</v-icon>
            Stage
          </v-btn>
        </v-slide-group-item>
        <!-- <v-slide-group-item>
          <v-btn color="onBackground" rounded="lg" size="small" class="text-none mr-2"
            @click="$emit('openAbsenceDialog', 'Autre')">
            <v-icon start>mdi-dots-horizontal</v-icon>
            Autre
          </v-btn>
        </v-slide-group-item> -->
        <v-slide-group-item>
          <v-btn color="onBackground" rounded="lg" size="small" class="text-none mr-2"
            @click="$emit('openAbsenceDialog', 'Autre')">
            <v-icon start>mdi-dots-horizontal</v-icon>
            Bureau
          </v-btn>
        </v-slide-group-item>
      </v-slide-group>
    </div>

    <div v-if="isRestDay || isOff" class="d-flex align-center justify-center mb-4 mx-4">
      <span style="font-size: 10px !important; opacity: 0.6;">Impossible si absent ou repos</span>
    </div>
    <div class="d-flex align-center ga-2 mb-4 px-4"
      v-if="!substitutionStore.hasOwnPendingDemand(selectedDate) && !substitutionStore.hasAcceptedAsPoster(selectedDate)">
      <v-btn height="36px" color="surfaceContainerHighest" text-color="permutation"
        class="flex-grow-1 d-flex text-none text-subtitle-2" :disabled="isRestDay || inPast || isOff"
        :class="{ 'opacity-10': isRestDay || inPast || isOff }" flat rounded="xl" @click="$emit('openRemplaDialog', 'switch')">
        <template #prepend>
          <v-icon>mdi-swap-horizontal-hidden</v-icon>
        </template>
        Permutation
      </v-btn>
      <v-btn height="36px" color="surfaceContainerHighest" :disabled="isRestDay || inPast || isOff"
        class="flex-grow-1 text-none text-subtitle-2" flat rounded="xl" :class="{ 'opacity-10': isRestDay || inPast || isOff }"
        @click="$emit('openRemplaDialog', 'substitution')">
        <template #prepend>
          <v-icon>mdi-account-arrow-left-outline</v-icon>
        </template>
        Remplacement
      </v-btn>
    </div>

    <div class="d-flex align-center justify-center mb-4 mx-4"
      v-if="substitutionStore.hasOwnPendingDemand(selectedDate)">
      <v-btn color="error" height="48px" variant="tonal" :disabled="inPast || isOff"
        class="flex-grow-1 d-flex flex-column rounded-xl text-none" @click="$emit('cancelDemand', substitutionId)">
        Annuler ma demande
      </v-btn>
    </div>

    <div class="d-flex align-center justify-center mb-4 mx-4"
      v-if="substitutionStore.hasAcceptedAsPoster(selectedDate)">
      <v-btn color="error" height="48px" variant="tonal" :disabled="inPast "
        class="flex-grow-1 d-flex flex-column rounded-xl text-none" @click="$emit('cancelDemand', substitutionId)">
        Annuler
      </v-btn>
    </div>

    <div class="d-flex align-center justify-center mb-4 mx-4"
      v-if="substitutionStore.hasAcceptedAsAccepter(selectedDate)">
      <v-btn color="error" height="48px" variant="tonal" :disabled="inPast "
        class="flex-1-1 d-flex flex-column rounded-xl text-none" rounded="lg"
        @click="$emit('unacceptDemand', substitutionStore.findAcceptedAsAccepter(selectedDate)._id)">
        Annuler mon rempla
      </v-btn>
    </div>

    <v-btn width="100%" flat rounded="xl" height="64px" color="background"
      :class="{ 'opacity-10': substitutionStore.countAvailableSubstitutions(selectedDate) === 0 }"
      :disabled="substitutionStore.countAvailableSubstitutions(selectedDate) === 0" append-icon="mdi-chevron-right"
      class="justify-space-between d-flex text-medium-emphasis mb-2 text-subtitle-2"
      @click="$emit('openDrawer', 'substitutions')">
      <v-chip rounded="xl" color="remplacement" variant="flat" class="text-caption font-weight-bold px-4 mr-3">
        <span>{{ substitutionStore.countAvailableSubstitutions(selectedDate) }}</span>
      </v-chip>
      Voir les remplacements disponibles
    </v-btn>

    <v-btn width="100%" :class="{ 'opacity-10': substitutionStore.countAvailableSwitches(selectedDate) === 0 }" flat
      rounded="xl" height="64px" color="background" append-icon="mdi-chevron-right"
      :disabled="substitutionStore.countAvailableSwitches(selectedDate) === 0"
      class="justify-space-between d-flex text-medium-emphasis text-subtitle-2 mb-2"
      @click="$emit('openDrawer', 'switches')">
      <v-chip rounded="xl" color="permutation" variant="flat" class="text-caption font-weight-bold px-4 mr-3">
        <span>{{ substitutionStore.countAvailableSwitches(selectedDate) }}</span>
      </v-chip>
      Voir les permutations disponibles
    </v-btn>

    <v-btn width="100%" :class="{ 'opacity-10': substitutionStore.countOtherDemands(selectedDate) === 0 }" flat
      rounded="xl" height="64px" color="background" append-icon="mdi-chevron-right"
      :disabled="substitutionStore.countOtherDemands(selectedDate) === 0"
      class="justify-space-between d-flex text-medium-emphasis text-subtitle-2" @click="$emit('openDrawer', 'others')">
      <v-chip rounded="xl" color="surfaceContainerHigh" variant="flat" class="text-caption font-weight-bold px-4 mr-3">
        <span>{{ substitutionStore.countOtherDemands(selectedDate) }}</span>
      </v-chip>
      Voir les autres demandes
    </v-btn>
  </v-sheet>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useTeamStore } from '@/stores/teamStore';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useDisplay } from 'vuetify';
import { useShiftStore } from '@/stores/shiftStore';
import { planningModificationService } from '@/services/planningModificationService';
import { useSnackbarStore } from '@/stores/snackbarStore';

const substitutionStore = useSubstitutionStore();
const teamStore = useTeamStore();
const { smAndDown } = useDisplay();
const userStore = useUserStore();
const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();

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


defineEmits(['openRemplaDialog', 'openDrawer', 'cancelDemand', 'openAbsenceDialog', 'unacceptDemand']);

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

const isRestDay = computed(() => {
  return getVacation.value?.shift?.type === 'rest' ;
});

const inPast = computed(() => {
  return new Date(props.selectedDate).toISOString().split('T')[0] < new Date().toISOString().split('T')[0];
});


const getShiftEndsNextDay = computed(() => {
  return getVacation.value?.shift?.default?.endsNextDay || false;
});


const getShiftName = computed(() => {
  if (isOff.value) {
    return getVacation.value?.initialShift?.name || '';
  }
  return getVacation.value?.shift?.name || '';
});

const getShiftHours = computed(() => {
  if (isOff.value) {
    return {
      startTime: getVacation.value?.initialShift?.default?.startTime || '',
      endTime: getVacation.value?.initialShift?.default?.endTime || ''
    };
  }
  return {
    startTime: getVacation.value?.shift?.default?.startTime || '',
    endTime: getVacation.value?.shift?.default?.endTime || ''
  };
});

const hasNoDemand = computed(() => {
  return !substitutionStore.hasOwnPendingDemand(props.selectedDate) && !substitutionStore.hasAcceptedAsPoster(props.selectedDate) && !substitutionStore.hasAcceptedAsAccepter(props.selectedDate);
});

const isOff = computed(() => {
  return getVacation.value?.isOff;
});

const substitutionId = computed(() => {
  const ownPendingDemand = substitutionStore.findOwnPendingDemand(props.selectedDate);
  if (ownPendingDemand) return ownPendingDemand._id;
  const acceptedAsPoster = substitutionStore.findAcceptedAsPoster(props.selectedDate);
  if (acceptedAsPoster) return acceptedAsPoster._id;
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


</style>
