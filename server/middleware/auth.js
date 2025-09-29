import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

// Protect routes
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication token required to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    req.user = await User.findById(decoded.id).populate('serviceCenterId');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'No user found with this token'
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'ACCOUNT_DISABLED',
        message: 'User account is deactivated'
      });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_INVALID',
        message: 'Invalid authentication token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'AUTH_ERROR',
      message: 'Authentication failed'
    });
  }
};

// Grant access to all authenticated users (role restrictions removed)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Authentication required to access this route'
      });
    }

    // Role restrictions removed - all authenticated users have access
    next();
  };
};

// Service center restrictions removed - all authenticated users have access
export const checkServiceCenter = (req, res, next) => {
  // Add service center ID to request if available (for backward compatibility)
  if (req.user.serviceCenterId) {
    req.serviceCenterId = req.user.serviceCenterId._id || req.user.serviceCenterId;
  }
  next();
};

// All authenticated users have access to all appointments (role restrictions removed)
export const validateAppointmentAccess = (appointment, user) => {
  if (!appointment) {
    return { hasAccess: false, message: 'Appointment not found' };
  }

  // All authenticated users have access to all appointments
  return { hasAccess: true };
};