import express from 'express';
import { verifyToken, isMasterAdmin } from '../middleware/authMiddleware.js';
import * as ruleController from '../controllers/rule.controller.js';

const router = express.Router();

// Lecture des règles d'un centre (?centerId=) : aujourd'hui ouverte sans jeton, ce qui n'est pas une route publique voulue
// (voir le suivi, point 53) ; elle reste ici pour ne pas changer le comportement.
router.get('/', ruleController.getAllRules);

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// Initialisation et réinitialisation : administrateur principal uniquement
router.post('/initialize', isMasterAdmin, ruleController.initializeRules);
router.post('/reset', isMasterAdmin, ruleController.resetRules);

// Verrouiller / déverrouiller une règle : administrateur principal uniquement
router.put('/:name/lock', isMasterAdmin, ruleController.toggleLock);

// Modifier une règle ou supprimer sa surcharge : administrateur de centre (droits et verrou contrôlés dans le service)
router.put('/:name', ruleController.updateRule);
router.delete('/:name', ruleController.deleteRuleOverride);

export default router;
