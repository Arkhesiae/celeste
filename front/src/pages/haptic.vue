<template>
  <v-container>
    <MainTitle title="Test Haptique" subtitle="Testez les retours haptiques de l'appareil" :back-button="true" />

    <v-row>
      <v-col cols="12">
        <v-card rounded="xl" elevation="0" class="pa-6" color="surfaceContainer">
          <v-card-title class="text-h5 mb-4">
            <v-icon class="mr-2">mdi-vibrate</v-icon>
            Retours Haptiques
          </v-card-title>
          
          <v-card-text class="d-flex flex-column ga-4">
            <!-- Impact Light -->
            <v-btn 
              block 
              height="64" 
              class="rounded-lg py-4" 
              color="primary" 
              elevation="0" 
              @click="triggerImpactLight"
            >
              <v-icon class="mr-3">mdi-hand-front</v-icon>
              <span class="text-h7">Impact Léger</span>
              <v-chip color="info" variant="flat" class="ml-auto" size="small">
                Light
              </v-chip>
            </v-btn>

            <!-- Impact Medium -->
            <v-btn 
              block 
              height="64" 
              class="rounded-lg py-4" 
              color="primary" 
              elevation="0" 
              @click="triggerImpactMedium"
            >
              <v-icon class="mr-3">mdi-hand-front</v-icon>
              <span class="text-h7">Impact Moyen</span>
              <v-chip color="warning" variant="flat" class="ml-auto" size="small">
                Medium
              </v-chip>
            </v-btn>

            <!-- Impact Heavy -->
            <v-btn 
              block 
              height="64" 
              class="rounded-lg py-4" 
              color="primary" 
              elevation="0" 
              @click="triggerImpactHeavy"
            >
              <v-icon class="mr-3">mdi-hand-front</v-icon>
              <span class="text-h7">Impact Fort</span>
              <v-chip color="error" variant="flat" class="ml-auto" size="small">
                Heavy
              </v-chip>
            </v-btn>

            <!-- Impact Rigid -->
            <v-btn 
              block 
              height="64" 
              class="rounded-lg py-4" 
              color="primary" 
              elevation="0" 
              @click="triggerImpactRigid"
            >
              <v-icon class="mr-3">mdi-hand-front</v-icon>
              <span class="text-h7">Impact Rigide</span>
              <v-chip color="secondary" variant="flat" class="ml-auto" size="small">
                Rigid
              </v-chip>
            </v-btn>

            <!-- Impact Soft -->
            <v-btn 
              block 
              height="64" 
              class="rounded-lg py-4" 
              color="primary" 
              elevation="0" 
              @click="triggerImpactSoft"
            >
              <v-icon class="mr-3">mdi-hand-front</v-icon>
              <span class="text-h7">Impact Doux</span>
              <v-chip color="success" variant="flat" class="ml-auto" size="small">
                Soft
              </v-chip>
            </v-btn>
          </v-card-text>
        </v-card>

        <v-card rounded="xl" elevation="0" class="pa-6 mt-4" color="surfaceContainer">
          <v-card-title class="text-h5 mb-4">
            <v-icon class="mr-2">mdi-bell-ring</v-icon>
            Notifications
          </v-card-title>
          
          <v-card-text class="d-flex flex-column ga-4">
            <!-- Notification Success -->
            <v-btn 
              block 
              height="64" 
              class="rounded-lg py-4" 
              color="success" 
              elevation="0" 
              @click="triggerNotificationSuccess"
            >
              <v-icon class="mr-3">mdi-check-circle</v-icon>
              <span class="text-h7">Notification Succès</span>
              <v-chip color="success" variant="flat" class="ml-auto" size="small">
                Success
              </v-chip>
            </v-btn>

            <!-- Notification Warning -->
            <v-btn 
              block 
              height="64" 
              class="rounded-lg py-4" 
              color="warning" 
              elevation="0" 
              @click="triggerNotificationWarning"
            >
              <v-icon class="mr-3">mdi-alert</v-icon>
              <span class="text-h7">Notification Avertissement</span>
              <v-chip color="warning" variant="flat" class="ml-auto" size="small">
                Warning
              </v-chip>
            </v-btn>

            <!-- Notification Error -->
            <v-btn 
              block 
              height="64" 
              class="rounded-lg py-4" 
              color="error" 
              elevation="0" 
              @click="triggerNotificationError"
            >
              <v-icon class="mr-3">mdi-close-circle</v-icon>
              <span class="text-h7">Notification Erreur</span>
              <v-chip color="error" variant="flat" class="ml-auto" size="small">
                Error
              </v-chip>
            </v-btn>
          </v-card-text>
        </v-card>

        <v-card rounded="xl" elevation="0" class="pa-6 mt-4" color="surfaceContainer">
          <v-card-title class="text-h5 mb-4">
            <v-icon class="mr-2">mdi-tune</v-icon>
            Sélection
          </v-card-title>
          
          <v-card-text class="d-flex flex-column ga-4">
            <!-- Selection -->
            <v-btn 
              block 
              height="64" 
              class="rounded-lg py-4" 
              color="info" 
              elevation="0" 
              @click="triggerSelectionStart"
            >
              <v-icon class="mr-3">mdi-cursor-pointer</v-icon>
              <span class="text-h7">Sélection Start</span>
              <v-chip color="info" variant="flat" class="ml-auto" size="small">
                Selection
              </v-chip>
            </v-btn>
            <v-btn 
              block 
              height="64" 
              class="rounded-lg py-4" 
              color="info" 
              elevation="0" 
              @click="triggerSelectionChanged"
            >
              <v-icon class="mr-3">mdi-cursor-pointer</v-icon>
              <span class="text-h7">Sélection Changed²</span>
              <v-chip color="info" variant="flat" class="ml-auto" size="small">
                Selection Changed
              </v-chip>
            </v-btn>
            <v-btn 
              block 
              height="64" 
              class="rounded-lg py-4" 
              color="info" 
              elevation="0" 
              @click="triggerSelectionEnd"
            >
              <v-icon class="mr-3">mdi-cursor-pointer</v-icon>
              <span class="text-h7">Sélection End</span>
              <v-chip color="info" variant="flat" class="ml-auto" size="small">
                Selection
              </v-chip>
            </v-btn>
          </v-card-text>
        </v-card>

        <v-card rounded="xl" elevation="0" class="pa-6 mt-4" color="surfaceContainer">
          <v-card-title class="text-h5 mb-4">
            <v-icon class="mr-2">mdi-cog</v-icon>
            Actions Avancées
          </v-card-title>
          
          <v-card-text class="d-flex flex-column ga-4">
            <!-- Vibrate -->
            <v-btn 
              block 
              height="64" 
              class="rounded-lg py-4" 
              color="secondary" 
              elevation="0" 
              @click="triggerVibrate"
            >
              <v-icon class="mr-3">mdi-vibrate</v-icon>
              <span class="text-h7">Vibration Simple</span>
              <v-chip color="secondary" variant="flat" class="ml-auto" size="small">
                Vibrate
              </v-chip>
            </v-btn>

                         <!-- Séquence personnalisée -->
             <v-btn 
               block 
               height="64" 
               class="rounded-lg py-4" 
               color="secondary" 
               elevation="0" 
               @click="triggerCustomSequence"
             >
               <v-icon class="mr-3">mdi-playlist-play</v-icon>
               <span class="text-h7">Séquence Personnalisée</span>
               <v-chip color="secondary" variant="flat" class="ml-auto" size="small">
                 Custom
               </v-chip>
             </v-btn>

             <!-- Impact Ultra-Léger -->
             <v-btn 
               block 
               height="64" 
               class="rounded-lg py-4" 
               color="secondary" 
               elevation="0" 
               @click="triggerUltraLight"
             >
               <v-icon class="mr-3">mdi-feather</v-icon>
               <span class="text-h7">Impact Ultra-Léger</span>
               <v-chip color="secondary" variant="flat" class="ml-auto" size="small">
                 Ultra Light
               </v-chip>
             </v-btn>

             <!-- Tap Léger -->
             <v-btn 
               block 
               height="64" 
               class="rounded-lg py-4" 
               color="secondary" 
               elevation="0" 
               @click="triggerLightTap"
             >
               <v-icon class="mr-3">mdi-hand-pointing-up</v-icon>
               <span class="text-h7">Tap Léger</span>
               <v-chip color="secondary" variant="flat" class="ml-auto" size="small">
                 Light Tap
               </v-chip>
             </v-btn>

             <!-- Micro Impact -->
             <v-btn 
               block 
               height="64" 
               class="rounded-lg py-4" 
               color="secondary" 
               elevation="0" 
               @click="triggerMicroImpact"
             >
               <v-icon class="mr-3">mdi-dot-small</v-icon>
               <span class="text-h7">Micro Impact</span>
               <v-chip color="secondary" variant="flat" class="ml-auto" size="small">
                 Micro
               </v-chip>
             </v-btn>

             <!-- Whisper Touch -->
             <v-btn 
               block 
               height="64" 
               class="rounded-lg py-4" 
               color="secondary" 
               elevation="0" 
               @click="triggerWhisperTouch"
             >
               <v-icon class="mr-3">mdi-air-humidifier</v-icon>
               <span class="text-h7">Whisper Touch</span>
               <v-chip color="secondary" variant="flat" class="ml-auto" size="small">
                 Whisper
               </v-chip>
             </v-btn>
           </v-card-text>
         </v-card>

        <!-- Informations sur la compatibilité -->
        <v-card rounded="xl" elevation="0" class="pa-6 mt-4" color="surfaceContainer">
          <v-card-title class="text-h5 mb-4">
            <v-icon class="mr-2">mdi-information</v-icon>
            Informations
          </v-card-title>
          
          <v-card-text>
            <v-alert 
              type="info" 
              variant="tonal" 
              class="mb-4"
              :text="`Compatibilité: ${hapticsSupported ? 'Supporté' : 'Non supporté'}`"
            />
            
            <v-alert 
              type="warning" 
              variant="tonal"
              :text="'Les retours haptiques ne fonctionnent que sur les appareils mobiles avec Capacitor. Sur le web, aucun effet ne sera produit.'"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

