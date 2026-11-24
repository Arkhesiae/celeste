<template>
  <BaseDialog v-model="open" title="Commentaire du jour" icon="mdi-comment-text-outline" :max-width="480">
    <!-- Une note libre sur le jour, indépendante de la vacation et des entrées : elle reste jusqu'à ce qu'on la change ou la supprime -->
    <v-textarea
      v-model="text"
      label="Commentaire"
      variant="solo-filled"
      flat
      rounded="xl"
      rows="3"
      auto-grow
      counter
      autofocus
      :maxlength="CALENDAR_COMMENT_MAX_LENGTH"
      hide-details="auto"
      @keydown.ctrl.enter="save"
    />

    <template #actions>
      <v-btn v-if="hadComment" variant="text" color="error" rounded="xl" :disabled="saving" @click="remove"
        >Supprimer</v-btn
      >
      <v-spacer />
      <v-btn variant="text" rounded="xl" :disabled="saving" @click="open = false">Annuler</v-btn>
      <v-btn variant="flat" color="primary" rounded="xl" :loading="saving" :disabled="!canSave" @click="save"
        >Enregistrer</v-btn
      >
    </template>
  </BaseDialog>
</template>

<script setup>
import { useShiftStore } from '@/stores/shiftStore';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { planningModificationService } from '@/services/planningModificationService';
import { CALENDAR_COMMENT_MAX_LENGTH } from '@/config/limits.js';
import { toDateKey } from '@/utils/dateKey';

const props = defineProps({
  /** Le jour commenté (Date ou `AAAA-MM-JJ`) */
  date: { type: [Date, String], required: true },
});

const open = defineModel({ type: Boolean, default: false });

const shiftStore = useShiftStore();
const snackbarStore = useSnackbarStore();

const dateKey = computed(() => toDateKey(props.date));
const current = computed(() => shiftStore.persistentVacationsMap.get(dateKey.value)?.comment ?? '');

const text = ref('');
const saving = ref(false);

// À l'ouverture, le commentaire du jour tel qu'il est affiché
watch(open, (isOpen) => {
  if (isOpen) text.value = current.value;
});

const hadComment = computed(() => current.value !== '');
const canSave = computed(() => text.value.trim() !== current.value && text.value.length <= CALENDAR_COMMENT_MAX_LENGTH);

// Un commentaire vide supprime la note : le serveur renvoie le jour recalculé
const send = async (comment) => {
  saving.value = true;
  try {
    const res = await planningModificationService.setDayComment(dateKey.value, comment);
    shiftStore.addEntry(res.userShift[0], dateKey.value);
    open.value = false;
  } catch (err) {
    console.error(err);
    snackbarStore.showNotification(err.message, 'onError', 'mdi-alert-circle-outline');
  } finally {
    saving.value = false;
  }
};

const save = () => {
  if (canSave.value && !saving.value) send(text.value.trim());
};
const remove = () => send('');
</script>
