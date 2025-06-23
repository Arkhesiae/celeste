


<template>
  <v-container :class="smAndDown ? 'mb-n16' : ''">
    <!-- En-tête -->
    <div class="d-flex justify-space-between align-center mb-8">
      <div class="d-flex flex-column">
        <div class="d-flex align-center">
          <span class="text-h4 d-inline-block font-weight-medium font-weight-bold">Bienvenue </span>
          <span class="text-h4 d-inline-block font-weight-medium ml-2 gradient font-weight-bold">{{ userName }}</span>
        </div>
        <span class="text-h4 text-overline text-medium-emphasis">Tableau de bord</span>
      </div>
      <v-btn v-if="!smAndDown"  height="48px" class="px-6 bg-surfaceContainerHighest text-remplacement highlight-shadow new-demand-button" flat style="border-radius: 16px !important"
        prepend-icon="mdi-plus" @click="$router.push('/calendar')">
        Nouvelle demande
      </v-btn>
    </div>

    <v-row>
      <v-col cols="12" class="pa-2">
        <v-card v-if="showAnnouncement" rounded="xl" elevation="0" class="mb-4 smooth-shadow pa-4"
          color="surfaceContainer">
          <v-icon icon="mdi-bell-outline" size="16" color="remplacement"
            style="position: absolute; top: 16px; left: 16px; transform: scale(12); filter: blur(0px); z-index: -1; opacity: 0.10;" />
          <div class="d-flex justify-space-between align-center">
            <div class="d-flex align-center ga-2 ml-4">
              <v-icon icon="mdi-bell-outline" size="16" color="remplacement" />
              <span class="font-weight-medium text-overline">Annonce</span>
            </div>
            <v-btn icon="mdi-close" variant="tonal" size="small" rounded="lg" color="remplacement"
              @click="showAnnouncement = false" />
          </div>
          <v-card-title class="text-h6 py-0 font-weight-medium ">Lancement du nouveau site</v-card-title>
          <v-card-text>
            <div class="text-medium-emphasis">
              Bienvenue à tous !
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="12" xl="12" offset-xl="0" class="pa-2">
        <v-alert v-if="!authStore.centerId" color="error" variant="tonal" rounded="xl" class="mb-4 pa-4" icon="mdi-alert-outline" style="cursor: pointer;" @click="router.push('/profile/'+authStore.userId)">
          <div class="d-flex align-center justify-space-between">
            <div>
          <v-card-title class="text-h6 font-weight-medium">Aucun centre assigné</v-card-title>
          <v-card-text>
            <div class="text-medium-emphasis">
              Vous n'avez pas de centre assigné. 
            </div>
            <div>
              Vous n'appartenez à aucun centre. Le site ne sera pas fonctionnel.
            </div>
          </v-card-text>
        </div>
          <v-icon icon="mdi-chevron-right" color="error" size="32" class="mr-2" />
        </div>
        </v-alert>
        <v-alert v-if="!teamStore.currentTeam" color="error" variant="tonal" rounded="xl" class="mb-4 pa-4" icon="mdi-alert-circle-outline" style="cursor: pointer;" @click="router.push('/profile/'+authStore.userId)">
          <div class="d-flex align-center justify-space-between">
            <div>
          <v-card-title class="text-h6 font-weight-medium">Aucune équipe assignée</v-card-title>
          <v-card-text>
            <div class="text-medium-emphasis">
              Vous n'avez pas d'équipe assignée. Vous ne pourrez pas effectuer de remplacements ou de permutations.
            </div>
            <div>
              Pour assigner une équipe, veuillez vous rendre sur la page profil
            </div>
          </v-card-text>
        </div>
          <v-icon icon="mdi-chevron-right" color="error" size="32" class="mr-2" />
        </div>
        </v-alert>
      
        <v-alert v-if="false" color="error" variant="tonal" rounded="xl" class="mb-4 pa-4" icon="mdi-alert-circle-outline" style="cursor: pointer;" @click="router.push('/profile/'+authStore.userId)">
          <div class="d-flex align-center justify-space-between">
            <div>
          <v-card-title class="text-h6 font-weight-medium">Conflit de demandes</v-card-title>
          <v-card-text>
            <div class="text-medium-emphasis">
              Certaines de vos demandes semble présenter des erreurs. Cela peut-être dû à un changement d'équipe ou de tour de service. Veuillez les résoudre avant de poster une nouvelle demande.
            </div>
            <div>
              Pour résoudre les conflits, veuillez vous rendre sur la page de gestion des demandes.
            </div>
          </v-card-text>
        </div>
          <div class="font-weight-medium">
            <!-- Résoudre -->
            <v-icon icon="mdi-chevron-right" color="error" size="32" class="mr-2" />
          </div>
 
        </div>
        </v-alert>


        <v-alert v-if="!activeRotation" color="error" variant="tonal" rounded="xl" class="mb-4 pa-4  " icon="mdi-alert-outline" style="cursor: pointer;" @click="router.push('/profile/'+authStore.userId)">
          <div class="d-flex align-center justify-space-between">
            <div>
          <v-card-title class="text-h6 font-weight-medium">Aucun tour de service actif</v-card-title>
          <v-card-text>
            <div class="text-medium-emphasis">
              Aucun tour de service n'est actuellement actif.
            </div>
            <div>
              Sans tour de service actif, vous ne pourrez pas effectuer de remplacements ou de permutations. Veuillez contacter un administrateur pour activer un tour de service.
            </div>
          </v-card-text>
        </div>
        
 
        </div>
        </v-alert> 
        <v-alert v-if="true" color="error" variant="tonal" rounded="xl" class="mb-4 pa-4 " icon="mdi-alert-circle-outline" style="cursor: pointer;" >
          <div class="d-flex align-center justify-space-between">
            <div>
          <v-card-title class="text-h6 font-weight-medium">Envoi de mails désactivé</v-card-title>
          <v-card-text>
            <div class="text-medium-emphasis">
              L'envoi de mail est désactivé pour le moment afin de procéder à des tests.
            </div>
            <div>
              Nous vous remercions de votre compréhension.
            </div>
          </v-card-text>
        </div>
          <!-- <div class="font-weight-medium"> -->
            <!-- Résoudre -->
            <!-- <v-icon icon="mdi-chevron-right" color="error" size="32" class="mr-2" />
          </div> -->
 
        </div>
        </v-alert>

        <v-alert v-if="true" color="pendingDemand" variant="tonal" rounded="xl" class="mb-4 pa-4" icon="mdi-alert-circle-outline" style="cursor: pointer;" >
          <div class="d-flex align-center justify-space-between">
            <div>
          <v-card-title class="text-h6 font-weight-medium">Version alpha</v-card-title>
          <v-card-text>
            <div class="text-medium-emphasis">
              Vous êtes sur une alpha du site.
            </div>
            <div>
              Certaines fonctionnalités ne sont pas encore disponibles car nécissitant davantage de tests. Veuillez nous excuser pour la gêne occasionnée et nous vous remercions pour votre compréhension.
            </div>
          </v-card-text>
        </div>
          <!-- <div class="font-weight-medium"> -->
            <!-- Résoudre -->
            <!-- <v-icon icon="mdi-chevron-right" color="error" size="32" class="mr-2" />
          </div> -->
 
        </div>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Grille principale -->
    <v-row :class="smAndDown ? 'mx-n4' : ''">

      <v-col cols="12" md="7" xl="8" offset-xl="0" class="pa-2" :class="smAndDown ? 'px-4' : ''">
        <!-- Carte des vacations -->
        <v-card rounded="xl" elevation="0" class="mb-4 smooth-shadow sss pa-4" color="surfaceContainer">
          <v-card-title class="text-h6 font-weight-medium">Aujourd'hui</v-card-title>
          <v-card-text>
            <div v-if="getVacation && getVacation.shift?.type === 'rest'">
              <div class="text-medium-emphasis position-absolute" style="bottom: 0; right: 0;">
                <v-icon icon="mdi-sleep" color="remplacement" size="128" class="mr-2"
                  style="filter: blur(0px); z-index: -1; opacity: 0.070;" />

              </div>
            </div>
            <div v-if="getVacation && getVacation.shift?.type !== 'rest'">
              <div class="d-flex align-center justify-space-between mb-2">
                <div>
                  <div class="text-h5 font-weight-medium">{{ vacationName(getVacation) }}</div>
                  <div class="text-medium-emphasis" v-if="getVacation.shift?.type !== 'rest'">
                    {{ getVacation.shift?.startTime }} - {{ getVacation.shift?.endTime }}
                  </div>
                </div>
                <v-chip class="position-absolute ma-6" color="onBackground" variant="flat" size="small" rounded="lg"
                  style="right: 0; top: 0;">
                  Équipe {{ getVacation.teamObject?.name }}
                </v-chip>
              </div>
            </div>
            <div v-else class="text-medium-emphasis">
              <v-icon icon="mdi-alert-circle-outline" color="remplacement" size="16" class="mr-2" />
              Pas de vacation aujourd'hui
            </div>
          </v-card-text>
        </v-card>


        <!-- Carte de la vacation de demain -->
        <v-card rounded="xl" elevation="0" class="mb-4 smooth-shadow pa-4" color="surfaceContainer">
          <v-card-title class="text-h6 font-weight-medium">Demain</v-card-title>
          <v-card-text>
            <div v-if="getTomorrowVacation && getTomorrowVacation.shift?.type === 'rest'">
              <div class="text-medium-emphasis position-absolute" style="bottom: 0; right: 0;">
                <v-icon icon="mdi-sleep" color="remplacement" size="128" class="mr-2"
                  style="filter: blur(0px); z-index: -1; opacity: 0.070;" />

              </div>
            </div>
            <div v-if="getTomorrowVacation && getTomorrowVacation.shift?.type !== 'rest'">
              <div class="d-flex align-center justify-space-between mb-2">
                <div>
                  <div class="text-h5 font-weight-medium">{{ vacationName(getTomorrowVacation) }}</div>
                  <div class="text-medium-emphasis" v-if="getTomorrowVacation.shift?.type !== 'rest'">
                    {{ getTomorrowVacation.shift?.startTime }} - {{ getTomorrowVacation.shift?.endTime }}
                  </div>
                </div>
                <v-chip class="position-absolute ma-6" color="onBackground" variant="flat" size="small" rounded="lg"
                  style="right: 0; top: 0;">
                  Équipe {{ getTomorrowVacation.teamObject?.name }}
                </v-chip>
              </div>
            </div>
            <div v-else class="text-medium-emphasis">
              <v-icon icon="mdi-alert-circle-outline" color="remplacement" size="16" class="mr-2" />
              Pas de vacation demain
            </div>
          </v-card-text>
        </v-card>

        <!-- Carte des prochaines substitutions -->
        <v-card rounded="xl" class="mb-4 shadow-alt pa-6" bg-color="remplacement"  z-index="-01000">
          <div class="d-flex align-start flex-column justify-space-between mb-4">
          <v-card-title class="text-h6 font-weight-medium pa-0 mb-0">Je remplace</v-card-title>
          <span class="text-subtitle-2 text-medium-emphasis">
            <v-icon icon="mdi-information-outline" color="remplacement" size="16" class="mr-2" />
            Les remplacements et permutations que je dois faire sont affichés ici.
          </span>
          </div>
          <v-card-text class="pa-0 ma-0 ">
              <div v-if="nextSubstitutions?.length > 0" class="d-flex flex-column ga-2">
                <OwnDemandCard  :isPoster="false" v-for="nextSubstitution in nextSubstitutions" :key="nextSubstitution.id" :demand="nextSubstitution" :small="xs"/>
              </div>
              <div v-else class="text-onRemplacement">
                Aucun remplacement ou permutation à venir
              </div>
          </v-card-text>
        </v-card>

        <!-- Carte des demandes en attente -->
        <v-card rounded="xl" v-if="pendingDemands.length > 0 || acceptedAsPoster.length > 0" class="mb-4 shadow-alt pa-6" color="surfaceContainer" z-index="-01000">
          <div class="d-flex align-start flex-column justify-space-between mb-4">
          <v-card-title class="text-h6 font-weight-medium pa-0 mb-0">Mes demandes</v-card-title>
          <span class="text-subtitle-2 text-medium-emphasis">
            <v-icon icon="mdi-information-outline" color="remplacement" size="16" class="mr-2" />
            Mes demandes en attente et acceptées sont affichées ici.
          </span>
          </div>
          <v-card-text class="pa-0 ga-2 d-flex flex-column">
            <div v-if="pendingDemands.length > 0" class="d-flex flex-column"> 
            <v-card-title class="text-body-1 font-weight-medium mb-2 pa-0">En attente</v-card-title>
            <div class="d-flex flex-column ga-2">
              <OwnDemandCard v-for="demand in pendingDemands" :key="demand.id" :demand="demand" :isPoster="true"  :small="xs"/>
            </div>
     
          </div>
            <div v-if="acceptedAsPoster.length > 0" class="d-flex flex-column">
              <v-card-title class="text-body-1 font-weight-medium mb-2 pa-0">Acceptées</v-card-title>
              <div class="d-flex flex-column ga-2">
                <OwnDemandCard v-for="demand in acceptedAsPoster" :key="demand.id" :demand="demand" :isPoster="true" :small="smAndDown"/>
              </div>
            </div>
           
          </v-card-text>
        </v-card>
      </v-col>



      <!-- Section Points et Équipe -->
      <v-col cols="12" md="5" xl="4" offset-xl="0" :class="smAndDown ? 'pa-0  mt-16' : 'pa-2'">

        <!-- Carte du tour de service actif -->
        <v-card rounded="xl" elevation="0" class="mb-4 pa-6" :class="smAndDown ? 'mx-4' : 'mx-0'"
          color="surfaceContainer" @click="$router.push('/rotation')" style="cursor: pointer;">
          <div class="d-flex align-center justify-space-between">
            <div>
              <v-card-title class="text-h6 font-weight-medium pa-0">Tour de service actif</v-card-title>
              <v-card-text class="pa-0">
                <div v-if="activeRotation">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div>
                      <div class="text-h5 font-weight-medium">{{ activeRotation.name }}</div>
                      <div class="text-medium-emphasis">
                        Actif depuis le {{ new Date(activeRotation.activationDate).toLocaleDateString() }}
                      </div>
                    </div>
                    <v-chip class="position-absolute ma-6" color="remplacement" variant="flat" size="small" rounded="lg"
                      style="right: 0; top: 0;">
                      Actif
                    </v-chip>
                  </div>
                </div>
                <div v-else class="text-medium-emphasis">
                  Aucun tour de service actif
                </div>
              </v-card-text>
            </div>
            <v-icon icon="mdi-chevron-right" color="remplacement" size="24" />
          </div>
        </v-card>


        <v-card rounded="xl" elevation="0" class="pa-4" :class="smAndDown ? 'pb-16' : ''"
          :color="smAndDown ? 'onBackground' : 'surfaceContainer'">



          <!-- Carte des points -->
          <div class="mb-4 smooth-shadow rounded-xl">
            <PointsCard :points="stats.points" :transactions="[]" color="onBackground"
              @transfer="transferDialog = true" />
          </div>

          <!-- Section Calendrier -->

          <v-card ref="calendarCard" rounded="xl" flat class="mb-4 v-card-dashboard smooth-shadow  calendar-card" :color="xs ? 'onBackground' : 'surfaceContainer'"
          :class="{'pa-0 py-2 ml-n4 mr-n4' : xs, 'pa-0' : !xs}"
          
          >
            <v-card-title class="text-h6 font-weight-medium">Calendrier</v-card-title>
            <v-card-text>
              <CalendarMobile :daysOfWeek="daysOfWeek" :calendarDays="calendarDays" :isSelected="isSelected" :isToday="isToday" 
                :rotationsMap="rotationsMap" @select-day="selectedDate = $event"
                @swipe-left="currentMonth = (currentMonth + 1) % 12"
                @swipe-right="currentMonth = (currentMonth - 1 + 12) % 12" />
            </v-card-text>
          </v-card>

          <!-- Carte de l'équipe -->
          <v-card ref="teamCard" rounded="xl" elevation="0" class="pa-2 team-card">
            <v-card-title class="text-h6 font-weight-medium">Mon équipe</v-card-title>
            <v-icon icon="mdi-crowd" size="16" color="onBackground"
              style="position: absolute; bottom: 40px; left: 16px; transform: scale(12); filter: blur(0px); z-index: -1; opacity: 0.10;" />
            <v-card-text>
              <div v-if="teamStore.currentTeam" class="d-flex flex-column align-center">
                <v-avatar color="background" size="64" class="mb-4 smooth-shadow">
                  <v-icon icon="mdi-crowd" size="32"></v-icon>
                </v-avatar>
                <div class="text-h5 font-weight-bold mb-2">Equipe {{ teamStore.currentTeam.name }}</div>
                <!-- <div class="text-medium-emphasis text-center">
                  <v-icon icon="mdi-calendar-start" class="mr-2"></v-icon>
                  Cycle depuis le {{ new Date(teamStore.currentTeam.cycleStartDate).toLocaleDateString() }}
                </div> -->
              </div>
              <div v-else class="text-center text-medium-emphasis">
                Aucune équipe assignée
              </div>
            </v-card-text>
          </v-card>



          <!-- Actions rapides
      <v-card rounded="xl" elevation="0">
        <v-card-title class="text-h6 font-weight-medium">Actions rapides</v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item
              v-for="action in quickActions"
              :key="action.label"
              :prepend-icon="action.icon"
              :title="action.label"
              @click="$router.push(action.route)"
              class="mb-2 rounded-lg"
              variant="tonal"
            />
          </v-list>
        </v-card-text>
      </v-card> -->
        </v-card>
      </v-col>

    </v-row>
    <v-row :class="smAndDown ? 'my-16' : ''">
      
        
        <v-col cols="12" md="12" class="pa-2" >
          <div class="d-flex block " >
        <v-card rounded="xl" elevation="0" class="pa-6 flex-grow-1">
            <v-card-title class="text-h6 font-weight-medium pa-0">Soutenez le projet</v-card-title>
            <v-icon icon="mdi-coffee" size="16" color="onBackground"
              style="position: absolute; bottom: 40px; left: 16px; transform: scale(12); filter: blur(0px); z-index: -1; opacity: 0.050;" />
            <v-card-text class="pa-0">
              <div class="d-flex flex-column align-center">
                <v-avatar color="background" size="64" class="mb-4 smooth-shadow">
                  <v-icon icon="mdi-coffee" size="32" color="remplacement"></v-icon>
                </v-avatar>
                
                <div class="text-medium-emphasis text-center mb-4">
                  Si vous appréciez mon travail, vous pouvez m'offrir un café pour me soutenir
                </div>
                <v-btn
                  color="remplacement"
                  variant="flat"
                  rounded="lg"
                  prepend-icon="mdi-coffee"
                  style="  background: linear-gradient(45deg, #ffc0d4, rgba(237, 202, 255, 0.94), rgba(250, 152, 248, 0.05),
      rgba(159, 159, 248, 0.22));"
                  target="_blank"
                  class="px-6"
                >
                  Offrir un café
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </div>
        </v-col>
    </v-row>
    <!-- Statistiques -->
    <!-- <v-row class="mt-4">
      <v-col cols="12" md="4">
        <v-card rounded="xl" elevation="0">
          <v-card-text class="text-center">
            <v-icon color="primary" size="48" class="mb-4">mdi-account-clock</v-icon>
            <div class="text-h4 font-weight-bold">{{ stats.remplacements }}</div>
            <div class="text-medium-emphasis">Remplacements</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card rounded="xl" elevation="0">
          <v-card-text class="text-center">
            <v-icon color="secondary" size="48" class="mb-4">mdi-swap-horizontal</v-icon>
            <div class="text-h4 font-weight-bold">{{ stats.permutations }}</div>
            <div class="text-medium-emphasis">Permutations</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card rounded="xl" elevation="0">
          <v-card-text class="text-center">
            <v-icon color="tertiary" size="48" class="mb-4">mdi-star</v-icon>
            <div class="text-h4 font-weight-bold">{{ stats.points }}</div>
            <div class="text-medium-emphasis">Points</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row> -->
    <TransferDialog :dialogVisible="transferDialog" :userId="authStore.userId"
      @update:dialogVisible="transferDialog = $event" />
  </v-container>
