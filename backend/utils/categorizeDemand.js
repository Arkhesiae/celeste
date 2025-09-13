import { computeShiftOfUserWithSubstitutions } from './computeShiftOfUserWithSubstitutions.js';
import Shift  from '../models/Shift.js';
import { shiftMapToArray } from './generateShiftsMap.js';
import { parseShiftTime } from './parseShiftTime.js';
// Constantes pour améliorer la lisibilité et la maintenance
const MIN_REST_MINUTES = 11 * 60;



const categorize = async (demand, shiftsMap = null) => {
    try {
        const demandDate = new Date(demand.posterShift.date);
        let demandWithLimit = demand.toObject();
        demandWithLimit.limit = [];

        // Utiliser la map pré-calculée si disponible, sinon calculer normalement
        let vacationOfFetcher;
        if (shiftsMap) {
            vacationOfFetcher = shiftsMap.get(demandDate.toISOString().split('T')[0]);
        } 
        else {
            throw new Error("Shifts map not found");
        }

        // if (!vacationOfFetcher?.shift) {
        //     demandWithLimit.limit.push('noShift');
        // }

        // Vérifier si l'utilisateur travaille déjà ce jour-là
        if (vacationOfFetcher?.shift && vacationOfFetcher.shift.type !== "rest") {
            // Vérifier si une permutation est possible
            demandWithLimit.limit.push('alreadyWorking');
            // Vérifier si une permutation est possible
            if (demand.acceptedSwitches?.length > 0) {
                let canSwitch = false;
                for (const switchItem of demand.acceptedSwitches) {
                    const shift = await Shift.findById(switchItem.shift);
              
              
                    if ((shift?._id?.toString() === vacationOfFetcher.shift._id?.toString()) || (shift?.name === vacationOfFetcher.shift.name)) {
                        canSwitch = true;
                        break;
                    }
                }
                if (canSwitch) {
                    demandWithLimit.canSwitch = true;
                }
            }
        }


        const shiftsSorted = shiftMapToArray(shiftsMap);
        const computeRest = checkMinimumRestTime(demand.posterShift.shift, demandDate, shiftsSorted);
        const {restOk, invalidWindow} = checkWeeklyRestPeriod(demand.posterShift.shift, demandDate, shiftsSorted);
        const isWithin48h = checkWeeklyWorkHours(demand.posterShift.shift, demandDate, shiftsSorted);
       
        const has35hRest = restOk;

        // if (!computeRest.ok) console.warn('Repos minimum de 11h non respecté');
        // if (!has35hRest) console.warn('Pas de repos de 35h trouvé dans les 7 jours glissants');
        // if (invalidWindow) console.log("invalidWindow", invalidWindow);
        // if (!isWithin48h) console.warn('Plus de 48h de travail sur 7 jours glissants');

        demandWithLimit.rest = {
            before: computeRest.restBefore,
            after: computeRest.restAfter
        };

        // console.log("demandWithLimit", demandWithLimit.rest.before/60, demandWithLimit.rest.after/60);
        if (!computeRest.ok) {
            demandWithLimit.limit.push('insufficientRest');
        }

        if (!has35hRest) {
            demandWithLimit.limit.push('35limit');
        }

        if (!isWithin48h) {
            demandWithLimit.limit.push('48hLimit');
        }


        return demandWithLimit;
    } catch (err) {
        console.error(`Erreur lors du traitement de la demande ${demand._id}:`, err);
        throw err;
    }
};


/**
 * Simule l'insertion d'un shift dans une liste triée chronologiquement
 * @param {Object} targetShift - Le shift à insérer
 * @param {string} targetDate - Date au format YYYY-MM-DD
 * @param {Array} shiftsSorted - Liste des shifts triés chronologiquement
 * @returns {Array} Nouvelle liste avec le shift inséré
 */
