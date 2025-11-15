<template>
  <v-card-title class="text-subtitle-1 font-weight-medium">
    <div class="d-flex align-center flex-shrink-0   ga-3 ml-2">
      <div class="pb-0 mb-0 flex-shrink-0">

        <span class="text-h5 font-weight-medium" style="position: relative; top: 1px;"><v-text
            class="font-weight-thin">{{ user?.shift?.name
            }}</v-text><v-text v-if="(!isPoster || isPoster && getAccepter) && permutation" class="font-weight-thin">
            >
          </v-text>{{
            user2?.shift?.name
          }}</span>
      </div>
      <div class="d-flex align-start flex-column justify-space-between">
        <div>
          <!-- Demandes en attente -->
          <div v-if="isPoster && !getAccepter"><span class="text-caption font-weight-bold">{{
            user?.shift?.default?.startTime
            || user?.shift?.startTime }}
              -
              {{
                user?.shift?.default?.endTime || user?.shift?.endTime
              }}</span>
            <div class="py-0 text-caption opacity-70" style="margin-top: -8px; font-size: 11px !important;">Dans
              l'équipe {{ userTeam }}</div>
          </div>
          <!-- Permuts acceptées et remplacements -->
          <div v-else-if="(permutation && isPoster && getAccepter || !isPoster)">
            <span class="text-caption font-weight-bold">{{ user2?.shift?.default?.startTime
              || user2?.shift?.startTime }}
              -
              {{
                user2?.shift?.default?.endTime || user2?.shift?.endTime
              }}</span>
            <div class="py-0 text-caption opacity-70" style="margin-top: -8px; font-size: 11px !important;">Dans
              l'équipe {{ user2Team }}</div>
          </div>
          <div v-else-if="!permutation">
            <span class="text-caption font-weight-bold">{{ user2?.shift?.default?.startTime
              || user2?.shift?.startTime }}
              -
              {{
                user2?.shift?.default?.endTime || user2?.shift?.endTime
              }}</span>
            <div class="py-0 text-caption opacity-70" style="margin-top: -8px; font-size: 11px !important;">Dans
              l'équipe {{ userTeam }}</div>
          </div>
          <span class="text-caption font-weight-bold opacity-50 ml-1"
            style="font-size: 10px !important; top: -2px; position: relative;"
            v-if="user2?.shift?.default?.endsNextDay || user2?.shift?.endsNextDay">+1</span>

        </div>


      </div>
    </div>
  </v-card-title>
</template>


<script setup>
import { useUserStore } from '@/stores/userStore'
const userStore = useUserStore();

const props = defineProps({
  user: {
    type: Object,
  },
  user2: {
    type: Object,
  },
  isPoster: {
    type: Boolean,
  },
  getAccepter: {
    type: Boolean
  },
  permutation: {
    type: Boolean
  },
  open: {
    type: Boolean
  }
})


const userTeam = computed(() => {
  return props.user?.teamId.name;
})
const user2Team = computed(() => {
  return props.user2?.teamId.name;
})


</script>

<style>
.text-line-decoration-through {
  text-decoration: line-through;
}
</style>