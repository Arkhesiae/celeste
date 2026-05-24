<template>
  <v-container ref="containerRef" :class="smAndDown ? 'mb-n16' : ''">
    <Transition name="title-transition" appear> 
      <WelcomeTitle :user-name="userName">
   
      </WelcomeTitle>
    </Transition>

<!-- 
    <Transition name="donations-transition" appear>
      <Donations></Donations>
    </Transition> -->


    <SetupAlerts />

    <AnnouncementBanner />

    <v-row>
      <v-col cols="12" md="12" xl="12" offset-xl="0" class="pa-2">
        <PointsCardMobile v-if="smAndDown" :points="stats.points" class="my-8" @click="openPointSection"/>
      </v-col>
    </v-row>
    <!-- Grille principale -->
    <v-row :class="smAndDown ? 'mx-n4' : ''">
      <v-col cols="12" md="auto" lg="auto" xl="auto" style="min-width: 0; width: 0;"
        class="flex-grow-1 ga-4 d-flex flex-column">
        <VacationCards />
        <DemandCards @open-details="openDemand"/>
      </v-col>

      <v-col :class="smAndDown ? '' : 'right-col'">
        <div class="d-flex justify-space-between align-start flex-column mb-4 flex-grow-1 ga-4">
          <span class="text-h6 font-weight-medium pa-0">
            Mon centre
          </span>
        </div>

        <LocalRecommendationsCard />

        <ActiveRotationCard />

       

        <v-card rounded="xl" elevation="0" class="pa-4" :class="smAndDown ? 'pb-16 mx-n3' : ''" color="surfaceContainer">
          <div class="d-flex ga-10 flex-column">
            <PointsCard v-if="!smAndDown" color="transparent" class="pa-0" :points="stats.points" :transactions="[]"
              @transfer="transferDialog = true" />

            <DashboardCalendarSection/>
          </div>

          <!-- <DashboardTeamCard /> -->
        </v-card>
      </v-col>

    </v-row>

    <v-bottom-sheet v-if="smAndDown" :model-value="pointSectionVisible" @update:model-value="pointSectionVisible = $event">
      <PointsCard class="pa-4" :points="stats.points" :transactions="[]" @transfer="transferDialog = true" />
    </v-bottom-sheet>

    <TransferDialog :dialog-visible="transferDialog" :user-id="authStore.userData.userId"
      @update:dialog-visible="transferDialog = $event" />

    <DemandDependencies ref="demandDeps" />
  </v-container>
</template>



<script setup>
import { useAuthStore } from "@/stores/authStore.js";
import { useDisplay } from "vuetify";

const authStore = useAuthStore();
const demandDeps = ref(null);
const userName = authStore.userData.name;
const pointSectionVisible = ref(false);

const { smAndDown } = useDisplay();


// Stats
const stats = ref({
  remplacements: 0,
  permutations: 0,
  points: 0
});

const transferDialog = ref(false);

// Container padding tracking
const containerRef = ref(null);
const containerPaddingLeft = ref('0px');
const containerMarginLeft = ref('0px');
let resizeObserver = null;

const updatePadding = () => {
  const el = containerRef.value?.$el;
  if (!el) return;
  containerMarginLeft.value = getComputedStyle(el).marginLeft;
  containerPaddingLeft.value = getComputedStyle(el).paddingLeft;
};

const openDemand = (demand) => {
  console.log('openDemand', demand);
  demandDeps.value.openDemandDetails(demand);
};

const openPointSection = () => {
  pointSectionVisible.value = true;
};

onMounted(async () => {
  updatePadding();
  resizeObserver = new ResizeObserver(updatePadding);
  resizeObserver.observe(containerRef.value.$el);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});
</script>

<style scoped>

.right-col {
  max-width: 500px;
}

.highlight-shadow {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.096), 0 0 0 1px rgba(255, 255, 255, 0.007), 0 4px 8px rgba(0, 0, 0, 0.148);
}

.new-demand-button.highlight-shadow {
  backface-visibility: hidden;
  transform: translateZ(0);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.026), 0 0 0 1px rgba(255, 255, 255, 0.007), 0 4px 4px rgba(0, 0, 0, 0.018);
}

.new-demand-button.highlight-shadow:hover {
  transform: scale(1.05) translateZ(0);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.096), 0 0 0 1px rgba(255, 255, 255, 0.007), 0 4px 8px rgba(0, 0, 0, 0.148);
  transition: transform 0.2s ease-in-out;
}

.title-transition-enter-active,
.title-transition-leave-active {
  transition: all 0.5s ease;
  transition-delay: 0.5s;
}

.title-transition-enter-from,
.title-transition-leave-to {
  opacity: 0;
  transition-delay: 0.5s;
  transform: translateY(-20px);
}

.donations-transition-enter-active,
.donations-transition-leave-active {
  transition: all 1s ease;

}

.donations-transition-enter-from,
.donations-transition-leave-to {
  opacity: 0;
 
  transform: translateY(20px);
}
</style>