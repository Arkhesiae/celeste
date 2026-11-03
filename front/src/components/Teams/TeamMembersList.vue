<template>
  <!-- Frise sur ~1 an : membres actuels, à venir et passés ; les renforts sont hachurés -->
  <div v-if="rows">
    <TeamTimeline :rows="rows" :window="timelineWindow" empty-text="Aucun membre sur cette période." />
  </div>

  <!-- Repli : liste simple des membres à la date du jour (frise indisponible) -->
  <v-list
    v-else
    bg-color="onBackground"
    rounded="xl"
  >
    <v-list-item
      v-for="user in members"
      :key="user._id"
      color="primary"
      rounded="lg"
      bg-color="onBackground"
    >
      <v-list-item-title>
        {{ user.name }} {{ user.lastName.toUpperCase() }}
      </v-list-item-title>
    </v-list-item>
    <v-list-item
      v-for="user in renforts"
      :key="user._id"
    >
      <v-list-item-title>
        {{ user.name }} {{ user.lastName.toUpperCase() }} (Renfort)
      </v-list-item-title>
    </v-list-item>
  </v-list>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  members: {
    type: Array,
    required: true
  },
  renforts: {
    type: Array,
    required: true
  },
  // Entrée de la frise pour cette équipe : { members: [{ userId, name, lastName, segments }] } (voir userStore.teamsTimeline)
  timeline: {
    type: Object,
    default: null
  },
  // Fenêtre de la frise : { from, to }
  timelineWindow: {
    type: Object,
    default: null
  }
});

const todayKey = () => new Date().toLocaleDateString('sv-SE');

/** Statut d'un membre aujourd'hui : actuel (permanent / renfort), à venir ou ancien. */
const statusOf = (segments, today) => {
  const current = segments.find((s) => s.from <= today && (s.to === null || s.to >= today));
  if (current) return { rank: 0, badge: current.kind === 'reinforcement' ? 'Renfort' : null };
  if (segments.some((s) => s.from > today)) return { rank: 1, badge: 'À venir' };
  return { rank: 2, badge: 'Ancien' };
};

const rows = computed(() => {
  if (!props.timeline || !props.timelineWindow) return null;
  const today = todayKey();

  return props.timeline.members
    .map((member) => {
      const status = statusOf(member.segments, today);
      return {
        key: member.userId,
        label: `${member.name} ${member.lastName?.toUpperCase() ?? ''}`.trim(),
        badge: status.badge,
        rank: status.rank,
        segments: member.segments,
      };
    })
    .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, 'fr'));
});
</script>