// État réactif
const hapticsSupported = ref(false)

// Vérification de la compatibilité au montage
onMounted(async () => {
  try {
    // Vérifier si Haptics est disponible
    if (Haptics) {
      hapticsSupported.value = true
    }
  } catch (error) {
    console.warn('Haptics non supporté:', error)
    hapticsSupported.value = false
  }
})

// Fonctions pour déclencher les différents types d'impacts
const triggerImpactLight = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (error) {
    console.warn('Erreur lors du déclenchement de l\'impact léger:', error)
  }
}

const triggerImpactMedium = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch (error) {
    console.warn('Erreur lors du déclenchement de l\'impact moyen:', error)
  }
}

const triggerImpactHeavy = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy })
  } catch (error) {
    console.warn('Erreur lors du déclenchement de l\'impact fort:', error)
  }
}

const triggerImpactRigid = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Rigid })
  } catch (error) {
    console.warn('Erreur lors du déclenchement de l\'impact rigide:', error)
  }
}

const triggerImpactSoft = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Soft })
  } catch (error) {
    console.warn('Erreur lors du déclenchement de l\'impact doux:', error)
  }
}

// Fonctions pour déclencher les notifications
const triggerNotificationSuccess = async () => {
  try {
    await Haptics.notification({ type: NotificationType.Success })
  } catch (error) {
    console.warn('Erreur lors du déclenchement de la notification succès:', error)
  }
}

