<template>
  <div class="landing-page">
    <!-- Droites qui se croisent et formes arrondies : hors du conteneur, sur toute la largeur de la page, en parallaxe (elles défilent moins vite que la page) -->
    <ParallaxLayer fixed>
      <ArtLineField class="art art--lines" />
    </ParallaxLayer>

    <v-container fluid class="landing-content">
      <v-row align="center" justify="start" style="min-height: 800px">
        <v-col cols="12" sm="12" md="12" lg="12" class="py-16">
          <div class="d-flex align-center" :class="mdAndUp ? 'justify-start' : 'justify-center'">
            <v-card variant="text" style="z-index: 34 !important">
              <v-card-text class="d-flex align-start flex-column" :class="{ 'align-center': !mdAndUp }">
                <div class="text-label-medium subtitle-animation">Votre site de rempla</div>
                <div
                  class="font-weight-medium d-flex flex-wrap mt-4 text-display-large"
                  :class="[mdAndUp ? 'text-display-large' : 'text-display-medium ', { 'justify-center': !mdAndUp }]"
                >
                  <span class="title-animation" style="margin-right: 1rem; font-weight: 900 !important">Bienvenue</span>

                  <span class="title-animation" style="margin-right: 1rem; font-weight: 900 !important">sur</span>
                  <span class="gradient font-weight-bold title-animation">Céleste</span>
                </div>
                <div class="text-title-large mt-5 subtitle-animation">Votre nouvelle plateforme de remplacements</div>
              </v-card-text>

              <v-card-actions class="ml-2 pb-5 flex-wrap ga-4" :class="{ 'justify-center': !mdAndUp }">
                <div class="block d-flex button-animation" style="animation-delay: 1.1s">
                  <v-btn
                    prepend-icon="mdi-lightning-bolt"
                    elevation="1"
                    style="border-radius: 16px !important"
                    height="48px "
                    class="px-8"
                    variant="flat"
                    color="primary"
                    @click="router.push({ path: '/get-started' })"
                  >
                    Get started
                  </v-btn>
                </div>

                <div class="d-flex button-animation soft-glow" style="animation-delay: 1.3s; z-index: 34 !important">
                  <ShapeBurst>
                    <v-btn
                      class="px-8 pr-8"
                      variant="flat"
                      style="border-radius: 200px !important"
                      height="48px"
                      color="surfaceContainer"
                      @click="router.push({ path: '/login' })"
                    >
                      <template #append>
                        <v-icon color="primary"> mdi-arrow-right </v-icon>
                      </template>
                      Se connecter
                    </v-btn>
                  </ShapeBurst>
                </div>
              </v-card-actions>
            </v-card>
          </div>
        </v-col>
      </v-row>

      <v-row class="px-4 py-16 mt-16 d-flex align-content-stretch" width="100%" style="min-height: 200px; width: 100%">
        <v-col v-for="(card, index) in cards" :key="index" cols="12" md="4">
          <div
            :ref="
              (el) => {
                if (el) cardRefs[index] = el;
              }
            "
            style="min-height: 200px"
          >
            <transition name="card">
              <div v-show="card.isVisible">
                <v-card height="100%" flat class="flex-column d-flex pa-8 bg-surfaceContainer">
                  <v-scale-transition>
                    <v-icon color="primary" class="mt-4 mb-4 align-self-center">
                      {{ card.icon }}
                    </v-icon>
                  </v-scale-transition>

                  <v-slide-y-transition>
                    <span class="text-body-large mt-2 font-weight-bold">{{ card.title }}</span>
                  </v-slide-y-transition>
                  <v-slide-y-transition>
                    <span class="text-body-small text-medium-emphasis">{{ card.description }}</span>
                  </v-slide-y-transition>
                </v-card>
              </div>
            </transition>
          </div>
        </v-col>
      </v-row>

      <v-row class="px-4 pt-16 pb-16 mt-16 d-flex align-content-stretch mb-16">
        <v-fade-transition group appear>
          <v-col key="center" cols="12" md="4">
            <v-card
              ref="statsRef"
              color="transparent"
              flat
              height="100%"
              class="flex-column align-center d-flex pa-4"
            >
              <span class="text-display-large mt-2 font-weight-bold text-primary">{{
                Math.floor(animatedCenters)
              }}</span>
              <span class="text-body-large text-medium-emphasis">centres</span>
            </v-card>
          </v-col>
          <v-col key="controllers" cols="12" md="4">
            <v-card color="transparent" flat height="100%" class="flex-column align-center d-flex pa-4">
              <span class="text-display-large mt-2 font-weight-bold text-onSurface">{{
                Math.floor(animatedNumber)
              }}</span>
              <span class="text-body-large text-medium-emphasis">contrôleurs</span>
            </v-card>
          </v-col>
          <v-col key="replace" cols="12" md="4">
            <v-card color="transparent" flat height="100%" class="flex-column align-center d-flex pa-4">
              <span class="text-display-large mt-2 font-weight-bold" style="opacity: 0.7">{{
                Math.floor(animatedReplacements)
              }}</span>
              <span class="text-body-large text-medium-emphasis">remplacements</span>
            </v-card>
          </v-col>
        </v-fade-transition>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { useDisplay } from 'vuetify';
import { useRouter } from 'vue-router';
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useStatStore } from '@/stores/statStore';

const statStore = useStatStore();

const { mdAndUp } = useDisplay();
const router = useRouter();
const cardRefs = ref([]);

