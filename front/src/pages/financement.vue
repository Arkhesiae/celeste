<template>
  <v-container :class="smAndDown ? 'mb-16' : ''">
    <!-- En-tête -->
    <MainTitle title="Financement" subtitle="Détails des coûts"
      @scrolled="(scrolled) => { /* handle sticky behaviour here if needed */ }" />
    <v-row class="d-flex ">
      <!-- Colonne latérale : Sélecteur de campagne -->
      <v-col cols="12" md="4" lg="3" class="d-flex flex-column overflow-hidden" style="max-height: 640px ">
        <template v-if="!smAndDown">
          <v-card rounded="xl" elevation="0" class="py-4" height="100%" color="transparent">
            <div class="d-flex flex-column flex-grow-0" style="max-height: 100%;">
              <v-card-title class="px-0 py-4">
                Campagnes de financement
              </v-card-title>

              <EntitySelector :items="campaigns" :prefix="'Campagne'" itemKey="index" itemTitle="index"
                :itemSubtitle="''" title=""  :itemStatus="'status'"
                :modelValue="campaigns.find(c => c.index === selectedCampaign?.index)"
                @update:modelValue="c => selectCampaign(c.index)">
                <template #statusChip="{ item }">
                  <v-chip v-if="item.status === 'a_venir'" color="remplacement" size="x-small" class="ml-2" rounded="lg" label>À
                    venir</v-chip>
                  <v-chip v-else-if="item.status === 'en_cours'" color="onBackground" variant="flat" size="x-small"
                    rounded="lg" class="ml-2" label>En cours</v-chip>
                  <v-chip v-else-if="item.status === 'termine'" color="grey" rounded="lg" size="x-small" class="ml-2"
                    label>Terminé</v-chip>
                </template>
                <template #itemDetails="{ item }">
                  <div class="d-flex flex-column">
                    <span class="text-caption text-medium-emphasis">Début : {{ new
                      Date(item.startDate).toLocaleDateString() }}</span>
                    <span v-if="item.endDate" class="text-caption text-medium-emphasis">Fin : {{ new
                      Date(item.endDate).toLocaleDateString() }}</span>
                  </div>
                </template>
              </EntitySelector>
            </div>
          </v-card>
        </template>
        <template v-else>
          <VersionSelector v-model="dialogOpen" :width="400"
            :title="'Campagne ' + ((campaigns.find(c => c.index === selectedCampaign?.index)?.index))"
            :subtitle="campaigns.find(c => c.index === selectedCampaign?.index)?.startDate ? 'Début : ' + new Date(campaigns.find(c => c.index === selectedCampaign?.index).startDate).toLocaleDateString() : ''"
            :defaultText="'Sélectionner une campagne'">
            <template #statusChip>
              <v-chip v-if="selectedCampaign?.status === 'a_venir'" color="info" size="x-small" class="ml-2"
                rounded="lg" label>À venir</v-chip>
              <v-chip v-else-if="selectedCampaign?.status === 'en_cours'" color="onBackground" variant="flat"
                size="x-small" rounded="lg" class="ml-2" label>En cours</v-chip>
              <v-chip v-else-if="selectedCampaign?.status === 'termine'" color="grey" rounded="lg" size="x-small"
                class="ml-2" label>Terminé</v-chip>
            </template>
            <template #dialog>
              <EntitySelector :items="campaigns" class="flex-grow-1 " :prefix="'Campagne'" itemKey="index"
                itemTitle="index" :itemSubtitle="''" :itemStatus="'status'"
                :modelValue="campaigns.find(c => c.index === selectedCampaign?.index)" title="Sélectionner une campagne"
                @update:modelValue="c => { selectCampaign(c.index); dialogOpen = false; }">
                <template #statusChip="{ item }">
                  <v-chip v-if="item.status === 'a_venir'" color="info" size="x-small" class="ml-2" rounded="lg" label>À
                    venir</v-chip>
                  <v-chip v-else-if="item.status === 'en_cours'" color="onBackground" variant="flat" size="x-small"
                    rounded="lg" class="ml-2" label>En cours</v-chip>
                  <v-chip v-else-if="item.status === 'termine'" color="grey" rounded="lg" size="x-small" class="ml-2"
                    label>Terminé</v-chip>
                </template>
                <template #itemDetails="{ item }">
                  <div class="d-flex flex-column">
                    <span class="text-caption text-medium-emphasis">Début : {{ new
                      Date(item.startDate).toLocaleDateString() }}</span>
                    <span v-if="item.endDate" class="text-caption text-medium-emphasis">Fin : {{ new
                      Date(item.endDate).toLocaleDateString() }}</span>
                  </div>
                </template>
              </EntitySelector>
            </template>
          </VersionSelector>
        </template>
      </v-col>
      <!-- Colonne principale : contenu financier -->
      <v-col cols="12" md="8" lg="9">
        <CurrentBudgetCard :remainingBudget="remainingBudget" :previousCampaignsRemainder="previousCampaignsRemainder"
          :campaignExpenses="campaignExpenses" :campaignAmount="initialCampaignAmount"
          :currentCampaignIndex="selectedCampaign?.index" />
        <!-- <Forecast12Months
        :nextMonths="nextMonths"
        :exhaustionDate="exhaustionDate"
        :nextCampaign="nextCampaign"
      /> -->
      </v-col>
    </v-row>

    <v-row class="mt-16"> 
      <v-col cols="12" class="pa-3">
        <ExpensesHistoryTable 
          :previousCampaignsRemainder="previousCampaignsRemainder"
          :campaignExpenses="campaigns.find(c => c.index === selectedCampaign?.index)?.expenses || []"
        />
      </v-col>
    </v-row>

  




    <!-- Détail des coûts -->
    <v-row>
      <v-col cols="12" md="6" class="pa-3">
        <FixedCostsCard
        />
      </v-col>

      <v-col cols="12" md="6" class="pa-3">
        <RecurringCostsCard
     
        />
      </v-col>

    </v-row>

    <!-- Coûts de développement -->
    <v-row>
      <v-col cols="12" class="pa-2">
        <!-- <DevelopmentCostsCard /> -->
      </v-col>
    </v-row>

    <!-- Utilisation éthique de l'IA -->
    <v-row>
      <v-col cols="12" class="pa-2">

      </v-col>
    </v-row>

    <!-- Graphique d'évolution -->
    <!-- <v-row>
      <v-col cols="12" class="pa-2">
        <v-card rounded="xl" elevation="0" class="smooth-shadow pa-6" color="surfaceContainer">
          <h3 class="text-h6 font-weight-medium mb-4">
            <v-icon icon="mdi-chart-line" color="info" class="mr-2" />
            Évolution du Budget
          </h3>

          <div class="budget-timeline">
            <div v-for="(point, index) in budgetEvolution" :key="index" class="timeline-point"
              :class="{ 'active': point.active }">
              <div class="timeline-dot" :class="{ 'active': point.active }"></div>
              <div class="timeline-content">
                <div class="timeline-date">{{ point.date }}</div>
                <div class="timeline-amount">{{ point.montant }}€</div>
                <div class="timeline-description">{{ point.description }}</div>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row> -->

    <!-- Prévision sur 12 mois -->


    <!-- Actions -->
    <!-- <v-row>
      <v-col cols="12" class="pa-2">
        <v-card rounded="xl" elevation="0" class="smooth-shadow pa-6" color="surfaceContainer">
          <div class="text-center">
            <v-icon icon="mdi-heart" color="error" size="48" class="mb-4" />
            <h3 class="text-h5 font-weight-bold mb-2">Soutenez le projet</h3>
            <p class="text-medium-emphasis mb-6">
              Votre soutien nous permet de maintenir et améliorer l'application pour tous les utilisateurs.
            </p>

            <div class="d-flex justify-center gap-4 flex-wrap">
              <v-btn color="primary" variant="flat" size="large" prepend-icon="mdi-coffee" @click="supportProject">
                Offrir un café (3€)
              </v-btn>
              <v-btn color="secondary" variant="flat" size="large" prepend-icon="mdi-pizza" @click="supportProject">
                Offrir un repas (15€)
              </v-btn>
              <v-btn color="success" variant="flat" size="large" prepend-icon="mdi-gift" @click="supportProject">
                Soutien mensuel (25€)
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row> -->

  </v-container>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useDisplay } from 'vuetify';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { useFundingStore } from '@/stores/financementStore';


