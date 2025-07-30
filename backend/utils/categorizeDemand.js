import { computeShiftOfUserWithSubstitutions } from './computeShiftOfUserWithSubstitutions.js';

// Constantes pour améliorer la lisibilité et la maintenance²
const MIN_REST_MINUTES = 11 * 60;

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

        const beforeRange = Array.from({ length: 7 }, (_, i) => {
            const newDate = new Date(demandDate);
            newDate.setDate(demandDate.getDate() + i - 7);
                
            return newDate;
        });

        const afterRange = Array.from({ length: 6 }, (_, i) => {
            const newDate = new Date(demandDate);
            newDate.setDate(demandDate.getDate() + i + 1);

            return newDate;
        });
       
        const shiftsTest = await computeShiftOfUserWithSubstitutions(beforeRange.concat(afterRange), userId);
       
        const shiftsMapTest = new Map();
        shiftsTest.forEach(shift => {
            const date = shift.date;
            if (!shiftsMapTest.has(date)) {
                shiftsMapTest.set(date, shift.shift);
            }
        });

        const computeRest = checkMinimumRestTime(demand.posterShift, demandDate, shiftsMapTest);
        const has35hRest = checkWeeklyRestPeriod(demand.posterShift, demandDate, shiftsMapTest);
        const isWithin48h = checkWeeklyWorkHours(demand.posterShift, demandDate, shiftsMapTest);
        
        if (!computeRest.ok) console.warn('Repos minimum de 11h non respecté');
        if (!has35hRest) console.warn('Pas de repos de 35h trouvé dans les 7 jours glissants');
        if (!isWithin48h) console.warn('Plus de 48h de travail sur 7 jours glissants');

        demandWithLimit.rest = {
            before: computeRest.restBefore,
            after: computeRest.restAfter
        };

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
 * Parse un horaire de shift en Date JS complète
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {string} time - Heure au format HH:mm
 * @param {boolean} endsNextDay - Si true, décale au lendemain
 * @returns {Date}
 */
function parseShiftDateTime(date, time, endsNextDay = false) {
  const [hour, minute] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  if (endsNextDay) d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Récupère tous les shifts de type "work", triés chronologiquement
 * @param {Object} shiftsMap - Objet avec clés de date et valeurs { date, shift }
 * @returns {Array<{ shift, date: string, start: Date, end: Date }>}
 */
function getAllShiftsSorted(shiftsMap) {
  const result = [];

  for (const [date, entry] of shiftsMap) {
    if (!entry || entry.type !== 'work') continue;

    const shift = entry;
    const start = parseShiftDateTime(date, shift.startTime);
    const end = parseShiftDateTime(date, shift.endTime, shift.endsNextDay);

    result.push({ shift, date, start, end });
  }

  return result.sort((a, b) => a.date - b.date);
}

/**
 * Vérifie s'il y a au moins 11h de repos avant et après le shift cible
 * @param {Object} targetShift - Le shift en question
 * @param {string} targetDate - Date au format YYYY-MM-DD
 * @param {Object} shiftsMap - Objet avec les shifts autour
 * @returns {boolean}
 */
function checkMinimumRestTime(targetShift, targetDate, shiftsMap) {
  if (targetShift.type !== 'work') return true;

  const allShifts = getAllShiftsSorted(shiftsMap);

  const targetStart = parseShiftDateTime(targetDate, targetShift.startTime);
  const targetEnd = parseShiftDateTime(targetDate, targetShift.endTime, targetShift.endsNextDay);

  let lastShift = null;
  let nextShift = null;

  for (const s of allShifts) {
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
    ok: true ,
  }

  if (lastShift) {
    result.restBefore = (targetStart - lastShift.end) / (60 * 1000);
    if (result.restBefore < MIN_REST_MINUTES) result.ok = false;
  }

  if (nextShift) {
    const restAfter = (nextShift.start - targetEnd) / (60 * 1000);
    if (restAfter < MIN_REST_MINUTES) result.ok = false;
  }

  return result;
}

   


function checkWeeklyRestPeriod(targetShift, targetDate, shiftsMap) {
    const map = new Map();
    shiftsMap.forEach((shift, date) => {
        map.set(date, shift);
    });
   
    map.set(targetDate, targetShift);
    const allShifts = getAllShiftsSorted(map);

    let restOk 
  
    for (let i = 0; i < 7; i++) {
        restOk = false;
        const windowStart = new Date(targetDate);
        windowStart.setDate(windowStart.getDate() + i - 6);
        const windowEnd = new Date(targetDate);
        windowEnd.setDate(windowEnd.getDate() + i + 1 );
        const windowShifts = allShifts.filter(s => new Date(s.end) >= windowStart && new Date(s.start) <= windowEnd);
         
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
       
        if (!restOk) break;
     
     
    }
    return restOk;

}

function checkWeeklyWorkHours(targetShift, targetDate, shiftsMap) {
    const map = new Map();
    shiftsMap.forEach((shift, date) => {
        map.set(date, shift);
    });
   
    map.set(targetDate, targetShift);
    const allShifts = getAllShiftsSorted(map);
    let workOk
  
    for (let i = 0; i < 7; i++) {
        workOk = true; 
        let totalWorkMinutes = 0;
        const windowStart = new Date(targetDate);
        windowStart.setDate(windowStart.getDate() + i - 6);
        const windowEnd = new Date(targetDate);
        windowEnd.setDate(windowEnd.getDate() + i + 1 );
        const windowShifts = allShifts.filter(s => new Date(s.end) >= windowStart && new Date(s.start) <= windowEnd);

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



export {
    categorize,
    checkMinimumRestTime,
    checkWeeklyRestPeriod,
    checkWeeklyWorkHours
};