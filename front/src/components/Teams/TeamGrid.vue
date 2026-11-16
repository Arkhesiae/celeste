<template>
  <div class="team-grid" :style="{ '--cols': span }">
    <!-- Colonne des noms : fixe, hors du Swiper -->
    <div class="tg-left">
      <div class="tg-corner" />
      <div v-for="row in rows" :key="row.userId" class="tg-name" :title="`${row.name} ${row.lastName}`">
        <span class="tg-name__text">{{ row.displayName }}</span>
        <v-chip v-if="row.isRenfort" size="x-small" rounded="lg" variant="tonal" class="tg-name__tag" title="Renfort">
          R
        </v-chip>
      </div>
    </div>

    <!-- Périodes précédente / courante / suivante : le Swiper les fait défiler en douceur -->
    <Swiper
      class="tg-swiper"
      :slides-per-view="1"
      :initial-slide="1"
      :speed="300"
      :threshold="8"
      @swiper="onSwiper"
      @transition-end="onTransitionEnd"
    >
      <SwiperSlide v-for="(slide, slideIndex) in slides" :key="slideIndex">
        <div class="tg-slide">
          <!-- En-tête : un jour par colonne -->
          <div class="tg-cells tg-cells--head">
            <div
              v-for="col in slide.columns"
              :key="col.key"
              class="tg-day"
            >
              <span class="tg-day__month">{{ col.monthLabel }}</span>
              <span class="tg-day__weekday">{{ col.weekday }}</span>
              <span class="tg-day__number" :class="{ 'today-pill': col.isToday }">{{ col.day }}</span>
              <span
                v-if="col.shift"
                class="tg-day__shift"
                :class="{ 'tg-day__shift--rest': col.shift.isRest }"
                :title="col.shiftTitle"
              >{{ col.shift.name }}</span>
            </div>
          </div>

          <!-- Une ligne par membre, une cellule par jour -->
          <div v-for="row in rows" :key="row.userId" class="tg-cells">
            <div
              v-for="(cell, index) in row.slides[slideIndex]"
              :key="index"
              class="tg-cell tile tile--static"
              :class="[
                cell.entry?.classes,
                {
                  'day--today': slide.columns[index].isToday,
                  'tg-cell--weekend': slide.columns[index].isWeekend && !cell.entry,
                  'tg-cell--outside': !cell.inTeam,
                  'tg-cell--replaced': cell.entry?.replaced,
                },
              ]"
              :title="cell.entry?.title"
            >
              <template v-if="cell.entry">
                <div class="tg-entry__line">
                  <v-icon v-if="cell.entry.icon" size="14" class="tg-entry__icon day-icon">
                    {{ cell.entry.icon }}
                  </v-icon>
                  <span class="tg-entry__label">{{ cell.entry.label }}</span>
                </div>
                <div v-if="cell.entry.counterpart" class="tg-entry__line tg-entry__counterpart">
                  <v-icon size="12" class="tg-entry__icon">
                    {{ cell.entry.counterpartIcon }}
                  </v-icon>
                  <span class="tg-entry__label">{{ cell.entry.counterpart }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </SwiperSlide>
    </Swiper>

    <div v-if="rows.length === 0" class="tg-empty text-medium-emphasis">
      Aucun membre sur cette période.
    </div>
  </div>
</template>

<script setup>
import { Temporal } from '@js-temporal/polyfill';
import { Swiper, SwiperSlide } from 'swiper/vue';
import 'swiper/css';
import { entryTypes } from '@/utils/entryIcons';
import { dayKindClass, dayKindOf, dayPresenceClasses } from '@/utils/dayStyle';

const props = defineProps({
  /** Membres renvoyés par GET /teams/:id/grid (période précédente + courante + suivante) */
  members: { type: Array, default: () => [] },
  /** Premier jour de la période courante (YYYY-MM-DD) */
  startDate: { type: String, required: true },
  /** Nombre de jours par période : 6, 12 ou 24 */
  span: { type: Number, default: 12 },
  /** Vacation habituelle de l'équipe par jour : { 'YYYY-MM-DD': { name, isRest, startTime, endTime } } */
  teamShifts: { type: Object, default: () => ({}) },
  /** Jour courant dans le fuseau du centre (YYYY-MM-DD) */
  today: { type: String, default: null },
});

/** `move` : le Swiper s'est arrêté sur la période précédente (-1) ou suivante (+1) */
const emit = defineEmits(['move']);

// ─── Swiper ──────────────────────────────────────────────────────────────────
// Trois diapositives : [précédente, courante, suivante]. Après un glissement, le parent décale `startDate` ;
// le contenu de la diapositive voisine devient celui de la diapositive centrale et on recentre sans animation.
const swiper = shallowRef(null);
const onSwiper = (instance) => { swiper.value = instance; };

const onTransitionEnd = (instance) => {
  if (instance.activeIndex !== 1) emit('move', instance.activeIndex - 1);
};

watch(() => props.startDate, () => {
  nextTick(() => swiper.value?.slideTo(1, 0, false));
});

/** Fait glisser vers la période précédente (-1) ou suivante (+1) : boutons de navigation */
const slideBy = (direction) => swiper.value?.slideTo(1 + direction, 300);
defineExpose({ slideBy });

// ─── Colonnes ────────────────────────────────────────────────────────────────
const buildColumns = (start) => {
  const first = Temporal.PlainDate.from(start);
  return Array.from({ length: props.span }, (_, index) => {
    const date = first.add({ days: index });
    const shift = props.teamShifts[date.toString()] ?? null;
    return {
      key: date.toString(),
      shift,
      shiftTitle: shift ? [shift.name, shift.startTime && shift.endTime ? `${shift.startTime}–${shift.endTime}` : null].filter(Boolean).join(' · ') : '',
      day: date.day,
      weekday: date.toLocaleString('fr-FR', { weekday: 'narrow' }),
      // Le mois est rappelé sur la première colonne et à chaque début de mois
      monthLabel: index === 0 || date.day === 1 ? date.toLocaleString('fr-FR', { month: 'short' }) : '',
      isToday: date.toString() === props.today,
      isWeekend: date.dayOfWeek >= 6,
    };
  });
};

const slides = computed(() => [-1, 0, 1].map((offset) => ({
  columns: buildColumns(Temporal.PlainDate.from(props.startDate).add({ days: offset * props.span }).toString()),
})));

// ─── Lignes ──────────────────────────────────────────────────────────────────
const entryOf = (type) => entryTypes.find((e) => e.key === type);

const buildCell = (day) => {
  const entry = entryOf(day.type);
  // VIC écrit en toutes lettres : la couleur seule ne doit pas porter l'information ; la dispo se lit à la couleur d'erreur et au libellé
  const variationLabel = day.variation === 'vic' ? 'VIC' : (day.variation && day.variation !== 'disp' ? day.variation : null);
  const label = [day.shiftName ?? entry?.label ?? day.type, variationLabel].filter(Boolean).join(' · ');

  let counterpartIcon = 'mdi-swap-horizontal';
  if (day.counterpart && !day.counterpart.isSwitch) {
    counterpartIcon = day.presence === 'replaced' ? 'mdi-account-arrow-right-outline' : 'mdi-account-arrow-left-outline';
  }

  // Même code couleur que le calendrier (utils/dayStyle.js, styles/day.css) : nature du jour, puis présence
  const kind = dayKindOf({
    type: day.type,
    shiftType: day.shiftName ? (day.isRest ? 'rest' : 'work') : null,
    variation: day.variation,
  });

  return {
    classes: [dayKindClass(kind), ...dayPresenceClasses(day.presence)],
    replaced: day.presence === 'replaced',
    icon: entry ? `mdi-${entry.icon}` : null,
    label,
    counterpart: day.counterpart?.name ?? null,
    counterpartIcon,
    title: [label, day.startTime && day.endTime ? `${day.startTime}–${day.endTime}` : null, day.counterpart?.name]
      .filter(Boolean).join(' · '),
  };
};

// Une ligne n'existe que si le membre fait partie de l'équipe au moins un jour de la période COURANTE
const rows = computed(() => {
  const first = props.startDate;
  const last = Temporal.PlainDate.from(props.startDate).add({ days: props.span - 1 }).toString();

  return props.members
    .filter((member) => member.inTeamDates.some((date) => date >= first && date <= last))
    .map((member) => {
      const byDate = new Map(member.days.map((day) => [day.date, day]));
      const inTeam = new Set(member.inTeamDates);
      return {
        ...member,
        // Nom de famille seul, en majuscules (le prénom reste dans l'infobulle)
        displayName: (member.lastName || member.name || '').toUpperCase(),
        // inTeam : le membre fait partie de l'équipe ce jour-là ; sinon la cellule reste vide et sans fond
        slides: slides.value.map(({ columns }) => columns.map((col) => {
          const day = byDate.get(col.key);
          return { inTeam: inTeam.has(col.key), entry: day ? buildCell(day) : null };
        })),
      };
    });
});
</script>

<style scoped>
.team-grid {
  --name-width: 84px;       /* largeur plafonnée de la colonne des noms */
  --row-height: 56px;
  --head-height: 64px;
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 4px;
  width: 100%;
  user-select: none;
}

@media (min-width: 960px) {
  .team-grid { --name-width: 120px; }
}

/* Colonne des noms : reste en place, seule la partie droite défile avec le Swiper */
.tg-left {
  flex: 0 0 var(--name-width);
  width: var(--name-width);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tg-corner { height: var(--head-height); }

.tg-name {
  height: var(--row-height);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px 4px 4px;
  min-width: 0;
  border-right: 1px solid rgba(var(--v-theme-outlineVariant), 0.4);
}

.tg-name__text {
  min-width: 0;
  flex: 1;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tg-name__tag { flex: 0 0 auto; }

.tg-swiper {
  flex: 1;
  min-width: 0;
  width: calc(100% - var(--name-width) - 4px);
}

.tg-slide {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tg-cells {
  display: grid;
  gap: 4px;                 /* écart horizontal et vertical entre les cellules */
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  height: var(--row-height);
  min-width: 0;
}

.tg-cells--head { height: var(--head-height); }

.tg-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: 4px 0;
  overflow: hidden;
  line-height: 1.1;
  color: rgb(var(--v-theme-onSurfaceVariant));
}

.tg-day__month {
  height: 11px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}

.tg-day__weekday { font-size: 10px; text-transform: uppercase; }
.tg-day__number { font-size: 14px; font-weight: 700; }

/* Vacation habituelle de l'équipe ce jour-là : comme le nom d'une vacation dans le calendrier (texte courant, repos atténué) */
.tg-day__shift {
  margin-top: 2px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  font-weight: 700;
  color: rgb(var(--v-theme-onSurface));
}

.tg-day__shift--rest { font-weight: 500; color: rgb(var(--v-theme-onSurfaceVariant)); }

/* Cellule = tuile globale statique (tile.css) colorée par day.css, comme une tuile du calendrier ; ici seulement sa taille */
.tg-cell {
  --tile-radius: 12px;
  flex-direction: column;
  justify-content: center;
  gap: 0;
  min-width: 0;
  min-height: 0;
  padding: 2px 3px;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.15;
}

/* Week-end : fond un peu plus soutenu pour une cellule vide */
.tg-cell--weekend { --tile-bg: rgba(var(--v-theme-onSurface), 0.05); }

/* Hors équipe ce jour-là : aucune cellule visible */
.tg-cell--outside {
  --tile-bg: transparent;
  --tile-border: transparent;
}

/* Remplacé : il ne travaille plus cette vacation, son nom est barré (le nom de celui qui le remplace reste lisible) */
.tg-cell--replaced .tg-entry__line:first-child .tg-entry__label { text-decoration: line-through; }

.tg-entry__line {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.tg-entry__icon { flex: 0 0 auto; }

.tg-entry__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.tg-entry__counterpart .tg-entry__label { font-weight: 500; }

.tg-empty {
  flex: 1 0 100%;
  padding: 32px 16px;
  text-align: center;
}
</style>