const { smAndDown } = useDisplay();
const snackbarStore = useSnackbarStore();
const fundingStore = useFundingStore();

const campaigns = computed(() => fundingStore.campaignsWithStatus);
// --- NEW: campaign management ---
const currentCampaign = computed(() => fundingStore.currentCampaign);
const selectedCampaign = ref(null);

// Initialiser avec la campagne en cours par défaut
const initializeSelectedCampaign = () => {
  const enCoursCampaign = campaigns.value?.find(c => c.status === 'en_cours');
  if (enCoursCampaign) {
    selectedCampaign.value = enCoursCampaign;
  } else {
    // Fallback: sélectionner la première campagne disponible
    selectedCampaign.value = campaigns.value?.[0] || null;
  }
};

// Watcher pour initialiser la campagne sélectionnée quand les campagnes sont disponibles
watch(campaigns, (newCampaigns) => {
  if (newCampaigns && newCampaigns.length > 0 && !selectedCampaign.value) {
    initializeSelectedCampaign();
  }
}, { immediate: true });

function selectCampaign(index) {
  selectedCampaign.value = campaigns.value?.find(c => c.index === index);
}

const initialCampaignAmount = computed(() => {
  return selectedCampaign.value?.montant;
});

const campaignExpenses = computed(() => {
  return selectedCampaign.value?.expenses?.reduce((total, expense) => total + Number(expense.montant), 0);
});

