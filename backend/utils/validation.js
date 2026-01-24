

export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export const isValidId = (id) => {
    const idRegex = /^[0-9a-fA-F]{24}$/;
    return idRegex.test(id);
}

export const isValidDate = (date) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(date);
}

export const isValidISODate = (date) => {
    let dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
}

export const isValidDateRange = ({ startDate, endDate }) => {
    if (!isValidISODate(startDate) || !isValidISODate(endDate)) return false
    return new Date(startDate) <= new Date(endDate)
}