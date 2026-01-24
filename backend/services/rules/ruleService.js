import Rule from '../../models/Rule.js';

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
        const override = rule.adminValues.find(v => v.centerId.toString() === centerId.toString());

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
        throw new Error('Rule not found');
    }

    if (centerId) {
        if (rule.locked) {
            throw new Error('Rule is locked and cannot be modified by center admins');
        }
        const existingIndex = rule.adminValues.findIndex(v => v.centerId.toString() === centerId.toString());

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
        throw new Error('Rule not found');
    }

    rule.locked = shouldLock;
    await rule.save();
    return rule;
};

export const deleteOverride = async (centerId, ruleName) => {
    const rule = await Rule.findOne({ name: ruleName });

    if (!rule) {
        throw new Error('Rule not found');
    }

    if (!centerId) {
        throw new Error('Center ID is required to delete an override');
    }

    const existingIndex = rule.adminValues.findIndex(v => v.centerId.toString() === centerId.toString());

    if (existingIndex > -1) {
        rule.adminValues.splice(existingIndex, 1);
        await rule.save();
    }

    return rule.getValueForCenter(centerId);
};

export default {
    getAllRules,
    updateRule,
    toggleLock,
    deleteOverride
};
