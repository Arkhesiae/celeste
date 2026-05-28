import mongoose from 'mongoose';

const ShiftDataSchema = new mongoose.Schema({
    shift: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shift',
        required: true,
        default: null
    },
    selectedVariation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Variation',
        default: null
    },
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
        default: null
    },

});

const baseOptions = { discriminatorKey: 'type', timestamps: true }

const CalendarEntrySchema = new mongoose.Schema({
    userId:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    centerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Center',
        required: true
    },
    date: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/,
        index: true
    },
    active: {
        type: Boolean,
        default: true
    },
    comment: {
        type: String,
        default: '',
        maxlength: 500
    },
}, baseOptions)

// CalendarEntrySchema.virtual('effectiveHours').get(function () {
//     const shift = this.shiftData?.shift;

//     if (this.startTime && this.endTime) {
//         return { startTime: this.startTime, endTime: this.endTime };
//     }

//     if (shift && typeof shift === 'object' && shift.default) {
//         const variation = this.shiftData.selectedVariation;
//         if (variation && typeof variation === 'object' && variation.startTime) {
//             return { startTime: variation.startTime, endTime: variation.endTime };
//         }
//         return { startTime: shift.default.startTime, endTime: shift.default.endTime };
//     }

// });

// CalendarEntrySchema.virtual('isOff').get(function () {
//     const hasShift = this.shiftData?.shift != null || this.shiftData?.shift?.type !== "rest";
//     if (!hasShift && !this.startTime && !this.endTime) {
//         return true;
//     }
//     return false;
// });

const CalendarEntry = mongoose.model('CalendarEntry', CalendarEntrySchema)

// ── Assignment ────────────────────────────────────────────────────────


const ASSIGNMENT_SUBTYPES = [
    'substitution', 'sick_leave', 'maternity_leave', 'manager',
    'english_training', 'training', 'simulation', 'other',
    'test', 'office', 'stage', 'instruc', 'custom', 'vis_med', 'absence'
]

const AssignmentSchema = new mongoose.Schema({
    shiftData: ShiftDataSchema,
    wasOverride: {
        type: Boolean,
        default: false
    },
    subType: {
        type: String,
        enum: ASSIGNMENT_SUBTYPES,
        required: true
    },
    substitution: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Substitution',
            default: null
        },
        savedEntry: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CalendarEntry',
            default: null
        },
    },
    startTime: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    endTime: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
})

AssignmentSchema.pre('save', async function () {
    const hasShift = this.shiftData?.shift != null
    const hasCustomTime = this.startTime || this.endTime

    if (this.subType === "absence") {
        this.startTime = null;
        this.endTime = null;
        return;
    }

    if (!hasShift && (!this.startTime || !this.endTime) && this.subType !== "substitution") {
        throw new Error(
            `startTime et endTime sont requis pour le type "${this.type}" sans shift défini`
        )
    }

    if (hasShift && hasCustomTime) {
        throw new Error(
            'startTime/endTime ne doivent pas être définis quand un shift est déjà associé'
        )
    }

    if (this.subType === 'substitution' && !this.substitution?.id) {
        throw new Error('substitution requis pour le subType substitution')
    }
    // if (!this.startTime || !this.endTime) {
    //     throw new Error('startTime et endTime requis pour une assignment')
    // }
})

const Assignment = CalendarEntry.discriminator('assignment', AssignmentSchema)


// ── Modification d'une vacation existante ──────────────────────────────────────────────────────

const ModificationSchema = new mongoose.Schema({
    subType: {
        type: String,
        enum: ['disp', 'vic', 'variation', 'pres'],
        required: true
    },
    shiftData: {
        type: ShiftDataSchema,
        required: true
    }
})

ModificationSchema.pre('save', async function () {
    if (this.subType === 'variation' && !this.shiftData?.selectedVariation) {
        throw new Error('selectedVariation requis pour le subType variation')
    }
})

const Modification = CalendarEntry.discriminator('modification', ModificationSchema)




// ── HourPatch (MDDA)─────────────────────────────────────────────────────────

const HourPatchSchema = new mongoose.Schema({
    adjustedTime: {
        adjustedStart: { type: Number, required: true },
        adjustedEnd: { type: Number, required: true },
    },
    subType: {
        type: String,
        default: 'mdda',
        required: true,
        enum: ['mdda', "assignment_patch"],
    },
    shiftData: {
        type: ShiftDataSchema,
        required: true
    }
})

HourPatchSchema.pre('save', async function () {
    const { adjustedStart, adjustedEnd } = this.adjustedTime
    if (adjustedStart >= adjustedEnd) {
        throw new Error('adjustedStart doit être inférieur à adjustedEnd')
    }
})

const HourPatch = CalendarEntry.discriminator('hour_patch', HourPatchSchema)

export { CalendarEntry, Assignment, Modification, HourPatch }