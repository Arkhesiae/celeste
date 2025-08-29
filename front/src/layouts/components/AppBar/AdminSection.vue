<template>
  <!-- Badge d'admin -->
   <div class="d-flex align-center ga-2 mx-2" >
 

  <!-- Bouton règles pour admin master -->
  <v-btn  
    v-if="isAdmin && adminType === 'master'" 
    icon 
    variant="text" 
    color="onBackground" 
    class="text-body-2" 
    @click="$emit('navigate-rules')"
  >
    <v-icon size="small">mdi-server-security</v-icon>
  </v-btn>

  <!-- Lien vers les tickets pour admin master -->
  <v-btn
    v-if="isAdmin"
    icon
   
    @click="$emit('navigate-tickets')"
  >
    <v-badge
    rounded="lg" offset-x="10" offset-y="28"
      :content="messageCount"
      :model-value="messageCount > 0"
      color="remplacement"
      
    >
      <v-icon size="small">mdi-account-question-outline</v-icon>
    </v-badge>
  </v-btn>
    <!-- Lien vers les tickets pour admin master -->
    <v-btn
    v-if="isAdmin"
    icon
   
    @click="$emit('navigate-email')"
  >
   
      <v-icon size="small">mdi-email-outline</v-icon>

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