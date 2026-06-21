<template>
  <v-container class="announcements-admin">
    <!-- ── Header ──────────────────────────────────────────────────────────── -->
    <MainTitle title="Annonces publiques" subtitle="Gérer les bannières affichées sur le tableau de bord des utilisateurs">
      <template #actions>
        <v-btn
          color="primary"
          variant="flat"
          rounded="xl"
          height="36"
          size="small"
          prepend-icon="mdi-plus"
          @click="openCreateDialog"
        >
          Nouvelle annonce
        </v-btn>
      </template>
    </MainTitle>

    <!-- ── Stats row ───────────────────────────────────────────────────────── -->
    <v-row class="mb-6">
      <v-col v-for="stat in statCards" :key="stat.key" cols="12" sm="6" md="3">
        <v-card class="stat-card pa-5" rounded="xl" color="surfaceContainerLow" flat>
          <div class="d-flex align-center ga-4">
            <v-avatar :color="stat.color" variant="tonal" size="40">
              <v-icon :icon="stat.icon" size="18" />
            </v-avatar>
            <div>
              <div class="text-headline-small font-weight-bold">{{ stat.value }}</div>
              <div class="text-body-small text-medium-emphasis">{{ stat.label }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ── Active announcements list ───────────────────────────────────────── -->
    <v-card rounded="xl" color="surfaceContainerLow" flat class="mb-6">
      <v-card-title class="pa-6 pb-2 d-flex align-center justify-space-between">
        <span class="text-body-large font-weight-semibold">Annonces actives</span>
        <v-chip size="small" color="primary" label>{{ activeAnnouncements.length }}</v-chip>
      </v-card-title>
      <v-card-text class="pa-4">
        <div v-if="store.loading" class="d-flex justify-center pa-8">
          <v-progress-circular indeterminate color="primary" size="32" />
        </div>

        <div v-else-if="activeAnnouncements.length === 0" class="empty-state">
          <v-icon size="40" color="medium-emphasis">mdi-bullhorn-outline</v-icon>
          <p class="text-body-medium text-medium-emphasis mt-2 mb-0">Aucune annonce active</p>
        </div>

        <div v-else class="announcements-list">
          <div
            v-for="ann in activeAnnouncements"
            :key="ann._id"
            class="announcement-row"
            :class="`accent-${ann.type}`"
          >
            <!-- Type indicator -->
            <div class="row-accent" />

            <!-- Content -->
            <div class="row-body">
              <div class="row-header">
                <div class="d-flex align-center ga-2">
                  <v-icon :icon="typeConfig[ann.type]?.icon" size="16" :color="typeConfig[ann.type]?.color" />
                  <span class="text-body-medium font-weight-semibold">{{ ann.title }}</span>
                </div>
                <div class="d-flex align-center ga-2">
                  <v-chip v-if="ann.isPermanent" size="x-small" color="secondary" label>
                    <v-icon start size="10">mdi-pin</v-icon>
                    Permanent
                  </v-chip>
                  <v-chip v-if="!ann.isGlobal" size="x-small" color="tertiary" label>
                    <v-icon start size="10">mdi-office-building</v-icon>
                    Local
                  </v-chip>
                  <v-chip size="x-small" :color="typeConfig[ann.type]?.color" label variant="tonal">
                    {{ typeConfig[ann.type]?.label }}
                  </v-chip>
                </div>
              </div>
              <p class="text-body-small text-medium-emphasis message-preview mb-0">{{ ann.message }}</p>
              <div class="row-footer">
                <span class="text-body-small text-disabled">
                  Par {{ ann.createdBy?.name }} {{ ann.createdBy?.lastName }} ·
                  {{ formatDate(ann.createdAt) }}
                </span>
                <span v-if="ann.expiresAt" class="text-body-small text-warning">
                  <v-icon size="12">mdi-clock-outline</v-icon>
                  Expire le {{ formatDate(ann.expiresAt) }}
                </span>
                <span class="text-body-small text-medium-emphasis">
                  <v-icon size="12">mdi-account-check</v-icon>
                  {{ ann.acknowledgedBy?.length ?? 0 }} acquittements
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="row-actions">
              <v-switch
                :model-value="ann.isActive"
                hide-details
                density="compact"
                color="primary"
                class="mr-2"
                @update:model-value="toggleActive(ann)"
              />
              <v-btn icon size="small" variant="text" @click="openEditDialog(ann)">
                <v-icon size="16">mdi-pencil-outline</v-icon>
              </v-btn>
              <v-btn icon size="small" variant="text" color="error" @click="confirmDelete(ann)">
                <v-icon size="16">mdi-trash-can-outline</v-icon>
              </v-btn>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- ── Inactive / archived ──────────────────────────────────────────────── -->
    <v-card rounded="xl" color="surfaceContainerLow" flat>
      <v-card-title class="pa-6 pb-2 d-flex align-center justify-space-between">
        <span class="text-body-large font-weight-semibold">Archivées / Inactives</span>
        <v-chip size="small" label>{{ inactiveAnnouncements.length }}</v-chip>
      </v-card-title>
      <v-card-text class="pa-4">
        <div v-if="inactiveAnnouncements.length === 0" class="empty-state">
          <p class="text-body-small text-disabled mb-0">Aucune annonce archivée</p>
        </div>
        <div v-else class="announcements-list">
          <div
            v-for="ann in inactiveAnnouncements"
            :key="ann._id"
            class="announcement-row inactive"
          >
            <div class="row-accent" />
            <div class="row-body">
              <div class="row-header">
                <span class="text-body-medium text-medium-emphasis">{{ ann.title }}</span>
                <v-chip size="x-small" label>{{ typeConfig[ann.type]?.label }}</v-chip>
              </div>
              <p class="text-body-small text-disabled message-preview mb-0">{{ ann.message }}</p>
            </div>
            <div class="row-actions">
              <v-switch
                :model-value="ann.isActive"
                hide-details
                density="compact"
                color="primary"
                @update:model-value="toggleActive(ann)"
              />
              <v-btn icon size="small" variant="text" color="error" @click="confirmDelete(ann)">
                <v-icon size="16">mdi-trash-can-outline</v-icon>
              </v-btn>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- ═══════════════════════════════════════════════════════════════════════
         Create / Edit dialog
    ═══════════════════════════════════════════════════════════════════════ -->
    <v-dialog v-model="dialog" max-width="640px" :fullscreen="smAndDown" persistent>
      <v-card :rounded="smAndDown ? '' : 'xl'" color="surfaceContainerLow" flat>

        <!-- Dialog header -->
        <div class="dialog-header pa-6 pb-0">
          <div class="d-flex align-center ga-3 mb-1">
            <v-avatar color="primary" variant="tonal" size="32">
              <v-icon size="16">mdi-bullhorn</v-icon>
            </v-avatar>
            <span class="text-title-large font-weight-bold">
              {{ editingId ? 'Modifier l\'annonce' : 'Nouvelle annonce' }}
            </span>
          </div>
          <p class="text-body-small text-medium-emphasis mb-0 ml-11">
            {{ editingId ? 'Modifiez les champs ci-dessous.' : 'L\'annonce sera visible immédiatement sur le tableau de bord.' }}
          </p>
        </div>

        <v-card-text class="pa-6 pt-6">
          <!-- Live preview -->
          <div class="preview-banner mb-6" :class="`type-${form.type}`">
            <div class="preview-accent" />
            <div class="preview-content">
              <v-icon :icon="typeConfig[form.type]?.icon" size="16" :color="typeConfig[form.type]?.color" />
              <div class="preview-text">
                <span class="preview-title">{{ form.title || 'Titre de l\'annonce' }}</span>
                <span class="preview-msg">{{ form.message || 'Message de l\'annonce…' }}</span>
              </div>
              <v-chip v-if="form.isPermanent" size="x-small" label class="ml-1">
                <v-icon start size="10">mdi-pin</v-icon>
                Permanent
              </v-chip>
              <v-btn v-else size="x-small" variant="tonal" rounded="xl" class="ml-1">J'ai compris</v-btn>
            </div>
          </div>

          <!-- Type selector -->
          <div class="mb-4">
            <div class="text-body-small text-medium-emphasis mb-2">Type</div>
            <div class="d-flex ga-2 flex-wrap">
              <v-btn
                v-for="t in typeOptions"
                :key="t.value"
                size="small"
                rounded="xl"
                :variant="form.type === t.value ? 'flat' : 'tonal'"
                :color="form.type === t.value ? t.color : ''"
                @click="form.type = t.value"
              >
                <v-icon start size="14">{{ t.icon }}</v-icon>
                {{ t.label }}
              </v-btn>
            </div>
          </div>

          <!-- Title -->
          <v-text-field
            v-model="form.title"
            label="Titre"
            variant="solo-filled"
            flat
            rounded="xl"
            bg-color="surfaceContainer"
            class="mb-3"
            :rules="[v => !!v || 'Requis']"
            counter="80"
            maxlength="80"
          />

          <!-- Message -->
          <v-textarea
            v-model="form.message"
            label="Message"
            variant="solo-filled"
            flat
            rounded="xl"
            bg-color="surfaceContainer"
            rows="3"
            class="mb-4"
            :rules="[v => !!v || 'Requis']"
            counter="500"
            maxlength="500"
          />

          <!-- Options row -->
          <v-row dense class="mb-2">
            <!-- Permanent toggle -->
            <v-col cols="12" sm="6">
              <v-card rounded="xl" color="surfaceContainer" flat class="pa-4">
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <div class="text-body-medium font-weight-medium">Permanent</div>
                    <div class="text-body-small text-medium-emphasis">Non dismissible par les utilisateurs</div>
                  </div>
                  <v-switch v-model="form.isPermanent" hide-details density="compact" color="primary" />
                </div>
              </v-card>
            </v-col>

            <!-- Global / Local toggle (master admin only) -->
            <v-col v-if="isMasterAdmin" cols="12" sm="6">
              <v-card rounded="xl" color="surfaceContainer" flat class="pa-4">
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <div class="text-body-medium font-weight-medium">Portée globale</div>
                    <div class="text-body-small text-medium-emphasis">Visible par tous les centres</div>
                  </div>
                  <v-switch v-model="form.isGlobal" hide-details density="compact" color="primary" />
                </div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Center picker (local mode) -->
          <v-select
            v-if="isMasterAdmin && !form.isGlobal"
            v-model="form.centerId"
            :items="centers"
            item-title="name"
            item-value="_id"
            label="Centre"
            variant="solo-filled"
            flat
            rounded="xl"
            bg-color="surfaceContainer"
            class="mb-3 mt-3"
            :rules="[v => form.isGlobal || !!v || 'Sélectionnez un centre']"
          />

          <!-- Expiry date -->
          <v-text-field
            v-model="form.expiresAt"
            label="Date d'expiration (optionnel)"
            type="datetime-local"
            variant="solo-filled"
            flat
            rounded="xl"
            bg-color="surfaceContainer"
            class="mt-3"
            clearable
            hint="Laisser vide pour ne pas expirer automatiquement"
            persistent-hint
          />
        </v-card-text>

        <v-card-actions class="pa-6 pt-0">
          <v-btn variant="text" color="onSurface" :disabled="store.saving" @click="closeDialog">
            Annuler
          </v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            rounded="xl"
            :loading="store.saving"
            :disabled="!formValid"
            @click="submitForm"
          >
            {{ editingId ? 'Enregistrer' : 'Publier' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmationDialog
      v-model="deleteDialog"
      title="Supprimer l'annonce"
      :text="deleteText"
      confirm-label="Supprimer"
      cancel-label="Annuler"
      :confirm-color="'error'"
      @confirm="executeDelete"
      @cancel="deleteDialog = false"
    />
  </v-container>
</template>

<script setup>

import { useAuthStore } from '@/stores/authStore';
import { usePublicAnnouncementStore } from '@/stores/publicAnnouncementStore';
import { useCenterStore } from '@/stores/centerStore';
import { useDisplay } from 'vuetify';

const authStore = useAuthStore();
const store = usePublicAnnouncementStore();
const centerStore = useCenterStore();
const { smAndDown } = useDisplay();

const isMasterAdmin = computed(() => authStore.userData.adminType === 'master');
const centers = computed(() => centerStore.centers ?? []);

// ── Type config ───────────────────────────────────────────────────────────
const typeConfig = {
  info:        { icon: 'mdi-information-outline', color: 'blue',   label: 'Information' },
  warning:     { icon: 'mdi-alert-outline',        color: 'orange', label: 'Avertissement' },
  maintenance: { icon: 'mdi-tools',               color: 'red',    label: 'Maintenance' },
  update:      { icon: 'mdi-update',              color: 'green',  label: 'Mise à jour' }
};

const typeOptions = [
  { value: 'info',        label: 'Information',   icon: 'mdi-information-outline', color: 'blue' },
  { value: 'warning',     label: 'Avertissement', icon: 'mdi-alert-outline',        color: 'orange' },
  { value: 'maintenance', label: 'Maintenance',   icon: 'mdi-tools',               color: 'red' },
  { value: 'update',      label: 'Mise à jour',   icon: 'mdi-update',              color: 'green' }
];

// ── Computed lists ────────────────────────────────────────────────────────
const activeAnnouncements = computed(() =>
  store.allAnnouncements.filter(a => a.isActive)
);
const inactiveAnnouncements = computed(() =>
  store.allAnnouncements.filter(a => !a.isActive)
);

// ── Stats ─────────────────────────────────────────────────────────────────
const statCards = computed(() => [
  {
    key: 'total',
    label: 'Total',
    value: store.allAnnouncements.length,
    icon: 'mdi-bullhorn',
    color: 'primary'
  },
  {
    key: 'active',
    label: 'Actives',
    value: activeAnnouncements.value.length,
    icon: 'mdi-check-circle-outline',
    color: 'success'
  },
  {
    key: 'permanent',
    label: 'Permanentes',
    value: store.allAnnouncements.filter(a => a.isPermanent).length,
    icon: 'mdi-pin',
    color: 'secondary'
  },
  {
    key: 'acknowledged',
    label: 'Acquittements',
    value: store.allAnnouncements.reduce((sum, a) => sum + (a.acknowledgedBy?.length ?? 0), 0),
    icon: 'mdi-account-check',
    color: 'tertiary'
  }
]);

// ── Form state ─────────────────────────────────────────────────────────────
const dialog = ref(false);
const editingId = ref(null);
const defaultForm = () => ({
  title: '',
  message: '',
  type: 'info',
  isPermanent: false,
  isActive: true,
  isGlobal: true,
  centerId: authStore.userData.centerId ?? null,
  expiresAt: null
});
const form = ref(defaultForm());

const formValid = computed(() =>
  form.value.title?.trim() &&
  form.value.message?.trim() &&
  (form.value.isGlobal || !!form.value.centerId)
);

const deleteDialog = ref(false);
const deleteText = ref('');
const deletingAnnouncement = ref(null);

// ── Helpers ───────────────────────────────────────────────────────────────
const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// ── Dialog actions ────────────────────────────────────────────────────────
const openCreateDialog = () => {
  editingId.value = null;
  form.value = defaultForm();
  dialog.value = true;
};

const openEditDialog = (ann) => {
  editingId.value = ann._id;
  form.value = {
    title: ann.title,
    message: ann.message,
    type: ann.type,
    isPermanent: ann.isPermanent,
    isActive: ann.isActive,
    isGlobal: ann.isGlobal,
    centerId: ann.centerId ?? null,
    expiresAt: ann.expiresAt
      ? new Date(ann.expiresAt).toISOString().slice(0, 16)
      : null
  };
  dialog.value = true;
};

const closeDialog = () => {
  dialog.value = false;
  editingId.value = null;
};

const submitForm = async () => {
  const payload = {
    ...form.value,
    expiresAt: form.value.expiresAt ? new Date(form.value.expiresAt).toISOString() : null
  };

  if (editingId.value) {
    await store.update(editingId.value, payload);
  } else {
    await store.create(payload);
  }
  closeDialog();
};

const toggleActive = async (ann) => {
  await store.update(ann._id, { isActive: !ann.isActive });
};

const confirmDelete = (ann) => {
  deletingAnnouncement.value = ann;
  deleteText.value = `Êtes-vous sûr de vouloir supprimer l'annonce "${ann.title}" ?`;
  deleteDialog.value = true;
};

const executeDelete = async () => {
  await store.remove(deletingAnnouncement.value._id);
  deleteDialog.value = false;
  deletingAnnouncement.value = null;
};

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  await store.fetchAll();
  if (isMasterAdmin.value) {
    await centerStore.fetchCenters();
  }
});
</script>

<style scoped>
.announcements-admin {
  padding-top: 2rem;
  padding-bottom: 4rem;
}

/* ── Stat cards ─────────────────────────────────────────────────────────── */
.stat-card {
  transition: transform 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-2px);
}

