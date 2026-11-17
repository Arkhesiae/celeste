<template>
  <div>
    <v-row class="mb-4 px-2">
      <v-col v-for="day in daysOfWeek" :key="day" class="text-center">
        <span class="week-day">{{ day }}</span>
      </v-col>
    </v-row>

    <!-- Mois précédent, affiché et suivant : le Swiper les fait défiler en douceur ; la hauteur suit le mois (5 ou 6 semaines) -->
    <Swiper
      class="calendar-swiper"
      :slides-per-view="1"
      :initial-slide="slides.length === 3 ? 1 : 0"
      :speed="300"
      :threshold="8"
      auto-height
      @swiper="onSwiper"
      @transition-end="onTransitionEnd"
    >
      <SwiperSlide v-for="(slide, slideIndex) in slides" :key="slideIndex">
        <v-row
          v-for="(week, index) in slide"
          :key="index"
          class="px-4 d-flex justify-space-between align-center my-1 ga-1"
        >
          <v-col v-for="day in week" :key="day.toString()" class="ma-0 d-flex justify-space-around align-center">
            <CalendarDayBlock
              :date="day.date"
              :is-in-month="day.isInMonth"
              :is-today="isToday(plainDateToDateStr(day))"
              :selected="isSelected(plainDateToDateStr(day))"
              v-bind="getShiftData(plainDateToDateStr(day))"
              :demands="demandsForDate(plainDateToDateStr(day))"
              :has-available-substitutions="hasAvailableSubstitutions(plainDateToDateStr(day))"
              :has-available-switches="hasAvailableSwitches(plainDateToDateStr(day))"
              :has-other-demands="hasOtherDemands(plainDateToDateStr(day))"
              :rest="workOf(plainDateToDateStr(day))?.rest ?? null"
              :window-lines="linesFor(plainDateToDateStr(day))"
              :in-period="inPeriod(plainDateToDateStr(day))"
              :height="64"
              @inspect-window="emit('inspect-window', $event)"
              @select="selectDate"
            />
          </v-col>
        </v-row>
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<script setup>
import { Swiper, SwiperSlide } from 'swiper/vue';
import 'swiper/css';
import { posterDay } from '@/utils/dayFields.js';
import { Temporal } from '@js-temporal/polyfill';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useShiftStore } from '@/stores/shiftStore';
import { getDisplayShiftName } from '@/utils/getEffectiveShiftTimes';
import { entryTypeOf } from '@/utils/entryIcons';
import { dayKindOf } from '@/utils/dayStyle';
import { sameDateKey, toDateKey } from '@/utils/dateKey';
import { useWorkIndicators } from '@/composables/useWorkIndicators';

const substitutionStore = useSubstitutionStore();
const shiftStore = useShiftStore();

const props = defineProps({
  /** Semaines du mois affiché */
  calendarDays: Array,
  /** Semaines du mois précédent et du mois suivant : sans elles, le calendrier n'a qu'une diapositive (pas de glissement) */
  previousDays: { type: Array, default: null },
  nextDays: { type: Array, default: null },
  selectedDate: [String, null],
  /** Période choisie ({ start, end }, `end` absent tant que le deuxième jour n'est pas choisi) */
  period: { type: Object, default: null },
});

const daysOfWeek = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const { workOf, linesFor, inPeriod } = useWorkIndicators(toRef(props, 'period'));

/** `move` : le Swiper s'est arrêté sur le mois précédent (-1) ou suivant (+1) */
const emit = defineEmits(['update:selectedDate', 'move', 'inspect-window']);

// ── Swiper ────────────────────────────────────────────────────────────────────
// Trois diapositives [précédent, affiché, suivant]. Après un glissement, le parent change de mois : le mois voisin devient
// le mois affiché et on recentre sans animation (même principe que la grille d'équipe).
const slides = computed(() =>
  props.previousDays && props.nextDays ? [props.previousDays, props.calendarDays, props.nextDays] : [props.calendarDays],
);
const swiper = shallowRef(null);
const onSwiper = (instance) => {
  swiper.value = instance;
};

const onTransitionEnd = (instance) => {
  if (slides.value.length === 3 && instance.activeIndex !== 1) emit('move', instance.activeIndex - 1);
};

watch(
  () => props.calendarDays,
  () => {
    if (slides.value.length === 3) nextTick(() => swiper.value?.slideTo(1, 0, false));
  },
);

/** Fait glisser vers le mois précédent (-1) ou suivant (+1) : boutons de navigation */
const slideBy = (direction) => {
  if (slides.value.length === 3) swiper.value?.slideTo(1 + direction, 300);
  else emit('move', direction);
};
defineExpose({ slideBy });

