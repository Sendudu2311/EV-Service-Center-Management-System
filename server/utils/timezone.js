// Timezone utilities for Vietnamese EV Service Center
// Handle UTC storage with Asia/Ho_Chi_Minh display conversion

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Convert date and time strings to UTC Date object
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {string} timeStr - Time in HH:mm format
 * @returns {Date} UTC Date object
 */
export const vietnamDateTimeToUTC = (dateStr, timeStr) => {
  const vietnamDateTime = new Date(`${dateStr}T${timeStr}:00`);

  // Create date in Vietnam timezone
  const vietnamDate = new Date(vietnamDateTime.toLocaleString('en-US', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }));

  // Adjust for timezone offset
  const offsetMs = vietnamDateTime.getTime() - vietnamDate.getTime();
  return new Date(vietnamDateTime.getTime() - offsetMs);
};

/**
 * Convert UTC Date to Vietnam timezone components
 * @param {Date} utcDate - UTC Date object
 * @returns {Object} {date: 'YYYY-MM-DD', time: 'HH:mm', datetime: Date}
 */
export const utcToVietnamDateTime = (utcDate) => {
  const vietnamDate = new Date(utcDate.toLocaleString('en-US', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }));

  const year = vietnamDate.getFullYear();
  const month = String(vietnamDate.getMonth() + 1).padStart(2, '0');
  const day = String(vietnamDate.getDate()).padStart(2, '0');
  const hour = String(vietnamDate.getHours()).padStart(2, '0');
  const minute = String(vietnamDate.getMinutes()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
    datetime: vietnamDate
  };
};

/**
 * Get current Vietnam time components
 * @returns {Object} {date: 'YYYY-MM-DD', time: 'HH:mm', datetime: Date}
 */
export const getCurrentVietnamTime = () => {
  return utcToVietnamDateTime(new Date());
};

/**
 * Check if a date is in Vietnam business hours
 * @param {Date} utcDate - UTC Date to check
 * @param {Object} workingHours - {open: 'HH:mm', close: 'HH:mm'}
 * @returns {boolean}
 */
export const isInBusinessHours = (utcDate, workingHours) => {
  const vietnam = utcToVietnamDateTime(utcDate);
  const [checkHour, checkMinute] = vietnam.time.split(':').map(Number);
  const checkTimeMinutes = checkHour * 60 + checkMinute;

  const [openHour, openMinute] = workingHours.open.split(':').map(Number);
  const openTimeMinutes = openHour * 60 + openMinute;

  const [closeHour, closeMinute] = workingHours.close.split(':').map(Number);
  const closeTimeMinutes = closeHour * 60 + closeMinute;

  return checkTimeMinutes >= openTimeMinutes && checkTimeMinutes <= closeTimeMinutes;
};

/**
 * Round time to nearest slot boundary (30 minutes default)
 * @param {string} timeStr - Time in HH:mm format
 * @param {number} slotMinutes - Slot size in minutes (default 30)
 * @returns {string} Rounded time in HH:mm format
 */
export const roundToSlotBoundary = (timeStr, slotMinutes = 30) => {
  const [hour, minute] = timeStr.split(':').map(Number);
  const totalMinutes = hour * 60 + minute;

  const roundedMinutes = Math.ceil(totalMinutes / slotMinutes) * slotMinutes;
  const roundedHour = Math.floor(roundedMinutes / 60);
  const roundedMinute = roundedMinutes % 60;

  return `${String(roundedHour).padStart(2, '0')}:${String(roundedMinute).padStart(2, '0')}`;
};

/**
 * Calculate duration between two time strings
 * @param {string} startTime - Start time in HH:mm format
 * @param {string} endTime - End time in HH:mm format
 * @returns {number} Duration in minutes
 */
export const calculateDuration = (startTime, endTime) => {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  return endMinutes - startMinutes;
};

/**
 * Add minutes to a time string
 * @param {string} timeStr - Time in HH:mm format
 * @param {number} minutes - Minutes to add
 * @returns {string} New time in HH:mm format
 */
export const addMinutesToTime = (timeStr, minutes) => {
  const [hour, minute] = timeStr.split(':').map(Number);
  const totalMinutes = hour * 60 + minute + minutes;

  const newHour = Math.floor(totalMinutes / 60) % 24;
  const newMinute = totalMinutes % 60;

  return `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
};