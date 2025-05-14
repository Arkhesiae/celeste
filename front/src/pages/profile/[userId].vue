<template>
  <div class="profile-page position-relative">
    <v-container class="position-relative" :class="smAndDown ? 'pa-0' : ''" >
      <div id="profilecard" class="header-placeholder mt-8 mb-6" ref="containerRef" :style="{ height: headerHeight ? headerHeight : 206 + 'px' }">
        <v-card 
          :class="[
            'profile-header',
            'pa-0',
            'pt-2',
            { 'fixed-header': isSticky },
            { 'bg-background': isSticky && smAndDown },
            { 'bg-surfaceContainer': !(isSticky && smAndDown) },
            { 'bg-surfaceContainerHigh': isSticky && !smAndDown }
          ]"
          :style="isSticky && !smAndDown ? { width: containerWidth + 'px !important' } : {}"
          flat 
          rounded="xl">
          <div class="d-flex align-start justify-space-between pa-6">
            <div class="d-flex align-start flex-column justify-space-between">
      
                <v-card-title v-if="!isSticky" class="text-h5 pa-0 mb-4">Profil</v-card-title>
  
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center">
 
                  <v-avatar size="64" class="mr-4" variant="tonal"   >
                    <v-img v-if="authStore.avatar" :src="`${API_URL}${authStore.avatar}`" alt="Avatar" />
                    <v-icon v-else>mdi-account</v-icon>
                  </v-avatar>
                  <div>
                    <div class="text-subtitle-1">{{ authStore.name }}</div>
                    <div class="text-caption text-medium-emphasis">{{ authStore.email }}</div>
                  </div>
                </div>
              </div>
            </div>
            <v-btn icon variant="text" size="large" to="/parameter" color="onBackground">
              <v-icon>mdi-cog-outline</v-icon>
            </v-btn>
          </div>
        </v-card>
      </div>

      <v-slide-y-transition appear>

   
      <v-row :class="smAndDown ? 'px-4' : ''">
        <v-col cols="12" md="4">
          <PointsCard height="100%" @transfer="transferDialog = true" />
        </v-col>
        <v-col :class="smAndDown ? 'my-16' : ''" cols="12" md="8">
          <TeamCard  :teamOccurrences="teamOccurrences" @update-dialog-mode="openAddDialog" />
        </v-col>
      </v-row>
    

    </v-slide-y-transition>
    <v-row>
        <v-col cols="12" md="6">
          <v-card color="surfaceContainer" rounded="xl" class="pa-6" height="400px">aze</v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card color="surfaceContainer" rounded="xl" class="pa-4" height="400px">aez</v-card>
        </v-col>
      </v-row>
    
      <TransferDialog 

        :dialogVisible="transferDialog" 
        :userId="userId" 
        @update:dialogVisible="transferDialog = $event"
        @transfer-success="handleTransferSuccess" 
      />

      <AvatarDialog
        v-model="avatarDialog"
        @success="handleAvatarSuccess"
        @error="handleAvatarError"
      />

      <TeamDialog 
        :dialogMode="dialogMode" 
        :dialogVisible="addDialog" 
        :teams="teams"
        :occurrences="teamOccurrences || []" 
        @onSubmit="handleTeamChange" 
        @onClose="closeAddDialog"
        @update:dialogModeValue="dialogMode = $event" 
        @update:dialogVisible="addDialog = $event" 
      />
    </v-container>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, onUnmounted } from 'vue';
import { useDisplay } from 'vuetify';
import { useTeamStore } from "@/stores/teamStore.js";
import { useAuthStore } from "@/stores/authStore.js";
import { useSnackbarStore } from "@/stores/snackbarStore.js";
import { usePointStore } from '@/stores/pointStore.js';
import TransferDialog from '@/components/Profile/TransferDialog.vue';
import PointsCard from '@/components/Profile/PointsCard.vue';
import AvatarDialog from '@/components/Profile/Parameters/AvatarDialog.vue';
import { API_URL } from '@/config/api';

const { smAndDown } = useDisplay();
const teamStore = useTeamStore();
const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();
const pointStore = usePointStore();

const transferDialog = ref(false);
const dialogMode = ref('');
const addDialog = ref(false);
const isLoading = ref(false);
const isSticky = ref(false);
const target = ref(null);
const headerHeight = ref(0);
const observer = ref(null);
const containerRef = ref(null);
const containerWidth = ref(0);
const avatarDialog = ref(false);

