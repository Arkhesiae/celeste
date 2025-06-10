<template>
  <v-container fluid class="fill-height">
    <v-row justify="center" style="min-height: 800px">
      <v-col cols="12" sm="12" md="8" lg="8" class="py-16 mt-16">
        <v-card variant="text" class="mt-16" style="z-index: 34 !important;">
          <v-card-text class="d-flex align-start flex-column" :class="{ 'align-center': !mdAndUp }">
            <div class="text-overline subtitle-animation">Votre nouveau site de rempla</div>
            <div class="font-weight-medium d-flex flex-wrap mt-4" :class="[
              mdAndUp ? 'text-h1' : 'text-h3',
              { 'justify-center': !mdAndUp }
            ]" :style="mdAndUp ? 'left: -8px; position: relative' : ''">

              <span class="title-animation" style="margin-right: 1rem ; font-weight: 900 !important;">Bienvenue</span>

              <span class="title-animation" style="margin-right: 1rem ; font-weight: 900 !important;">sur</span>
              <span class="gradient font-weight-bold title-animation">Céleste</span>


            </div>
            <div class="text-h6 mt-5 subtitle-animation">Remplacer s'offre un nouveau look !</div>
          </v-card-text>

          <v-card-actions class="ml-2 pb-5 flex-wrap ga-4" :class="{ 'justify-center': !mdAndUp }">
            <div class="block d-flex button-animation" style="animation-delay: 1.1s;">
              <v-btn prepend-icon="mdi-lightning-bolt" style="border-radius: 12px !important;" height="48px"
                class="px-8" variant="flat" rounded="lg" color="surface" @click="router.push({ path: '/get-started' })">
                Get started
              </v-btn>
            </div>
            <div class="d-flex button-animation" style="animation-delay: 1.3s; z-index: 34 !important;">
              <v-btn class="px-8 pr-8" variant="flat" style="border-radius: 12px !important;" height="48px" rounded="lg"
                color="onBackground" @click="router.push({ path: '/login' })">
                <template #append>
                  <v-icon style="left:10px">mdi-arrow-right</v-icon>
                </template>
                Se connecter
              </v-btn>
            </div>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-img src="@/assets/CRNA.png" alt="landing" :class="{ 'img-mobile': !mdAndUp, 'img-desktop': mdAndUp }" />


    </v-row>

    <v-row class="px-4 py-16 mt-16 d-flex align-content-stretch bg-background" width="100%" style="min-height: 200px ; width: 100%;">
      <v-col cols="12" md="4" v-for="(card, index) in cards" :key="index">

        <div  style="min-height: 200px;" :ref="el => { if (el) cardRefs[index] = el }">
          <transition name="card">
            <div v-show="card.isVisible" >
         
            <v-card :class="{ 'card-hover': mdAndUp }" flat height="100%"
              rounded="xl" class="flex-column d-flex pa-8 bg-surfaceContainer">
       
              <v-scale-transition>
                <v-icon color="remplacement" class="mt-4 mb-4 align-self-center">{{ card.icon }}</v-icon>
              </v-scale-transition>
              <v-icon color="remplacement" style="filter: blur(10px); transform: scale(8) ; opacity: 0.2"
                class="position-absolute">{{ card.icon }}</v-icon>
              <v-slide-y-transition>
                <span class="text-h7 mt-2 font-weight-bold">{{ card.title }}</span>
              </v-slide-y-transition>
              <v-slide-y-transition>
                <span class="text-caption text-medium-emphasis">{{ card.description }}</span>
              </v-slide-y-transition>
            </v-card>
                 
          </div>
          </transition>
        </div>

      </v-col>
    </v-row>

    <v-row class="px-4 pt-16 pb-16 mt-16 d-flex align-content-stretch">
      <v-fade-transition group appear>
        <v-col key="center" cols="12" md="4">
          <v-card ref="statsRef" color="transparent" flat height="100%" rounded="xl" class="flex-column align-center d-flex pa-4">
            <span class="text-h1 mt-2 font-weight-bold gradient">{{ Math.floor(animatedCenters) }}</span>
            <span class="text-h7 text-medium-emphasis">centres</span>
          </v-card>
        </v-col>
        <v-col key="controllers" cols="12" md="4">
          <v-card color="transparent" flat height="100%" rounded="xl"
            class="flex-column align-center d-flex pa-4">
            <span class="text-h1 mt-2 font-weight-bold gradient">{{ Math.floor(animatedNumber) }}</span>
            <span class="text-h7 text-medium-emphasis">contrôleurs</span>
          </v-card>
        </v-col>
        <v-col key="replace" cols="12" md="4">
          <v-card color="transparent" flat height="100%" rounded="xl" class="flex-column align-center d-flex pa-4">
            <span class="text-h1 mt-2 font-weight-bold">{{ Math.floor(animatedReplacements) }}</span>
            <span class="text-h7 text-medium-emphasis">remplacements</span>
          </v-card>
        </v-col>
      </v-fade-transition>
    </v-row>

    <v-row class="px-4 mt-16 d-flex align-content-stretch">
      <v-col cols="12" md="12">
        <v-card flat height="100%" rounded="xl" class="flex-column d-flex pa-8">
          <v-card-title class="text-h6 mt-2 font-weight-bold">
            <v-icon color="remplacement">mdi-rocket-launch</v-icon>
          </v-card-title>
          <span class="text-caption text-medium-emphasis"></span>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useDisplay } from 'vuetify'
