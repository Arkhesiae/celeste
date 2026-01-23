<template>
    <WorkdayAmplitudeGraph :days="days" :center-date="props.demand?.posterShift?.date" :compatibility="compatibility" />
</template>

<script setup>
import { substitutionService } from '@/services/substitutionService';
import { ref, onMounted } from 'vue';

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

    const demandDate = new Date(props.demand.posterShift.date)
    

    // Helper function to match parseShiftTime logic
    const parseTimeUTC = (date, time, endsNextDay = false) => {
        const [hour, minute] = time.split(':').map(Number)
        const d = new Date(date)
        d.setUTCHours(hour, minute, 0, 0)
        if (endsNextDay) d.setDate(d.getDate() + 1)
        return d
    }

    const result = []
    for (let i = -6; i <= 6; i++) {
        const currentDate = new Date(demandDate)
        currentDate.setDate(demandDate.getDate() + i)
        const dateStr = currentDate.toISOString().slice(0, 10)

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

    // Add demand shift specifically
    const posterShift = props.demand.posterShift
    if (posterShift?.shift?.default) {
        const { startTime, endTime, endsNextDay } = posterShift.shift.default
        result.push({
            start: parseTimeUTC(posterShift.date, startTime).toISOString(),
            end: parseTimeUTC(posterShift.date, endTime, endsNextDay).toISOString(),
            name: posterShift.shift.name,
            isDemandShift: true,
            id: 'demand-shift-' + props.demand._id
        })
    }

    return result
}

const fetchCompatibility = async () => {
    try {
        const data = await substitutionService.fetchCompatibility(props.demand._id)
        console.log('Compatibility data:', data)
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
        console.log('demand', props.demand)
        fetchCompatibility()
    }
})

</script>

<style scoped></style>