/* ── Announcement row ───────────────────────────────────────────────────── */
.announcements-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.announcement-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-surfaceContainerHigh), 0.5);
  border: 1px solid rgba(var(--v-theme-outline), 0.08);
  transition: background 0.2s ease;
}

.announcement-row.inactive {
  opacity: 0.5;
}

.announcement-row:hover {
  background: rgba(var(--v-theme-surfaceContainerHigh), 1);
}

.row-accent {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 4px;
}

.accent-info    .row-accent { background: #42A5F5; }
.accent-warning .row-accent { background: #FFA726; }
.accent-maintenance .row-accent { background: #EF5350; }
.accent-update  .row-accent { background: #66BB6A; }

.row-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.message-preview {
  white-space: pre-line;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.row-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
}

/* ── Dialog ──────────────────────────────────────────────────────────────── */
.dialog-header {
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.08);
  padding-bottom: 16px !important;
}

/* ── Live preview ────────────────────────────────────────────────────────── */
.preview-banner {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
  background: rgba(var(--v-theme-surfaceContainer), 1);
}

.preview-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.preview-content {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 10px 18px;
  flex-wrap: wrap;
}

.preview-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preview-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--v-theme-onSurface), 0.85);
}

.preview-msg {
  font-size: 11px;
  color: rgba(var(--v-theme-onSurface), 0.55);
  white-space: pre-line;
}

.type-info    .preview-accent { background: #42A5F5; }
.type-warning .preview-accent { background: #FFA726; }
.type-maintenance .preview-accent { background: #EF5350; }
.type-update  .preview-accent { background: #66BB6A; }
</style>