</template>

<style scoped>
.v-card-dashboard {
  background: rgba(var(--v-theme-background), 0.4);

}

.highlight-shadow{  
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.096), 0 0 0 1px rgba(255, 255, 255, 0.007), 0 4px 8px rgba(0, 0, 0, 0.148) ;
}

.new-demand-button.highlight-shadow{
  backface-visibility: hidden;
  transform: translateZ(0);

  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.026), 0 0 0 1px rgba(255, 255, 255, 0.007), 0 4px 4px rgba(0, 0, 0, 0.018) ;
}

.new-demand-button.highlight-shadow:hover{
  transform: scale(1.05) translateZ(0);

  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.096), 0 0 0 1px rgba(255, 255, 255, 0.007), 0 4px 8px rgba(0, 0, 0, 0.148) ;
  
  transition: transform 0.2s ease-in-out;
}

.shadow {
  box-shadow:
    -31px -31px 43px 0 rgba(var(--v-theme-remplacement), 0.64),
    26px 26px 48px 0 rgba(0, 0, 0, 0.16);
}

.shadow-alt {

  box-shadow:

    0px 40px 50px 10px rgba(var(--v-theme-remplacement), .011);
}

.calendar-card.not-visible {
  opacity: 0.01;
  transition: all 0.3s ease-in-out ;
  transform: translateY(20px) scale(0.90);
}

