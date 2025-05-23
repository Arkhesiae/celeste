// routes/request.routes.js
const express = require('express');
const router = express.Router();
const requestController = require('../controllers/request.controller');
const { verifyToken, isLocalAdmin, isMasterAdmin } = require('../middleware/auth.middleware');

/**
 * @route POST /api/requests/replacement
 * @desc Créer une demande de remplacement
 * @access Privé
 */
router.post('/replacement', verifyToken, requestController.createReplacementRequest);

/**
 * @route POST /api/requests/swap
 * @desc Créer une demande de permutation
 * @access Privé
 */
router.post('/swap', verifyToken, requestController.createSwapRequest);

/**
 * @route POST /api/requests/flexible-swap
 * @desc Créer une demande de permutation flexible
 * @access Privé
 */
router.post('/flexible-swap', verifyToken, requestController.createFlexibleSwapRequest);

/**
 * @route PUT /api/requests/:requestId/accept-replacement
 * @desc Accepter une demande de remplacement
 * @access Privé
 */
router.put('/:requestId/accept-replacement', verifyToken, requestController.acceptReplacementRequest);

/**
 * @route PUT /api/requests/:requestId/accept-swap
 * @desc Accepter une demande de permutation
 * @access Privé
 */
router.put('/:requestId/accept-swap', verifyToken, requestController.acceptSwapRequest);

/**
 * @route PUT /api/requests/:requestId/reject
 * @desc Rejeter une demande
 * @access Privé
 */
router.put('/:requestId/reject', verifyToken, requestController.rejectRequest);

/**
 * @route PUT /api/requests/:requestId/cancel
 * @desc Annuler une demande (par l'initiateur)
 * @access Privé
 */
router.put('/:requestId/cancel', verifyToken, requestController.cancelRequest);

/**
 * @route GET /api/requests
 * @desc Récupérer la liste des demandes avec pagination et filtres
 * @access Privé
 */
router.get('/', verifyToken, requestController.getRequests);

/**
 * @route GET /api/requests/:requestId
 * @desc Récupérer les détails d'une demande
 * @access Privé
 */
router.get('/:requestId', verifyToken, requestController.getRequestById);

module.exports = router;