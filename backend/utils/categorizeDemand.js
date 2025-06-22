import { computeShiftOfUserWithSubstitutions } from './computeShiftOfUserWithSubstitutions.js';

// Constantes pour améliorer la lisibilité et la maintenance
const REST_DAY_NAME = "Rest Day";
const REST_TYPE = "rest";
const MIN_REST_HOURS = 11;
const MAX_CONSECUTIVE_DAYS = 6;
const RANGE_SIZE = 13;
const RANGE_OFFSET = 6;

const categorize = async (demand, userId) => {
    try {
        const demandDate = new Date(demand.posterShift.date);
        const demandWithLimit = demand.toObject();
        demandWithLimit.limit = [];

        const vacationOfFetcher = (await computeShiftOfUserWithSubstitutions(demandDate, userId))[0];

        if (!vacationOfFetcher?.shift) {
            console.log("Aucun shift trouvé pour l'utilisateur");
            demandWithLimit.limit.push('noShift');
            return demandWithLimit;
        }

        // Vérifier si l'utilisateur travaille déjà ce jour-là
        if (vacationOfFetcher.shift?.name !== "Rest Day" && vacationOfFetcher.shift?.type !== "rest") {
            // Vérifier si une permutation est possible
            demandWithLimit.limit.push('alreadyWorking');
            // Vérifier si une permutation est possible
            if (demand.acceptedSwitches?.length > 0 && 
                demand.acceptedSwitches.some(switchItem => 
                    switchItem?.shift?.toString() === vacationOfFetcher.shift._id?.toString()
                )) {
                demandWithLimit.canSwitch = true;
            }
        }

        // Vérifier les périodes de repos
        const range = Array.from({ length: 13 }, (_, i) => {
            const newDate = new Date(demandDate);
            newDate.setDate(demandDate.getDate() + i - 6);
            return newDate;
        });

        const shifts = await computeShiftOfUserWithSubstitutions(range, userId);
        const previousShift = shifts[5].shift;
        const nextShift = shifts[7].shift;

        // Calculer les temps de repos une seule fois
        const beforeRestTime = computeRestTime(previousShift, demand.posterShift);
        const afterRestTime = computeRestTime(demand.posterShift, nextShift);

        demandWithLimit.rest = {
            before: beforeRestTime,
            after: afterRestTime
        };


        const hasElevenHoursBefore = checkRestPeriod(previousShift, demand.posterShift, 'before');
        const hasElevenHoursAfter = checkRestPeriod(nextShift, demand.posterShift, 'after');

        if (!hasElevenHoursBefore || !hasElevenHoursAfter) {
            demandWithLimit.limit.push('insufficientRest');
        }

        // Vérifier la limite de jours consécutifs
        if (checkConsecutiveDays(shifts, demandDate) >= 6) {
            demandWithLimit.limit.push('consecutiveDaysLimit');
        }

        return demandWithLimit;
    } catch (err) {
        console.error(`Erreur lors du traitement de la demande ${demand._id}:`, err);
        throw err;
    }
};

const computeRestTime = (shift, shift2) => {
    if (!shift || !shift2) return 0;
    const baseRest = 0;
    if (shift.type === 'rest') {
        return 24;
    }
    else if (shift2.type === 'rest') {
        return 24;
    }

    const shiftEnd = new Date(`2000-01-01 ${shift.endTime}`);
    const shift2Start = new Date(`2000-01-02 ${shift2.startTime}`);
    
    if (shift.endsNextDay) {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }
    
    // Calculer la différence en heures
    const diffHours = (shift2Start - shiftEnd) / (1000 * 60 * 60);
    return diffHours + baseRest;
};

const checkRestPeriod = (shift, demandShift, period) => {
    if (!shift || shift.type === 'rest') return true;
    if (period === 'before') {
        return demandShift.startTime && shift.endTime ? 
            computeRestTime(shift, demandShift) >= 11 : true;
    } else {
        return demandShift.endTime && shift.startTime ?
            computeRestTime(demandShift, shift) >= 11 : true;
    }
};

