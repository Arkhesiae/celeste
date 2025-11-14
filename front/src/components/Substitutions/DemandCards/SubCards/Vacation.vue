<template>
  <v-card-title class="text-subtitle-1 font-weight-medium">
    <div class="d-flex align-center flex-shrink-0   ga-3 ml-2">
      <div class="pb-0 mb-0 flex-shrink-0">

        <span class="text-h5 font-weight-medium" style="position: relative; top: 1px;"><v-text
            class="font-weight-thin">{{ user?.shift?.name
            }}</v-text><v-text v-if="!isPoster || isPoster && getAccepter" class="font-weight-thin"> > </v-text>{{
              user2?.shift?.name
            }}</span>
      </div>
      <div class="d-flex align-start flex-column justify-space-between">
        <div>
          <span class="text-caption font-weight-bold">{{ user?.shift?.default?.startTime || user?.shift?.startTime }} -
            {{
              user?.shift?.default?.endTime || user?.shift?.endTime
            }}</span>
          <span class="text-caption font-weight-bold opacity-50 ml-1"
            style="font-size: 10px !important; top: -2px; position: relative;"
            v-if="user?.shift?.default?.endsNextDay || user?.shift?.endsNextDay">+1</span>
        </div>
        <div class="py-0 text-caption opacity-70" style="margin-top: -8px; font-size: 11px !important;">Dans
          équipe {{ getTeamName }}</div>

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
  }
})


const getTeamName = computed(() => {
  return props.user?.teamId.name;
})


</script>