<template>
  <v-container fluid class="fill-height">
    <v-row justify="center" style="min-height: 80vh">
      <v-col cols="12" sm="12" md="8" lg="8" class="py-16 mt-16">
        <v-card variant="text" class="mt-16">
          <v-card-text class="d-flex align-start flex-column" :class="{'align-center': !mdAndUp}">
            <div class="text-overline subtitle-animation">Votre nouveau site de rempla</div>
            <div
              class="font-weight-medium d-flex flex-wrap mt-4"
              :class="[
                mdAndUp ? 'text-h1' : 'text-h2',
                {'justify-center': !mdAndUp}
              ]"
              :style="mdAndUp ? 'left: -8px; position: relative' : ''"
            >
           
              <span class="title-animation" style="margin-right: 1rem">Bienvenue</span>
           
              <span class="title-animation" style="margin-right: 1rem">sur</span>
              <span class="gradient font-weight-bold title-animation">Céleste</span>
          
              
            </div>
            <div class="text-h6 mt-5 subtitle-animation">Remplacer s'offre un nouveau look !</div>
          </v-card-text>

          <v-card-actions class="ml-2 pb-5 flex-wrap ga-4" :class="{'justify-center': !mdAndUp}" v-intersect="onIntersect">
            <div class="block d-flex button-animation" style="animation-delay: 1.1s;">
              <v-btn prepend-icon="mdi-lightning-bolt" height="48px" class="px-8" variant="flat" rounded="lg" color="surface" @click="router.push({ path: '/get-started' })">
                Get started
              </v-btn>
            </div>
            <div class="d-flex button-animation" style="animation-delay: 1.3s;">
              <v-btn class="px-8 pr-8" variant="flat" height="48px" rounded="lg" color="onBackground" @click="router.push({ path: '/login' })">
                <template #append>
                  <v-icon style="left:10px">mdi-arrow-right</v-icon>
                </template>
                Se connecter
              </v-btn>
            </div>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
    
    <v-row class="px-4 py-16 mt-16 d-flex align-content-stretch bg-surfaceContainer" style="min-height: 400px">
      <v-col cols="12" md="4">
        <v-card
 
          flat
          height="100%"
          rounded="xl"
          class="flex-column d-flex pa-8 bg-background"
        >
          <v-icon color="#dc8474" class="mt-4 mb-4 align-self-center" style="">mdi-responsive</v-icon>
          <v-icon color="#dc8474" style="filter: blur(10px); transform: scale(8) ; opacity: 0.2" class="position-absolute">mdi-responsive</v-icon>
          <span class="text-h7 mt-2 font-weight-bold">Une gestion fluide, sur tous les écrans</span>
          <span class="text-caption text-medium-emphasis">Une plateforme entièrement repensée pour s'adapter à vos besoins, quel que soit l'appareil gâce à une interface responsive et intuitive</span>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card
          flat
          height="100%"
          rounded="xl"
          class="flex-column d-flex pa-8 bg-background"
        >
          <v-icon color="#c8687e" class="mt-4 mb-4 align-self-center">mdi-shield-check-outline</v-icon>
          <v-icon color="#c8687e" style="filter: blur(10px); transform: scale(8) ; opacity: 0.2" class="position-absolute">mdi-shield-check-outline</v-icon>
          <span class="text-h7 mt-2 font-weight-bold">Sécurité et fiabilité</span>
          <span class="text-caption text-medium-emphasis">Votre tranquillité d'esprit est notre priorité. Avec des protocoles de sécurité renforcés et une plateforme fiable, remplacez en toute sérénité</span>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card
          flat
          height="100%"
          rounded="xl"
          class="flex-column d-flex pa-8 bg-background"
        >
          <v-icon color="#a779cd" class="mt-4 mb-4 align-self-center">mdi-calendar-sync</v-icon>
          <v-icon color="#a779cd" style="filter: blur(10px); transform: scale(8) ; opacity: 0.2" class="position-absolute">mdi-calendar-sync</v-icon>
          <span class="text-h7 mt-2 font-weight-bold">Gestion dynamique des horaires</span>
          <span class="text-caption text-medium-emphasis">Finis les problèmes de tours de service. Remplacez ou échangez vos vacations en quelques clics</span>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="px-4 pt-16 pb-16 mt-16 d-flex align-content-stretch">
      <v-fade-transition group appear>
        <v-col key="center" cols="12" md="4">
          <v-card
            flat
            color="transparent"
            height="100%"
            rounded="xl"
            class="flex-column align-center d-flex pa-4"
          >
            <span class="text-h1 mt-2 font-weight-bold">10</span>
            <span class="text-h7 text-medium-emphasis">centres</span>
          </v-card>
        </v-col>
        <v-col key="controllers" cols="12" md="4">
          <v-card
            @mouseenter="startAnimation"
            color="transparent"
            flat
            height="100%"
            rounded="xl"
            class="flex-column align-center d-flex pa-4"
          >
            <span class="text-h1 mt-2 font-weight-bold">{{ Math.floor(animatedNumber) }}</span>
            <span class="text-h7 text-medium-emphasis">contrôleurs</span>
          </v-card>
        </v-col>
        <v-col key="replace" cols="12" md="4">
          <v-card
            color="transparent"
            flat
            height="100%"
            rounded="xl"
            class="flex-column align-center d-flex pa-4"
          >
            <span class="text-h1 mt-2 font-weight-bold">2000</span>
            <span class="text-h7 text-medium-emphasis">remplacements</span>
          </v-card>
        </v-col>
      </v-fade-transition>
    </v-row>

    <v-row class="px-4 mt-16 d-flex align-content-stretch">
      <v-col cols="12" md="12">
        <v-card
          flat
          height="100%"
          rounded="xl"
          class="flex-column d-flex pa-8"
        >
          <v-card-title class="text-h6 mt-2 font-weight-bold">
            <v-icon color="#dc8474">mdi-rocket-launch</v-icon> Une gestion fluide, sur tous les écrans
          </v-card-title>
          <span class="text-caption text-medium-emphasis">Une plateforme entièrement repensée pour s'adapter à vos besoins, quel que soit l'appareil grâce à une interface responsive et intuitive</span>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { useDisplay } from 'vuetify'
