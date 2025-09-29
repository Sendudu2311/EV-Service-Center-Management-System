// Parameter validation middleware for EV Service booking system

export const validateDateTimeParams = (req, res, next) => {
  const { date, time, duration } = req.query.date ? req.query : req.body;

  // Validate date format (YYYY-MM-DD)
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date format. Use YYYY-MM-DD',
      field: 'date'
    });
  }

  // Validate time format (HH:mm)
  if (time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid time format. Use HH:mm (24-hour)',
      field: 'time'
    });
  }

  // Validate duration (integer minutes, 15-480 range)
  if (duration !== undefined) {
    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum < 15 || durationNum > 480) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 15 and 480 minutes',
        field: 'duration'
      });
    }
  }

  // Validate date is not in the past (allow same day)
  if (date) {
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (inputDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot schedule appointments in the past',
        field: 'date'
      });
    }
  }

  next();
};

export const validateObjectId = (paramName) => (req, res, next) => {
  const value = req.params[paramName] || req.body[paramName] || req.query[paramName];

  if (value && !/^[0-9a-fA-F]{24}$/.test(value)) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${paramName} format`,
      field: paramName
    });
  }

  next();
};

export const validateAppointmentCreation = (req, res, next) => {
  const { vehicleId, serviceCenterId, services, scheduledDate, scheduledTime } = req.body;

  // Required fields
  if (!vehicleId || !serviceCenterId || !services || !scheduledDate || !scheduledTime) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: vehicleId, serviceCenterId, services, scheduledDate, scheduledTime'
    });
  }

  // Validate services array
  if (!Array.isArray(services) || services.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Services must be a non-empty array'
    });
  }

  // Validate each service
  for (const service of services) {
    if (!service.serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Each service must have a serviceId'
      });
    }

    if (service.quantity !== undefined && (service.quantity < 1 || !Number.isInteger(service.quantity))) {
      return res.status(400).json({
        success: false,
        message: 'Service quantity must be a positive integer'
      });
    }
  }

  next();
};

export const standardizeErrorResponse = (err, req, res, next) => {
  console.error('API Error:', err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', '),
      errors: err.errors
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      field: err.path
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
      field
    });
  }

  // Default server error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};