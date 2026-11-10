import express from 'express';
import dotenv from 'dotenv';
import generateTeamUsers from '../bootstrap/generateTeamUsers.js';
import seedDefaultConfig from '../bootstrap/seedDefaultConfig.js';
import seedTeamDemands, { seedSwitchDemands } from '../bootstrap/seedTeamDemands.js';
import { isMasterAdmin, verifyToken } from '../middleware/authMiddleware.js';
import { AppError } from '../error/AppError.js';

dotenv.config();

const router = express.Router();

const ensureDev = () => {
  if (process.env.NODE_ENV === 'production') {
    throw new AppError("Cette route n'est disponible qu'en mode développement", 403);
  }
};

// Route pour générer les utilisateurs des équipes (uniquement en dev)
router.post('/populate-users', verifyToken, isMasterAdmin, async (req, res, next) => {
  ensureDev();

  const result = await generateTeamUsers();
  if (result.success) {
    res.json(result);
  } else {
    throw new AppError(result.error ?? 'Échec de la génération des utilisateurs', 500);
  }
});

// Seed conf par défaut LFBB : centre, équipes 1–12, agents, TDS Densifié Ete
router.post('/seed-default-config', verifyToken, isMasterAdmin, async (req, res, next) => {
  ensureDev();

  try {
    const result = await seedDefaultConfig();
    res.json(result);
  } catch (error) {
    console.error('Erreur seed-default-config:', error);
    next(error);
  }
});

// Demandes de rempla ouvertes (~200) pour stress-test agent9 (équipes ≠ 9)
router.post('/seed-team-demands', verifyToken, isMasterAdmin, async (req, res, next) => {
  ensureDev();

  try {
    const target = Number(req.body?.target) || undefined;
    const withSwitches = req.body?.withSwitches !== false;
    const remplas = await seedTeamDemands(target ? { target } : {});
    const switches = withSwitches
      ? await seedSwitchDemands({
          replacePrevious: true,
          target: Number(req.body?.switchTarget) || undefined,
        })
      : null;
    res.json({ success: true, remplas, switches });
  } catch (error) {
    console.error('Erreur seed-team-demands:', error);
    next(error);
  }
});

// Uniquement permutations ciblant les vacs de agent9-1
router.post('/seed-switch-demands', verifyToken, isMasterAdmin, async (req, res, next) => {
  ensureDev();

  try {
    const target = Number(req.body?.target) || undefined;
    const result = await seedSwitchDemands(target ? { target } : {});
    res.json(result);
  } catch (error) {
    console.error('Erreur seed-switch-demands:', error);
    next(error);
  }
});

export default router;
