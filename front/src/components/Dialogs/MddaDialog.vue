<template>
  <BaseDialog v-model="open" title="MDDA" icon="mdi-clock-fast" :max-width="420" divider>
    <div class="d-flex flex-column ga-4">
      <p class="text-body-medium text-medium-emphasis mb-0">
        Indiquez les horaires effectivement réalisés.
      </p>

      <div
        v-if="plannedStart && plannedEnd"
        class="d-flex align-center justify-space-between pa-3 rounded-lg"
        style="background: rgba(var(--v-theme-surfaceContainerHigh), 1);"
      >
        <span class="text-body-small text-medium-emphasis">Horaires prévus</span>
        <span class="text-body-medium font-weight-medium">{{ plannedStart }} – {{ plannedEnd }}</span>
      </div>

      <v-row dense>
        <v-col cols="6">
          <v-text-field
            v-model="startTime"
            label="Début réel"
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
            label="Fin réelle"
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

    <template #actions>
      <v-btn variant="text" rounded="xl" @click="open = false">Annuler</v-btn>
      <v-spacer />
      <v-btn
        color="primary"
        variant="flat"
        rounded="xl"
        :disabled="!canSubmit"
        :loading="loading"
        @click="submit"
      >
        Enregistrer
      </v-btn>
    </template>
  </BaseDialog>
</template>

<script setup>
import BaseDialog from '@/components/common/BaseDialog.vue';

const open = defineModel({ type: Boolean, default: false });

const props = defineProps({
  plannedStart: { type: String, default: '' },
  plannedEnd: { type: String, default: '' },
  initialStart: { type: String, default: '' },
  initialEnd: { type: String, default: '' },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['confirm']);

const startTime = ref('');
const endTime = ref('');

const requiredTime = (v) => !!v || 'Requis';

const normalizeTime = (value) => {
  if (!value) return '';
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

const canSubmit = computed(() =>
  Boolean(normalizeTime(startTime.value) && normalizeTime(endTime.value))
);

watch(open, (isOpen) => {
  if (!isOpen) return;
  startTime.value = normalizeTime(props.initialStart || props.plannedStart);
  endTime.value = normalizeTime(props.initialEnd || props.plannedEnd);
});

const submit = () => {
  if (!canSubmit.value) return;
  emit('confirm', {
    startTime: normalizeTime(startTime.value),
    endTime: normalizeTime(endTime.value),
  });
};
</script>
