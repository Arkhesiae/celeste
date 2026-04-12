<template>
  <DemandModal v-model="showDemandDetailsModal" :demand="selectedDemand" @handle-replacement="handleReplacement"
    @handle-switch="handleSwitch" @cancel-demand="handleCancel" @withdraw-demand="handleWithdraw"
    @update-demand="selectedDemand = $event" />

  <ConfirmationDialog v-model="showConfirmationDialog" :title="dialogTitle" :text="dialogText">
    <template #actions>
      <!-- Accept/Replace flow -->
      <template v-if="dialogOption === 'accept'">
        <v-btn v-if="userHasShift && canSwitch" variant="tonal" rounded="xl" :loading="loading.confirm"
          @click="handleConfirmSwitch">
          Permuter
        </v-btn>
        <v-btn color="primary" variant="flat" rounded="xl" :loading="loading.confirm" @click="handleConfirmAccept">
          Remplacer
        </v-btn>
      </template>

      <!-- Switch flow -->
      <v-btn v-else-if="dialogOption === 'switch'" color="primary" variant="flat" rounded="xl"
        :loading="loading.confirm" @click="handleConfirmSwitch">
        Permuter
      </v-btn>

      <!-- Cancel/Withdraw flow -->
      <v-btn v-else-if="dialogOption === 'cancel' || dialogOption === 'withdraw'" color="primary" variant="flat"
        rounded="xl" :loading="loading.confirm" @click="handleConfirmAction">
        {{ dialogOption === 'cancel' ? 'Supprimer' : 'Se désister' }}
      </v-btn>
    </template>
  </ConfirmationDialog>
</template>

<script setup>
import { useDemandActions } from '@/composables/useDemandActions.js';

const {
  showDemandDetailsModal,
  selectedDemand,
  showConfirmationDialog,
  dialogText,
  dialogTitle,
  dialogOption,
  userHasShift,
  canSwitch,
  loading,
  openDemandDetails,
  handleReplacement,
  handleConfirmAccept,
  handleSwitch,
  handleConfirmSwitch,
  handleCancel,
  handleWithdraw,
  handleConfirmAction,
} = useDemandActions();

defineExpose({
  openDemandDetails,
  handleReplacement,
  handleSwitch,
  handleCancel,
  handleWithdraw,
});
</script>