const remainingBudget = computed(() => {
  return initialCampaignAmount.value + previousCampaignsRemainder.value - campaignExpenses.value;
});

const previousCampaignsRemainder = computed(() => {
  if (!selectedCampaign.value) return 0;
  const now = new Date();
  // On prend toutes les campagnes terminées, antérieures à la campagne sélectionnée, et dont la date de fin est passée
  return campaigns.value
    .filter(c =>
      c.index < selectedCampaign.value.index

    )
    .reduce((sum, c) => {
      const totalExpenses = (c.expenses || []).reduce((t, d) => t + Number(d.montant), 0);
      return sum + (c.montant - totalExpenses);
    }, 0);
});


// const progressPercentage = computed(() => {
//   if (!initialBudget.value) return 0;
//   return 100 - Math.round((usedBudget.value / initialBudget.value) * 100);
// });

// // Budget used calculations
// const usedBudget = computed(() => {
//   return campaigns.value[currentCampaign.value].expenses.reduce((total, expense) => total + Number(expense.montant), 0);
// });

// const remainingBudget = computed(() => initialBudget.value - usedBudget.value);
// const campaignAmount = computed(() => campaigns.value[currentCampaign.value].montant);
// const initialBudget = computed(() => campaignAmount.value + previousCampaignsRemainder.value);
// // Store data usage
// const fixedCosts = fundingStore.fixedCosts;
// const recurringCosts = fundingStore.recurringCosts;
// const budgetEvolution = fundingStore.budgetEvolution;

// // Store computed usage
// const totalFixedCosts = fundingStore.totalFixedCosts;
// const totalAnnualCosts = fundingStore.totalAnnualCosts;

// // Calculation of exhaustion date and 12 months
// const exhaustionDate = computed(() => {
//   const monthlyCost = totalAnnualCosts / 12;
//   const monthsLeft = currentBudget.value / monthlyCost;
//   const exhaustionDate = new Date();
//   exhaustionDate.setMonth(exhaustionDate.getMonth() + monthsLeft);
//   return exhaustionDate.toLocaleDateString('fr-FR', {
//     day: 'numeric',
//     month: 'short',
//     year: 'numeric'
//   });
// });

