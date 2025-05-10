<template>
  <v-container>

    <div class="d-flex justify-space-between">
      <div class="my-16 d-flex flex-column">
        <span class="text-h4 font-weight-medium">Remplacements</span>
        <span class="text-h4 text-overline text-medium-emphasis ">Créer et consulter les demandes de rempla </span>
      </div>

    </div>
    <v-row>
      <!-- Liste des demandes existantes -->
      <v-col cols=8>
        <v-card rounded="xl" elevation="0" class="pa-0" color="transparent">
          <v-card-title>Demandes en cours</v-card-title>


          <v-col cols="6">
            <v-text-field rounded="xl" prepend-inner-icon="mdi-magnify"
                          label="Rechercher..."></v-text-field>
            <span>Filtrer par </span>
            <v-chip
              rounded="lg"
              color="primary"
              append-icon="mdi-chevron-down"
            >
              Zone
            </v-chip>
            <v-chip
              rounded="lg"
              color="primary"
              append-icon="mdi-chevron-down"
            >
              Equipe
            </v-chip>
            <v-chip
              rounded="lg"
              closable
              color="primary"

            >
              EST
            </v-chip>
            <v-chip-group v-model="filterStatus" mandatory>
              <!-- Filtres de statut -->

              <v-chip
                v-for="status in statuses"
                rounded="lg"
                border="sm dashed"
                :key="status"
                color="primary"
              >
                {{ status }}
              </v-chip>
            </v-chip-group>
            <!-- Filtres de statut -->
            <v-chip
              rounded="lg"
              color="primary"
              append-icon="mdi-chevron-down"
            >
              Trier par
            </v-chip>
          </v-col>
          <v-col

          >
            <!-- Affichage d'une carte pour chaque demande -->
            <DemandCard
              :demands="demands.doable"
            >
            </DemandCard>
            <div class="my-2"><span class="text-h5 font-weight-medium mt-10">Travaille ce jour</span></div>
<!--            <div class="my-2 text-green-accent-4" color="green-darken-1"><span class="text-subtitle-1">Indisponible</span></div>-->

            <DemandCard
              :demands="demands.notDoable?.alreadyWorking"
            >
            </DemandCard>

            <div class="my-2"><span class="text-h5 font-weight-medium mt-10">Pas assez de repos</span></div>

            <DemandCard
              :demands="demands.notDoable?.insufficientRest"
            >
            </DemandCard>

            <div class="my-2"><span class="text-h5 font-weight-medium mt-10">Travaille trop de jours consecutifs</span></div>

            <DemandCard
              :demands="demands.notDoable?.consecutiveDaysLimit"
            >
            </DemandCard>


          </v-col>
        </v-card>
      </v-col>
      <v-col cols=4 >
        <v-btn class="mb-4" prepend-icon="mdi-plus" variant="tonal" height="80px" width="100%" elevation="0">Ajouter
          une demande
        </v-btn>
        <div class="my-8 d-flex flex-column">
          <span class="text-h5 font-weight-medium">Mes demandes </span>
          <span class="opac text-subtitle-2 text-medium-emphasis ">Toutes mes demandes</span>
        </div>
        <v-card rounded="xl" elevation="0" class="pa-1 position-sticky" style="position:sticky !important;top:100px !important;">
          <v-card-item @click="displayPending = !displayPending">
            <v-card-title>
              En attente
            </v-card-title>
            <template #append>
              <v-icon icon="mdi-chevron-down" style="transition: all ease-in-out 0.2s" :style="displayPending ? 'transform: rotate(-180deg)' : ''"></v-icon>
            </template>

          </v-card-item >

          <v-expand-transition>


          <v-card-text v-if="displayPending">

            <v-card v-for="demand in demands.ofUser"
                    :key="demand._id"
                    cols="12"
                    variant="tonal"
                    color="secondary"
                    rounded="xl"
                    elevation="0"
                    class="pa-1 mb-2">
              <!--            <v-card-title class="text-body-2 d-flex align-center">-->
              <!--              <v-icon color="primary" icon="mdi-calendar" start></v-icon>-->
              <!--              <span class="text-medium-emphasis font-weight-bold">-->
              <!--              {{ demand.date?.substring(0, 10) }}-->
              <!--            </span>-->


              <v-card-item class="align-start">

                <v-card-title class="text-h4 font-weight-bold">{{ demand.shift?.name }}</v-card-title>

                <template #append>
                  <v-chip
                    class="ms-2 text-medium-emphasis"
                    prepend-icon="mdi-eye-outline"

                    rounded="pill"
                    color="primary"
                    variant="tonal"
                  >
                    {{ demand.seenBy?.length || 0 }}
                  </v-chip>
                  <v-chip
                    class="ms-2 text-medium-emphasis"
                    rounded="pill"
                    color="error"
                    variant="tonal"
                  >
                    En attente
                  </v-chip>


                </template>
              </v-card-item>
              <v-card-text class="pa-0 ">
                <v-card-subtitle style="overflow: visible">     <span class=" text-medium-emphasis font-weight-bold">
                                 {{ demand.date?.substring(0, 10) }}
                               </span> dans équipe A
                </v-card-subtitle>
              </v-card-text>
              <!--              <v-card-text class="d-flex align-start  flex-column">-->


              <!--                <template #ad></template>-->
              <!--              </v-card-text>-->


              <!--            </v-card-title>-->


              <v-card-actions class="pa-3">
                <v-spacer></v-spacer>
                <v-btn
                  rounded="lg"
                  color="error"
                  variant="flat"
                  prepend-icon="mdi-close"
                  @click="deleteDemand(demand._id)"
                >
                  Annuler
                </v-btn>


              </v-card-actions>


              <!--          <v-card-title>-->
              <!--          -->
              <!--       -->
              <!--          </v-card-title>-->
              <!--          <v-card-subtitle>{{ demand.comment }}</v-card-subtitle>-->

            </v-card>
            <v-card height="80px" class="d-flex justify-center flex-column align-center" variant="flat"
                    border="dashed opacity-10 md">
              <v-card-title>Nouvelle demande</v-card-title>
              <v-card-text>
                <v-icon icon="mdi-plus"></v-icon>
              </v-card-text>
            </v-card>
          </v-card-text>
          </v-expand-transition>
        </v-card>


      </v-col>
    </v-row>

  </v-container>
