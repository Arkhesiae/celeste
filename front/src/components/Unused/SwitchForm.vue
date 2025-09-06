<template>
  <v-dialog v-model="isDialogVisible"
            max-width="600px" :fullscreen="mobile">
    <v-card rounded="xl" elevation="8" class="pa-2">
      <!-- Titre principal -->

      <v-card-title class="d-flex justify-space-between align-center">
        <div class="text-h5 ">
          {{ dialogTitle }}
        </div>

        <v-btn
          icon="mdi-close"
          variant="text"
          @click="close"
        ></v-btn>
      </v-card-title>

      <v-card-text class="overflow-auto">
        {{userShift?.shift?.name }}
        <v-form ref="addForm" v-model="formValid">

          <div class="d-flex  justify-space-between">
            <v-icon icon="mdi-calendar" @click="" class="mr-4 mt-4"></v-icon>
            <v-text-field
              rounded="lg"
              class="cursor-pointer mt-00"
              bg-color="primary"
              v-model="formattedDate"
              persistent-hint
              hint="Remplacement"
              label="Date de remplacement"
              @blur="formatDateForDisplay"
              @focus="formatDateForInput"
              readonly
            ></v-text-field>
            <div v-if="dialogModeValue === 'Renfort'" class="text-h4 ma-3">-</div>
          </div>
          <v-date-picker
            show-adjacent-months
            show-current
            hide-header
            class="mx-auto"
            width="400px"
            v-model="selectedDate"
            @update:model-value="updateFormattedDate"
            locale="fr"
          ></v-date-picker>
          <v-textarea
            rounded="xl"
            v-model="demand.comment"
            no-resize
            label="Commentaire"
            outlined
          ></v-textarea>


          <div class="d-flex justify-start align-center ">
            <v-number-input
              hide-input
              hide-details
              v-model="demand.points"
              max-width="50px"
              rounded="lg"
              color="white"
              bg-color="primary"
              label="Points"
              required
            >
            </v-number-input>
            <input
              type="number"
              class="rounded-xl text-h2 font-weight-bold  pa-4"
              style="  width: 150px; color: #85cde6"
              v-model="demand.points"
            />

          </div>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-space-between">
        <v-btn 
          variant="text" 
          color="secondary" 
          rounded="xl"
          @click="close"

        >
          Annuler
        </v-btn>
        <v-btn 
          variant="tonal" 
          rounded="xl" 
          color="primary"
          :disabled="!formValid"
          @click="submit"

        >
          Poster la demande
        </v-btn>
      </v-card-actions>


    </v-card>
  </v-dialog>

  <!-- Confirmation Dialog -->
  <v-dialog v-model="showConfirmationDialog" max-width="400px">
    <v-card rounded="xl" elevation="0" class="pa-2">
      <v-card-item prepend-icon="mdi-alert-outline">
        <v-card-title>Conflit de changement</v-card-title>

      </v-card-item>

      <v-card-text>
        Ecraser le changement du {{ toDisplayFormat(selectedDate) }} ?
      </v-card-text>
      <v-card-actions class="justify-space-between">
        <v-btn variant="text" color="secondary" @click="showConfirmationDialog = false">Annuler</v-btn>
        <v-btn variant="tonal" rounded="lg" color="primary" @click="submit() ; showConfirmationDialog=false">Valider
        </v-btn>

      </v-card-actions>
    </v-card>

  </v-dialog>

  <v-snackbar
    v-model="snackbarVisible"
    close-delay="5000"
    location="top"

    color="primary"
  >
    {{ snackbarMessage }}
  </v-snackbar>

</template>

<script>
import {ref, watch, computed} from "vue";
import {useDisplay} from "vuetify";
import {useDate} from 'vuetify';
import {toUTCNormalized} from "@/utils.js";
import {useAuthStore} from "@/stores/authStore.js";
import {useRemplacementStore} from "@/stores/remplacementStore.js";