const cards = ref([
  {
    icon: 'mdi-responsive',
    title: 'Une gestion fluide, sur tous les écrans',
    description:
      "Une plateforme entièrement repensée pour s'adapter à vos besoins, quel que soit l'appareil grâce à une interface responsive et intuitive",
    isVisible: false,
  },
  {
    icon: 'mdi-shield-check-outline',
    title: 'Sécurité et fiabilité',
    description:
      "Votre tranquillité d'esprit est notre priorité. Avec des protocoles de sécurité renforcés et une plateforme fiable, remplacez en toute sérénité",
    isVisible: false,
  },
  {
    icon: 'mdi-calendar-sync',
    title: 'Gestion dynamique des horaires',
    description: 'Finis les problèmes de tours de service. Remplacez ou échangez vos vacations en quelques clics',
    isVisible: false,
  },
]);

let observer = null;

const setupIntersectionObserver = async () => {
  const options = {
    root: null,
    rootMargin: '-100px',
    threshold: [0.1, 0.5],
  };

  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const index = cardRefs.value.findIndex((ref) => ref === entry.target);

      if (index !== -1) {
        // Utiliser le ratio d'intersection le plus élevé
        const isVisible = entry.intersectionRatio > 0.1;
        if (isVisible !== cards.value[index].isVisible) {
          cards.value[index].isVisible = isVisible;
        }
      }
    });
  }, options);

  await nextTick();

  cardRefs.value.forEach((ref) => {
    if (ref) {
      observer.observe(ref);
    }
  });
};

const animatedNumber = ref(0);
const animatedCenters = ref(0);
const animatedReplacements = ref(0);
const animationIntervals = {
  controllers: null,
  centers: null,
  replacements: null,
};
const statsRef = ref(null);

const startAnimation = (target, current, key, duration) => {
  if (animationIntervals[key]) {
    clearInterval(animationIntervals[key]);
  }

  const animationDuration = duration || 2000;
  const delay = 20;
  const increment = target / (animationDuration / delay);

  animationIntervals[key] = setInterval(() => {
    if (current.value < target) {
      current.value = Math.min((current.value += increment), target);
    } else {
      clearInterval(animationIntervals[key]);
    }
  }, delay);
};

const getStats = async () => {
  await statStore.fetchStats();
};

const setupStatsObserver = async () => {
  await nextTick();

  const options = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1,
  };

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        startAnimation(statStore.totalUsers, animatedNumber, 'controllers', 1000);
        startAnimation(statStore.totalCenters, animatedCenters, 'centers', 1500);
        startAnimation(statStore.totalDemands, animatedReplacements, 'replacements', 2000);
      } else {
        animatedNumber.value = 0;
        animatedCenters.value = 0;
        animatedReplacements.value = 0;
        Object.values(animationIntervals).forEach((interval) => {
          if (interval) clearInterval(interval);
        });
      }
    });
  }, options);

  await nextTick();

  const element = statsRef.value?.$el || statsRef.value;
  if (element) {
    statsObserver.observe(element);
  } else {
    console.warn('Stats ref is not available');
  }

  return statsObserver;
};

let statsObserver = null;

onMounted(async () => {
  getStats();
  await setupIntersectionObserver();
  statsObserver = await setupStatsObserver();
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
  if (statsObserver) {
    statsObserver.disconnect();
  }
  Object.values(animationIntervals).forEach((interval) => {
    if (interval) clearInterval(interval);
  });
});
</script>

<style scoped>
.landing-page {
  position: relative;
}

/* Le fond (`ParallaxLayer`) remplit sa couche */
.art--lines {
  width: 100%;
  height: 100%;
  opacity: 1;
}

.landing-content {
  position: relative;
  z-index: 1;
}

.gradient {
  color: transparent;
  font-weight: 900 !important;
  background: linear-gradient(
    to right,
    color-mix(in srgb, rgb(var(--v-theme-primary)) 00%, transparent),
    color-mix(in srgb, rgb(var(--v-theme-primary)) 20%, transparent),
    color-mix(in srgb, rgb(var(--v-theme-primary)) 100%, transparent),
    color-mix(in srgb, rgb(var(--v-theme-primary)) 00%, transparent)
  );
  background-size: 200% auto;
  background-clip: text;
  animation: animatedTextGradient 10s linear infinite;
}

@keyframes animatedTextGradient {
  0% {
    background-position: 0 0;
  }

  100% {
    background-position: 200% center;
  }
}

@keyframes buttonEntrance {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes titleEntrance {
  0% {
    opacity: 0;
    transform: translateY(-5px);
  }

  100% {
    opacity: 1;
    transform: translateY(-0px);
  }
}

.soft-glow {
  position: relative;
  z-index: 1;
}

.soft-glow::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, rgb(var(--v-theme-primary)) 20%, transparent) 0%,
    transparent 100%
  );
  transform: translate(-50%, -50%);
  filter: blur(10px);
  z-index: -1;
}

.button-animation {
  animation: buttonEntrance 0.6s ease forwards;
  animation-delay: 2s;
  opacity: 0;
}

.title-animation {
  animation:
    titleEntrance 0.6s ease forwards,
    animatedTextGradient 10s linear infinite;
  animation-delay: 0.5s;
  opacity: 0;
}

.subtitle-animation {
  animation: titleEntrance 0.6s ease forwards;
  animation-delay: 0.6s;
  opacity: 0;
}

.v-card {
  transition: all 0.3s ease;
}

.v-card:hover .v-icon {
  transform: scale(1.1);
  transition: all 0.3s ease;
}

.card-enter-active {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-enter-from {
  opacity: 0;
  transform: scale(0.5);
  transform: translateY(30px);
}

.card-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-leave-to {
  opacity: 0;
  transform: scale(0.5);
  transform: translateY(30px);
}

</style>
