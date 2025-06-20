<template>
  <v-sheet :rounded="rounded" :elevation="elevation" class="py-4 px-4" color="surfaceContainerHigh">
    <h2 class="text-h5 text-overline text-center">{{ formattedDate }}</h2>

    <v-card rounded="xl" color="background" class="mb-4 card-shadow" elevation="0">
      <v-card-item class="d-flex align-start justify-space-between pa-4">
        <v-card-title
         
          class="pb-0 mb-0">
          <h2 class="text-h4 font-weight-medium" v-if="isRestDay">Repos</h2>
          <h2 class="text-h4 font-weight-medium" v-else>{{ getShiftName }}</h2>
        </v-card-title>
        <v-card-subtitle v-if="getShiftTeam" class="pt-0 text-caption">Dans équipe {{ getShiftTeam }}</v-card-subtitle>
        <v-card-subtitle v-else class="pt-0 text-caption">Aucune équipe assignée</v-card-subtitle>
        <v-card-subtitle v-if="!isRestDay" class="pt-0">
          {{ getShiftHours.startTime }} - {{ getShiftHours.endTime }}
        </v-card-subtitle>

        <template #append>
          <div class="d-flex flex-column">
<!-- 

            <v-chip v-if="substitutionStore.hasAcceptedSubstitutionsAsAccepter(selectedDate)" color="remplacement"
              variant="flat" size="small" rounded="lg">
              <v-icon>mdi-account-arrow-right-outline</v-icon>
              <span>Remplace dans équipe {{ substitutionTeam }}</span>
            </v-chip>
            <v-chip v-if="substitutionStore.hasAcceptedSubstitutionsAsPoster(selectedDate)" color="remplacement"
              variant="flat" size="small" rounded="lg">
              <v-icon>mdi-account-arrow-left-outline</v-icon>
              <span>Remplacé par {{ substituteUser }}</span>
            </v-chip> -->
            <ConfirmationChipExtended v-if="substitutionStore.hasAcceptedAsPoster(new Date(selectedDate).toISOString())" style="top:12px !important; right:12px !important"  :date=" new Date(selectedDate)"/>
            <PendingChipExtended v-if="substitutionStore.hasOwnPendingDemand(new Date(selectedDate).toISOString())" style="top:12px !important; right:12px !important"  :date=" new Date(selectedDate)"/>
            <AccepterChipExtended v-if="substitutionStore.hasAcceptedAsAccepter(new Date(selectedDate).toISOString())" style="top:12px !important; right:12px !important"  :date=" new Date(selectedDate)"/>
          </div>
        </template>
      </v-card-item>
    </v-card>



    <div>
      <v-slide-group :mobile="smAndDown" class="mb-4 mx-2">
        <v-slide-group-item >
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

    <div class="d-flex align-center justify-center mb-4" v-if="!substitutionStore.hasOwnPendingDemand(selectedDate) && !substitutionStore.hasAcceptedAsPoster(selectedDate)">
      <v-btn height="60px" color="permutation" text-color="permutation"
        class="flex-1-1 d-flex flex-column rounded-ts-xl rounded-bs-xl mr-1 text-none " :disabled="isRestDay || inPast"
        :class="{ 'opacity-10': isRestDay || inPast }" flat rounded="lg" @click="$emit('openRemplaDialog', 'switch')">
        <template #prepend>
          <v-icon>mdi-swap-horizontal-hidden</v-icon>
        </template>
        Permutation
      </v-btn>
      <v-btn height="60px" color="remplacement" :disabled="isRestDay || inPast"
        class="flex-1-1 d-flex flex-column rounded-te-xl rounded-be-xl text-none " flat rounded="lg"
        :class="{ 'opacity-10': isRestDay || inPast }" @click="$emit('openRemplaDialog', 'substitution')">
        <template #prepend>
          <v-icon>mdi-account-arrow-left-outline</v-icon>
        </template>
        Remplacement
      </v-btn>
    </div>

    <div class="d-flex align-center justify-center mb-4"
      v-if="substitutionStore.hasOwnPendingDemand(selectedDate) ">
      <v-btn color="error" height="60px" variant="tonal" :disabled="inPast"
        class="flex-grow-1 d-flex flex-column rounded-xl text-none" @click="$emit('cancelDemand', substitutionId)">
        Annuler ma demande
      </v-btn>
    </div>

    <div class="d-flex align-center justify-center mb-4"
      v-if=" substitutionStore.hasAcceptedAsPoster(selectedDate)">
      <v-btn color="error" height="60px" variant="tonal" :disabled="inPast"
        class="flex-grow-1 d-flex flex-column rounded-xl text-none" @click="$emit('cancelDemand', substitutionId)">
        Annuler 
      </v-btn>
    </div>

    <div class="d-flex align-center justify-center mb-4"
      v-if="substitutionStore.hasAcceptedAsAccepter(selectedDate)">
      <v-btn color="error" height="60px" variant="tonal" :disabled="inPast"
        class="flex-1-1 d-flex flex-column rounded-xl text-none" rounded="lg"
        @click="$emit('unacceptDemand', substitutionStore.findAcceptedAsAccepter(selectedDate)._id)">
        Annuler mon rempla
      </v-btn>
    </div>

    <v-btn width="100%" flat rounded="xl" height="64px" color="background"
      :class="{ 'opacity-10': substitutionStore.countAvailableSubstitutions(selectedDate) === 0 }"
      :disabled="substitutionStore.countAvailableSubstitutions(selectedDate) === 0" 
      append-icon="mdi-chevron-right" class="justify-space-between d-flex text-medium-emphasis mb-2 text-subtitle-2"
      @click="$emit('openDrawer', 'substitutions')">
      <v-chip rounded="xl" color="remplacement" variant="flat" class="text-caption font-weight-bold px-4 mr-3">
        <span>{{ substitutionStore.countAvailableSubstitutions(selectedDate) }}</span>
      </v-chip>
      Voir les remplacements disponibles
    </v-btn>

    <v-btn width="100%" :class="{ 'opacity-10': substitutionStore.countAvailableSwitches(selectedDate) === 0 }" flat
      rounded="xl" height="64px" color="background" append-icon="mdi-chevron-right"
      :disabled="substitutionStore.countAvailableSwitches(selectedDate) === 0" 
      class="justify-space-between d-flex text-medium-emphasis text-subtitle-2 mb-2" @click="$emit('openDrawer', 'switches')">
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
import { computed, onMounted } from 'vue';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useTeamStore } from '@/stores/teamStore';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useDisplay } from 'vuetify';

