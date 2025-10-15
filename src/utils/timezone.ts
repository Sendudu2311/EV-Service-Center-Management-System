// Vietnamese timezone utilities for EV Service Center frontend
// Handle UTC backend storage with Asia/Ho_Chi_Minh display

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Convert UTC Date to Vietnamese time components
 * @param utcDate - UTC Date object
 * @returns Object with Vietnamese date/time components
 */
export const utcToVietnameseDateTime = (utcDate: Date) => {
  const vietnameseDate = new Date(utcDate.toLocaleString('en-US', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }));

  const year = vietnameseDate.getFullYear();
  const month = String(vietnameseDate.getMonth() + 1).padStart(2, '0');
  const day = String(vietnameseDate.getDate()).padStart(2, '0');
  const hour = String(vietnameseDate.getHours()).padStart(2, '0');
  const minute = String(vietnameseDate.getMinutes()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
    datetime: vietnameseDate,
    formatted: `${day}/${month}/${year} ${hour}:${minute}`
  };
};

/**
 * Convert Vietnamese date/time strings to UTC Date
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:mm format
 * @returns UTC Date object
 */
export const vietnameseDateTimeToUTC = (dateStr: string, timeStr: string): Date => {
  // Vietnam is UTC+7, so we need to subtract 7 hours to get UTC
  // Create date string in ISO format and parse it as if it were UTC
  const isoString = `${dateStr}T${timeStr}:00.000Z`;
  const utcDate = new Date(isoString);
  
  // Subtract 7 hours (Vietnam offset) to get actual UTC time
  // When it's 08:00 in Vietnam, it's 01:00 UTC
  utcDate.setHours(utcDate.getHours() - 7);
  
  console.log(`Converting Vietnam time ${dateStr} ${timeStr} to UTC:`, utcDate.toISOString());
  
  return utcDate;
};

/**
 * Get current Vietnamese time
 * @returns Current Vietnamese date/time components
 */
export const getCurrentVietnameseTime = () => {
  return utcToVietnameseDateTime(new Date());
};

/**
 * Format Vietnamese date for display
 * @param date - Date string or Date object
 * @returns Formatted Vietnamese date string
 */
export const formatVietnameseDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const vietnamese = utcToVietnameseDateTime(dateObj);

  return vietnamese.date.split('-').reverse().join('/'); // DD/MM/YYYY
};

/**
 * Format Vietnamese time for display
 * @param time - Time string in HH:mm format
 * @returns Formatted time with 'giờ' suffix
 */
export const formatVietnameseTime = (time: string): string => {
  return `${time} giờ`;
};

/**
 * Format Vietnamese datetime for display
 * @param date - Date string or Date object
 * @param time - Optional time string, uses date time if not provided
 * @returns Formatted Vietnamese datetime string
 */
export const formatVietnameseDateTime = (date: string | Date, time?: string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const vietnamese = utcToVietnameseDateTime(dateObj);

  const displayTime = time || vietnamese.time;
  const displayDate = vietnamese.date.split('-').reverse().join('/');

  return `${displayDate} lúc ${displayTime}`;
};

/**
 * Check if a time slot is in the past (Vietnamese timezone)
 * @param date - Date string in YYYY-MM-DD format
 * @param time - Time string in HH:mm format
 * @returns True if the slot is in the past
 */
export const isTimeSlotInPast = (date: string, time: string): boolean => {
  const slotTime = vietnameseDateTimeToUTC(date, time);
  return slotTime < new Date();
};

/**
 * Generate time slots for a given date range
 * @param startTime - Start time in HH:mm format
 * @param endTime - End time in HH:mm format
 * @param slotDuration - Slot duration in minutes (default 30)
 * @returns Array of time slot strings
 */
export const generateTimeSlots = (
  startTime: string,
  endTime: string,
  slotDuration: number = 30
): string[] => {
  const slots: string[] = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    slots.push(timeString);
  }

  return slots;
};

/**
 * Calculate end time given start time and duration
 * @param startTime - Start time in HH:mm format
 * @param durationMinutes - Duration in minutes
 * @returns End time in HH:mm format
 */
export const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hour, minute] = startTime.split(':').map(Number);
  const totalMinutes = hour * 60 + minute + durationMinutes;

  const endHour = Math.floor(totalMinutes / 60) % 24;
  const endMinute = totalMinutes % 60;

  return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
};