const triggerNotificationWarning = async () => {
  try {
    await Haptics.notification({ type: NotificationType.Warning })
  } catch (error) {
    console.warn('Erreur lors du déclenchement de la notification avertissement:', error)
  }
}

const triggerNotificationError = async () => {
  try {
    await Haptics.notification({ type: NotificationType.Error })
  } catch (error) {
    console.warn('Erreur lors du déclenchement de la notification erreur:', error)
  }
}

// Fonction pour la sélection
const triggerSelectionStart = async () => {
  try {
    await Haptics.selectionStart()
  } catch (error) {
    console.warn('Erreur lors du déclenchement de la sélection:', error)
  }
}

const triggerSelectionChanged = async () => {
  try {
    await Haptics.selectionChanged()
  } catch (error) {
    console.warn('Erreur lors du déclenchement de la sélection:', error)
  }
};

const triggerSelectionEnd = async () => {
  try {
    await Haptics.selectionEnd()
  } catch (error) {
    console.warn('Erreur lors du déclenchement de la sélection:', error)
  }
};




// Fonction pour la vibration simple
const triggerVibrate = async () => {
  try {
    await Haptics.vibrate()
  } catch (error) {
    console.warn('Erreur lors du déclenchement de la vibration:', error)
  }
}

 // Fonction pour une séquence personnalisée
 const triggerCustomSequence = async () => {
   try {
     // Séquence personnalisée : impact léger, pause, impact moyen, pause, impact fort
     await Haptics.impact({ style: ImpactStyle.Light })
     await new Promise(resolve => setTimeout(resolve, 200))
     await Haptics.impact({ style: ImpactStyle.Medium })
     await new Promise(resolve => setTimeout(resolve, 200))
     await Haptics.impact({ style: ImpactStyle.Heavy })
   } catch (error) {
     console.warn('Erreur lors du déclenchement de la séquence personnalisée:', error)
   }
 }

 // Fonction pour un impact ultra-léger (séquence de très légers impacts)
 const triggerUltraLight = async () => {
   try {
     // Séquence ultra-légère : plusieurs impacts légers très rapprochés
     await Haptics.impact({ style: ImpactStyle.Light })
     await new Promise(resolve => setTimeout(resolve, 50))
     await Haptics.impact({ style: ImpactStyle.Light })
     await new Promise(resolve => setTimeout(resolve, 50))
     await Haptics.impact({ style: ImpactStyle.Light })
   } catch (error) {
     console.warn('Erreur lors du déclenchement de l\'impact ultra-léger:', error)
   }
 }

 // Fonction pour un tap léger (impact soft très court)
 const triggerLightTap = async () => {
   try {
     // Utilise l'impact soft qui est généralement plus subtil
     await Haptics.impact({ style: ImpactStyle.Soft })
   } catch (error) {
     console.warn('Erreur lors du déclenchement du tap léger:', error)
   }
 }

 // Fonction pour un micro impact (très court et subtil)
 const triggerMicroImpact = async () => {
   try {
     // Micro impact : impact soft suivi d'un très court délai et d'un impact light
     await Haptics.impact({ style: ImpactStyle.Soft })
     await new Promise(resolve => setTimeout(resolve, 30))
     await Haptics.impact({ style: ImpactStyle.Light })
   } catch (error) {
     console.warn('Erreur lors du déclenchement du micro impact:', error)
   }
 }

 // Fonction pour un whisper touch (très subtil)
 const triggerWhisperTouch = async () => {
   try {
     // Whisper touch : séquence très douce et rapide
     await Haptics.impact({ style: ImpactStyle.Soft })
     await new Promise(resolve => setTimeout(resolve, 20))
     await Haptics.impact({ style: ImpactStyle.Soft })
     await new Promise(resolve => setTimeout(resolve, 20))
     await Haptics.impact({ style: ImpactStyle.Soft })
   } catch (error) {
     console.warn('Erreur lors du déclenchement du whisper touch:', error)
   }
 }
</script>

<style scoped>
.v-btn {
  transition: all 0.3s ease;
}

.v-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.v-btn:active {
  transform: translateY(0);
}
</style>
