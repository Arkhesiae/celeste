<script setup>
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'

const router = useRouter()
const showContent = ref(false)

onMounted(() => {
  setTimeout(() => {
    showContent.value = true
  }, 500)
})

const handleNewAccount = () => {
  router.push('/creation')
}

const handleExistingAccount = () => {
  router.push('/account-recovery')
}
</script>

<template>
  <v-container class="fill-height">
    <v-row justify="center">
      <v-col cols="12" md="6">  
    <Transition name="fade">
      <div v-if="showContent">
        <div>
          <h1 class="animate-title">Bienvenue !</h1>
          <p class="subtitle animate-subtitle">Comment souhaitez-vous commencer ?</p>
        </div>
        <div class="options-container">

              
          <Transition name="slide-up" appear>
            <div class="option-card ga-4 pa-6" @click="handleExistingAccount">
              <span class="text-h6 font-weight-bold">Compte Remplacer</span>
              <span class="text-body-2 text-medium-emphasis">Je possède déjà un compte REMPLACER.OVH et je souhaite le récupérer</span>
            </div>
          </Transition>
          <Transition name="slide-up" appear>
            <div class="option-card ga-4 pa-6" @click="handleNewAccount">
              <span class="text-h6 font-weight-bold">Nouveau compte</span>
              <span class="text-body-2 text-medium-emphasis">Je souhaite créer un nouveau compte</span>
            </div>
          </Transition>
      
        </div>
      </div>
    </Transition>
  </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>


h1 {
  font-size: 2.5rem;

  margin-bottom: 1rem;
}

.subtitle {
  font-size: 1.2rem;

  margin-bottom: 3rem;
}

.options-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.option-card {
  background: rgba(var(--v-theme-surfaceContainer), 1);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: start;
  justify-content: center;

  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.005);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.4s;
}

.option-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.20);
}

.option-card h2 {
  color: rgba(var(--v-theme-onSurface), 1);
  margin-bottom: 1rem;
}

.option-card p {
  color: rgba(var(--v-theme-onSurface), 0.7);
  line-height: 1.5;
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active {
  transition: all 0.5s ease-out;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.animate-title {
  animation: fadeInDown 0.8s ease-out;
}

.animate-subtitle {
  animation: fadeInDown 0.8s ease-out 0.2s backwards;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
