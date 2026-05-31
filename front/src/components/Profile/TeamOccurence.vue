<template>
  <div class="occurrence-card" :class="{ 'is-confirming': isConfirming }">
    <!-- Leading icon -->
    <div class="occurrence-icon" :class="occurrence.type === 'Renfort' ? 'icon--renfort' : 'icon--affectation'">
      <v-icon size="18"
        :icon="occurrence.type === 'Renfort' ? 'mdi-handshake-outline' : 'mdi-account-switch-outline'" />
    </div>

    <!-- Body -->
    <div class="occurrence-body">
      <span class="occurrence-title">
        <span class="occurrence-type-badge">{{ occurrence.type }}</span>
        Équipe {{ occurrence.teamName }}
        <span class="days-chip" :class="chipVariant">
          · Dans {{ relativeDays }} jours
        </span>
      </span>
      <span v-if="occurrence.type === 'Renfort'" class="occurrence-sub">
        Du <strong>{{ formattedOccurenceDate(occurrence.fromDate) }}</strong>
        au <strong>{{ formattedOccurenceDate(occurrence.toDate) }}</strong> inclus
      </span>
      <span v-else class="occurrence-sub">
        À partir du <strong>{{ formattedOccurenceDate(occurrence.fromDate) }}</strong>
      </span>

    </div>

    <div class="occurrence-right">
      <v-btn rounded="xl" variant="text" color="onBackground" size="small" icon
        @click.stop="handleDelete(occurrence._id)">
        <v-icon>mdi-delete-outline</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { useDisplay } from "vuetify";

const props = defineProps({
  occurrence: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['delete-occurrence']);

const activeCardId = ref(null);
const { smAndDown } = useDisplay();

const relativeDays = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const changeDate = new Date(props.occurrence.fromDate);
  const diffTime = changeDate - today;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

const formattedOccurenceDate = computed(() => (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
});


const handleDelete = (occurrenceId) => {
  console.log('handleDelete', occurrenceId);
  emit('delete-occurrence', occurrenceId);
};
</script>


<style scoped>
.occurrence-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 16px;
  border: 0.5px solid rgba(var(--v-border-color), .01);
  background: rgb(var(--v-theme-surfaceContainerHigh));
  transition: border-color 0.15s ease;
  margin-bottom: 6px;
}

.occurrence-card:hover {
  border-color: rgba(var(--v-border-color), 0.3);
}

/* ── Icon badge ── */
.occurrence-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon--renfort {
  background: rgba(var(--v-theme-primary), 0.012);
  color: rgb(var(--v-theme-primary));
}

.icon--affectation {
  background: rgba(var(--v-theme-primary), 0.012);
  color: rgb(var(--v-theme-primary));
}

/* ── Body ── */
.occurrence-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.occurrence-title {
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 4px;
}

.occurrence-type-badge {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.occurrence-sub {
  font-size: 12px;
  opacity: 0.8;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.4;
}

.occurrence-sub strong {
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
}

/* ── Right side ── */
.occurrence-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ── Days chip ── */
.days-chip {
  font-size: 12px;
  font-weight: 400;

  border-radius: 999px;
  /* border: 0.5px solid rgba(var(--v-border-color), var(--v-border-opacity)); */
  color: rgba(var(--v-theme-on-surface), 0.6);
  white-space: nowrap;
  line-height: 1.6;
}

.chip--soon {
  background: rgba(var(--v-theme-warning), 0.1);
  border-color: rgba(var(--v-theme-warning), 0.35);
  color: rgb(var(--v-theme-warning));
}

.chip--today {
  background: rgba(var(--v-theme-success), 0.1);
  border-color: rgba(var(--v-theme-success), 0.35);
  color: rgb(var(--v-theme-success));
}

.chip--past {
  opacity: 0.55;
}

/* ── Delete button ── */
.del-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--v-theme-error));
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.del-btn:hover {
  background: rgba(var(--v-theme-error), 0.08);
  border-color: rgba(var(--v-theme-error), 0.35);
  color: rgb(var(--v-theme-error));
}

/* ── Confirm group ── */
.confirm-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-cancel {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 0.5px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: transparent;
  color: rgb(var(--v-theme-on-surface-variant));
  cursor: pointer;
  transition: background 0.1s;
  line-height: 1.5;
}

.btn-cancel:hover {
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.btn-confirm {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 8px;
  border: 0.5px solid rgba(var(--v-theme-error), 0.4);
  background: rgba(var(--v-theme-error), 0.1);
  color: rgb(var(--v-theme-error));
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: opacity 0.1s;
  line-height: 1.5;
}

.btn-confirm:hover {
  opacity: 0.75;
}

/* ── Transition ── */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(6px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}
</style>