const substitutionStore = useSubstitutionStore();
const teamStore = useTeamStore();
const { smAndDown } = useDisplay();
const userStore = useUserStore();
const authStore = useAuthStore();

const props = defineProps({
  formattedDate: {
    type: String,
    required: true
  },
  vacationsOfUser: {
    type: Map,
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

const getVacation = computed(() => {
  if (!props.selectedDate) return null;
  return props.vacationsOfUser.get(new Date(props.selectedDate).toISOString());
});

const isRestDay = computed(() => {
  return  getVacation.value?.shift?.type === 'rest' || !getVacation.value?.shift;
});

const inPast = computed(() => {
  return new Date(props.selectedDate).toISOString().split('T')[0] < new Date().toISOString().split('T')[0];
});


const getShiftName = computed(() => {
  return getVacation.value?.shift?.name || '';
});

const getShiftHours = computed(() => {
  return {
    startTime: getVacation.value?.shift?.startTime || '',
    endTime: getVacation.value?.shift?.endTime || ''
  };
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
  return user?.name + ' ' +user?.lastName.toUpperCase() || '';
});




</script>

<style scoped>
.card-shadow {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.096), 0 0 0 1px rgba(121, 121, 121, 0.007), 0 4px 8px rgba(0, 0, 0, 0.048) !important;
}
</style>
