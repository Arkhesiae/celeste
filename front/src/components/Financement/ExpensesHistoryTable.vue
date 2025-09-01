<template>
  <div class="pa-0 rounded-xl" >
    <h3 class="text-h6 font-weight-medium mb-4">Historique des dépenses</h3>
    <v-table class="pa-4 ma-0 rounded-xl bg-surfaceContainerLow"  >
      <thead>
        <tr>
          <th v-if="!smAndDown">Catégorie</th>
          <th >Nom</th>
          <th >Date</th>
          <th align="end" >Montant</th>
        </tr>
      </thead>
      <tbody>
        <!-- Ligne du reste de la campagne précédente -->
        <tr>
          <td :colspan="smAndDown ? 2 : 3" class="font-weight-bold text-medium-emphasis">Reste de la campagne précédente</td>
          <td align="end" class="font-weight-bold text-onSurface opacity-50">{{ previousCampaignsRemainder }}</td>
        </tr>
        <!-- Dépenses de la campagne sélectionnée -->
        <tr v-for="(depense, index) in campaignExpenses" :key="index">
          <td v-if="!smAndDown">{{ depense.categorie }}</td>
          <td :class="smAndDown ? 'text-caption text-medium-emphasis' : ''">{{ depense.description }}</td>
          <td class="text-caption text-medium-emphasis">{{ depense.date }}</td>
          <td align="end" class="font-weight-bold text-remplacement">-{{ depense.montant }}€</td>
        </tr>
        <tr v-if="!Array.isArray(campaignExpenses) || !campaignExpenses.length">
          <td colspan="4" class="text-center text-medium-emphasis">Aucune dépense enregistrée</td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script setup>
import { useDisplay } from 'vuetify';
const { smAndDown } = useDisplay();

const props = defineProps({
  campaignExpenses: { type: Array, required: true },
  previousCampaignsRemainder: { type: Number, required: true }
});

</script> 