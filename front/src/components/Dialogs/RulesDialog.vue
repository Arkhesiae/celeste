<template>
  <v-dialog v-model="dialogVisible" max-width="1200px" persistent :fullscreen="smAndDown">
    <v-card :rounded="smAndDown ? '0' : 'xl'" class="pa-6">
      <v-card-title class="d-flex align-center justify-space-between pa-0 ma-0 mb-6">
        <div class="d-flex align-center">
          <v-icon icon="mdi-book-open-variant" color="remplacement" class="mr-6" size="16" />
          <span class="text-h5 font-weight-medium">Règles de travail</span>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="closeDialog" />
      </v-card-title>


      <div class="my-6 pa-4 bg-surfaceContainerHighest  rounded-lg">
            <div class="d-flex align-center">
              <v-icon icon="mdi-file-document-outline" color="primary" class="mr-3" size="20" />
              <span class="text-body-2 text-medium-emphasis">
                Source : 
                <a 
                  href="https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000049926084" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="text-primary text-decoration-none"
                >
                  Arreté 2024 relatif à l'organisation du travail
                </a>
              </span>
            </div>
          </div>
      <v-card-text class="pa-0  article">
     
        <div class="text-body-1">
          <p class="mb-4">
            Pour chaque agent, en complément des obligations qui s'appliquent aux cycles de travail en équipe, sont garanties :
          </p>

          <div class="d-flex flex-column ga-3 mb-4">
            <v-card 
              v-for="rule in basicRules" 
              :key="rule.id"
              color="surfaceContainer " 
              rounded="lg" 
              class="pa-4"
              flat
            >
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center">
                  <v-icon :icon="rule.icon" color="primary" class="mr-6" size="16" />
                  <span class="text-onSurface" style="font-size: 12px !important">
                    {{ rule.text }}
                  </span>
                </div>
                <div class="flex-shrink-0">
                <v-chip 
                  v-if="rule.computed"
                  color="onBackground" 
                  variant="flat" 
                  size="small"
                  rounded="lg"
                  prepend-icon="mdi-calculator"
                >
                  Calculé
                </v-chip>
                <v-chip 
                  v-else
                  color="error" 
                  variant="flat" 
                  size="small"
                  rounded="lg"
                  prepend-icon="mdi-close"
                >
                  Non calculé
                </v-chip>
                </div>
              </div>
            </v-card>
            
          <v-card 
            v-for="rule in additionalRules" 
            :key="rule.id"
            color="surfaceContainer " 
            rounded="lg" 
             :class="rule.computed ? 'computed-rule' : 'uncomputed-rule'"
            class="pa-4"
            flat
          >
            <div class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon :icon="rule.icon" :color="rule.computed ? 'primary' : 'error'" class="mr-6" size="16" />
                <span class="text-body-2 text-wrap" :class="rule.computed ? 'text-onSurface' : 'text-error'" style="font-size: 12px !important">
                  {{ rule.text }}
                </span>
              </div>
              <div class="flex-shrink-0">
              <v-chip 
                v-if="rule.computed"
                color="onBackground" 
                variant="flat" 
                size="small"
                rounded="lg"
                prepend-icon="mdi-calculator"
              >
                Calculé
              </v-chip>
              <v-chip 
                v-else
                color="error" 
                variant="flat" 
                size="small"
                rounded="lg"
                prepend-icon="mdi-close"
              >
                  à venir
                </v-chip>
              </div>
            </div>
          </v-card>
          </div>
          
          <p class="mb-4 text-body-2 text-medium-emphasis">
            Les 7 jours glissants mentionnés aux alinéas précédents s'entendent du 1er jour de la période considérée à 0 heure au 7e jour à 23 h 59.
          </p>

          <p class="mb text-body-2 text-medium-emphasis">
            Une vacation de jour ne peut débuter avant 6 heures ni se terminer après 1 heure le lendemain du début de la vacation. Durant la période comprise entre 5 heures et 24 heures un agent ne peut commencer qu'une seule vacation de contrôle.
          </p>

          <p class="mb-4 text-body-2 text-medium-emphasis">
            Une vacation de contrôle ne peut être programmée pour une durée inférieure à 5 heures.
          </p>

          <p class="mb text-body-2 text-medium-emphasis ">
            La durée maximale d'une vacation de contrôle de jour est de 10 heures.
          </p>

          <p class="mb text-body-2 text-medium-emphasis">
            La durée maximale d'une vacation de contrôle de nuit est de 11 heures (durée augmentée d'une heure les nuits d'automne de changement d'heure).
          </p>

          <p class="mb-4 text-body-2 text-medium-emphasis">
            Le décalage entre la première et la dernière heure de début ainsi qu'entre la première et la dernière heure de fin des vacations élémentaires, hors vacation de nuit, au sein d'une même vacation générique est de 5 heures maximum. Cette durée est portée à 3 heures pour les CRNA.
          </p>

          <p class="mb text-body-2 text-medium-emphasis">
            La durée maximale d'une plage de tenue de poste de contrôle est de 2,5 heures pour les organismes des listes 1 à 3 et de 4 heures pour les organismes des listes 4 et 5.
          </p>

          <p class="mb-4 text-body-2 text-medium-emphasis">
            La durée minimale d'une pause entre deux plages de tenue de poste est de 30 minutes. Une pause pour le déjeuner est obligatoire pour une vacation de contrôle d'une durée de 6 heures ou plus et incluant la plage 11 heures-13 heures. La pause pour le repas est d'une durée minimale de 45 minutes, et peut être portée à 1 heure dans la mesure du possible.
          </p>


          <p class="mb-0 font-weight-bold">
            Des dispenses sont octroyées par le service à un agent lorsque cela est strictement nécessaire au respect des dispositions du présent article.
          </p>
          
          
        </div>
      </v-card-text>

      <v-card-actions class="pa-0 pt-0 mt-4">
        <v-spacer />
        <v-btn 
          color="primary" 
          variant="tonal" 
          @click="closeDialog"
          prepend-icon="mdi-check"
        >
          Compris
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useDisplay } from 'vuetify'

