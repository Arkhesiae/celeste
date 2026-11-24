<template>
  <div class="dashboard-page">
    <!-- Écran radar dans le coin haut-droit de la page, sous le contenu -->
    <div class="radar-layer" aria-hidden="true">
      <ArtRadarField class="art art--radar" />
    </div>

    <v-container ref="containerRef" class="dashboard-content" :class="smAndDown ? 'mb-n16' : ''">
      <Transition name="title-transition" appear>
        <WelcomeTitle :user-name="userName"> </WelcomeTitle>
      </Transition>

      <!-- <Transition name="donations-transition" appear>
        <Donations></Donations>
      </Transition> -->

      <SetupAlerts />

      <!-- Bannières publiées par les administrateurs -->
      <BannerList />

      <v-row>
        <v-col cols="12" md="12" xl="12" offset-xl="0" class="pa-2">
          <PointsCardMobile v-if="smAndDown" :points="stats.points" class="my-8" @click="openPointSection" />
        </v-col>
      </v-row>
      <!-- Grille principale -->
      <v-row>
        <v-col
          cols="12"
          md="auto"
          lg="auto"
          xl="auto"
          style="min-width: 0; width: 0"
          class="flex-grow-1 ga-4 d-flex flex-column"
        >
          <VacationCards />
          <DemandCards
            @open-details="openDemand"
            @cancel-demand="(demand) => demandDeps.handleCancel(demand)"
            @withdraw-demand="(demand) => demandDeps.handleWithdraw(demand)"
          />
        </v-col>

        <v-col :class="smAndDown ? '' : 'right-col'">
          <div class="d-flex justify-space-between align-start flex-column mb-4 flex-grow-1 ga-4">
            <span class="text-title-large font-weight-medium pa-0"> Mon centre </span>
          </div>

          <LocalRecommendationsCard />

          <ActiveRotationCard />

          <v-card

            elevation="0"
            class="pa-4"
            :class="smAndDown ? 'pb-16 mx-n3' : ''"
            color="surfaceContainer"
          >
            <div class="d-flex ga-10 flex-column">
              <PointsCard
                v-if="!smAndDown"
                color="transparent"
                class="pa-0"
                :points="stats.points"
                :transactions="[]"
                @transfer="transferDialog = true"
                @show-history="transactionsDialog = true"
              />

              <DashboardCalendarSection />
            </div>

            <!-- <DashboardTeamCard /> -->
          </v-card>

          <DemandHeatmapCard class="my-4" />

          <!-- <CentersMapCard class="my-4 mb-16" /> -->
        </v-col>
      </v-row>

      <v-bottom-sheet
        v-if="smAndDown"
        :model-value="pointSectionVisible"
        @update:model-value="pointSectionVisible = $event"
      >
        <PointsCard class="pa-4" :points="stats.points" :transactions="[]" @transfer="transferDialog = true"
                @show-history="transactionsDialog = true" />
      </v-bottom-sheet>

      <TransactionHistoryDialog v-model="transactionsDialog" />

      <TransferDialog
        :dialog-visible="transferDialog"
        :user-id="authStore.userData.userId"
        @update:dialog-visible="transferDialog = $event"
      />

      <DemandDependencies ref="demandDeps" />
    </v-container>
  </div>
</template>

<script setup>
import { useScrollRestoration } from 'vue-router/experimental';

// Onglet du bas : racine de ses pages, il retrouve son défilement (router/scrollRestoration.js)
definePage({ meta: { tab: 'dashboard' } });
useScrollRestoration();

import { useAuthStore } from '@/stores/authStore.js';
import { useDisplay } from 'vuetify';



const authStore = useAuthStore();
const demandDeps = ref(null);
const userName = authStore.userData.name;
const pointSectionVisible = ref(false);

const { smAndDown } = useDisplay();

// Stats
const stats = ref({
  remplacements: 0,
  permutations: 0,
  points: 0,
});

const transferDialog = ref(false);
const transactionsDialog = ref(false);

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
.dashboard-page {
  position: relative;
}

/* Le radar occupe le coin haut-droit de la page ; il est coupé par la couche, jamais par le contenu, et ne gêne aucun clic */
.radar-layer {
  position: absolute;
  top: 0;
  right: 0;
  width: min(820px, 100vw);
  aspect-ratio: 1;
  overflow: hidden;
  opacity: 0.99;
  pointer-events: none;
  z-index: 0;
}

.dashboard-content {
  position: relative;
  z-index: 1;
}

.right-col {
  max-width: 500px;
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