</template>

<script>
import {ref, computed, onMounted, watch} from "vue";
import {useSubstitutionStore} from "@/stores/substitutionStore.js";
import {useUserStore} from "@/stores/userStore.js";
import {useAuthStore} from "@/stores/authStore.js";
import {toUTCNormalized} from "@/utils.js";
import DemandCard from "@/components/Remplacer/DemandCard.vue";


export default {
  components: {DemandCard},
  setup() {
    // Initialisation des stores
    const substitutionStore = useSubstitutionStore();
    const userStore = useUserStore();
    const authStore = useAuthStore();

    // Références et états locaux
    const loadingUsers = ref(true); // Indique si les utilisateurs sont en cours de chargement
    // const selectedUser = ref()
    const userShift = ref(null); // Shift actuel de l'utilisateur sélectionné
    const demand = ref({
      shift: "",
      date: null,
      comment: "",
      points: 0,
    });
    const statuses = ["open", "accepted", "cancelled"]; // Liste des statuts possibles
    const filterStatus = ref(null); // Statut actuel utilisé pour filtrer
    const loadingShift = ref(false); // Indique si le shift est en cours de chargement
    const displayPending = ref(false); // Indique si le shift est en cours de chargement

    // Calculs réactifs
    const users = computed(() => userStore.users);
    const userId = computed(() => authStore.userId);
    const demands = computed(() => remplacementStore.demands);
    const getUserById = computed(() => (userId) => userStore.users.find((user) => user._id === userId));

    // Fonction pour récupérer le shift de l'utilisateur sélectionné
    const fetchUserShift = async () => {
      if (userId.value && demand.value.date) {
        try {
          loadingShift.value = true;
          const response = await fetch(
            `http://192.168.1.36:3000/users/${userId.value}/get-vacations`,
            {
              method: "POST",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify({dates: toUTCNormalized(demand.value.date)}),
            }
          );
          if (!response.ok) {
            throw new Error("Échec lors de la récupération des vacances");
          }
          const data = await response.json();
          userShift.value = data[0]?.status || "Inconnu";
        } catch (err) {
          console.error(err.message || "Erreur inconnue lors de la récupération du shift.");
        } finally {
          loadingShift.value = false;
        }
      }
    };

    // Observer les changements de date ou d'utilisateur sélectionné
    watch(
      [() => demand.value.date, () => userId.value],
      async () => {
        if (userId.value && demand.value.date) {
          await fetchUserShift();
        }
      },
      {immediate: true}
    );

    // Filtrer les demandes en fonction du statut
    // const filteredDemands = computed(() => {
    //   if (!filterStatus.value) {
    //     return demands.value;
    //   }
    //   return demands.value.filter((demand) => demand.status === filterStatus.value);
    // });

    // Envoyer une demande
    const submitDemand = async () => {
      if (userId.value) {
        try {
          demand.value.date = toUTCNormalized(demand.value.date);
          const newDemand = {
            ...demand.value,
            posterId: userId.value,
            shift: userShift.value,
          };
          await substitutionStore.createDemand(newDemand);
          // Réinitialiser le formulaire après l'envoi
          demand.value = {shift: "", date: null, comment: "", points: 0};
        } catch (err) {
          console.error("Erreur lors de l'envoi de la demande.");
        }
      } else {
        console.error("Veuillez sélectionner un utilisateur avant de soumettre la demande.");
      }
    };

    // Supprimer une demande
    const deleteDemand = async (demandId) => {
      try {
        await substitutionStore.deleteDemand(demandId);
      } catch (err) {
        console.error("Erreur lors de la suppression de la demande.", err);
      }
    };

    // Charger les utilisateurs et les demandes au montage
    onMounted(async () => {
      await userStore.fetchUsers();
      await substitutionStore.fetchAndMarkAsSeen(authStore.userId);
      loadingUsers.value = false;
    });

    return {
      // selectedUser,
      demand,
      users,
      loadingUsers,
      deleteDemand,
      getUserById,
      loadingShift,
      statuses,
      filterStatus,
      demands,
      submitDemand,
      displayPending,
      userShift,
    };
  },
};
</script>

<style scoped>

::v-deep(.dashed > .v-timeline-divider > .v-timeline-divider__after) {
  border: none;
  margin-bottom: 3px;
  border-left:2px dotted rgba(157, 194, 211, 0.21);
  background: none !important;
}

::v-deep(.dashed > .v-timeline-divider > .v-timeline-divider__before) {
  border: none;

  border-left:2px dotted rgba(157, 194, 211, 0.23);
  background: none !important;
}
</style>
