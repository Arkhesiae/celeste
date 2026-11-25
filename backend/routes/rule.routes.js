import express from 'express';
import { verifyToken, isMasterAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterQuery } from '../middleware/centerAuth.js';
import * as ruleController from '../controllers/rule.controller.js';

const router = express.Router();

// Toutes les routes exigent un utilisateur connecté (jeton valide, compte actif) : aucun écran n'a besoin des règles avant la connexion
router.use(verifyToken);

// Lecture des règles d'un centre (?centerId=) : le sien, sauf pour l'administrateur principal
router.get('/', authorizeCenterQuery('centerId'), ruleController.getAllRules);

// Modifier une règle ou supprimer sa surcharge : administrateur de centre (droits et verrou contrôlés dans le service)
router.put('/:name', ruleController.updateRule);
router.delete('/:name', ruleController.deleteRuleOverride);

// À partir d'ici : administrateur principal uniquement
router.use(isMasterAdmin);

// Verrouillage / déverrouillage d'une règle
router.put('/:name/lock', ruleController.toggleLock);

export default router;
