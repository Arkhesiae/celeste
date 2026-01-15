<template>
  <ScalableDialog
    title="Demande "
    :is-dialog-visible="modelValue"
    max-width="600"
    :show-actions="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div>
      <div class="text-center mb-6">
        <h1 class="text-h3 font-weight-bold">
          {{ demand.posterShift?.shift?.name }}
        </h1>
        <div>
          <span class="text-caption font-weight-bold text-medium-emphasis">{{ getShiftHours.startTime }} - {{
            getShiftHours.endTime
          }}</span>
          <span
            v-if="getShiftEndsNextDay"
            class="text-caption font-weight-bold opacity-50 ml-1"
            style="font-size: 10px !important; top: -2px; position: relative;"
          >+1</span>
        </div>


        <div class="d-flex justify-center mt-3 gap-3">
          <v-chip
            class="px-4"
            rounded="xl"
            color="surfaceContainer"
            variant="flat"
          >
            <div class="dot-big dot-green mr-2" />
            Compatible
          </v-chip>
          <v-chip
            class="px-4"
            rounded="xl"
            color="surfaceContainer"
            variant="flat"
          >
            <div class="dot-big dot-red mr-2" />
            Incompatible
          </v-chip>
        </div>
      </div>

      <v-card
        rounded="xl"
        color="background"
        elevation="0"
        class="mb-4 pa-4"
        @click="showUserDetails = !showUserDetails"
      >
        <div class="d-flex justify-space-between align-center">
          <h3 class="text-subtitle-1 font-weight-medium mb-0">
            {{ poster?.name }} {{ poster?.lastName }}
          </h3>
          <v-avatar
            size="32"
            variant="tonal"
          >
            <v-img
              v-if="getUserById(demand?.posterId)?.avatar"
              :src="`${API_URL}${getUserById(demand?.posterId)?.avatar}`"
              alt="Avatar"
            />
            <v-icon
              v-else
              size="x-small"
            >
              mdi-account
            </v-icon>
          </v-avatar>
        </div>
        <v-expand-transition>
          <div v-if="showUserDetails">
            <div class="d-flex flex-column">
              <div class="d-flex ga-1 align-center">
                <span
                  class="pa-0 text-medium-emphasis"
                  style="font-size: 14px;"
                >
                  {{ poster?.email }}
                </span>
                <v-icon size="12">
                  mdi-content-copy
                </v-icon>
              </div>
                
              <span class="text-caption opacity-70 font-weight-medium">
                {{ poster?.personalData?.phoneNumber }}
              </span>
            </div>
          </div>
        </v-expand-transition>
      </v-card>

      <v-card
        rounded="xl"
        color="background"
        elevation="0"
        class="mb-4 pa-4"
      >
        <div class="d-flex align-center justify-space-between">
          <div
            class="d-flex align-center "
            style="position: relative; width: 20px;"
          >
            <div
              v-if="demand?.type === 'switch'"
              class="d-flex align-center ga-2"
            >
              <v-icon
                class=""
                style="top: 1px; font-size: 14px;"
                icon="mdi-swap-horizontal"
              />
            </div>
            <div
              v-if="demand?.type === 'substitution'"
              class="d-flex align-center ga-2"
            >
              <v-icon
                class=""
                style="top: 1px; font-size: 14px;"
                icon="mdi-account-arrow-left-outline "
              />
            </div>
            <div
              v-if="demand?.type === 'hybrid'"
              class="d-flex align-center ga-2 position-relative"
            >
              <v-icon
                class="ml-n1"
                style="top: 1px; font-size: 14px;"
                icon="mdi-account-arrow-left-outline "
              />
              <v-icon
                class="ml-n2"
                style="top: 2px; font-size: 14px; position: absolute; left: 10px;"
                icon="mdi-swap-horizontal"
              />
            </div>
          </div>
          <span class="text-disabled text-body-2 font-weight-medium">{{ formatType(demand.type) }}</span>
        </div>
      </v-card>

      <v-card
        rounded="xl"
        elevation="0"
        class="mb-4 px-4 py-2"
        color="background"
      >
        <div
          class="d-flex justify-space-between py-2 align-center"
          style="height: 48px;"
        > 
          <span class="text-body-2 font-weight-medium text-medium-emphasis">Points</span>
          <div class="d-flex ga-1 align-end">
            <span class="text-body-2 font-weight-medium text-disabled">{{ demand.points }}</span>
            <LogoCopy />
          </div>
        </div>
        <v-divider />
        <div
          class="d-flex justify-space-between py-2 align-center"
          style="height: 48px;"
        >
          <span class="text-body-2 font-weight-medium text-medium-emphasis">Permutations</span>
          <div class="d-flex ga-2">
            <v-chip
              v-for="s in demand.acceptedSwitches"
              :key="s.shift"
              rounded="lg"
              size="small"
              variant="tonal"
            >
              <v-icon
                start
                size="small"
              >
                mdi-swap-horizontal
              </v-icon>
              {{ s.shift?.name }} : {{ s.points }}
            </v-chip>
          </div>
        </div>
      </v-card>


      <v-card
        color="background"
        rounded="xl"
        elevation="0"
        class="mb-4 pa-4"
      >
        <div class="d-flex justify-space-between align-center text-disabled">
          <span class="text-body-2 font-weight-medium text-medium-emphasis">Date</span>
          <span class="text-body-2 text-disabled">{{ formatDate(demand.posterShift?.date) }}</span>
        </div>
      </v-card>

      <v-card
        v-if="demand.comment"
        color="background"
        rounded="xl"
        elevation="0"
        class="mb-4 pa-4"
      >
        <span class="text-disabled text-body-2 font-weight-medium">{{ demand.comment }}</span>
      </v-card>

      <v-card
        color="background"
        rounded="xl"
        elevation="0"
        class="mb-4 pa-4"
      >
        <div class="d-flex align-center ga-2">
          <v-icon
            size="12"
            icon="mdi-eye-outline"
          />
          <span class="text-body-2 text-medium-emphasis">
            Vue par {{ demand.seenBy?.length }} personnes
          </span>
        </div>
      </v-card>

       
      <div class="d-flex flex-column my-4 text-body-2 font-weight-medium">
        <div class="d-flex align-center justify-space-between py-3 ga-2">
          <span>Remplacer</span>
          <v-icon icon="mdi-chevron-right" />
        </div>
        <v-divider />
        <div class="d-flex align-center justify-space-between py-3 ga-2">
          <span>Permuter</span>
          <v-icon icon="mdi-chevron-right" />
        </div>
      </div>
     

      <v-card
        rounded="xl"
        elevation="0"
        class="mb-4"
        color="error"
      >
        <v-list bg-color="error">
          <v-list-item
            color="error"
            append-icon="mdi-chevron-right"
          >
            <v-list-item-title>Se désister</v-list-item-title>
          </v-list-item>
          <v-list-item
            color="error"
            append-icon="mdi-chevron-right"
          >
            <v-list-item-title>Annuler</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>

      <div class="text-center mt-4 text-disabled text-caption">
        <span> Créée il y a {{ timeSinceCreation }}

        </span>
      </div>
    </div>
  </ScalableDialog>


  <v-dialog
    v-model="showConfirmationDialog"
    max-width="500"
    persistent
    style="z-index: 1000000 !important"
  >
    <v-card
      rounded="xl"
      color="surfaceContainer"
      class="pa-6"
      style="z-index: 1000000 !important"
    >
      <v-card-title class="text-h5 pa-0">
        Confirmation de remplacement
      </v-card-title>
      <v-card-text class="pa-0 mb-6">
        <p v-if="userHasShift">
          Vous travaillez déjà ce jour
        </p>
        <p v-else>
          Êtes-vous sûr de vouloir accepter ce remplacement ?
        </p>
      </v-card-text>
      <v-card-actions class="pa-0">
        <v-btn
          color="secondary"
          variant="text"
          rounded="xl"
          @click="showConfirmationDialog = false"
        >
          Annuler
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="userHasShift && demand?.canSwitch"
          color="permutation"
          variant="tonal"
          rounded="xl"
          :loading="loading.accept"
          @click="handleSwap"
        >
          Permuter
        </v-btn>
        <v-btn
          color="remplacement"
          variant="tonal"
          rounded="xl"
          :loading="loading.accept"
          @click="handleConfirmAccept"
        >
          {{ userHasShift ? 'Remplacer' : 'Confirmer' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="showConfirmationSwapDialog"
    max-width="500"
    style="z-index: 1000000 !important"
  >
    <v-card
      rounded="xl"
      color="surfaceContainer"
      class="pa-6"
      style="z-index: 1000000 !important"
    >
      <v-card-title class="text-h5 pa-0">
        Confirmation de permutation
      </v-card-title>
      <v-card-text class="pa-0 mb-6">
        <p>
          Êtes-vous sûr de vouloir permuter ?
        </p>
      </v-card-text>
      <v-card-actions class="pa-0">
        <v-btn
          color="secondary"
          variant="text"
          rounded="xl"
          @click="showConfirmationSwapDialog = false"
        >
          Annuler
        </v-btn>
        <v-spacer />
        <v-btn
          color="permutation"
          variant="tonal"
          rounded="xl"
          :loading="loading.accept"
          @click="handleConfirmSwap"
        >
          Permuter
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/userStore';
import { useDate } from 'vuetify'
import { useDisplay } from 'vuetify'
import { API_URL } from '@/config/api';


const userStore = useUserStore();
const date = useDate()
const showConfirmationDialog = ref(false)
const showConfirmationSwapDialog = ref(false)
const { smAndDown } = useDisplay()
const emit = defineEmits(['update:modelValue']);
const showUserDetails = ref(false)


const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  demand: {
    type: Object,

  }
})

