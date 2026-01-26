import ruleService from '../services/rules/ruleService.js';
import { initializeRules as initRulesService } from '../services/rules/initializeRules.js';
import Rule from '../models/Rule.js';

export const getAllRules = async (req, res) => {
  try {
    const { centerId } = req.query;
    const rules = await ruleService.getAllRules(centerId);
    res.status(200).json(rules);
  } catch (error) {
    console.error('Error fetching rules:', error);
    res.status(500).json({ message: 'Error fetching rules', error: error.message });
  }
};

export const updateRule = async (req, res) => {
  try {
    const { name } = req.params;
    const { centerId, value, mode } = req.body;

    // Check if user is Master Admin to allow missing centerId
    const isMaster = req.user && req.user.isAdmin && req.user.adminType === 'master';

    if (!centerId && !isMaster) {
      return res.status(400).json({ message: 'centerId is required' });
    }

    const updatedRule = await ruleService.updateRule(centerId, name, { value, mode });
    res.status(200).json(updatedRule);
  } catch (error) {
    console.error('Error updating rule:', error);
    res.status(400).json({ message: error.message });
  }
};

export const toggleLock = async (req, res) => {
  try {
    const { name } = req.params;
    const { locked } = req.body;

    if (typeof locked !== 'boolean') {
      return res.status(400).json({ message: 'locked status (boolean) is required' });
    }

    const rule = await ruleService.toggleLock(name, locked);
    res.status(200).json(rule);
  } catch (error) {
    console.error('Error locking rule:', error);
    res.status(400).json({ message: error.message });
  }
};

export const deleteRuleOverride = async (req, res) => {
    try {
      const { name } = req.params;
      const { centerId } = req.query;

      if (!centerId) {
        return res.status(400).json({ message: 'centerId is required' });
      }

      const updatedRule = await ruleService.deleteOverride(centerId, name);
      res.status(200).json(updatedRule);
    } catch (error) {
      console.error('Error deleting rule override:', error);
      res.status(400).json({ message: error.message });
    }
  };

  // Existing route requirement handlers
  export const initializeRules = async (req, res) => {
    try {
      await initRulesService();
      res.status(200).json({ message: 'Rules initialized successfully' });
    } catch (error) {
      console.error('Error initializing rules:', error);
      res.status(500).json({ message: 'Error initializing rules', error: error.message });
    }
  };

  export const resetRules = async (req, res) => {
    try {
      // Implementation for resetting rules
      // For now, let's assume it means clearing overrides or re-initializing defaults
      // Warn: This might include dropping the collection or just resetting values.
      // I'll make it safe: reset all adminValues to empty array?
      // Or re-run init?
      // Let's just clear adminValues for now to "reset" to defaults.
      await Rule.updateMany({}, { $set: { adminValues: [] } });
      res.status(200).json({ message: 'Rules reset to defaults (overrides cleared)' });
    } catch (error) {
      console.error('Error resetting rules:', error);
      res.status(500).json({ message: 'Error resetting rules', error: error.message });
    }
  };

  export default {
    getAllRules,
    updateRule,
    toggleLock,
    initializeRules,
    resetRules,
    deleteRuleOverride
  };
