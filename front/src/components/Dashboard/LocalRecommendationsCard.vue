<template>
  <v-card v-if="getCenterName?.includes('CRNA Nord')" rounded="xl" elevation="0" class="mb-4 pa-6" color="surfaceContainer">
    <v-card-title class="text-h6 font-weight-medium pa-0 ma-0">
      Recommandations locales
    </v-card-title>
    <span class="text-caption text-disabled">
      <v-icon icon="mdi-information-outline " color="primary" size="16" class="mr-2" />
      Ces recommandations ne prennent pas en compte les différences d'horaires et sont fournies à titre indicatif.
    </span>

      <div class="rounded-xl mt-4" style="overflow-x: auto;">
        <v-table>
          <tbody>
            <tr>
              <th />
              <td v-for="row in vacationTable" :key="row.vac" class="text-center font-weight-bold">
                {{ row.vac }}
              </td>
            </tr>
            <tr>
              <th class=" font-weight-medium">
                Semaine
              </th>
              <td v-for="row in vacationTable" :key="row.vac" class="text-center font-weight-medium opacity-50">
                {{ row.semaine }}
              </td>
            </tr>
            <tr>
              <th class=" font-weight-medium">
                WE/JF
              </th>
              <td v-for="row in vacationTable" :key="row.vac" class="text-center font-weight-medium opacity-50">
                {{ row.wejf }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
 
  </v-card>
</template>

<script setup>
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/authStore.js';
import { useCenterStore } from '@/stores/centerStore.js';

const { smAndDown } = useDisplay();
const authStore = useAuthStore();
const centerStore = useCenterStore();

const getCenterName = computed(() => {
  return centerStore.centers.find(center => center._id === authStore.userData.centerId)?.name;
});

const vacationTable = [
  { vac: 'M', semaine: 9, wejf: 10 },
  { vac: 'J2', semaine: 10, wejf: 11 },
  { vac: 'S2', semaine: 9, wejf: 10 },
  { vac: 'J1', semaine: 10, wejf: 11 },
  { vac: 'S1', semaine: 9, wejf: 10 },
  { vac: 'N', semaine: 10, wejf: 11 },
  { vac: 'JE', semaine: 0, wejf: 1 }
];
</script>