// const nextMonths = computed(() => {
//   const monthlyCost = totalAnnualCosts / 12;
//   const monthsLeft = currentBudget.value / monthlyCost;
//   const currentDate = new Date();
//   const months = [];

//   for (let i = 0; i < 12; i++) {
//     const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
//     const label = monthDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });

//     // Calculate remaining budget for this month
//     let monthBudget = null;
//     let fillPercentage = 0;
//     let exhausted = false;
//     let showExhaustionLine = false;
//     let exhaustionPosition = 0;

//     if (i < Math.floor(monthsLeft)) {
//       // Fully funded month
//       monthBudget = monthlyCost;
//       fillPercentage = 100;
//     } else if (i === Math.floor(monthsLeft)) {
//       // Partially funded month
//       const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
//       const remainingDays = (monthsLeft - Math.floor(monthsLeft)) * daysInMonth;
//       const dayPercentage = (remainingDays / daysInMonth) * 100;

//       monthBudget = (monthsLeft - Math.floor(monthsLeft)) * monthlyCost;
//       fillPercentage = dayPercentage;
//       showExhaustionLine = true;
//       exhaustionPosition = dayPercentage;
//     } else {
//       // Unfunded month
//       exhausted = true;
//       fillPercentage = 0;
//     }

//     months.push({
//       label,
//       monthBudget: monthBudget ? Math.round(monthBudget) : null,
//       fillPercentage: Math.round(fillPercentage),
//       exhausted,
//       showExhaustionLine,
//       exhaustionPosition: Math.round(exhaustionPosition)
//     });
//   }

//   return months;
// });

// Methods
const supportProject = () => {
  snackbarStore.showMessage('Fonctionnalité de soutien à venir !', 'info');
  // Here you could integrate a payment system like Stripe
};






function getCampaignStatus(campaigns) {
  const now = new Date();

  let hasEnCours = false;
  let hasAVenir = false;

  for (const campaign of campaigns) {
    const start = new Date(campaign.startDate);
    const end = campaign.endDate ? new Date(campaign.endDate) : null;

    if (start > now) {
      hasAVenir = true;
    } else if (!end || end >= now) {
      hasEnCours = true;
    }
    // On ne fait rien de spécial pour "terminé", car c'est le fallback
  }

  if (hasEnCours) return 'en_cours';
  if (hasAVenir) return 'a_venir';
  return 'termine';
}
</script>

<style>
/* .v-col, .v-row{
  border: 1px solid red;
}
.v-card{
  border: 1px solid blue;
} */
</style>

<style scoped>



.budget-timeline {
  position: relative;
  padding: 20px 0;
}

.budget-timeline::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(var(--v-theme-remplacement), 0.3);
}

.timeline-point {
  position: relative;
  margin-bottom: 30px;
  padding-left: 60px;
}

.timeline-dot {
  position: absolute;
  left: 11px;
  top: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(var(--v-theme-remplacement), 0.3);
  border: 3px solid rgb(var(--v-theme-surface));
  transition: all 0.3s ease;
}

.timeline-dot.active {
  background: rgb(var(--v-theme-remplacement));
  transform: scale(1.2);
}

.timeline-content {
  background: rgba(var(--v-theme-remplacement), 0.05);
  padding: 16px;
  border-radius: 12px;
  border-left: 4px solid rgb(var(--v-theme-remplacement));
}

.timeline-date {
  font-weight: bold;
  color: rgb(var(--v-theme-remplacement));
  margin-bottom: 4px;
}

.timeline-amount {
  font-size: 1.2em;
  font-weight: bold;
  margin-bottom: 4px;
}