function simulateInsertShift(targetShift, targetDate, shiftsSorted) {
    const localShiftsSorted = shiftsSorted.slice();
  
    let startTime = targetShift?.default?.startTime;
    let endTime = targetShift?.default?.endTime ;
    if (!startTime || !endTime) {
        throw new Error("Invalid shift" + targetShift);
    }
    const start = parseShiftTime(targetDate, startTime);
    const end = parseShiftTime(targetDate, endTime, targetShift?.default?.endsNextDay);

    const newShift = { shift: targetShift, team: targetShift.teamObject, date: targetDate, start, end };
    
    const targetShiftIndex = localShiftsSorted.findIndex(s => s.date === targetDate.toISOString().split('T')[0]);
    
    if (targetShiftIndex !== -1) {
        // Si le shift existe déjà à cette date, on le remplace
        localShiftsSorted[targetShiftIndex] = newShift;
    } else {
        // Sinon, on l'insère au bon endroit selon la date
        const insertIndex = localShiftsSorted.findIndex(s => new Date(s.date) > new Date(targetDate));
        if (insertIndex === -1) {
            // Si aucune date plus grande n'est trouvée, on ajoute à la fin
            localShiftsSorted.push(newShift);
        } else {
            // Sinon on insère à la position trouvée
            localShiftsSorted.splice(insertIndex, 0, newShift);
        }
    }
    
    return localShiftsSorted;
}



/**
 * Vérifie s'il y a au moins 11h de repos avant et après le shift cible
 * @param {Object} targetShift - Le shift en question
 * @param {string} targetDate - Date au format YYYY-MM-DD
 * @param {Array} shiftsSorted - Liste des shifts triés chronologiquement
 * @returns {Object} { restBefore: number, restAfter: number, ok: boolean }
 */
function checkMinimumRestTime(targetShift, targetDate, shiftsSorted) {
    if (targetShift.type !== 'work') return { restBefore: 0, restAfter: 0, ok: true };

    // Simuler l'insertion du shift pour obtenir la liste mise à jour
    const localShiftsSorted = simulateInsertShift(targetShift, targetDate, shiftsSorted);

    let startTime = targetShift?.default?.startTime;
    let endTime = targetShift?.default?.endTime ;
    const targetStart = parseShiftTime(targetDate, startTime);
    const targetEnd = parseShiftTime(targetDate, endTime, targetShift?.default?.endsNextDay);

    let lastShift = null;
    let nextShift = null;

    for (const s of localShiftsSorted) {
        if (s.end <= targetStart) {
            lastShift = s;
        } else if (s.start >= targetEnd) {
            nextShift = s;
            break;
        }
    }

    let result = {
        restBefore: 0,
        restAfter: 0,
        ok: true,
    }

    if (lastShift) {
        result.restBefore = (targetStart - lastShift.end) / (60 * 1000);
        if (result.restBefore < MIN_REST_MINUTES) result.ok = false;
    }

    if (nextShift) {
        result.restAfter = (nextShift.start - targetEnd) / (60 * 1000);
        if (result.restAfter < MIN_REST_MINUTES) result.ok = false;
    }

    return result;
}




function checkWeeklyRestPeriod(targetShift, targetDate, shiftsSorted) {
    const localShiftsSorted = simulateInsertShift(targetShift, targetDate, shiftsSorted);

    let restOk
    let invalidWindow 

    for (let i = 0; i < 7; i++) {
        restOk = false;
        const windowStart = new Date(targetDate);
        windowStart.setDate(windowStart.getDate() + i - 6);
        const windowEnd = new Date(targetDate);
        windowEnd.setDate(windowEnd.getDate() + i + 1);
        const windowShifts = localShiftsSorted.filter(s => new Date(s.end) >= windowStart && new Date(s.start) <= windowEnd);

        let lastEnd = new Date(windowStart);

        for (let j = 0; j < windowShifts.length; j++) {
            const s = windowShifts[j];
            const restMinutes = (s.start - lastEnd) / (60 * 1000);
            if (restMinutes >= 35 * 60) {

                restOk = true;
                break;
            }
            if (s.end > lastEnd) lastEnd = s.end;

            // Action spécifique pour le dernier index de windowShifts
            if (j === windowShifts.length - 1) {
                // Vérifier s'il y a une période de repos de 35h entre le dernier shift et la fin de la fenêtre
                const restMinutesToEnd = (windowEnd - lastEnd) / (60 * 1000);
                if (restMinutesToEnd >= 35 * 60) {
                    restOk = true;
                }
            }
        }

        if (!restOk) {
            invalidWindow = {windowStart, windowEnd};
            break;
        }



    }
    return {restOk, invalidWindow};

}

