

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