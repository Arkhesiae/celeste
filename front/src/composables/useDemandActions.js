import { ref } from 'vue';
import { useSnackbarStore } from '@/stores/snackbarStore.js';
import { useSubstitutionStore } from '@/stores/substitutionStore.js';

export function useDemandActions () {
    const snackbarStore = useSnackbarStore();
    const substitutionStore = useSubstitutionStore();

    const showDemandDetailsModal = ref(false);
    const selectedDemand = ref(null);
    const showConfirmationDialog = ref(false);
    const dialogText = ref('');
    const dialogTitle = ref('Confirmation');
    const dialogOption = ref('');
    const userHasShift = ref(false);
    const canSwitch = ref(false);
    const loading = ref({ confirm: false });

    const openDemandDetails = (demand) => {
        selectedDemand.value = demand;
        showDemandDetailsModal.value = true;
    };

    const handleReplacement = async (demand) => {
        try {
            const response = await substitutionStore.checkUserShift(demand.posterShift.date);
            userHasShift.value = response.hasShift;
            canSwitch.value = demand.canSwitch;
            selectedDemand.value = demand;
            dialogOption.value = 'accept';
            dialogTitle.value = 'Confirmation de remplacement';
            dialogText.value = userHasShift.value
                ? 'Vous travaillez déjà ce jour, êtes-vous sûr ?'
                : 'Êtes-vous sûr de vouloir accepter ce remplacement ?';
            showConfirmationDialog.value = true;
        } catch (error) {
            snackbarStore.showNotification('Erreur lors de la vérification des shifts', 'onError', 'mdi-alert-circle-outline');
            console.error('Erreur lors de la vérification des shifts:', error);
        }
    };

    const handleConfirmAccept = async () => {
        loading.value.confirm = true;
        try {
            await substitutionStore.acceptDemand(selectedDemand.value._id);
            snackbarStore.showNotification('Remplacement accepté', 'onRemplacement', 'mdi-account-arrow-left-outline');
            showConfirmationDialog.value = false;
            showDemandDetailsModal.value = false;
        } catch (error) {
            snackbarStore.showNotification('Erreur lors de l\'acceptation du remplacement : ' + error.message, 'onError', 'mdi-alert-circle-outline');
            console.error('Erreur lors de l\'acceptation:', error);
        } finally {
            loading.value.confirm = false;
        }
    };

    const handleSwitch = (demand) => {
        const d = demand ?? selectedDemand.value;
        if (!d?.canSwitch) return;
        selectedDemand.value = d;
        dialogOption.value = 'switch';
        dialogTitle.value = 'Confirmation de permutation';
        dialogText.value = 'Êtes-vous sûr de vouloir accepter cette permutation ?';
        showConfirmationDialog.value = true;
    };

    const handleConfirmSwitch = async () => {
        loading.value.confirm = true;
        try {
            await substitutionStore.swapShifts(selectedDemand.value._id);
            snackbarStore.showNotification('Permutation acceptée', 'onRemplacement', 'mdi-swap-horizontal');
            showConfirmationDialog.value = false;
            showDemandDetailsModal.value = false;
        } catch (error) {
            snackbarStore.showNotification('Erreur lors de l\'échange des shifts : ' + error.message, 'onError', 'mdi-alert-circle-outline');
            console.error('Erreur lors de l\'échange:', error);
        } finally {
            loading.value.confirm = false;
        }
    };

    const handleCancel = (demand) => {
        if (demand?._id) selectedDemand.value = demand;
        dialogText.value = 'Êtes-vous sûr de vouloir supprimer cette demande ?';
        dialogOption.value = 'cancel';
        dialogTitle.value = 'Confirmation de suppression';
        showConfirmationDialog.value = true;
    };

    const handleWithdraw = (demand) => {
        if (demand?._id) selectedDemand.value = demand;
        dialogText.value = 'Êtes-vous sûr de vouloir vous désister de cette demande ?';
        dialogOption.value = 'withdraw';
        dialogTitle.value = 'Confirmation de désistement';
        showConfirmationDialog.value = true;
    };

    const handleConfirmAction = async () => {
        loading.value.confirm = true;
        try {
            if (dialogOption.value === 'cancel') {
                await substitutionStore.cancelDemand(selectedDemand.value._id);
                snackbarStore.showNotification('Demande supprimée', 'success', 'mdi-delete');
            } else {
                await substitutionStore.unacceptDemand(selectedDemand.value._id);
                snackbarStore.showNotification('Désistement enregistré', 'success', 'mdi-account-minus');
            }
            showConfirmationDialog.value = false;
            showDemandDetailsModal.value = false;
        } catch (error) {
            console.error('Erreur lors de la confirmation:', error);
            snackbarStore.showNotification("Erreur lors de l'action", 'onError', 'mdi-alert');
        } finally {
            loading.value.confirm = false;
        }
    };

    return {
        // State
        showDemandDetailsModal,
        selectedDemand,
        showConfirmationDialog,
        dialogText,
        dialogTitle,
        dialogOption,
        userHasShift,
        canSwitch,
        loading,
        // Actions
        openDemandDetails,
        handleReplacement,
        handleConfirmAccept,
        handleSwitch,
        handleConfirmSwitch,
        handleCancel,
        handleWithdraw,
        handleConfirmAction,
    };
}