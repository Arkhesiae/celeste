import { AppError } from '../error/AppError.js';
import * as ruleService from '../services/rule/index.js';

export const getAllRules = async (req, res, next) => {
  try {
    const { centerId } = req.query;
    const rules = await ruleService.getAllRules(centerId);
    res.status(200).json(rules);
  } catch (error) {
    console.error('Error fetching rules:', error);
    next(error);
  }
};

export const updateRule = async (req, res, next) => {
  try {
    const { name } = req.params;
    const { centerId, value, mode } = req.body;

    // Check if user is Master Admin to allow missing centerId
    const isMaster = req.user && req.user.isAdmin && req.user.adminType === 'master';

    if (!centerId && !isMaster) {
      throw new AppError('centerId is required', 400);
    }

    const updatedRule = await ruleService.updateRule(centerId, name, { value, mode });
    res.status(200).json(updatedRule);
  } catch (error) {
    console.error('Error updating rule:', error);
    next(error);
  }
};

export const toggleLock = async (req, res, next) => {
  try {
    const { name } = req.params;
    const { locked } = req.body;

    if (typeof locked !== 'boolean') {
      throw new AppError('locked status (boolean) is required', 400);
    }

    const rule = await ruleService.toggleLock(name, locked);
    res.status(200).json(rule);
  } catch (error) {
    console.error('Error locking rule:', error);
    next(error);
  }
};

export const deleteRuleOverride = async (req, res, next) => {
  try {
    const { name } = req.params;
    const { centerId } = req.query;

    if (!centerId) {
      throw new AppError('centerId is required', 400);
    }

    const updatedRule = await ruleService.deleteOverride(centerId, name);
    res.status(200).json(updatedRule);
  } catch (error) {
    console.error('Error deleting rule override:', error);
    next(error);
  }
};

