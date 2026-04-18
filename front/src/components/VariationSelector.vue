<template>
    <div v-if="!isRestDay" class="mt-4 d-flex ga-2 align-center justify-space-between align-self-end">
        <v-tooltip v-if="inPast && isShift" text="MDDA" location="top">
            <template #activator="{ props: tooltipProps }">
                <v-btn v-bind="tooltipProps" icon size="small" variant="flat" color="primary" class="selected"
                    @click="emit('register-mdda')">
                    <v-icon>mdi-clock-fast</v-icon>
                </v-btn>
            </template>
        </v-tooltip>

        <v-tooltip v-if="!isShift && !isOff" text="Modifier l'horaire" location="top">
            <template #activator="{ props: tooltipProps }">
                <v-btn v-bind="tooltipProps" icon size="small" variant="flat" color="primary" class="selected"
                    @click="emit('patch-hours')">
                    <v-icon>mdi-clock-edit-outline</v-icon>
                </v-btn>
            </template>
        </v-tooltip>

        <div v-if="isShift" class="d-flex align-center ga-2 chips-container">
            <div class="d-flex align-center chips-container-alt">
                <v-tooltip v-for="v in variations" :key="v._id" :text="`${v.startTime} - ${v.endTime}`" location="top">
                    <template #activator="{ props: tooltipProps }">
                        <v-btn v-bind="tooltipProps" icon size="small" variant="flat"
                            :color="isVariationSelected(v) ? 'primary' : 'surfaceContainerHigh'"
                            :class="isVariationSelected(v) ? 'selected' : ''" @click="emit('select-variation', v)">
                            {{ v.name }}
                        </v-btn>
                    </template>
                </v-tooltip>

                <v-tooltip v-if="isShift" text="VIC" location="top">
                    <template #activator="{ props: tooltipProps }">
                        <v-btn v-bind="tooltipProps" icon size="small" variant="flat"
                            :color="status === 'vic' ? 'warning' : 'surfaceContainerHigh'"
                            @click="emit('register-vic')">
                            VIC
                        </v-btn>
                    </template>
                </v-tooltip>

                <v-tooltip v-if="isShift" :text="isOff ? 'Annuler l\'absence' : 'Déclarer une absence'"
                    location="top">
                    <template #activator="{ props: tooltipProps }">
                        <v-btn v-bind="tooltipProps" :color="isOff ? 'error' : 'surfaceContainerHigh'"
                            :class="isOff ? 'selected' : ''" icon rounded="lg" size="small" flat
                            @click="emit('register-absence')">
                            <v-icon>mdi-cancel</v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>
            </div>
        </div>
    </div>
</template>

<script setup
        lang="ts">
        interface Variation {
            _id: string
            name: string
            startTime: string
            endTime: string
        }

        interface Props {
            isRestDay: boolean
            inPast?: boolean
            isShift?: boolean
            isOff?: boolean
            hasNoDemand?: boolean
            status?: string
            variations?: Variation[]
            selectedVariation?: Variation | null | string
        }

        const props = withDefaults(defineProps<Props>(), {
            inPast: false,
            isShift: false,
            isOff: false,
            hasNoDemand: false,
            status: '',
            variations: () => [],
            selectedVariation: null,
        })

        const emit = defineEmits<{
            'register-mdda': []
            'patch-hours': []
            'select-variation': [variation: Variation]
            'register-vic': []
            'register-absence': []
        }>()

        function isVariationSelected(v: Variation): boolean {
            if (!props.selectedVariation || !v) return false;
            const selectedId = typeof props.selectedVariation === 'string'
                ? props.selectedVariation
                : props.selectedVariation._id;
            return selectedId?.toString() === v._id?.toString();
        }
</script>


<style scoped>
.chips-container {
  transition: all 0.5s ease-in-out;

  padding: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chips-container::-webkit-scrollbar {
  display: none;
}

.chips-container-alt {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  overflow-y: hidden;
  transition: all 0.5s ease-in-out;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chips-container-alt::-webkit-scrollbar {
  display: none;
}

.chips-container-alt .v-btn {
  border-radius: 8px !important;
  transition: border-radius var(--motion-expressive-fast-spatial),
    background-color var(--motion-expressive-fast-effects);
}

.chips-container-alt .v-btn:first-child {
  border-radius: 24px 8px 8px 24px !important;
}

.chips-container-alt .v-btn:nth-child(2) {
  border-radius: 8px !important;
}

.chips-container-alt .v-btn:last-child {
  border-radius: 8px 24px 24px 8px !important;
}

.chips-container-alt .v-btn.selected {
  border-radius: 24px !important;
}

.chips-container-alt .v-btn:last-child.selected {
  border-radius: 8px !important;
}
</style>