const selectDate = (date) => {
  emit('update:selectedDate', date.toString());
};

const plainDateToDateStr = (plainDate) => {
  return plainDate?.date?.toString();
};

const toDateStr = (date) => toDateKey(date);

const isSelected = (dateStr) => {
  // Les deux jours de la période choisie s'affichent comme sélectionnés
  return toDateKey(props.selectedDate) === dateStr || props.period?.start === dateStr || props.period?.end === dateStr;
};

const isToday = (dateStr) => {
  const now = Temporal.Now.plainDateISO();
  const todayStr = now.toString();
  return dateStr === todayStr;
};

// ── Shift maps ────────────────────────────────────────────────────────────────

const shiftDataMap = computed(() => {
  const map = new Map();
  for (const [key, value] of shiftStore.persistentVacationsMap) {
    // Remplacé, l'agent ne tient plus de vacation : la tuile montre celle qu'il a cédée (barrée)
    const shown = value?.shiftData?.shift ?? (value?.presence === 'replaced' ? value.substitution?.gave?.shift : null);
    map.set(key, {
      isWorkDay: !!shown && shown.type !== 'rest',
      comment: value?.comment ?? '',
      presence: value?.presence ?? 'present',
      shiftName: getDisplayShiftName(value),
      selectedVariation: value?.shiftData?.selectedVariation ?? null,
      variationName: value?.shiftData?.selectedVariation?.name ?? null,
      // Nature du jour (couleur commune au calendrier et à la grille, styles/day.css) ; pour une affectation (congé, formation...)
      // l'icône remplace le nom de la vacation
      kind: dayKindOf({ type: value?.type, shiftType: shown?.type, variation: value?.shiftData?.selectedVariation }),
      icon: (() => {
        const entry = entryTypeOf(value?.type);
        return entry ? `mdi-${entry.icon}` : null;
      })(),
    });
  }
  return map;
});

const getShiftData = (dateStr) => shiftDataMap.value.get(dateStr) ?? {};

const hasAvailableSubstitutions = (dateStr) =>
  dateStr
    ? substitutionStore.availableSubstitutions.some((substitution) => sameDateKey(posterDay(substitution), dateStr))
    : false;
const hasAvailableSwitches = (dateStr) =>
  dateStr
    ? substitutionStore.availableSwitches.some((substitution) => sameDateKey(posterDay(substitution), dateStr))
    : false;
const hasOtherDemands = (dateStr) =>
  dateStr
    ? substitutionStore.otherDemands.some((substitution) => sameDateKey(posterDay(substitution), dateStr))
    : false;

const demandsMap = computed(() => {
  const map = new Map();
  const all = [
    ...substitutionStore.ownPendingHybridSubstitutions,
    ...substitutionStore.ownPendingTrueSubstitutions,
    ...substitutionStore.ownPendingTrueSwitches,
    ...substitutionStore.acceptedAsAccepter,
    ...substitutionStore.acceptedAsPoster,
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  for (const demand of all) {
    const key = toDateStr(posterDay(demand));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(demand);
  }
  return map;
});

const demandsForDate = (dateStr) => (dateStr ? (demandsMap.value.get(dateStr) ?? []) : []);
</script>

<style scoped>
.week-day {
  font-size: 0.6rem !important;
  font-weight: 500 !important;
  opacity: 0.5;
}

.shift-name {
  font-size: 10px !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.shift-name.xs {
  font-size: 9px !important;
}

.variation-name {
  display: flex;
  align-items: center;
  font-size: 10px !important;
  font-weight: 500 !important;
  opacity: 0.9;
  white-space: nowrap;
  /* overflow: hidden; */
  text-overflow: ellipsis;
  min-width: 0;
}

.variation-name.xs {
  font-size: 9px !important;
}

.test {
  gap: 2px;
}

.isWorkDay {
  opacity: 0.9;

  font-weight: 900 !important;
}

.selected {
  border-radius: 16px !important;
  color: rgb(var(--v-theme-onPrimary)) !important;
  background: rgba(var(--v-theme-primary), 1) !important;
}

.day_label_container {
  justify-content: center;
  display: flex;
}

.empty-day {
  opacity: 0.4;
}

.chip-container {
  position: absolute;
  bottom: 0px;
  padding-bottom: 4px;
  padding-left: 4px;
  padding-right: 4px;
  width: 100%;
  display: flex;
  justify-content: center;
}

.shift_container {
  opacity: 0.9;
  display: flex;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  justify-content: center;
  min-width: 0;
}

.day_label_container span {
  position: relative;
  font-size: 12px !important;
  font-weight: 500 !important;
}

.day_label_container span.xs {
  font-size: 11px !important;
  font-weight: 500 !important;
}
</style>
