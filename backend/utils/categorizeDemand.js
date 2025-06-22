import { computeShiftOfUserWithSubstitutions } from './computeShiftOfUserWithSubstitutions.js';

const categorize = async (demand, userId) => {
    try {
        const demandDate = new Date(demand.posterShift.date);
        const demandWithLimit = demand.toObject();
        demandWithLimit.limit = [];

        const vacationOfFetcher = (await computeShiftOfUserWithSubstitutions(demandDate, userId))[0];

        if (!vacationOfFetcher || !vacationOfFetcher.shift) {
            console.log("Aucun shift trouvé pour l'utilisateur");
            demandWithLimit.limit.push('noShift');
            return demandWithLimit;
        }

        // Vérifier si l'utilisateur travaille déjà ce jour-là
        if (vacationOfFetcher.shift?.name !== "Rest Day" && vacationOfFetcher.shift?.type !== "rest") {
            // Vérifier si une permutation est possible
            demandWithLimit.limit.push('alreadyWorking');
            if (demand.acceptedSwitches.length > 0 && demand.acceptedSwitches.some(switchItem => switchItem?.shift?.toString() === vacationOfFetcher.shift?._id?.toString())) {
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

export { categorize };