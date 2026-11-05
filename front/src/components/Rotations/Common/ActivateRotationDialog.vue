<template>
  <base-dialog v-model="modelValue" title="Programmer un TDS" icon="mdi-file-plus">
      <v-card-text class="mt-8">
        <div class="d-flex justify-space-between align-center py-6">
          <v-text-field
            rounded="lg"
            prepend-inner-icon="mdi-calendar"
            class="cursor-pointer"
            variant="solo"
            flat
            bg-color="background"
            :model-value="formattedDate"
            persistent-hint
            hint="Début"
            label="Date d'activation"
            readonly
          />
        </div>

        <v-date-picker
          hide-header
          flat
          elevation="0"
          class="mx-auto mt-4"
          width="100%"
          :model-value="selectedDate"
          :min="minDate"
          locale="fr"
          @update:model-value="updateDate"
        />
      </v-card-text>

      <template #actions>
        <v-spacer />
        <v-btn
          color="primary"
          variant="tonal"
          rounded="xl"
          :disabled="!selectedDate"
          prepend-icon="mdi-clock-star-four-points-outline"
          @click="submit"
        >
          Programmer
        </v-btn>
      </template>
  
 </base-dialog>
</template>

<script setup lang="ts">
import { useDate } from "vuetify";
import { Temporal } from "@js-temporal/polyfill";

const DEFAULT_TIME_ZONE = "Europe/Paris";

// ─── Emits ───────────────────────────────────────────────────────────────────
const emit = defineEmits<{
  onSubmit: [date: Date];
}>();

// ─── Props ───────────────────────────────────────────────────────────────────
const props = defineProps<{ timeZone?: string }>();

// ─── Models ──────────────────────────────────────────────────────────────────
const modelValue = defineModel<boolean>({ required: true });

const date = useDate();
const selectedDate = ref<Date | null>(null);
// Premier jour activable : aujourd'hui dans le fuseau du centre (le serveur applique la même règle)
const minDate = computed(() => {
  let today: Temporal.PlainDate;
  try {
    today = Temporal.Now.plainDateISO(props.timeZone || DEFAULT_TIME_ZONE);
  } catch {
    today = Temporal.Now.plainDateISO(DEFAULT_TIME_ZONE); // fuseau invalide
  }
  return new Date(today.year, today.month - 1, today.day);
});

const formattedDate = computed(() =>
  selectedDate.value ? date.format(selectedDate.value, "keyboardDate") : ""
);

function updateDate(newDate: Date): void {
  selectedDate.value = newDate;
}

function submit(): void {
  if (!selectedDate.value) return;
  emit("onSubmit", selectedDate.value);
  modelValue.value = false;
}

function close(): void {
  modelValue.value = false;
}
</script>