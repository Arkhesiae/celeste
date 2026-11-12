<template>
  <v-card rounded="xl" elevation="0" class="pa-4" color="surfaceContainer">
    <div class="d-flex align-start justify-space-between ga-2 mb-3">
      <div class="d-flex flex-column">
        <span class="text-body-small text-uppercase text-disabled">Activité des centres</span>
        <span class="text-title-medium font-weight-medium">Demandes à venir</span>
      </div>
      <v-progress-circular v-if="loading || pendingLocations > 0" indeterminate size="18" width="2" color="primary" />
    </div>

    <!-- Carte : Leaflet est chargé à la demande (il n'alourdit pas le reste du tableau de bord) -->
    <div class="cm-frame">
      <div ref="mapElement" class="cm-map" role="application" aria-label="Carte des centres et de leurs demandes à venir" />
      <div v-if="mapError" class="cm-overlay text-body-medium text-medium-emphasis">
        La carte n'a pas pu être chargée.
      </div>
      <div v-else-if="!loading && centers.length === 0" class="cm-overlay text-body-medium text-medium-emphasis">
        {{ pendingLocations > 0 ? 'Localisation des centres en cours…' : 'Aucun centre à afficher.' }}
      </div>
    </div>

    <!-- Légende : la teinte dit ce qui domine, le diamètre dit le nombre de demandes -->
    <div class="d-flex flex-wrap align-center ga-4 mt-3 text-body-small text-medium-emphasis">
      <span class="d-flex align-center ga-1"><span class="cm-swatch cm-swatch--open" /> Demandes ouvertes</span>
      <span class="d-flex align-center ga-1"><span class="cm-swatch cm-swatch--taken" /> Seulement prises</span>
      <span class="d-flex align-center ga-1"><span class="cm-swatch cm-swatch--idle" /> Aucune demande</span>
    </div>

    <!-- Centre sélectionné -->
    <v-expand-transition>
      <div v-if="selected" class="cm-selected d-flex align-center justify-space-between ga-3 mt-3 pa-3">
        <div class="d-flex flex-column min-width-0">
          <span class="text-title-small text-truncate">
            {{ selected.name }}
            <v-chip v-if="selected.isOwn" size="x-small" color="primary" variant="tonal" class="ml-1">Votre centre</v-chip>
          </span>
          <span class="text-body-small text-medium-emphasis">{{ selected.OACI }}</span>
        </div>
        <div class="d-flex ga-2 flex-shrink-0">
          <v-chip color="primary" variant="flat" size="small" prepend-icon="mdi-swap-horizontal">
            {{ selected.open }} ouverte{{ selected.open > 1 ? 's' : '' }}
          </v-chip>
          <v-chip color="secondary" variant="flat" size="small" prepend-icon="mdi-check">
            {{ selected.accepted }} prise{{ selected.accepted > 1 ? 's' : '' }}
          </v-chip>
        </div>
      </div>
    </v-expand-transition>

    <div v-if="!selected && centers.length" class="text-body-small text-medium-emphasis mt-2">
      {{ totals.open }} ouverte{{ totals.open > 1 ? 's' : '' }} · {{ totals.accepted }} prise{{ totals.accepted > 1 ? 's' : '' }}
      dans {{ centers.length }} centre{{ centers.length > 1 ? 's' : '' }}
    </div>
  </v-card>
</template>

<script setup>
import { useCenterStore } from '@/stores/centerStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';

/*
 * Carte des centres (Leaflet), SANS service de tuiles : le fond est un fichier local de contours de pays
 * (src/assets/map/countries.json, Natural Earth, généré par scripts/buildMapData.mjs) dessiné en SVG. Rien n'est
 * demandé à un tiers (pas de clé, pas de panne, fonctionne hors ligne). Terre, mer et repères sont colorés par les
 * variables du thème (`--v-theme-*`, classes cm-*) : ils suivent donc le thème Material 3, clair ou sombre, sans code
 * de couleur ici. Les positions des centres sont calculées par le serveur à partir de leur nom.
 */
const LOCATION_POLL_MS = 8000;      // la position des centres est cherchée en arrière-plan : on revient la chercher
const LOCATION_POLL_MAX = 6;

const centerStore = useCenterStore();
const substitutionStore = useSubstitutionStore();

const mapElement = ref(null);
const loading = ref(false);
const mapError = ref(false);
const centers = ref([]);
const pendingLocations = ref(0);
const selectedId = ref(null);

const selected = computed(() => centers.value.find((center) => center._id === selectedId.value) ?? null);
const totals = computed(() => ({
  open: centers.value.reduce((sum, center) => sum + center.open, 0),
  accepted: centers.value.reduce((sum, center) => sum + center.accepted, 0),
}));

// Leaflet et ses objets n'ont pas à être réactifs
let L = null;
let map = null;
let markersLayer = null;
let resizeObserver = null;
let pollTimer = null;
let pollCount = 0;
let refreshTimer = null;
let hasFitted = false;

const tone = (center) => (center.open > 0 ? 'open' : center.accepted > 0 ? 'taken' : 'idle');

/** Pastille d'un centre : son diamètre croît avec le nombre de demandes (ouvertes + prises) */
const pinFor = (center) => {
  const total = center.open + center.accepted;
  const size = 30 + Math.min(total, 20) * 1.5;
  const element = document.createElement('div');
  element.className = `cm-pin cm-pin--${tone(center)}${center.isOwn ? ' cm-pin--own' : ''}${center._id === selectedId.value ? ' cm-pin--selected' : ''}`;
  element.style.width = element.style.height = `${size}px`;
  element.textContent = total > 0 ? String(total) : '';
  return L.divIcon({ className: 'cm-icon', html: element, iconSize: [size, size] });
};

const drawMarkers = () => {
  if (!map || !L) return;
  markersLayer.clearLayers();
  for (const center of centers.value) {
    const marker = L.marker([center.latitude, center.longitude], {
      icon: pinFor(center),
      keyboard: true,
      title: `${center.name} : ${center.open} ouverte(s), ${center.accepted} prise(s)`,
      riseOnHover: true,
    });
    // Le nom vient de la base : on l'insère comme texte, jamais comme HTML
    const label = document.createElement('span');
    label.textContent = center.name;
    marker.bindTooltip(label, { direction: 'top', offset: [0, -12], className: 'cm-tooltip' });
    marker.on('click', () => selectCenter(center));
    marker.addTo(markersLayer);
  }
};

const fitToCenters = () => {
  if (!map || centers.value.length === 0) return;
  if (centers.value.length === 1) {
    map.setView([centers.value[0].latitude, centers.value[0].longitude], 6);
  } else {
    map.fitBounds(L.latLngBounds(centers.value.map((center) => [center.latitude, center.longitude])), { padding: [36, 36], maxZoom: 7 });
  }
  hasFitted = true;
};

const selectCenter = (center) => {
  selectedId.value = selectedId.value === center._id ? null : center._id;
  drawMarkers();
  if (selectedId.value) map.panTo([center.latitude, center.longitude], { animate: true });
};

/** Fond : les pays, en SVG ; la couleur vient de la classe CSS cm-land (variables du thème), pas d'un attribut */
const addLand = async () => {
  const { default: countries } = await import('@/assets/map/countries.json');
  L.geoJSON(countries, {
    interactive: false,
    smoothFactor: 1.2,
    style: () => ({ className: 'cm-land', weight: 0.6, fillOpacity: 1 }),
  }).addTo(map);
};

const initMap = async () => {
  try {
    // Chargement à la demande : la bibliothèque et sa feuille de style ne pèsent que sur les pages qui ont une carte
    const [leaflet] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
    L = leaflet.default ?? leaflet;
    if (!mapElement.value) return;

    map = L.map(mapElement.value, { zoomControl: false, attributionControl: false, minZoom: 3, maxZoom: 9, worldCopyJump: true, center: [46.6, 2.5], zoom: 5 });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    await addLand();
    markersLayer = L.layerGroup().addTo(map);

    // La carte est dans une carte qui peut changer de taille (rotation de l'écran, panneau latéral) : la recadrer
    resizeObserver = new ResizeObserver(() => map?.invalidateSize());
    resizeObserver.observe(mapElement.value);
  } catch (error) {
    console.error('Chargement de la carte impossible :', error);
    mapError.value = true;
  }
};

const load = async () => {
  loading.value = true;
  try {
    const data = await centerStore.fetchCentersMap();
    centers.value = data.centers;
    pendingLocations.value = data.pendingLocations;
    if (selectedId.value && !selected.value) selectedId.value = null;
    drawMarkers();
    if (!hasFitted) fitToCenters();
    schedulePoll();
  } catch (error) {
    console.error('Erreur lors du chargement de la carte des centres:', error);
  } finally {
    loading.value = false;
  }
};

/** Des centres n'ont pas encore de position : le serveur la cherche en arrière-plan, on revient voir (quelques fois) */
const schedulePoll = () => {
  clearTimeout(pollTimer);
  if (pendingLocations.value > 0 && pollCount < LOCATION_POLL_MAX) {
    pollCount++;
    pollTimer = setTimeout(async () => {
      const wasFitted = hasFitted;
      hasFitted = false;                // de nouveaux centres localisés : recadrer
      await load();
      if (!centers.value.length) hasFitted = wasFitted;
    }, LOCATION_POLL_MS);
  }
};

// Les demandes changent (création, acceptation, annulation) : recompter, sans enchaîner les appels
watch(() => substitutionStore.substitutions, () => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(load, 800);
}, { deep: false });

