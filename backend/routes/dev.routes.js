import express from 'express';
import dotenv from 'dotenv';
import generateTeamUsers from '../utils/generateTeamUsers.js';
import seedDefaultConfig from '../utils/seedDefaultConfig.js';
import seedTeamDemands, { seedSwitchDemands } from '../utils/seedTeamDemands.js';
import { isMasterAdmin, verifyToken } from '../middleware/authMiddleware.js';

dotenv.config();

const router = express.Router();

const ensureDev = (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({
      success: false,
      message: "Cette route n'est disponible qu'en mode développement",
    });
    return false;
  }
  return true;
};

// Route pour générer les utilisateurs des équipes (uniquement en dev)
router.post('/populate-users', verifyToken, isMasterAdmin, async (req, res) => {
  if (!ensureDev(req, res)) return;

  const result = await generateTeamUsers();
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

// Seed conf par défaut LFBB : centre, équipes 1–12, agents, TDS Densifié Ete
router.post('/seed-default-config', verifyToken, isMasterAdmin, async (req, res) => {
  if (!ensureDev(req, res)) return;

  try {
    const result = await seedDefaultConfig();
    res.json(result);
  } catch (error) {
    console.error('Erreur seed-default-config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Demandes de rempla ouvertes (~200) pour stress-test agent9 (équipes ≠ 9)
router.post('/seed-team-demands', verifyToken, isMasterAdmin, async (req, res) => {
  if (!ensureDev(req, res)) return;

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
    res.status(500).json({ success: false, message: error.message });
  }
});

// Uniquement permutations ciblant les vacs de agent9-1
router.post('/seed-switch-demands', verifyToken, isMasterAdmin, async (req, res) => {
  if (!ensureDev(req, res)) return;

  try {
    const target = Number(req.body?.target) || undefined;
    const result = await seedSwitchDemands(target ? { target } : {});
    res.json(result);
  } catch (error) {
    console.error('Erreur seed-switch-demands:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