import { useRouter } from 'vue-router';
import { ref, onMounted, onUnmounted, nextTick } from 'vue';


const emit = defineEmits(["update-topbar"]);
const { mdAndUp } = useDisplay();
const router = useRouter();
const inScreen = ref(false);
const cardRefs = ref([]);

const cards = ref([
  {
    icon: 'mdi-responsive',
    title: 'Une gestion fluide, sur tous les écrans',
    description: "Une plateforme entièrement repensée pour s'adapter à vos besoins, quel que soit l'appareil grâce à une interface responsive et intuitive",
    isVisible: false
  },
  {
    icon: 'mdi-shield-check-outline',
    title: 'Sécurité et fiabilité',
    description: "Votre tranquillité d'esprit est notre priorité. Avec des protocoles de sécurité renforcés et une plateforme fiable, remplacez en toute sérénité",
    isVisible: false
  },
  {
    icon: 'mdi-calendar-sync',
    title: 'Gestion dynamique des horaires',
    description: 'Finis les problèmes de tours de service. Remplacez ou échangez vos vacations en quelques clics',
    isVisible: false
  }
]);

let observer = null;

const setupIntersectionObserver = async () => {
  const options = {
    root: null,
    rootMargin: '-100px',
    threshold: [0.1, 0.5]
  };

  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const index = cardRefs.value.findIndex(ref => ref === entry.target);
      
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

const setupTopbarObserver = async () => {
  await nextTick();
  console.log('Initialisation de l\'observateur de la barre supérieure');

  const topbarOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const topbarObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {

      inScreen.value = entry.isIntersecting;
      emit('update-topbar', inScreen.value);
    });
  }, topbarOptions);

  const buttonsSection = document.querySelector('.v-card-actions');
  if (buttonsSection) {
    console.log('Section des boutons trouvée, observation démarrée');
    topbarObserver.observe(buttonsSection);
  } else {
    console.warn('Section des boutons non trouvée');
  }

  return topbarObserver;
};

let topbarObserver = null;

const animatedNumber = ref(0);
const animatedCenters = ref(0);
const animatedReplacements = ref(0);
const animationIntervals = {
  controllers: null,
  centers: null,
  replacements: null
};
const statsRef = ref(null);