export default {
  name: "TeamDialog",
  props: {
    dialogMode: {
      type: String,
      required: true,
    },
    dialogVisible: {
      type: Boolean,
      required: true,
    },
    date: {
      type: String,

    },
  },
  emits: ["onClose", "onSubmit", "update:dialogModeValue", "update:dialogVisible"],
  setup(props, {emit}) {
    // Déclaration de la snackbar
    const snackbarVisible = ref(false);
    const snackbarMessage = ref('');
    const {mobile} = useDisplay()
    // Modèles réactifs
    const demand = ref({
      shift: null ,
      date: null,
      comment: "",
      points: 0,
    });
    const authStore = useAuthStore();
    const remplacementStore = useRemplacementStore();
    const userShift = ref("");
    const userId = computed(() => authStore.userData.userId);

    // Fonction pour récupérer le shift de l'utilisateur sélectionné
    const fetchUserShift = async () => {
      if (userId.value && selectedDate.value) {
        try {

          const response = await fetch(
            `http://192.168.1.36:3000/users/${userId.value}/get-vacations`,
            {
              method: "POST",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify({dates: toUTCNormalized(selectedDate.value)}),
            }
          );
          if (!response.ok) {
            throw new Error("Échec lors de la récupération des vacations");
          }
          const data = await response.json();
          userShift.value = data[0] || "Inconnu";
        } catch (err) {
          console.error(err.message || "Erreur inconnue lors de la récupération du shift.");
        } finally {

        }
      }
    };

    const dialogModeValue = computed({
      get: () => props.dialogMode,
      set: (value) => emit("update:dialogModeValue", value),
    });

    const isDialogVisible = computed({
      get: () => props.dialogVisible,
      set: (value) => emit("update:dialogVisible", value),
    });

    const dialogTitle = computed(() =>
      dialogModeValue.value === "Rempla"
        ? "Demander un remplacement"
        : "Demande de permutation"
    );


    const showConfirmationDialog = ref(false);
    const teamData = ref({teamId: null, fromDate: null, toDate: null});
    const menu = ref(false); // pour le sélecteur de date
    const formValid = ref(false);
    const date = useDate();
    const formattedDate = ref('');
    const selectedDate  =   ref('')

    const toDisplayFormat = (input) => {
      if (input) {
        return date.format(input, "fullDate")
      }
    }

    // Formate la date pour l'affichage (blur d'un champ)
    const formatDateForDisplay = () => {
      if (selectedDate.value) {
        formattedDate.value = date.format(selectedDate.value, "fullDate");
      }
    };

    // Formate la date pour la saisie (focus d'un champ)
    const formatDateForInput = () => {
      if (selectedDate.value) {
        formattedDate.value = date.format(selectedDate.value, "keyboardDate");
      }
    };

    // Validateur simple requis
    const rules = {
      required: (value) => !!value || "Ce champ est requis.",
    };

    // Synchronisation lors de la sélection dans le v-date-picker
    const updateFormattedDate = (val) => {
      selectedDate.value = val;
      formatDateForDisplay(); // Formater pour affichage
    };


    // Remise à zéro du formulaire lors de fermeture du dialogue
    watch(
      () => props.dialogVisible,
      (value) => {
        if (value) {
          // On définit la date initiale au moment où la boîte de dialogue s'ouvre
          selectedDate.value = props.date ? new Date(props.date) : null;
          formattedDate.value = props.date ? toDisplayFormat(props.date) : '';
        } else {
          resetForm();
        }
      }
    );

    watch(selectedDate, async (newVal) => {
      if(newVal){
        await fetchUserShift()
      }
    }, );

    const resetForm = () => {
      selectedDate.value = null;
      formValid.value = false;
    };

    // Soumission des données
    const submit = async () => {
        try {
          demand.value.date = toUTCNormalized(selectedDate.value);
          const newDemand = {
            ...demand.value,
            posterId: userId.value,
            shift: userShift.value.shift,
          };
          await remplacementStore.createDemand(newDemand);
          // Réinitialiser le formulaire après l'envoi
          demand.value = {shift: "", date: null, comment: "", points: 0};
          // Affiche une snackbar pour indiquer le succès
          snackbarMessage.value = "Demande de remplacement postée"
          snackbarVisible.value = true;
          close()
          resetForm()
          await remplacementStore.fetchDemandsByPosterId(userId.value);
        } catch (err) {
          snackbarMessage.value = err.message;
          snackbarVisible.value = true;
        }
    };

    const close = () => {
      isDialogVisible.value = false;
    };

    return {
      menu,
      demand,
      formattedDate,
      selectedDate,
      dialogModeValue,
      rules,
      userShift,
      formValid,
      formatDateForDisplay,
      formatDateForInput,
      isDialogVisible,
      showConfirmationDialog,
      updateFormattedDate,
      mobile,
      teamData,
      submit,
      close,
      dialogTitle,
      snackbarVisible,
      snackbarMessage,
      toDisplayFormat,
    };
  },
};
</script>