function checkWeeklyWorkHours(targetShift, targetDate, shiftsSorted) {
    const localShiftsSorted = simulateInsertShift(targetShift, targetDate, shiftsSorted);
  
    let workOk

    for (let i = 0; i < 7; i++) {
        workOk = true;
        let totalWorkMinutes = 0;
        const windowStart = new Date(targetDate);
        windowStart.setDate(windowStart.getDate() + i - 6);
        const windowEnd = new Date(targetDate);
        windowEnd.setDate(windowEnd.getDate() + i + 1);
        const windowShifts = localShiftsSorted.filter(s => new Date(s.end) >= windowStart && new Date(s.start) <= windowEnd);

        for (let j = 0; j < windowShifts.length; j++) {

            const s = windowShifts[j];

            if (j === 0 && s.start < windowStart) {

                const workMinutesToStart = (s.end - windowStart) / (60 * 1000);

                totalWorkMinutes += workMinutesToStart;
            }

            else if (j === windowShifts.length - 1 && s.end > windowEnd) {
                const workMinutesToEnd = (windowEnd - s.start) / (60 * 1000);

                totalWorkMinutes += workMinutesToEnd;
            }

            else {
                const workMinutes = (s.end - s.start) / (60 * 1000);

                totalWorkMinutes += workMinutes;
            }




            if (totalWorkMinutes > 48 * 60) {
                workOk = false;
                break;
            }

        }



        if (!workOk) break;
    }
    return workOk;
}


/**
 * Vérifie qu'un agent ne travaille pas plus de 5 jours consécutifs (temps de trajet exclu)
 * @param {Object} targetShift - Le shift en question
 * @param {string} targetDate - Date au format YYYY-MM-DD
 * @param {Array} shiftsSorted - Array des shifts triés chronologiquement
 * @returns {Object} { ok: boolean, consecutiveDays: number }
 */
function checkConsecutiveWorkDays(targetShift, targetDate, shiftsSorted) {
    if (targetShift.type !== 'work') return { ok: true, consecutiveDays: 0 };

    const localShiftsSorted = simulateInsertShift(targetShift, targetDate, shiftsSorted);

    let maxConsecutiveDays = 0;
    let currentConsecutiveDays = 0;
    let currentDate = null;

    for (const shift of localShiftsSorted) {
        if (shift.shift.type === 'work') {
            const shiftDate = new Date(shift.date);
            
            if (currentDate === null) {
                currentConsecutiveDays = 1;
                currentDate = shiftDate;
            } else {
                const daysDiff = Math.floor((shiftDate - currentDate) / (1000 * 60 * 60 * 24));
                
                if (daysDiff === 1) {
                    // Jour consécutif
                    currentConsecutiveDays++;
                } else if (daysDiff === 0) {
                    // Même jour, on ne compte pas
                    continue;
                } else {
                    // Jour non consécutif, on réinitialise
                    maxConsecutiveDays = Math.max(maxConsecutiveDays, currentConsecutiveDays);
                    currentConsecutiveDays = 1;
                }
                currentDate = shiftDate;
            }
        } else {
            // Shift de repos, on réinitialise le compteur
            maxConsecutiveDays = Math.max(maxConsecutiveDays, currentConsecutiveDays);
            currentConsecutiveDays = 0;
            currentDate = null;
        }
    }

    // Vérifier le dernier groupe
    maxConsecutiveDays = Math.max(maxConsecutiveDays, currentConsecutiveDays);

    return {
        ok: maxConsecutiveDays <= 5,
        consecutiveDays: maxConsecutiveDays
    };
}

