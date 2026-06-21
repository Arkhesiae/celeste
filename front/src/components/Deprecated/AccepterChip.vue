<template>
  <div
    class="clip d-flex bg-primary align-center rounded-lg w-100 pa-1"
  >
    <!-- <v-icon
      v-if="findAcceptedAsAccepter.length > 1"
      color="error"
    >
      mdi-alert-circle-outline
    </v-icon> -->
    <v-icon 
      icon="$subOk"
      size="14px"
      color="background"
    >
    {{  getDemandIcon(props.demand, authStore.userData.userId) }}
    </v-icon>

    <!-- <div v-if="findAcceptedAsAccepter" class="d-flex align-center justify-center">
      <span class="text-body-small">{{ teamName }}</span>
    </div>
    <div v-else>
      <span class="text-body-small">?</span>
    </div> -->
  </div>
</template>


<script setup>
import { getDemandIcon } from '@/utils/demandToIcon';
import { useAuthStore } from '@/stores/authStore';
import { useTeamStore } from '@/stores/teamStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';

const authStore = useAuthStore();
const teamStore = useTeamStore();
const substitutionStore = useSubstitutionStore();

const props = defineProps({
  demand: { type: Object, required: true },
  date: { type: Date, required: true },
  text: { type: String, default: '' },

});




// const findAcceptedAsAccepter = computed(() => {
//   return substitutionStore.findAcceptedAsAccepter(props.date.toISOString());
// });

// const teamName = computed(() => {
//   const team = teamStore.centerTeams.find(team => team._id === findAcceptedAsAccepter.value.posterShift.teamId)?.name
//   return team ? team : '?'
// });



</script>

<style scoped>

.clip {
 clip-path: 
      shape(from 0% 0%,
      line to -5px calc(50% - 10px) ,
      arc to -5px calc(50% + 10px) of 10px cw,
      line to 0% 100%,
      line to 100% 100%,
      line to 100% 0%,
      close);
}

</style>

