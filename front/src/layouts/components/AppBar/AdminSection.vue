<template>
  <!-- Badge d'admin -->
   <div class="d-flex align-center ga-2 mx-2" >
  <v-chip  rounded="lg" size="small" v-if="isAdmin"> 
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

  <!-- Lien vers les tickets pour admin master -->
  <v-btn
    v-if="isAdmin"
    icon
   
    @click="$emit('navigate-tickets')"
  >
    <v-badge
      :content="messageCount"
      :model-value="messageCount > 0"
      color="error"
      
    >
      <v-icon>mdi-ticket</v-icon>
    </v-badge>
  </v-btn>
    <!-- Lien vers les tickets pour admin master -->
    <v-btn
    v-if="isAdmin"
    icon
   
    @click="$emit('navigate-email')"
  >
   
      <v-icon>mdi-email-outline</v-icon>

  </v-btn>
</div>
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
defineEmits(['navigate-rules', 'navigate-tickets', 'navigate-email']);
</script> 