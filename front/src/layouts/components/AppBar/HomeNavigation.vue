<template>
  <div class="d-flex justify-center align-center">
    <!-- <ThemeSwitch 
      :model-value="isDarkTheme" 
      @update:model-value="$emit('update-theme', $event)" 
      class="mr-2" 
    /> -->
    
    <v-btn 
      variant="text" 
      class="text-body-2 nav-link" 
      @click="$emit('navigate-contact')"
    >
      Assistance
    </v-btn>
    
    <v-btn 
      variant="text" 
      class="text-body-2 nav-link" 
      @click="$emit('open-icnagenda')"
    >
      Icnagenda
      <v-icon class="ml-3 text-medium-emphasis">mdi-open-in-new</v-icon>
    </v-btn>
    
    <v-btn 
      variant="text" 
      class="text-body-2 nav-link" 
      @click="$emit('open-olafatco')"
    >
      Olafatco
      <v-icon class="ml-3 text-medium-emphasis">mdi-open-in-new</v-icon>
    </v-btn>
  </div>
  
  <v-scroll-y-reverse-transition>
    <div v-if="!showButtons" class="d-flex">
      <!-- <div class="block d-flex">
        <v-btn 
          prepend-icon="mdi-lightning-bolt" 
          variant="flat" 
          rounded="lg" 
          @click="$emit('navigate-get-started')"
        >
          Get started
        </v-btn>
      </div> -->
      <div class="d-flex mx-5">
        <v-btn 
          variant="flat" 
          rounded="lg" 
          color="onBackground" 
          append-icon="mdi-arrow-right"
          @click="$emit('navigate-login')"
        >
          Se connecter
        </v-btn>
      </div>
    </div>
  </v-scroll-y-reverse-transition>
</template>

<script setup>
import ThemeSwitch from './ThemeSwitch.vue';

// Props
defineProps({
  showButtons: {
    type: Boolean,
    default: false
  },
  isDarkTheme: {
    type: Boolean,
    required: true
  }
});

// Emits
defineEmits([
  'update-theme',
  'navigate-contact',
  'navigate-get-started',
  'navigate-login',
  'open-icnagenda',
  'open-olafatco'
]);
</script>

<style scoped>
.block {
  position: relative;
  z-index: 0;
  overflow: visible !important;
  opacity: 1 !important;
}

.block:after, .block:before {
  content: '';
  position: absolute;
  left: -1.5px;
  top: -1.5px;
  border-radius: 10px;
  background: linear-gradient(45deg, #ffc0d4, rgba(237, 202, 255, 0.94), rgba(250, 152, 248, 0.05),
  rgba(159, 159, 248, 0.22), #ffccdd);
  background-size: 400%;
  width: calc(100% + 3px);
  height: calc(100% + 3px);
  z-index: -1;
  animation: steam 7s linear infinite;
}

@keyframes steam {
  0% {
    background-position: 0 0;
  }
  80% {
    background-position: 400% 0;
  }
  100% {
    background-position: 400% 0;
  }
}

.block:after {
  filter: blur(5px);
}

.nav-link:hover {
  color: #84d0ff !important;
  transition: color 0.3s ease;
}

:deep(.nav-link.v-btn .v-btn__overlay) {
  background-color: transparent !important;
  opacity: 0 !important;
}
</style> 