/**
 * Vérifie qu'un agent bénéficie d'une période de repos minimale de 12 heures après une vacation de contrôle de nuit
 * @param {Object} targetShift - Le shift en question
 * @param {string} targetDate - Date au format YYYY-MM-DD
 * @param {Array} shiftsSorted - Array des shifts triés chronologiquement
 * @returns {Object} { ok: boolean, restAfterNightControl: number }
 */
function checkRestAfterNightControl(targetShift, targetDate, shiftsSorted) {
    if (targetShift.type !== 'work') return { ok: true, restAfterNightControl: 0 };

    const targetStart = parseShiftTime(targetDate, targetShift?.default?.startTime);
    const targetEnd = parseShiftTime(targetDate, targetShift?.default?.endTime, targetShift?.default?.endsNextDay);

    // Vérifier si c'est un contrôle de nuit (entre 00h00 et 06h00)
    const isNightControl = targetStart.getHours() >= 0 && targetStart.getHours() < 6;

    if (!isNightControl) return { ok: true, restAfterNightControl: 0 };

    // Chercher le prochain shift après ce contrôle de nuit
    let nextShift = null;
    for (const shift of shiftsSorted) {
        if (shift.shift.type === 'work' && shift.start > targetEnd) {
            nextShift = shift;
            break;
        }
    }

    if (!nextShift) return { ok: true, restAfterNightControl: 0 };

    const restMinutes = (nextShift.start - targetEnd) / (60 * 1000);
    const requiredRestMinutes = 12 * 60; // 12 heures

    return {
        ok: restMinutes >= requiredRestMinutes,
        restAfterNightControl: restMinutes
    };
}

/**
 * Vérifie qu'un agent ne peut exercer plus de deux vacations de contrôle consécutives empiétant sur la plage 00h00-06h00
 * @param {Object} targetShift - Le shift en question
 * @param {string} targetDate - Date au format YYYY-MM-DD
 * @param {Array} shiftsSorted - Array des shifts triés chronologiquement
 * @returns {Object} { ok: boolean, consecutiveNightControls: number }
 */
function checkConsecutiveNightControls(targetShift, targetDate, shiftsSorted) {
    if (targetShift.type !== 'work') return { ok: true, consecutiveNightControls: 0 };

    const localShiftsSorted = simulateInsertShift(targetShift, targetDate, shiftsSorted);

    let maxConsecutiveNightControls = 0;
    let currentConsecutiveNightControls = 0;
    let currentDate = null;

    for (const shift of localShiftsSorted) {
        if (shift.shift.type === 'work') {
            const shiftStart = parseShiftTime(shift.date, shift.shift?.default?.startTime);
            const isNightControl = shiftStart.getHours() >= 0 && shiftStart.getHours() < 6;
            
            if (isNightControl) {
                const shiftDate = new Date(shift.date);
                
                if (currentDate === null) {
                    currentConsecutiveNightControls = 1;
                    currentDate = shiftDate;
                } else {
                    const daysDiff = Math.floor((shiftDate - currentDate) / (1000 * 60 * 60 * 24));
                    
                    if (daysDiff === 1) {
                        // Jour consécutif
                        currentConsecutiveNightControls++;
                    } else if (daysDiff === 0) {
                        // Même jour, on ne compte pas
                        continue;
                    } else {
                        // Jour non consécutif, on réinitialise
                        maxConsecutiveNightControls = Math.max(maxConsecutiveNightControls, currentConsecutiveNightControls);
                        currentConsecutiveNightControls = 1;
                    }
                    currentDate = shiftDate;
                }
            } else {
                // Shift de jour, on réinitialise le compteur
                maxConsecutiveNightControls = Math.max(maxConsecutiveNightControls, currentConsecutiveNightControls);
                currentConsecutiveNightControls = 0;
                currentDate = null;
            }
        } else {
            // Shift de repos, on réinitialise le compteur
            maxConsecutiveNightControls = Math.max(maxConsecutiveNightControls, currentConsecutiveNightControls);
            currentConsecutiveNightControls = 0;
            currentDate = null;
        }
    }

    // Vérifier le dernier groupe
    maxConsecutiveNightControls = Math.max(maxConsecutiveNightControls, currentConsecutiveNightControls);

    return {
        ok: maxConsecutiveNightControls <= 2,
        consecutiveNightControls: maxConsecutiveNightControls
    };
}

