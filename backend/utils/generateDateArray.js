export function generateDateArray(startDate, endDate) {
    const dateArray = [];
  let currentDate = new Date(startDate);

  while (currentDate <= new Date(endDate)) {
    dateArray.push(new Date(currentDate).toISOString().split('T')[0]);
    // Use UTC date to prevent problems with time zones and DST
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return dateArray;
};