function checkConsecutiveDays(shifts, demandDate) {
    const demandDay = new Date(demandDate).getDay();
    let consecutiveDays = 0;

    for (let i = 0; i < shifts.length; i++) {
        const shiftDay = new Date(shifts[i].date).getDay();
        if (shiftDay === demandDay) {
            consecutiveDays++;
        } else {
            consecutiveDays = 0;
        }

        if (consecutiveDays >= 6) {
            break;
        }
    }
    return consecutiveDays;
}

/**
 * Vérifie si un shift cible respecte la période de repos minimale de 11 heures
 * après une période de service par rapport aux shifts précédent et suivant
 * @param {Object} previousShift - Le shift précédent
 * @param {Object} targetShift - Le shift cible à vérifier
 * @param {Object} nextShift - Le shift suivant
 * @returns {Object} - { isCompliant: boolean, restBefore: number, restAfter: number }
 */
const checkMinimumRestPeriod = (previousShift, targetShift, nextShift) => {
    const restBefore = computeRestTime(previousShift, targetShift);
    const restAfter = computeRestTime(targetShift, nextShift);
    
    const isCompliant = restBefore >= MIN_REST_HOURS && restAfter >= MIN_REST_HOURS;
    
    return {
        isCompliant,
        restBefore,
        restAfter,
        minRequired: MIN_REST_HOURS
    };
};

/**
 * Vérifie si un shift cible respecte la période de repos de 35 heures consécutives
 * sur 7 jours glissants
 * @param {Array} shifts - Array des shifts sur 7 jours glissants
 * @param {Object} targetShift - Shift cible
 * @returns {Object} - { isCompliant: boolean, consecutiveRestHours: number, requiredHours: number }
 */
const checkConsecutiveRestPeriod = (shifts, targetShift) => {
    const REQUIRED_CONSECUTIVE_REST = 35;
    
    // Pour chaque position possible de la fenêtre glissante de 7 jours
    let maxConsecutiveRest = 0;
    
    // Parcourir toutes les fenêtres glissantes de 7 jours possibles dans la plage de 13 jours
    for (let windowStart = 0; windowStart <= shifts.length - 7; windowStart++) {
        const windowEnd = windowStart + 7;
        const windowShifts = shifts.slice(windowStart, windowEnd);
        
        let currentConsecutiveRest = 0;
        let windowMaxConsecutiveRest = 0;
        
        // Analyser cette fenêtre de 7 jours
        for (let i = 0; i < windowShifts.length; i++) {
            const shift = windowShifts[i].shift;
            
            if (shift && shift.type === REST_TYPE) {
                currentConsecutiveRest += 24; // Un jour de repos = 24h
            } else if (shift && shift.type !== REST_TYPE) {
                // Calculer le temps de repos entre ce shift et le suivant
                if (i < windowShifts.length - 1) {
                    const nextShift = windowShifts[i + 1].shift;
                    const restTime = computeRestTime(shift, nextShift);
                    currentConsecutiveRest += restTime;
                }
            }
            
            // Mettre à jour le maximum pour cette fenêtre
            if (currentConsecutiveRest > windowMaxConsecutiveRest) {
                windowMaxConsecutiveRest = currentConsecutiveRest;
            }
            
            // Réinitialiser si on trouve un shift de travail
            if (shift && shift.type !== REST_TYPE) {
                currentConsecutiveRest = 0;
            }
        }
        
        // Mettre à jour le maximum global
        if (windowMaxConsecutiveRest > maxConsecutiveRest) {
            maxConsecutiveRest = windowMaxConsecutiveRest;
        }
        
        // Si on trouve une fenêtre avec pas assez de repos, on peut s'arrêter
        if (windowMaxConsecutiveRest < REQUIRED_CONSECUTIVE_REST) {
            break;
        }
    }
    
    return {
        isCompliant: maxConsecutiveRest >= REQUIRED_CONSECUTIVE_REST,
        consecutiveRestHours: maxConsecutiveRest,
        requiredHours: REQUIRED_CONSECUTIVE_REST
    };
};