const { smAndDown } = useDisplay()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const closeDialog = () => {
  dialogVisible.value = false
}

// Règles de base avec propriété computed
const basicRules = [
  {
    id: 1,
    icon: 'mdi-clock-outline',
    text: 'Une période de repos minimale de 11 heures après une période de service.',
    computed: true
  },
  {
    id: 2,
    icon: 'mdi-calendar-week',
    text: 'Une période de repos de 35 heures consécutives sur 7 jours glissants.',
    computed: true
  },
  {
    id: 3,
    icon: 'mdi-chart-timeline-variant',
    text: 'Une durée hebdomadaire du travail effectif ne pouvant excéder ni 48 heures sur 7 jours glissants ni 44 heures en moyenne sur une période quelconque de 12 semaines consécutives',
    computed: true
  }
]

// Règles supplémentaires avec propriété computed
const additionalRules = [
  {
    id: 4,
    icon: 'mdi-calendar-remove',
    text: 'Un agent ne peut travailler plus de 5 jours consécutifs, temps de trajet exclu.',
    computed: false
  },
  {
    id: 5,
    icon: 'mdi-bed',
    text: 'Un agent bénéficie d\'une période de repos minimale de 12 heures après une vacation de contrôle de nuit.',
    computed: false
  },
  {
    id: 6,
    icon: 'mdi-bread-slice',
    text: 'Un agent ne peut exercer plus de deux vacations de contrôle consécutives empiétant sur la plage 00 h 00-06 h 00.',
    computed: false
  },
  {
    id: 7,
    icon: 'mdi-moon-waning-crescent ',
    text: 'Un agent bénéficie d\'une période de repos minimale de 48 heures après deux vacations consécutives de contrôle de nuit.',
    computed: false
  }
]
</script>

<style scoped>
.article {
  padding : 16px;
  border : 1px solid rgba(var(--v-theme-onSurface), 0.0000002);
  border-radius : 16px;
}


.uncomputed-rule {
  opacity: 0.9;

  background-color: rgba(var(--v-theme-error), 0.15) !important;
}
</style> 