.timeline-description {
  font-size: 0.9em;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

/* Indicateur de budget utilisé */
.budget-used-indicator {
  position: absolute;
  top: 2px;
  transform: translateX(-50%);
  transition: all 0.3s ease;
  opacity: 0;
  z-index: 10;
}

.budget-used-indicator.visible {
  opacity: 1;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  background: rgba(var(--v-theme-surface), 0.9);
  border: 1px solid rgba(var(--v-theme-onSurface), 0.5);
  border-radius: 50%;
  margin: 0 auto 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.indicator-label {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-remplacement), 0.02);
  border-radius: 8px;
  padding: 6px 10px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 80px;
}

.label-text {
  font-weight: bold;
  font-size: 0.875rem;
  color: rgb(var(--v-theme-remplacement));
  line-height: 1;
}

.label-subtitle {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  line-height: 1;
  margin-top: 2px;
}

/* Responsive */
@media (max-width: 960px) {
  .budget-timeline::before {
    left: 15px;
  }

  .timeline-point {
    padding-left: 50px;
  }

  .timeline-dot {
    left: 6px;
  }

  .indicator-label {
    min-width: 70px;
    padding: 4px 8px;
  }

  .label-text {
    font-size: 0.8rem;
  }

  .label-subtitle {
    font-size: 0.7rem;
  }
}

/* Styles pour la prévision sur 12 mois */
.months-forecast {
  position: relative;
}

.months-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.month-rectangle {
  position: relative;


}

.month-rectangle-content {
  height: 80px;
  position: relative;
  overflow: hidden;
  min-width: 80px;
  background: rgba(var(--v-theme-remplacement), 0.1);
  border: 2px solid rgba(var(--v-theme-remplacement), 0.002);
  border-radius: 12px;
}

/* .month-rectangle.exhausted {
  background: rgba(var(--v-theme-error), 0.1);
  border-color: rgba(var(--v-theme-error), 0.3);
} */

.month-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(135deg,
      rgba(var(--v-theme-remplacement), 0.0) 0%,
      rgba(var(--v-theme-remplacement), 0.6) 100%);
  transition: width 0.5s ease;
  z-index: 1;
}

/* Continuous gradient across all rectangles */
.month-rectangle:nth-child(1) .month-fill {
  background: rgba(var(--v-theme-remplacement), 0)
}

.month-rectangle:nth-child(2) .month-fill {
  background: rgba(var(--v-theme-remplacement), 0.1)
}

.month-rectangle:nth-child(3) .month-fill {
  background: rgba(var(--v-theme-remplacement), 0.2)
}

.month-rectangle:nth-child(4) .month-fill {
  background: rgba(var(--v-theme-remplacement), 0.3)
}

.month-rectangle:nth-child(5) .month-fill {
  background: rgba(var(--v-theme-remplacement), 0.4)
}

.month-rectangle:nth-child(6) .month-fill {
  background: rgba(var(--v-theme-remplacement), 0.5)
}

.month-rectangle:nth-child(7) .month-fill {
  background: rgba(var(--v-theme-remplacement), 0.6)
}

.month-rectangle:nth-child(8) .month-fill {
  background: rgba(var(--v-theme-remplacement), 0.7)
}

.month-rectangle:nth-child(9) .month-fill {
  background: rgba(var(--v-theme-remplacement), 0.8)
}

.month-rectangle:nth-child(10) .month-fill {
  background: rgba(var(--v-theme-remplacement), 0.9)
}

.month-rectangle:nth-child(11) .month-fill {
  background: rgba(var(--v-theme-remplacement), 1.0)
}

.month-rectangle:nth-child(12) .month-fill {
  background: rgba(var(--v-theme-remplacement), 1.0)
}

/* .month-rectangle.exhausted .month-fill {
  background: linear-gradient(135deg, 
    rgba(var(--v-theme-error), 0.8) 0%, 
    rgba(var(--v-theme-error), 0.6) 100%);
} */

.month-label {
  position: absolute;
  bottom: 8px;
  left: 8px;
  font-size: 0.5rem;
  opacity: 0.5;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  z-index: 2;
}

.month-budget {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 0.7rem;
  font-weight: bold;
  color: rgb(var(--v-theme-remplacement));
  background: rgba(var(--v-theme-surface), 0.9);
  padding: 2px 6px;
  border-radius: 6px;
  z-index: 2;
}

