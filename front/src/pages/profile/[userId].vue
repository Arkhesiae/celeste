<template>

  <v-container class="position-relative" :class="smAndDown ? 'pa-0' : ''">

    <div class="w-100 debug3 my-16" ref="container" :style="{ height: containerHeight + 'px' }">
      <div class="debug4" ref="sentinel"></div>
      <v-card flat class="debug2 " ref="header" :style="headerStyle">
        <div class="d-flex align-start justify-space-between pa-6">
          <div class="d-flex align-start flex-column justify-space-between">


            
              <v-card-title v-if="!isSticky" class="text-h5 pa-0 mb-4">Profil</v-card-title>
            

            <div class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">

                <v-avatar size="64" class="mr-4" variant="tonal">
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
          <PointsCard rounded="xl" color="surfaceContainer" class="pa-6" height="100%"
            @transfer="transferDialog = true" />
        </v-col>
        <v-col :class="smAndDown ? 'my-16' : ''" cols="12" md="8">
          <UserTeamCard height="100%" @show-team-change-dialog="openAddDialog" />
        </v-col>
      </v-row>
    </v-slide-y-transition>
    <!-- <v-row>
        <v-col cols="12" md="6">
          <v-card color="surfaceContainer" flat rounded="xl" class="pa-6" height="400px">aze</v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card color="surfaceContainer" flat rounded="xl" class="pa-4" height="400px">aez</v-card>
        </v-col>
      </v-row> -->

    <v-row :class="smAndDown ? 'px-4' : 'mt-16'">
      <v-col cols="12" md="4" v-for="item in items" :key="item.id">
        <v-card v-if="!smAndDown" color="surfaceContainer" rounded="xl" class="pa-6 cursor-pointer" height="80"
          @click="router.push(item.link)" link flat>
          <div class="d-flex align-center justify-space-between h-100">
            <div class="d-flex align-center ga-2">
              <v-icon size="16" color="onSurface">{{ item.icon }}</v-icon>
              <span class="text-onSurface text-h7">{{ item.title }}</span>
            </div>
            <v-icon color="onSurface">mdi-chevron-right</v-icon>
          </div>
        </v-card>
        <div v-else class="px-2 cursor-pointer" @click="router.push(item.link)">
          <div class="d-flex align-center ga-2 justify-space-between mb-6">
          <div class="d-flex align-center ga-2">
            <v-icon size="16" color="onSurface">{{ item.icon }}</v-icon>
            <span class="text-onSurface text-h7">{{ item.title }}</span>
          </div>
          <v-icon color="onSurface">mdi-chevron-right</v-icon>
          </div>
          <v-divider v-if="item.id !== items.length"></v-divider>
        </div>
      </v-col>
      
    </v-row>
    <v-row :class="smAndDown ? 'px-4' : ''">
      <v-col cols="6" md="6">
        <v-card v-if="authStore.centerId" color="surfaceContainer" rounded="xl" class="pa-6 cursor-pointer" height="64"
          @click="router.push('/patchnotes')" link flat>
          <div class="d-flex align-center justify-space-between h-100">
            <span class="text-onSurface text-caption">Patchnotes</span>
            <v-icon size="16" color="onSurface">mdi-update</v-icon>
          </div>
        </v-card>
      </v-col>
      <v-col cols="6" md="6">
        <v-card color="surfaceContainer" rounded="xl" class="pa-6 cursor-pointer" height="64"
          @click="router.push('/financement')" link flat>
          <div class="d-flex align-center justify-space-between h-100">
              <span class="text-onSurface text-caption">Financement</span>
            <v-icon size="16" color="onSurface">mdi-currency-eur</v-icon>
          </div>
        </v-card>
      </v-col>
  
    </v-row>
    <v-row :class="smAndDown ? 'px-4' : ''" class="mb-4">
      <v-col cols="12" md="4" order-lg="1">

      </v-col>
      <v-col cols="12" md="4" order-lg="1">

      </v-col>
      <v-col cols="12" md="4" order-lg="3" class="d-flex justify-center">
        <v-card color="surfaceContainerLow" rounded="xl" width="200px" class="pa-6 cursor-pointer" height="48" @click="logout" flat>
          <div class="d-flex align-center justify-center h-100">
            <span class="text-h7 font-weight-medium text-error">Se déconnecter</span>

          </div>
        </v-card>
      </v-col>

    </v-row>
    <TransferDialog :dialogVisible="transferDialog" :userId="userId" @update:dialogVisible="transferDialog = $event"
      @transfer-success="handleTransferSuccess" />



    <TeamChangeDialog :dialogMode="dialogMode" :modelValue="addDialog" @onSubmit="handleTeamChange"
      @onClose="closeAddDialog" @update:modelValue="addDialog = $event" />
  </v-container>

</template>