/**
 * Vérifie si un shift cible respecte la durée hebdomadaire du travail
 * ne pouvant excéder 48 heures sur 7 jours glissants
 * @param {Array} shifts - Array des shifts sur 7 jours glissants
 * @param {Object} targetShift - Shift cible
 * @returns {Object} - { isCompliant: boolean, totalWorkHours: number, maxAllowedHours: number }
 */
const checkWeeklyWorkDuration = (shifts, targetShift) => {
    const MAX_WEEKLY_HOURS = 48;
    
    // Pour chaque position possible de la fenêtre glissante de 7 jours
    let maxWorkHours = 0;
    
    // Parcourir toutes les fenêtres glissantes de 7 jours possibles dans la plage de 13 jours
    for (let windowStart = 0; windowStart <= shifts.length - 7; windowStart++) {
        const windowEnd = windowStart + 7;
        const windowShifts = shifts.slice(windowStart, windowEnd);
        
        let windowWorkHours = 0;
        
        // Calculer le total des heures de travail pour cette fenêtre de 7 jours
        for (let i = 0; i < windowShifts.length; i++) {
            const shift = windowShifts[i].shift;
            
            if (shift && shift.type !== REST_TYPE) {
                // Calculer la durée du shift en heures
                const startTime = new Date(`2000-01-01 ${shift.startTime}`);
                const endTime = new Date(`2000-01-01 ${shift.endTime}`);
                
                if (shift.endsNextDay) {
                    endTime.setDate(endTime.getDate() + 1);
                }
                
                const shiftDuration = (endTime - startTime) / (1000 * 60 * 60);
                windowWorkHours += shiftDuration;
            }
        }
        
        // Mettre à jour le maximum
        if (windowWorkHours > maxWorkHours) {
            maxWorkHours = windowWorkHours;
        }
        
        // Si on trouve une fenêtre qui dépasse la limite, on peut s'arrêter
        if (maxWorkHours > MAX_WEEKLY_HOURS) {
            break;
        }
    }
    
    return {
        isCompliant: maxWorkHours <= MAX_WEEKLY_HOURS,
        totalWorkHours: Math.round(maxWorkHours * 100) / 100, // Arrondir à 2 décimales
        maxAllowedHours: MAX_WEEKLY_HOURS
    };
};

/**
 * Fonction principale pour vérifier la conformité complète d'un shift cible
 * @param {Object} targetShift - Le shift cible à vérifier
 * @param {Array} surroundingShifts - Array des shifts environnants (7 jours glissants)
 * @returns {Object} - Résultat complet de la conformité
 */
const checkShiftCompliance = (targetShift, surroundingShifts) => {
    const previousShift = surroundingShifts[5]?.shift; // Shift précédent
    const nextShift = surroundingShifts[7]?.shift; // Shift suivant
    
    const restPeriodCheck = checkMinimumRestPeriod(previousShift, targetShift, nextShift);
    const consecutiveRestCheck = checkConsecutiveRestPeriod(surroundingShifts, targetShift);
    const weeklyWorkCheck = checkWeeklyWorkDuration(surroundingShifts, targetShift);
    
    const isFullyCompliant = restPeriodCheck.isCompliant && 
                            consecutiveRestCheck.isCompliant && 
                            weeklyWorkCheck.isCompliant;
    
    return {
        isCompliant: isFullyCompliant,
        checks: {
            minimumRestPeriod: restPeriodCheck,
            consecutiveRestPeriod: consecutiveRestCheck,
            weeklyWorkDuration: weeklyWorkCheck
        },
        summary: {
            totalIssues: [
                !restPeriodCheck.isCompliant && 'Période de repos insuffisante',
                !consecutiveRestCheck.isCompliant && 'Repos consécutif insuffisant',
                !weeklyWorkCheck.isCompliant && 'Durée hebdomadaire dépassée'
            ].filter(Boolean)
        }
    };
};

export { 
    categorize, 
    checkMinimumRestPeriod, 
    checkConsecutiveRestPeriod, 
    checkWeeklyWorkDuration, 
    checkShiftCompliance 
};