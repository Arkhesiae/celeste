// ─── Constants ────────────────────────────────────────────────────────────────

export const DEMAND_TYPE = {
    SUBSTITUTION: 'substitution',
    HYBRID: 'hybrid',
    SWITCH: 'switch',
}

export const STATUS = {
    ACCEPTED: 'accepted',
    PENDING: 'open',
}

export const ROLE = {
    POSTER: 'Poster',
    ACCEPTER: 'Accepter',
}

// ─── Icon map ─────────────────────────────────────────────────────────────────


const FALLBACK_ICON = 'mdi-help-circle-outline'

// ─── Key builder ──────────────────────────────────────────────────────────────

/**
 * @param {'substitution'|'hybrid'|'switch'} demandType
 * @param {'accepted'|'pending'} status
 * @param {'substitution'|'switch'|null} hybridResolution
 * @param {'poster'|'accepter'|null} role
 * @returns {string}
 */
function buildIconKey (demandType, status, hybridResolution, role) {
    const prefix = '$'
    const parts = [prefix + demandType]

    if (status === STATUS.PENDING) {
        parts.push('Pending')
        return parts.join('')
    } else if (status === STATUS.ACCEPTED) {
        parts.push('Accepted')
    }

    if (demandType === DEMAND_TYPE.HYBRID && hybridResolution) {
        parts.push(`As${hybridResolution}`)
    }

    if (role) parts.push(role)

    return parts.join('')
}

// ─── Main function ────────────────────────────────────────────────────────────


export function getDemandIcon (demand, userId) {

    if (!demand) {
        return FALLBACK_ICON;
    }

    const isPoster = demand?.posterId?.toString() === userId;
    const isAccepter = demand?.accepterId?.toString() === userId;
    let role = null;
    if (isAccepter) {
        role = ROLE.ACCEPTER;
    } else if (isPoster) {
        role = ROLE.POSTER;
    } else {
        role = null;
        throw new Error('User is not poster or accepter');
    }

    const demandType = demand.type;
    const status = demand.status;
    let hybridResolution = null;

    if (demand.type === DEMAND_TYPE.HYBRID) {
        hybridResolution = demand.accepterShift ? 'Switch' : 'Substitution';
    }

    const key = buildIconKey(demandType, status, hybridResolution, role)

    return key
}