/**
 * Vérifie qu'un agent bénéficie d'une période de repos minimale de 48 heures après deux vacations consécutives de contrôle de nuit
 * @param {Object} targetShift - Le shift en question
 * @param {string} targetDate - Date au format YYYY-MM-DD
 * @param {Array} shiftsSorted - Array des shifts triés chronologiquement
 * @returns {Object} { ok: boolean, restAfterTwoNightControls: number }
 */
function checkRestAfterTwoNightControls(targetShift, targetDate, shiftsSorted) {
    if (targetShift.type !== 'work') return { ok: true, restAfterTwoNightControls: 0 };

    const localShiftsSorted = simulateInsertShift(targetShift, targetDate, shiftsSorted);

    // Chercher les séquences de deux vacations de contrôle de nuit consécutives
    let consecutiveNightControls = [];
    let currentSequence = [];
    let currentDate = null;

    for (const shift of localShiftsSorted) {
        if (shift.shift.type === 'work') {
            const shiftStart = parseShiftTime(shift.date, shift.shift?.default?.startTime);
            const isNightControl = shiftStart.getHours() >= 0 && shiftStart.getHours() < 6;
            
            if (isNightControl) {
                const shiftDate = new Date(shift.date);
                
                if (currentDate === null) {
                    currentSequence = [shift];
                    currentDate = shiftDate;
                } else {
                    const daysDiff = Math.floor((shiftDate - currentDate) / (1000 * 60 * 60 * 24));
                    
                    if (daysDiff === 1) {
                        // Jour consécutif
                        currentSequence.push(shift);
                        if (currentSequence.length === 2) {
                            consecutiveNightControls.push([...currentSequence]);
                        }
                    } else if (daysDiff === 0) {
                        // Même jour, on ne compte pas
                        continue;
                    } else {
                        // Jour non consécutif, on réinitialise
                        currentSequence = [shift];
                    }
                    currentDate = shiftDate;
                }
            } else {
                // Shift de jour, on réinitialise le compteur
                currentSequence = [];
                currentDate = null;
            }
        } else {
            // Shift de repos, on réinitialise le compteur
            currentSequence = [];
            currentDate = null;
        }
    }

    // Vérifier le repos après chaque séquence de deux vacations consécutives
    for (const sequence of consecutiveNightControls) {
        if (sequence.length === 2) {
            const lastShiftEnd = parseShiftTime(sequence[1].date, sequence[1].shift?.default?.endTime, sequence[1].shift?.default?.endsNextDay);
            
            // Chercher le prochain shift après cette séquence
            let nextShift = null;
            for (const shift of localShiftsSorted) {
                if (shift.shift.type === 'work' && shift.start > lastShiftEnd) {
                    nextShift = shift;
                    break;
                }
            }

            if (nextShift) {
                const restMinutes = (nextShift.start - lastShiftEnd) / (60 * 1000);
                const requiredRestMinutes = 48 * 60; // 48 heures

                if (restMinutes < requiredRestMinutes) {
                    return {
                        ok: false,
                        restAfterTwoNightControls: restMinutes
                    };
                }
            }
        }
    }

    return {
        ok: true,
        restAfterTwoNightControls: 0
    };
}



export {
    categorize,     
    checkMinimumRestTime,
    checkWeeklyRestPeriod,
    checkWeeklyWorkHours,
    checkConsecutiveWorkDays,
    checkRestAfterNightControl,
    checkConsecutiveNightControls,
    checkRestAfterTwoNightControls,
    simulateInsertShift
};