onMounted(async () => {
  await initMap();
  load();
});

onBeforeUnmount(() => {
  clearTimeout(pollTimer);
  clearTimeout(refreshTimer);
  resizeObserver?.disconnect();
  map?.remove();
  map = null;
});
</script>

<style scoped>
.cm-frame {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: rgb(var(--v-theme-surfaceContainer));
}
.cm-map {
  height: 340px;
  width: 100%;
  background: rgb(var(--v-theme-background));   /* la mer */
  font-family: inherit;
}
.cm-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 16px;
  pointer-events: none;
  z-index: 500;
  background: color-mix(in srgb, rgb(var(--v-theme-surfaceContainer)) 80%, transparent);
}

.cm-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.cm-swatch--open { background: rgb(var(--v-theme-primary)); }
.cm-swatch--taken { background: rgb(var(--v-theme-secondary)); }
.cm-swatch--idle { background: rgb(var(--v-theme-surfaceVariant)); }

.cm-selected {
  border-radius: 16px;
  background: rgb(var(--v-theme-surfaceContainerHigh));
}
.min-width-0 { min-width: 0; }
</style>

<!-- Éléments créés par Leaflet (hors du composant) : styles non « scoped », préfixés cm- -->
<style>
.cm-icon { background: transparent; border: 0; }