/* Ligne d'épuisement */
.exhaustion-line {
  position: absolute;
  top: -10px;
  bottom: -10px;
  width: 2px;
  background: rgba(var(--v-theme-onBackground), 0.5);
  z-index: 10;
  transform: translateX(-50%);
}

.exhaustion-dot {
  position: absolute;
  top: -6px;
  left: -3px;
  width: 8px;
  height: 8px;
  background: rgba(var(--v-theme-onBackground), 0.5);
  border-radius: 50%;
  border: 2px solid rgb(var(--v-theme-surface));
}

.exhaustion-label {
  position: absolute;
  top: -50px;
  left: 50%;
  transform: translateX(-50%);
  background: rgb(var(--v-theme-onBackground));
  color: white;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: bold;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 20;
}

.exhaustion-date {
  font-size: 0.7rem;
  line-height: 1.2;
  display: block;
}

.exhaustion-text {
  font-size: 0.6rem;
  font-weight: 900;
  opacity: 0.9;
  line-height: 1;
  display: block;
  margin-top: 2px;
}


.campaign-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-onBackground), 0.1);
  padding: 8px 16px;
  border-radius: 16px;
  border: 1px solid rgba(var(--v-theme-onBackground), 0.02);
}

/* Légende */
.forecast-legend {
  border-top: 1px solid rgba(var(--v-theme-outline), 0.2);
  padding-top: 16px;
}

.campaign-list {
  max-height: 50vh;
  overflow-y: auto;
}

.campaign-item {
  border: 1px solid transparent;
  transition: all 0.2s ease-in-out;
}

.campaign-hover:hover {
  background-color: rgba(var(--v-theme-remplacement), 0.05);
  border-color: rgba(var(--v-theme-remplacement), 0.1);
}

.selected-campaign {
  background-color: rgba(var(--v-theme-remplacement), 0.1);
  border-color: rgba(var(--v-theme-remplacement), 0.03);
}


/* Responsive pour la grille des mois */
@media (max-width: 1200px) {
  .months-grid {
    grid-template-columns: repeat(12, 1fr);
    gap: 6px;
  }

  .month-rectangle {
    height: 70px;
    min-width: 70px;
  }

  .month-label {
    font-size: 0.7rem;
  }

  .month-budget {
    font-size: 0.65rem;
  }

  .exhaustion-label {
    font-size: 0.7rem;
    padding: 5px 8px;
    top: -45px;
  }
}

@media (max-width: 768px) {
  .months-grid {
    grid-template-columns: repeat(12, 1fr);
    gap: 4px;
    overflow-x: auto;
    padding-bottom: 12px;
  }

  .month-rectangle {
    height: 60px;
    min-width: 60px;
  }

  .month-label {
    font-size: 0.65rem;
    bottom: 4px;
    left: 4px;
  }

  .month-budget {
    font-size: 0.6rem;
    top: 4px;
    right: 4px;
    padding: 1px 4px;
  }

  .exhaustion-label {
    font-size: 0.65rem;
    padding: 4px 6px;
    top: -40px;
  }

  .exhaustion-date {
    font-size: 0.6rem;
  }

  .exhaustion-text {
    font-size: 0.55rem;
  }
}

@media (max-width: 480px) {
  .months-grid {
    gap: 3px;
  }

  .month-rectangle {
    height: 50px;
    min-width: 50px;
  }

  .month-label {
    font-size: 0.6rem;
    bottom: 2px;
    left: 2px;
  }

  .month-budget {
    font-size: 0.55rem;
    top: 2px;
    right: 2px;
    padding: 1px 3px;
  }

  .exhaustion-label {
    font-size: 0.6rem;
    padding: 3px 5px;
    top: -35px;
  }

  .exhaustion-date {
    font-size: 0.55rem;
  }

  .exhaustion-text {
    font-size: 0.5rem;
  }
}
</style>