import { useRouter } from 'vue-router';
import { ref } from 'vue';

export default {
  emits: ["update-topbar"],
  setup(_, { emit }) {
    const { xs, mdAndUp } = useDisplay();
    const router = useRouter();
    const inScreen = ref(false);

    const onIntersect = (isIntersecting) => {
      inScreen.value = isIntersecting;
      emit('update-topbar', inScreen.value);
    };

    const targetNumber = 500;
    const animatedNumber = ref(0);
    let animationInterval = null;

    function startAnimation() {
      const duration = 5000;
      const delay = 20; // Délai entre chaque incrémentation (en millisecondes)
      const finalValue = 500;
      const increment = finalValue / (duration / delay); // Valeur d'incrémentation

      animationInterval = setInterval(() => {
        if (animatedNumber.value < targetNumber) {
          animatedNumber.value = Math.min(animatedNumber.value += increment, finalValue);
        } else {
          clearInterval(animationInterval); // Arrêter l'animation une fois la cible atteinte
        }
      }, delay);
    }

    return {
      router,
      startAnimation,
      animatedNumber,
      onIntersect,
      inScreen,
      mdAndUp,
    };
  },
};
</script>

<style scoped>
.gradient {
  fill: transparent;
  color: #000;
  background: linear-gradient(to right, #dc8474, #c8687e 20%, #a779cd 40%, #c36abe 60%, #dc8474 80%);
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
    opacity: 0 ;
    transform: scale(0.9);
  }
  100% {
    opacity: 1 ;
    transform: scale(1);
  }
}


@keyframes titleEntrance {
  0% {
    opacity: 0 ;
    transform: translateY(-5px);
  }
  100% {
    opacity: 1 ;
    transform: translateY(-0px);
  }
}

@keyframes subtitleEntrance {
  0% {
    opacity: 0 ;

  }
  100% {
    opacity: 1 ;
 
  }
}

.title-move{
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
</style>