const userId = computed(() => authStore.userId);
const teams = computed(() => teamStore.teams);
const teamOccurrences = computed(() => teamStore.teamOccurrences);

const openAddDialog = (mode) => {
  dialogMode.value = mode;
  addDialog.value = true;
};

const closeAddDialog = () => {
  addDialog.value = false;
};

const handleTeamChange = async (data, conflict) => {
  try {
    isLoading.value = true;
    if (conflict) {
      await deleteTeamConflict(userId.value, conflict._id);
    }
    await teamStore.assignUserToTeam(userId.value, {
      teamId: data.teamId,
      fromDate: data.fromDate,
      toDate: data.toDate,
    });
    closeAddDialog();
    await teamStore.getTeamOccurrencesOfUser(userId.value);
    snackbarStore.showNotification(`Changement d'équipe validé à partir du ${data.fromDate.substring(0, 10)}`, 'primary');
  } catch (error) {
    snackbarStore.showNotification(error.message, 'error');
  } finally {
    isLoading.value = false;
  }
};

const handleTransferSuccess = () => {
  pointStore.fetchUserPoints();
  pointStore.fetchTransactions(); 
};

const handleAvatarSuccess = () => {
  // Handle avatar success
};

const handleAvatarError = () => {
  // Handle avatar error
};

onMounted(async () => {
  try {
    isLoading.value = true;
    await teamStore.fetchTeamOccurrencesOfUser(userId.value);
    await teamStore.fetchCenterTeams(authStore.centerId);

    target.value = document.querySelector("#profilecard");
    const headerElement = document.querySelector('.profile-header');
    headerHeight.value = headerElement ? headerElement.offsetHeight + 32 : 206;
    
    if (target.value) {
      setTimeout(() => {
        observer.value = new IntersectionObserver(
          ([entry]) => {
            isSticky.value = !entry.isIntersecting;
            if (!smAndDown.value && containerRef.value) {
              containerWidth.value = containerRef.value.offsetWidth;
            }
          },
          {
            root: null,
            rootMargin: `-64px 0px 0px 0px`,
            threshold: 1
          }
        );
        observer.value.observe(target.value);
      }, 400);
    }
  } catch (error) {
    console.error(error.message);
    snackbarStore.showNotification(error.message, 'onError' );
  } finally {
    isLoading.value = false;
  }
});

onUnmounted(() => {
  if (observer.value) {
    observer.value.disconnect();
  }
});
</script>

<style scoped>
.fixed-header {
  position: fixed;
  backdrop-filter: blur(10px);
  z-index: 100;
  top: var(--v-layout-top);
  width: inherit !important;
  transition: all 0.3s ease;
  box-shadow: 0 20px 20px 4px rgba(0, 0, 0, 0.096), 0 0 0 0px rgba(255, 255, 255, 0.000), 0 4px 8px rgba(0, 0, 0, 0.048);
}

.header-placeholder {
  width: inherit !important;
}



.water-jar {
  height: 200px;
  width: 200px;
  position: relative;
  background: linear-gradient(#131a1c, #0f1416) padding-box, linear-gradient(45deg, #131a1c, #86cfe8) border-box;
  border-radius: 100px;
  overflow: hidden;
  border: 4px solid transparent;
}

.water-filling {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 64px;
}

.water {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  background: #85cde8;
  filter: drop-shadow(0px -3px 20px #85cde6);
  transform: translate(0, 100%);
}

.water_wave {
  width: 200%;
  position: absolute;
  bottom: 100%;
}

.water_wave_back {
  right: 0;
  fill: #567c88;
  animation: wave-back 1.8s infinite cubic-bezier(0.42, 0.0, 0.58, 1.0);
  animation-delay: -0.2s;
}

.water_wave_front {
  left: 0;
  fill: #86cfe8;
  margin-bottom: -2px;
  animation: wave-front 3.4s infinite cubic-bezier(0.12, 0.0, 1, 1.0);
  animation-delay: -0.1s;
}

.water_wave_middle {
  left: 0;
  fill: rgba(115, 172, 191, 0.63);
  margin-bottom: 0px;
  animation: wave-front 2.1s infinite linear;
  animation-delay: 0;
}

@keyframes wave-front {
  0% {
    transform: translate(-15%, 0);
  }

  50% {
    transform: translate(-50%, 0);
  }

  100% {
    transform: translate(-15%, 0);
  }
}

@keyframes wave-back {
  100% {
    transform: translate(50%, 0);
  }
}
</style>
