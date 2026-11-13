import Rule from '../../models/Rule.js';
import { sameId } from '../../utils/ids.js';
import { AppError } from '../../error/AppError.js';

export const getAllRules = async (centerId) => {
    const rules = await Rule.find();
    console.log(centerId);
    if (!centerId) {
        return rules.map(rule => ({
            ...rule.toObject(),
            value: rule.defaultValue,
            isOverridden: false
        }));
    }

    return rules.map(rule => {
        const effectiveValue = rule.getValueForCenter(centerId);
        const override = rule.adminValues.find(v => sameId(v.centerId, centerId));

        return {
            ...rule.toObject(),
            value: effectiveValue,
            isOverridden: effectiveValue !== rule.defaultValue,
            mode: override ? override.mode : 'static' // default to static if no override
        };
    });
};

export const updateRule = async (centerId, ruleName, updates) => {
    const { value, mode } = updates;
    const rule = await Rule.findOne({ name: ruleName });

    if (!rule) {
        throw new AppError('Rule not found', 404);
    }

    if (centerId) {
        if (rule.locked) {
            throw new AppError('Rule is locked and cannot be modified by center admins', 403);
        }
        const existingIndex = rule.adminValues.findIndex(v => sameId(v.centerId, centerId));

        if (existingIndex > -1) {
            if (value !== undefined) rule.adminValues[existingIndex].value = value;
            if (mode !== undefined) rule.adminValues[existingIndex].mode = mode;
            rule.adminValues[existingIndex].updatedAt = new Date();
        } else {
            rule.adminValues.push({
                centerId,
                mode: mode || 'static',
                value: value !== undefined ? value : rule.defaultValue
            });
        }

        await rule.save();
        return rule.getValueForCenter(centerId);
    }

    if (value !== undefined) rule.defaultValue = value;

    await rule.save();
    return rule;
};

export const toggleLock = async (ruleName, shouldLock) => {
    const rule = await Rule.findOne({ name: ruleName });
    if (!rule) {
        throw new AppError('Rule not found', 404);
    }

    rule.locked = shouldLock;
    await rule.save();
    return rule;
};

export const deleteOverride = async (centerId, ruleName) => {
    const rule = await Rule.findOne({ name: ruleName });

    if (!rule) {
        throw new AppError('Rule not found', 404);
    }

    if (!centerId) {
        throw new AppError('Center ID is required to delete an override', 400);
    }

    const existingIndex = rule.adminValues.findIndex(v => sameId(v.centerId, centerId));

    if (existingIndex > -1) {
        rule.adminValues.splice(existingIndex, 1);
        await rule.save();
    }

    return rule.getValueForCenter(centerId);
};
