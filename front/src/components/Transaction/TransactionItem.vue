<template>
  <v-card 
    :color="transaction.status === 'pending' ? 'surfaceContainerHigh' : 'surfaceContainer'" 
    flat
    class="transaction-item pa-4 d-flex justify-space-between align-center py-2"
    :class="transaction.status === 'pending' ? 'low-opacity' : ''"
  >
    <div class="d-flex align-center">
      <v-icon 
        v-if="transaction.status === 'completed'" 
        :color="transaction.flow === 'sent' ? 'error' : 'green'" 
        class="mr-2"
      >
        {{ transaction.flow === 'sent' ? 'mdi-bank-transfer-out' : 'mdi-bank-transfer-in' }}
      </v-icon>
      <v-icon 
        v-if="transaction.status === 'pending'" 
        color="remplacement" 
        class="mr-2"
      >
        mdi-clock-outline
      </v-icon>
      <div>
        <div class="text-body-2">{{ transaction.description }}</div>
        <div class="text-caption text-medium-emphasis">
          {{ transaction.effectiveDate ? transaction.effectiveDate : transaction.date }}
        </div>
      </div>
    </div>
    <div v-if="transaction.status === 'cancelled'">
      <span class="text-caption text-medium-emphasis mr-2">Annulée</span>
      <v-icon color="error" class="mr-2">mdi-close-circle-outline</v-icon>
    </div>
    <div 
      v-else 
      :class="{
        'text-success': transaction.flow === 'received',
        'text-error': transaction.flow === 'sent'
      }"
    >
      {{ transaction.flow === 'received' ? '+' : '-' }}{{ transaction.amount }}
    </div>
  </v-card>
</template>

<script setup>
defineProps({
  transaction: {
    type: Object,
    required: true,
  }
});
</script>

<style scoped>
.transaction-item{
  border-bottom: none;
  border-radius: 16px !important;
}
.low-opacity {
  opacity: 0.8;
}
</style> 