.calendar-card {
  opacity: 1;
  transition: all 0.5s ease-in-out .2s;
  transform: translateY(0px) scale(1);
}

.team-card.not-visible {
  opacity: 0.01;
  transition: all 0.3s ease-in-out ;
  transform: translateY(20px) scale(0.90);
}

.team-card {
  opacity: 1;
  transition: all 0.5s ease-in-out .2s;
  transform: translateY(0px) scale(1);
}



.gradient {
  fill: transparent;
  color: #000;
  font-weight: 900 !important;
  background: linear-gradient(to right, rgb(var(--v-theme-remplacement)) 20%, #a779cd 40%, rgb(var(--v-theme-permutation)) 60%, #dc8474 80%);
  background-size: 200% auto;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-fill-color: transparent;
  animation: animatedTextGradient 15s linear infinite;
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
  opacity: 0.81;
  border-radius: 24px;
  background: linear-gradient(45deg, #ffc0d4, rgba(237, 202, 255, 0.94), rgba(250, 152, 248, 0.05),
      rgba(159, 159, 248, 0.22), #ffccdd);
  background-size: 400%;
  width: calc(100% + 3px);
  height: calc(100% + 3px);
  z-index: -1;
  animation: steam 15s linear infinite;
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
  filter: blur(20px);
}

.block:before {
  filter: blur(3px);
}
</style>


<script setup>
import { useAuthStore } from "@/stores/authStore.js";
import { ref, computed, onMounted, watch } from 'vue';
import { useDate } from 'vuetify';
import CalendarMobile from "@/components/Calendar/CalendarMobile.vue";
import PointsCard from "@/components/Profile/PointsCard.vue";

import { useDisplay } from "vuetify";
import { useTeamStore } from "@/stores/teamStore.js";
import { useSubstitutionStore } from "@/stores/substitutionStore.js";
import { useSnackbarStore } from "@/stores/snackbarStore.js";
import { useCalendar } from '@/composables/useCalendar';
// import { vacationService } from "@/services/vacationService.js";
import { useRotationStore } from "@/stores/rotationStore.js";
import DemandCard from '@/components/OwnDemandCard.vue';
import OwnDemandCard from "@/components/OwnDemandCard.vue";
import TransferDialog from '@/components/Profile/TransferDialog.vue';
import { useRouter } from 'vue-router';
import { useShiftStore } from "@/stores/shiftStore.js";

const router = useRouter();

const authStore = useAuthStore()
const teamStore = useTeamStore()
const substitutionStore = useSubstitutionStore()
const snackbarStore = useSnackbarStore()
const rotationStore = useRotationStore()
const userName = authStore.name
const { smAndDown, xs } = useDisplay();
const showAnnouncement = ref(true);
const shiftStore = useShiftStore();

const shiftsWithSubstitutions = computed(() => {
  return shiftStore.shiftsWithSubstitutions;
});

// État pour le calendrier
const selectedDate = ref(new Date());
const currentMonth = ref(new Date().getMonth());
const currentYear = ref(new Date().getFullYear());
const daysOfWeek = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const vacationsOfUser = computed(() => {
  const map = new Map();
  const shifts = shiftsWithSubstitutions.value;
  if (shifts && shifts.length > 0) { 
    shifts.forEach(({ date, shift, teamObject }) => {
      map.set(date, { shift, teamObject });
    });
  }
  return map;
});
const rotationsMap = ref(new Map());


// Utilisation du composable useCalendar
const { calendarDays } = useCalendar(currentYear, currentMonth);

// Fonctions pour le calendrier
const isSelected = (date) => {
  if (!selectedDate.value) return false;
  return date.toISOString() === selectedDate.value.toISOString();
};

const isWorkDay = (date) => {
  const shift = vacationsOfUser.value.get(date.toISOString())?.shift?.name;
  return shift ? shift !== 'Rest Day' : false;
};

const isToday = (date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

// Fonction pour obtenir la vacation actuelle ou la prochaine
const getVacation = computed(() => {
  const today = new Date();
  const todayISO = new Date(today.toISOString().split('T')[0]);

  // Vérifier d'abord la vacation d'aujourd'hui
  const todayVacation = vacationsOfUser.value.get(todayISO.toISOString());

  if (todayVacation && todayVacation.shift) {
    return todayVacation;
  }


  // Si pas de vacation aujourd'hui, chercher la prochaine
  const sortedDates = Array.from(vacationsOfUser.value.keys())
    .map(date => new Date(date))
    .filter(date => date > today)
    .sort((a, b) => a - b);

  if (sortedDates.length > 0) {
    const nextDate = sortedDates[0].toISOString();
    return vacationsOfUser.value.get(nextDate);
  }

  return null;
});

// Fonction pour obtenir la vacation de demain
const getTomorrowVacation = computed(() => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = new Date(tomorrow.toISOString().split('T')[0]);

  return vacationsOfUser.value.get(tomorrowISO.toISOString());
});

const activeRotation = computed(() => {
  return rotationStore.sortedRotations.find(rotation => rotation.status === 'active') || null;
 
});

const vacationName = computed(() => (vacation) => {
  if (!vacation) return null;
  if (vacation.shift?.type === 'rest') return 'Repos';
  return vacation.shift?.name;
});

// Fonction pour obtenir la prochaine substitution
const nextSubstitutions = computed(() => {
  const today = new Date();
  const allSubstitutions = substitutionStore.acceptedAsAccepter
  // Filtrer les substitutions futures et les trier par date
  const futureSubstitutions = allSubstitutions
    .filter(sub => new Date(sub.posterShift.date) > today)
    .sort((a, b) => new Date(a.posterShift.date) - new Date(b.posterShift.date));

  return futureSubstitutions || null;
});

const pendingDemands = computed(() => {
  return substitutionStore.ownPendingHybridSubstitutions.concat(substitutionStore.ownPendingTrueSubstitutions).concat(substitutionStore.ownPendingTrueSwitches);
});

const acceptedAsPoster = computed(() => substitutionStore.acceptedAsPoster);
const acceptedAsAccepter = computed(() => substitutionStore.acceptedAsAccepter);

// Chargement des données
const isLoading = ref(true);

// Statistiques
const stats = ref({
  remplacements: 0,
  permutations: 0,
  points: 0
});

// Charger les données
const loadData = async () => {
  try {
    isLoading.value = true;
    await substitutionStore.fetchAllDemands({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    });

    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await shiftStore.fetchShiftsWithSubstitutions({
      startDate: new Date(startDate).setUTCHours(0, 0, 0, 0),
      endDate: new Date(endDate).setUTCHours(23, 59, 59, 999)
    });


    // // Charger les jours de travail
    // const flatArray = calendarDays.value.flatMap(group => group.map(item => item.date));
    // const result = await vacationService.fetchWorkdaysOfUser(authStore.userId, flatArray);
    // result.forEach(({ date, shift, teamObject }) => {
    //   vacationsOfUser.value.set(date, { shift, teamObject });
    // });


  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);

  } finally {
    isLoading.value = false;
  }
};

// Observer les changements de mois pour recharger les données
watch([currentMonth, currentYear], () => {
  loadData();
});

let observer = null;
const calendarCard = ref(null);
const teamCard = ref(null);

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }

});

