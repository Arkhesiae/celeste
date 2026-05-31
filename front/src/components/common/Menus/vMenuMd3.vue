<template>
  <v-menu></v-menu>
  <v-card class="md3-menu" elevation="2" rounded="lg" color="surfaceContainerLow">
    <v-list class="md3-menu__list pa-0" bg-color="transparent" density="compact">
      <template v-for="(entry, index) in items" :key="index">

        <template v-if="entry.type === 'divider'">
          <v-divider class="md3-menu__divider" />
          <v-list-subheader v-if="entry.label" class="md3-menu__subheader">
            {{ entry.label }}
          </v-list-subheader>
        </template>

        <v-list-item v-else class="md3-menu__item" :class="{
          'md3-menu__item--selected': modelValue === entry.value,
          'md3-menu__item--disabled': entry.disabled,
        }" :disabled="entry.disabled" :ripple="!entry.disabled" rounded="lg" @click="onSelect(entry)">

          <template v-if="entry.icon" #prepend>
            <v-icon class="md3-menu__icon" :icon="entry.icon" />
          </template>

          <v-list-item-title class="md3-menu__label">
            {{ entry.label }}
          </v-list-item-title>

          <template v-if="entry.shortcut || entry.children" #append>
            <span v-if="entry.shortcut" class="md3-menu__shortcut">
              {{ entry.shortcut }}
            </span>
            <v-icon v-else-if="entry.children" class="md3-menu__submenu-arrow" icon="mdi-chevron-right" size="18" />
          </template>
        </v-list-item>

      </template>
    </v-list>
  </v-card>
</template>

<script setup>

const props = defineProps({
  modelValue: {
    type: String,
    default: null,
  },
  items: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits([
  'update:modelValue',
  'select',
])

function onSelect (entry) {
  if (entry.type !== 'item' || entry.disabled) return
  emit('update:modelValue', entry.value)
  emit('select', entry)
}
</script>

<style scoped>
.md3-menu {
  min-width: 200px;
  padding: 8px 4px;
  background-color: rgb(var(--v-theme-surfaceContainerLow)) !important;
}

.md3-menu__list {
  display: flex;
  flex-direction: column;
}

/* ── Item ───────────────────────────────────────────────────────────────────── */

.md3-menu__item {
  min-height: 48px !important;
  padding-inline: 12px !important;
  margin-block: 0 !important;
  border-radius: 8px !important;
  transition: background-color 0.15s ease;
}

.md3-menu__item:not(.md3-menu__item--disabled):hover {
  background-color: rgba(var(--v-theme-onSurface), 0.08) !important;
}

/* ── Selected state ─────────────────────────────────────────────────────────── */

.md3-menu__item--selected {
  background-color: rgb(var(--v-theme-tertiaryContainer)) !important;
}

.md3-menu__item--selected :deep(.v-list-item-title) {
  color: rgb(var(--v-theme-onTertiaryContainer)) !important;
  font-weight: 500;
}

.md3-menu__item--selected :deep(.v-icon) {
  color: rgb(var(--v-theme-onTertiaryContainer)) !important;
}

.md3-menu__item--selected .md3-menu__shortcut {
  color: rgb(var(--v-theme-onTertiaryContainer));
}

/* ── Disabled state ─────────────────────────────────────────────────────────── */

.md3-menu__item--disabled {
  opacity: 0.38 !important;
  pointer-events: none;
}

/* ── Leading icon ───────────────────────────────────────────────────────────── */

.md3-menu__icon {
  color: rgb(var(--v-theme-onSurfaceVariant));
  margin-inline-end: 12px !important;
  font-size: 20px;
  transition: color 0.15s ease;
}

/* ── Label ──────────────────────────────────────────────────────────────────── */

.md3-menu__label {
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  letter-spacing: 0.25px;
  color: rgb(var(--v-theme-onSurface));
}

/* ── Divider ────────────────────────────────────────────────────────────────── */

.md3-menu__divider {
  margin-block: 2px !important;
  border-color: rgb(var(--v-theme-outlineVariant)) !important;
  opacity: 1 !important;
}

/* ── Section subheader ──────────────────────────────────────────────────────── */

.md3-menu__subheader {
  min-height: 32px !important;
  padding-inline: 12px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  letter-spacing: 0.5px !important;
  line-height: 16px !important;
  text-transform: none !important;
  color: rgb(var(--v-theme-onSurfaceVariant)) !important;
}

/* ── Trailing: submenu chevron ──────────────────────────────────────────────── */

.md3-menu__submenu-arrow {
  color: rgb(var(--v-theme-onSurfaceVariant));
}

/* ── Trailing: keyboard shortcut ────────────────────────────────────────────── */

.md3-menu__shortcut {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.4px;
  font-family: monospace;
  color: rgb(var(--v-theme-onSurfaceVariant));
  opacity: 0.9;
}
</style>