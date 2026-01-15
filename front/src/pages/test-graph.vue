<template>
  <v-container class="fill-height">
    <v-row
      justify="center"
      align="center"
    >
      <v-col
        cols="12"
        md="10"
        lg="8"
      >
        <v-card
          class="pa-4 rounded-xl"
          elevation="0"
        >
          <workday-amplitude-graph :days="testDays" />



         
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import WorkdayAmplitudeGraph from '@/components/common/WorkdayAmplitudeGraph.vue';

const testDays = ref([]);

const generateData = () => {
    const arr = [];
    const today = new Date();
    // Center is today (index 6), so start offset is -6
    const startOffset = -6;

    for (let i = 0; i < 13; i++) {
        const currentBase = new Date(today);
        currentBase.setDate(today.getDate() + startOffset + i);
        currentBase.setHours(0, 0, 0, 0);

        // 20% chance of overnight shift
        const isOvernight = Math.random() < 0.2;

        let startH, duration;
        if (isOvernight) {
            startH = 18 + Math.random() * 5; // 18:00 - 23:00
            duration = 6 + Math.random() * 4;
        } else {
            startH = 6 + Math.random() * 6; // 06:00 - 12:00
            duration = 5 + Math.random() * 6;
        }

        const start = new Date(currentBase);
        start.setHours(Math.floor(startH), (startH % 1) * 60);

        const end = new Date(currentBase);
        // Using raw hours addition handles day overflow correctly
        end.setHours(Math.floor(startH) + Math.floor(duration), ((startH % 1) * 60) + ((duration % 1) * 60));

        // Random Name
        const type = Math.random() > 0.5 ? 'J' : 'S';
        const num = Math.floor(Math.random() * 20) + 1;
        const name = `${type}${num}`;

        arr.push({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            id: i,
            name: name
        });
    }
    testDays.value = arr;
};

const refreshData = () => {
    generateData();
};

onMounted(() => {
    generateData();
});
</script>
