<template>
  <!-- Badge d'admin -->
  <v-chip class="mr-2" rounded="lg" v-if="isAdmin"> 
    <v-icon 
      class="mr-2" 
      :color="adminType === 'master' ? 'primary' : 'secondary'"
    >
      {{ adminType === 'master' ? 'mdi-star-four-points' : 'mdi-shield-crown-outline' }}
    </v-icon>
    {{ adminType === 'master' ? 'Master' : 'Admin' }}
  </v-chip>

  <!-- Bouton règles pour admin master -->
  <v-btn  
    v-if="isAdmin && adminType === 'master'" 
    icon 
    variant="text" 
    color="onBackground" 
    class="text-body-2" 
    @click="$emit('navigate-rules')"
  >
    <v-icon>mdi-server-security</v-icon>
  </v-btn>

  <!-- Lien vers les messages pour admin master -->
  <v-btn
    v-if="isAdmin && adminType === 'master'"
    icon
    class="mr-2"
    @click="$emit('navigate-messages')"
  >
    <v-badge
      :content="messageCount"
      :model-value="messageCount > 0"
      color="error"
    >
      <v-icon>mdi-message-text</v-icon>
    </v-badge>
  </v-btn>
</template>

<script setup>
// Props
defineProps({
  isAdmin: {
    type: Boolean,
    default: false
  },
  adminType: {
    type: String,
    default: ''
  },
  messageCount: {
    type: Number,
    default: 0
  }
});

// Emits
defineEmits(['navigate-rules', 'navigate-messages']);
</script> 