.cm-pin {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid rgb(var(--v-theme-surface));
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  box-shadow: 0 1px 4px color-mix(in srgb, rgb(var(--v-theme-shadow)) 40%, transparent);
  transition: transform 150ms ease, box-shadow 150ms ease;
  cursor: pointer;
}
.cm-pin--open { background: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-onPrimary)); }
.cm-pin--taken { background: rgb(var(--v-theme-secondary)); color: rgb(var(--v-theme-onSecondary)); }
.cm-pin--idle { background: rgb(var(--v-theme-surfaceVariant)); color: rgb(var(--v-theme-onSurfaceVariant)); }
/* Le centre de l'utilisateur : un anneau */
.cm-pin--own { outline: 3px solid rgb(var(--v-theme-onSurface)); outline-offset: 1px; }
.cm-pin--selected { transform: scale(1.15); box-shadow: 0 2px 10px color-mix(in srgb, rgb(var(--v-theme-shadow)) 55%, transparent); }
@media (hover: hover) { .cm-pin:hover { transform: scale(1.1); } }
@media (prefers-reduced-motion: reduce) { .cm-pin { transition: none; } }
.leaflet-marker-icon:focus-visible .cm-pin { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }

/* Terre : pays en SVG, aux couleurs du thème (les classes CSS l'emportent sur les attributs SVG de Leaflet) */
.cm-land {
  fill: color-mix(in srgb, rgb(var(--v-theme-surfaceContainer)) 100%, transparent);
  stroke: transparent;
  stroke-linejoin: round;
}

/* Infobulle et boutons de zoom aux couleurs Material 3 */
.cm-tooltip.leaflet-tooltip {
  background: rgb(var(--v-theme-inverseSurface));
  color: rgb(var(--v-theme-inverseOnSurface));
  border: 0;
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 12px;
  box-shadow: none;
}
.cm-tooltip.leaflet-tooltip-top::before { border-top-color: rgb(var(--v-theme-inverseSurface)); }

.leaflet-bar { border: 0; box-shadow: 0 1px 4px color-mix(in srgb, rgb(var(--v-theme-shadow)) 35%, transparent); border-radius: 12px; overflow: hidden; }
.leaflet-bar a,
.leaflet-bar a:hover {
  background: rgb(var(--v-theme-surfaceContainerHighest, var(--v-theme-surface)));
  color: rgb(var(--v-theme-onSurface));
  border-bottom-color: rgb(var(--v-theme-outlineVariant));
}
.leaflet-container { font-family: inherit; }
</style>
