<template>
    <div v-if="loading" class="d-flex justify-center align-center py-12">
        <v-progress-circular indeterminate color="primary" size="40" />
    </div>
    <WorkdayAmplitudeGraph
        v-else
        :days="days"
        :center-date="props.demand?.posterShift?.date"
        :compatibility="compatibility"
        :demand="props.demand"
    />
</template>

<script setup>
import { substitutionService } from '@/services/substitutionService';
import { getDisplayShiftName, getEffectiveShiftTimes } from '@/utils/getEffectiveShiftTimes';

const props = defineProps({
    demand: {
        type: Object,
        default: () => ({})
    }
})

const days = ref([])
const compatibility = ref({ limit: [] })
const loading = ref(false)

/** YYYY-MM-DD en UTC (aligné backend / shiftsArray) */
const toUtcDateStr = (value) => {
    if (!value) return ''
    if (typeof value === 'string') return value.slice(0, 10)
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
}

const addUtcDays = (dateStr, offset) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d + offset))
    return dt.toISOString().slice(0, 10)
}

const generateDaysData = (shiftsArray) => {
    if (!props.demand?.posterShift?.date) return []

    const posterShift = props.demand.posterShift
    const demandDateStr = toUtcDateStr(posterShift.date)
    if (!demandDateStr) return []

    const parseTimeUTC = (date, time, endsNextDay = false) => {
        const [hour, minute] = time.split(':').map(Number)
        const d = new Date(date)
        d.setUTCHours(hour, minute, 0, 0)
        if (endsNextDay) d.setUTCDate(d.getUTCDate() + 1)
        return d
    }

    const demandShiftEntry = posterShift?.shift ? (() => {
        const effective = getEffectiveShiftTimes(posterShift.shift, posterShift.selectedVariation)
        if (!effective?.startTime || !effective?.endTime) return null
        return {
            start: parseTimeUTC(posterShift.date, effective.startTime).toISOString(),
            end: parseTimeUTC(posterShift.date, effective.endTime, effective.endsNextDay).toISOString(),
            name: getDisplayShiftName({ shift: posterShift.shift, selectedVariation: posterShift.selectedVariation })
                || posterShift.shift?.name
                || 'Vacation',
            isDemandShift: true,
            id: 'demand-shift-' + props.demand._id,
            date: demandDateStr
        }
    })() : null

    const result = []
    for (let i = -6; i <= 6; i++) {
        const dateStr = addUtcDays(demandDateStr, i)
        const shift = shiftsArray.find(s => toUtcDateStr(s.date) === dateStr)

        if (shift?.start && shift?.end) {
            const displayName = getDisplayShiftName({
                shift: shift.shift,
                selectedVariation: shift.selectedVariation
            })
            result.push({
                ...shift,
                date: dateStr,
                name: displayName || shift.shift?.name || 'Vacation'
            })
        } else {
            result.push({
                date: dateStr,
                empty: true
            })
        }
    }

    // Vacation de la demande en plus du planning de l'agent (jour demandé inclus)
    if (demandShiftEntry) {
        result.push(demandShiftEntry)
    }

    return result
}

const fetchCompatibility = async () => {
    if (!props.demand?._id) return
    loading.value = true
    try {
        const data = await substitutionService.fetchCompatibility(props.demand._id)
        if (data && data.shiftsArray) {
            days.value = generateDaysData(data.shiftsArray)
        }
        if (data && data.compatibility) {
            compatibility.value = data.compatibility
        }
    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchCompatibility()
})

watch(
    () => props.demand?._id,
    (id) => {
        if (id) fetchCompatibility()
    }
)

</script>

<style scoped></style>
