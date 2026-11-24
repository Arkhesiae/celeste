<template>
  <BaseDialog v-model="open" title="Ajouter une entrée" icon="mdi-calendar-plus" :max-width="520">
    <div class="d-flex flex-column ga-5">
      <!-- Type : une tuile par type, on en choisit un (vrais boutons radio pour le clavier et les lecteurs d'écran) -->
      <div>
        <span id="assignment-type-label" class="text-label-large text-medium-emphasis d-block mb-2">Type d'entrée</span>
        <div class="entry-grid ga-2" role="radiogroup" aria-labelledby="assignment-type-label">
          <button
            v-for="entry in entryTypes"
            :key="entry.key"
            type="button"
            role="radio"
            :aria-checked="type === entry.key"
            class="tile entry-tile"
            :class="entry.key === 'absence' ? 'entry-tile--leave' : 'entry-tile--entry'"
            @click="type = entry.key"
          >
            <v-icon size="24" aria-hidden="true">{{ entry.icon }}</v-icon>
            <span class="entry-tile__label text-label-medium font-weight-bold">{{ entry.label }}</span>
          </button>
        </div>
      </div>

      <!-- Congé : validé ou non. Réglage d'affichage seulement : cette valeur n'est pas envoyée au serveur -->
      <v-switch
        v-if="type === 'absence'"
        v-model="validated"
        label="Congé validé"
        color="primary"
        density="comfortable"
       
      />

      <!-- Horaires : le serveur les exige pour toute entrée sans vacation ; 09:00 – 17:00 par défaut -->
      <div>
        <span class="text-label-large text-medium-emphasis d-block mb-2">Horaires</span>
        <v-row dense>
          <v-col cols="6">
            <v-text-field
              v-model="startTime"
              label="Début"
              type="time"
              variant="solo-filled"
              flat
              rounded="xl"
              hide-details="auto"
              :rules="[requiredTime]"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model="endTime"
              label="Fin"
              type="time"
              variant="solo-filled"
              flat
              rounded="xl"
              hide-details="auto"
              :rules="[requiredTime]"
            />
          </v-col>
        </v-row>
      </div>

      <v-textarea
        v-model="comment"
        label="Commentaire (optionnel)"
        variant="solo-filled"
        flat
        rounded="xl"
        rows="2"
        auto-grow
        counter
        :maxlength="CALENDAR_COMMENT_MAX_LENGTH"
        hide-details="auto"
      />
    </div>

    <template #actions>
      <v-btn variant="text" rounded="xl" @click="open = false">Annuler</v-btn>
      <v-spacer />
      <v-btn color="primary" variant="flat" rounded="xl" :disabled="!canSubmit" :loading="loading" @click="submit">
        Ajouter
      </v-btn>
    </template>
  </BaseDialog>
</template>

<script setup>
import { entryTypes } from '@/utils/entryIcons';
import { CALENDAR_COMMENT_MAX_LENGTH } from '@/config/limits.js';

/**
 * Ajout d'une entrée de calendrier (formation, bureau, congé...) : le type se choisit sur des tuiles, avec les horaires
 * (09:00 – 17:00 par défaut) et un commentaire facultatif. `submit` renvoie la saisie ; le parent l'envoie au serveur et ferme
 * la fenêtre quand c'est fait (ou ouvre sa confirmation si le serveur en demande une).
 */
const open = defineModel({ type: Boolean, default: false });

defineProps({
  /** Enregistrement en cours : le bouton attend */
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['submit']);

const DEFAULT_START = '09:00';
const DEFAULT_END = '17:00';

const type = ref(null);
const startTime = ref(DEFAULT_START);
const endTime = ref(DEFAULT_END);
const comment = ref('');
const validated = ref(true);

const requiredTime = (value) => !!value || 'Requis';

const normalizeTime = (value) => {
  const match = String(value ?? '').match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '';
};

const canSubmit = computed(() => {
  const start = normalizeTime(startTime.value);
  const end = normalizeTime(endTime.value);
  return Boolean(type.value && start && end && start !== end && comment.value.length <= CALENDAR_COMMENT_MAX_LENGTH);
});

// Une saisie neuve à chaque ouverture
watch(open, (isOpen) => {
  if (!isOpen) return;
  type.value = null;
  startTime.value = DEFAULT_START;
  endTime.value = DEFAULT_END;
  comment.value = '';
  validated.value = true;
});

const submit = () => {
  if (!canSubmit.value) return;
  emit('submit', {
    entryType: type.value,
    startTime: normalizeTime(startTime.value),
    endTime: normalizeTime(endTime.value),
    comment: comment.value.trim(),
    // Congé validé ou non : conservé ici pour l'affichage, le parent ne l'envoie pas au serveur
    validated: type.value === 'absence' ? validated.value : null,
  });
};
</script>

<style scoped>
.entry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
}

/* Tuile globale (styles/tile.css) : on ne règle que la disposition et l'accent, comme dans le calendrier (congé / autres entrées) */
.entry-tile {
  align-items: center;
  justify-content: center;
  min-height: 76px;
  text-align: center;
}

.entry-tile--entry {
  --tile-accent: rgb(var(--v-theme-entry));
  --tile-on-accent: rgb(var(--v-theme-onEntry));
}

.entry-tile--leave {
  --tile-accent: rgb(var(--v-theme-leave));
  --tile-on-accent: rgb(var(--v-theme-onLeave));
}

.entry-tile__label {
  line-height: 1.15;
}
</style>