const getUserById = (userId) => userStore.users.find((user) => user._id === userId);

let intervalId

const poster = computed(() => {
  if (!props.demand?.posterId) return null;
  if (typeof props.demand.posterId === 'object' && props.demand.posterId !== null) {
    return props.demand.posterId;
  }
  return getUserById(props.demand.posterId);
});

const getShiftHours = computed(() => {
  return { startTime: props.demand?.posterShift?.shift?.default?.startTime, endTime: props.demand?.posterShift?.shift?.default?.endTime }
})

const getShiftEndsNextDay = computed(() => {
  return props.demand?.posterShift?.shift?.default?.endsNextDay
})

const timeSinceCreation = computed(() => {
  if (!props.demand?.createdAt) return ''

  const createdAt = new Date(props.demand.createdAt).getTime()
  const diffInMinutes = Math.floor((now.value - createdAt) / 60000)

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} heure${diffInHours > 1 ? 's' : ''}`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} jour${diffInDays > 1 ? 's' : ''}`
})


const formatDate = (dateString) => {
  if (!dateString) return ''

  const currentYear = new Date().getFullYear()
  const dateYear = new Date(dateString).getFullYear()
  let formattedDate = date.format(dateString, 'fullDate')
  return formattedDate



}


const formatType = (type) => {
  switch (type) {
    case 'switch':
      return 'Permutation'
    case 'substitution':
      return 'Remplacement'
    case 'hybrid':
      return 'Remplacement ou permutation'
    default:
      return type
  }
}

const now = ref(Date.now())

onMounted(() => {
  intervalId = setInterval(() => {
    now.value = Date.now()
  }, 60000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})


console.log(props.demand)



</script>

<style scoped>
.list-item {
  height: 48px;
  padding: 4px 16px;
}

.dot-green {
  position: relative;
  background-color: rgb(75, 255, 75);
}

.dot-green::after {
  content: "";
  z-index: -1;
  position: absolute;
  top: -3px;
  left: -3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: rgb(147, 243, 147);
  filter: blur(4px);
}

.dot-red {
  position: relative;
  background-color: rgb(255, 75, 75);
}

.dot-red::after {
  content: "";
  z-index: -1;
  position: absolute;
  top: -3px;
  left: -3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: rgb(243, 147, 147);
  filter: blur(4px);
}
</style>
