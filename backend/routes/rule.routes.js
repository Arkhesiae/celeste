import express from 'express';
import { verifyToken, isMasterAdmin } from '../middleware/authMiddleware.js';
import * as ruleController from '../controllers/rule.controller.js';

const router = express.Router();

// Lecture des règles d'un centre (?centerId=) : aujourd'hui ouverte sans jeton, ce qui n'est pas une route publique voulue
// (voir le suivi, point 53) ; elle reste ici pour ne pas changer le comportement.
router.get('/', ruleController.getAllRules);

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// Modifier une règle ou supprimer sa surcharge : administrateur de centre (droits et verrou contrôlés dans le service)
router.put('/:name', ruleController.updateRule);
router.delete('/:name', ruleController.deleteRuleOverride);

// À partir d'ici : administrateur principal uniquement
router.use(isMasterAdmin);

// Verrouillage / déverrouillage d'une règle
router.put('/:name/lock', ruleController.toggleLock);

export default router;
