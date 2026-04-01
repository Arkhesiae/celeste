import { Temporal } from '@js-temporal/polyfill';

const overlaps = (a, b) => {
    const toDateTime = ({ date, time }) =>
        Temporal.PlainDateTime.from(`${date}T${time}`)

    const start = (x) => toDateTime({ date: x.date, time: x.startTime })
    const end = (x) => {
        const e = toDateTime({ date: x.date, time: x.endTime })
        return Temporal.PlainDateTime.compare(e, start(x)) <= 0 ? e.add({ days: 1 }) : e
    }

    return (
        Temporal.PlainDateTime.compare(start(a), end(b)) < 0 &&
        Temporal.PlainDateTime.compare(start(b), end(a)) < 0
    )
}

export default overlaps;