const targetNumber = 500;

onMounted(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('not-visible');
      } else {
        entry.target.classList.add('not-visible');
      }
    });
  }, {
    threshold: 0.1
  });

  
  if (calendarCard.value) {
    observer.observe(calendarCard.value.$el);
  }

  if (teamCard.value) {
    observer.observe(teamCard.value.$el);
  }

  loadData();
});



const handleAcceptDemand = async (demand) => {
  try {
    await substitutionStore.acceptDemand(demand.id);
    snackbarStore.showMessage('Demande acceptée avec succès', 'success');
  } catch (err) {
    snackbarStore.showMessage('Erreur lors de l\'acceptation de la demande', 'error');
  }
};

const handleRejectDemand = async (demand) => {
  try {
    await substitutionStore.rejectDemand(demand.id);
    snackbarStore.showMessage('Demande refusée', 'info');
  } catch (err) {
    snackbarStore.showMessage('Erreur lors du refus de la demande', 'error');
  }
};

const transferDialog = ref(false);

// const handleTransferSuccess = () => {
//   pointStore.fetchUserPoints();
//   pointStore.fetchTransactions();
// };

const handleVacation = async (vacation) => {
  try {
    await vacationStore.updateVacation(vacation);
    snackbarStore.showMessage('Vacances mises à jour avec succès', 'success');
  } catch (err) {
    snackbarStore.showMessage('Erreur lors de la mise à jour des vacances', 'error');
  }
};
</script>