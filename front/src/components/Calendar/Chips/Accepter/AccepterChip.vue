
<template>

    <v-chip
 
      rounded="lg"
      color="background"
      variant="flat"
      size="x-small"
      style="bottom: -10px; opacity: 1; transform: scale(1) ; border-color: rgba(var(--v-theme-remplacement), 0.4);"
      class="text-caption font-weight-bold position-absolute px-2 overflow-visible"
    >
      <v-icon color="error"  v-if="findAcceptedAsAccepter.length > 1">mdi-alert-circle-outline</v-icon>
      <v-icon color="remplacement"  >mdi-crowd</v-icon>

      <div v-if="findAcceptedAsAccepter" >
        <span>{{teamName}}</span>
      </div>
      <div  v-else>
       
        <span >?</span>
      </div>
    </v-chip>

</template>


<script setup>
import { computed, onMounted } from 'vue';
import { useTeamStore } from '@/stores/teamStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useAuthStore } from '@/stores/authStore';

const teamStore = useTeamStore();
const substitutionStore = useSubstitutionStore();
const authStore = useAuthStore();
const props = defineProps({
  date : { type: Date, required: true },
  text: { type: String },

});

const type = ref('');



const findAcceptedAsAccepter = computed(() => {
  return substitutionStore.findAcceptedAsAccepter(props.date.toISOString());
});

const teamName = computed(() => {
  return teamStore.centerTeams.find(team => team._id === findAcceptedAsAccepter.value.posterShift.teamId)?.name;
});

const shiftType = computed(() => {
  return findAcceptedAsAccepter.value?.type;
});


</script>