<script setup>
import { computed, onMounted, ref, onUnmounted, onBeforeUnmount } from 'vue';
import { useDisplay } from 'vuetify';
import { useTeamStore } from "@/stores/teamStore.js";
import { useAuthStore } from "@/stores/authStore.js";
import { useSnackbarStore } from "@/stores/snackbarStore.js";
import { usePointStore } from '@/stores/pointStore.js';
import TransferDialog from '@/components/Profile/TransferDialog.vue';
import PointsCard from '@/components/Profile/PointsCard.vue';

import { API_URL } from '@/config/api';
import { useRouter } from 'vue-router';

const router = useRouter();

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
const sentinel = ref(null);
const containerHeight = ref(0);
const headerHeight = ref(0);
const headerWidth = ref(0);
const observer = ref(null);
const container = ref(null);
const header = ref(null);
const containerWidth = ref(0);
const safeMarginTop = ref(0);
let resizeObserver = null;
const userId = computed(() => authStore.userId);

const items = ref([
  {
    id: 1,
    title: 'Mon centre',
    icon: 'mdi-airport',
    link: '/center/' + authStore.centerId + '/teams'
  },
  {
    id: 2,
    title: 'Tour de service',
    icon: 'mdi-file-plus-outline',
    link: '/rotation'
  },
  {
    id: 3,
    title: 'Assistance',
    icon: 'mdi-message-outline',
    link: '/contact-admin'
  }
])




const openAddDialog = (mode) => {
  dialogMode.value = mode;
  addDialog.value = true;
};

const closeAddDialog = () => {
  addDialog.value = false;
};

const setContainerHeight = () => {
  if (container.value) {
    console.log(header.value.$el.offsetHeight + 'px')
    containerHeight.value = header.value.$el.offsetHeight;
  }
}

const setHeaderWidth = () => {
  if (container.value) {
    console.log(container.value.offsetWidth)
    headerWidth.value = container.value.offsetWidth;
  }
}

const handleTeamChange = async (data, conflictToReplace) => {
  try {
    isLoading.value = true;
    if (conflictToReplace) {
      await teamStore.deleteTeamOccurrence(userId.value, conflictToReplace._id);
    }
    await teamStore.assignUserToTeam(userId.value, {
      teamId: data.teamId,
      fromDate: data.fromDate,
      toDate: data.toDate,
    });
    closeAddDialog();
    snackbarStore.showNotification(`Changement d'équipe validé à partir du ${data.fromDate.substring(0, 10)}`, 'onPrimary', "mdi-crowd");
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

const safeAreaTop = computed(() => {
  return getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top') || '0px'
})





const logout = () => {
  authStore.logOut();
  router.push('/login');
};

// Gestionnaire d'événement de redimensionnement
const handleResize = () => {


  setHeaderWidth();
};

onMounted(() => {
  // Ajouter l'écouteur d'événement de redimensionnement
  resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(container.value);
  setContainerHeight();
  setHeaderWidth();
});



onMounted(async () => {
  try {
    isLoading.value = true;
    safeMarginTop.value = 64 + parseInt(safeAreaTop.value?.replace('px', ''))



    if (sentinel.value) {
      setTimeout(() => {
        observer.value = new IntersectionObserver(
          (entries) => {
            entries.forEach(entry => {
              isSticky.value = !entry.isIntersecting;
            })

          },
          {
            root: null,
            rootMargin: `-${safeMarginTop.value}px 0px 0px 0px `,
            threshold: 1
          }
        );
        observer.value.observe(sentinel.value);
      }, 400);
    }


  } catch (error) {
    console.error(error.message);
    snackbarStore.showNotification(error.message, 'onError');
  } finally {
    isLoading.value = false;
  }
});

onUnmounted(() => {
  resizeObserver.disconnect();
  if (observer.value) {
    observer.value.disconnect();
  }
});

const headerStyle = reactive({
  position: computed(() => (isSticky.value ? 'fixed' : 'relative')),
  background: computed(() => (isSticky.value ? 'rgba(var(--v-theme-background), 0.99)' : 'transparent')),
  top: computed(() => (isSticky.value ? safeMarginTop.value + 'px' : '0px')),
  borderRadius: computed(() => {
    if (isSticky.value && smAndDown.value) {
      return '0px 0px 24px 24px !important'
    }
    if (isSticky.value && !smAndDown.value) {
      return '0px 0px 0px 0px !important'
    }
    return '24px !important'
  }),
  transition: 'border-radius 0.3s ease, padding 0.3s ease, margin-top 0.3s ease, height 0.3s ease',
  width: computed(() => headerWidth.value + 'px'),
  boxShadow: computed(() => (isSticky.value && smAndDown.value ? '0 20px 20px 4px rgba(0, 0, 0, 0.096), 0 0 0 0px rgba(255, 255, 255, 0.000), 0 4px 8px rgba(0, 0, 0, 0.048)' : 'none')),
  zIndex: '10',
  borderBottom: computed(() => (isSticky.value ? '1px solid rgba(var(--v-theme-on-surface), 0.1)' : 'none')),

})

</script>

<style scoped></style>
