// Validation utilities for data validation across the application

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Vietnamese format)
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidVietnamesePhone = (phone) => {
  // Vietnamese phone number formats: +84, 84, 0 followed by 9-10 digits
  const phoneRegex = /^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validate VIN (Vehicle Identification Number)
 * @param {string} vin
 * @returns {boolean}
 */
export const isValidVIN = (vin) => {
  // VIN must be 17 characters, no I, O, Q allowed
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;
  return vinRegex.test(vin);
};

/**
 * Validate password strength
 * @param {string} password
 * @returns {object} { isValid: boolean, message: string }
 */
export const validatePasswordStrength = (password) => {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }

  if (password.length > 128) {
    return { isValid: false, message: 'Password must be less than 128 characters' };
  }

  // Check for at least one number or special character for stronger passwords
  const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  if (!hasNumberOrSpecial) {
    return {
      isValid: true,
      message: 'Password is acceptable but could be stronger with numbers or special characters'
    };
  }

  return { isValid: true, message: 'Password strength is good' };
};

/**
 * Validate appointment scheduling
 * @param {Date} scheduledDate
 * @param {string} scheduledTime
 * @returns {object} { isValid: boolean, message: string }
 */
export const validateAppointmentScheduling = (scheduledDate, scheduledTime) => {
  const now = new Date();
  const appointmentDateTime = new Date(scheduledDate);

  // Parse time and set on appointment date
  if (scheduledTime) {
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);
  }

  // Cannot schedule in the past
  if (appointmentDateTime <= now) {
    return { isValid: false, message: 'Cannot schedule appointments in the past' };
  }

  // Cannot schedule more than 6 months in advance
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
  if (appointmentDateTime > sixMonthsFromNow) {
    return { isValid: false, message: 'Cannot schedule appointments more than 6 months in advance' };
  }

  // Check if it's a weekend (assuming service centers don't work weekends)
  const dayOfWeek = appointmentDateTime.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { isValid: false, message: 'Appointments cannot be scheduled on weekends' };
  }

  // Check business hours (8 AM to 6 PM)
  const hour = appointmentDateTime.getHours();
  if (hour < 8 || hour >= 18) {
    return { isValid: false, message: 'Appointments must be scheduled between 8 AM and 6 PM' };
  }

  return { isValid: true, message: 'Appointment scheduling is valid' };
};

/**
 * Validate vehicle data
 * @param {object} vehicleData
 * @returns {object} { isValid: boolean, errors: object }
 */
export const validateVehicleData = (vehicleData) => {
  const errors = {};

  // Validate VIN
  if (!vehicleData.vin) {
    errors.vin = 'VIN is required';
  } else if (!isValidVIN(vehicleData.vin)) {
    errors.vin = 'Invalid VIN format';
  }

  // Validate year
  const currentYear = new Date().getFullYear();
  if (!vehicleData.year) {
    errors.year = 'Year is required';
  } else if (vehicleData.year < 2010 || vehicleData.year > currentYear + 1) {
    errors.year = `Year must be between 2010 and ${currentYear + 1}`;
  }

  // Validate battery capacity
  if (!vehicleData.batteryCapacity) {
    errors.batteryCapacity = 'Battery capacity is required';
  } else if (vehicleData.batteryCapacity < 10 || vehicleData.batteryCapacity > 300) {
    errors.batteryCapacity = 'Battery capacity must be between 10 and 300 kWh';
  }

  // Validate charging power
  if (!vehicleData.maxChargingPower) {
    errors.maxChargingPower = 'Max charging power is required';
  } else if (vehicleData.maxChargingPower < 3 || vehicleData.maxChargingPower > 500) {
    errors.maxChargingPower = 'Max charging power must be between 3 and 500 kW';
  }

  // Validate range
  if (!vehicleData.range) {
    errors.range = 'Vehicle range is required';
  } else if (vehicleData.range < 50 || vehicleData.range > 1000) {
    errors.range = 'Vehicle range must be between 50 and 1000 km';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate part data
 * @param {object} partData
 * @returns {object} { isValid: boolean, errors: object }
 */
export const validatePartData = (partData) => {
  const errors = {};

  // Validate part number
  if (!partData.partNumber) {
    errors.partNumber = 'Part number is required';
  } else if (partData.partNumber.length < 3 || partData.partNumber.length > 50) {
    errors.partNumber = 'Part number must be between 3 and 50 characters';
  }

  // Validate pricing
  if (!partData.pricing?.retail) {
    errors.retail = 'Retail price is required';
  } else if (partData.pricing.retail < 0) {
    errors.retail = 'Retail price cannot be negative';
  }

  if (!partData.pricing?.cost) {
    errors.cost = 'Cost price is required';
  } else if (partData.pricing.cost < 0) {
    errors.cost = 'Cost price cannot be negative';
  }

  // Validate inventory levels
  if (partData.inventory?.currentStock < 0) {
    errors.currentStock = 'Current stock cannot be negative';
  }

  if (partData.inventory?.minStockLevel < 0) {
    errors.minStockLevel = 'Minimum stock level cannot be negative';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Sanitize string input to prevent XSS
 * @param {string} input
 * @returns {string}
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id
 * @returns {boolean}
 */
export const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate price range
 * @param {number} price
 * @param {number} min
 * @param {number} max
 * @returns {object}
 */
export const validatePriceRange = (price, min = 0, max = 1000000000) => {
  if (typeof price !== 'number') {
    return { isValid: false, message: 'Price must be a number' };
  }

  if (price < min) {
    return { isValid: false, message: `Price must be at least ${min}` };
  }

  if (price > max) {
    return { isValid: false, message: `Price cannot exceed ${max}` };
  }

  return { isValid: true };
};