const startAnimation = (target, current, key) => {
  if (animationIntervals[key]) {
    clearInterval(animationIntervals[key]);
  }

  const duration = 2000;
  const delay = 20;
  const increment = target / (duration / delay);

  animationIntervals[key] = setInterval(() => {
    if (current.value < target) {
      current.value = Math.min(current.value += increment, target);
    } else {
      clearInterval(animationIntervals[key]);
    }
  }, delay);
};

const setupStatsObserver = async () => {
  await nextTick();
  
  const options = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        console.log("ae")
        startAnimation(500, animatedNumber, 'controllers');
        startAnimation(10, animatedCenters, 'centers');
        startAnimation(2000, animatedReplacements, 'replacements');
      } else {
        animatedNumber.value = 0;
        animatedCenters.value = 0;
        animatedReplacements.value = 0;
        Object.values(animationIntervals).forEach(interval => {
          if (interval) clearInterval(interval);
        });
      }
    });
  }, options);

  await nextTick();
  
  const element = statsRef.value?.$el || statsRef.value;
  if (element) {
    console.log("Observing stats section", element);
    statsObserver.observe(element);
  } else {
    console.warn("Stats ref is not available");
  }

  return statsObserver;
};

let statsObserver = null;

onMounted(async () => {
  await setupIntersectionObserver();
  topbarObserver = await setupTopbarObserver();
  statsObserver = await setupStatsObserver();
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
  if (topbarObserver) {
    topbarObserver.disconnect();
  }
  if (statsObserver) {
    statsObserver.disconnect();
  }
  Object.values(animationIntervals).forEach(interval => {
    if (interval) clearInterval(interval);
  });
});

const targetNumber = 500;

onMounted(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1
  });

  const buttonSection = document.querySelector('.button-section');
  if (buttonSection) {
    observer.observe(buttonSection);
  }

  const statsSection = document.querySelector('.stats-section');
  if (statsSection) {
    observer.observe(statsSection);
  }
});

</script>

<style scoped>
.gradient {
  fill: transparent;
  color: #000;
  font-weight: 900 !important;
  background: linear-gradient(to right, rgb(var(--v-theme-remplacement)) 00%, #a779cd 20%, rgb(var(--v-theme-permutation)) 75%, rgb(var(--v-theme-remplacement)) 100%);
  background-size: 200% auto;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-fill-color: transparent;
  animation: animatedTextGradient 15s linear infinite;
}

@keyframes animatedTextGradient {
  to {
    background-position: 200% center;
  }
}

.block {
  position: relative;
  z-index: 0;
  overflow: visible !important;

}

.block:after,
.block:before {
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

@keyframes subtitleEntrance {
  0% {
    opacity: 0;

  }

  100% {
    opacity: 1;

  }
}

.title-move {
  transition: all 8s cubic-bezier(0.55, 0, 0.1, 1);

}

.title-enter-active,
.title-leave-active {
  transition: all 8s cubic-bezier(0.55, 0, 0.1, 1);
}

.title-enter-from,
.title-leave-to {
  opacity: 0 !important;

}


.button-animation {
  animation: buttonEntrance 0.6s ease forwards;
  animation-delay: 2s;
  opacity: 0;
}

.title-animation {
  animation: titleEntrance 0.6s ease forwards;
  animation-delay: .5s;
  opacity: 0;
}


.subtitle-animation {
  animation: titleEntrance 0.6s ease forwards;
  animation-delay: .6s;
  opacity: 0;
}

.img-mobile {
  height: 800px;
  width: 800px;
  position: absolute;
  top: 400px;
  left: 50%;
  transform: translateX(-36%);
}

.img-desktop {
  z-index: 10;
  width: 900px;
  height: 800px;
  object-fit: cover;
  position: absolute;
  right: -250px;
  top: 200px;
}

.card-hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, box-shadow;
}

.card-hover:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.v-card {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.v-card:hover .v-icon {
  transform: scale(1.1);
  transition: transform 0.3s ease;
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
