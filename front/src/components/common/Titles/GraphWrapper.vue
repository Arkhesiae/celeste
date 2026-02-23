<template>
    <WorkdayAmplitudeGraph :days="days" :center-date="props.demand?.posterShift?.date" :compatibility="compatibility" />
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

const generateDaysData = (shiftsArray) => {
    if (!props.demand?.posterShift?.date) return []

    const posterShift = props.demand.posterShift
    const demandDate = new Date(posterShift?.date)

    // Helper function to match parseShiftTime logic
    const parseTimeUTC = (date, time, endsNextDay = false) => {
        const [hour, minute] = time.split(':').map(Number)
        const d = new Date(date)
        d.setUTCHours(hour, minute, 0, 0)
        if (endsNextDay) d.setDate(d.getDate() + 1)
        return d
    }

    const demandDateStr = typeof posterShift?.date === 'string'
        ? posterShift.date.slice(0, 10)
        : posterShift?.date ? new Date(posterShift.date).toISOString().slice(0, 10) : ''
    const demandShiftEntry = posterShift?.shift ? (() => {
        const effective = getEffectiveShiftTimes(posterShift.shift, posterShift.selectedVariation)
        if (!effective?.startTime || !effective?.endTime) return null
        return {
            start: parseTimeUTC(posterShift.date, effective.startTime).toISOString(),
            end: parseTimeUTC(posterShift.date, effective.endTime, effective.endsNextDay).toISOString(),
            name: getDisplayShiftName({ shift: posterShift.shift, selectedVariation: posterShift.selectedVariation }),
            isDemandShift: true,
            id: 'demand-shift-' + props.demand._id,
            date: demandDateStr
        }
    })() : null

    const result = []
    for (let i = -6; i <= 6; i++) {
        const currentDate = new Date(demandDate)
        currentDate.setDate(demandDate.getDate() + i)
        const dateStr = currentDate.toISOString().slice(0, 10)

        if (dateStr === demandDateStr && demandShiftEntry) {
            result.push(demandShiftEntry)
            continue
        }
        const shift = shiftsArray.find(s => s.date === dateStr)
        if (shift) {
            result.push({
                ...shift,
                name: shift.shift?.name || 'Vacation'
            })
        } else {
            result.push({
                date: currentDate,
                empty: true
            })
        }
    }

    return result
}

const fetchCompatibility = async () => {
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
    }
}

onMounted(() => {
    if (props.demand) {
        fetchCompatibility()
    }
})

</script>

<style scoped></style>
