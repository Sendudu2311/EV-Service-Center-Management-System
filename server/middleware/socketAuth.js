import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

/**
 * Socket.IO authentication middleware
 * Verifies JWT token from socket handshake and attaches user data to socket
 */
export const socketAuth = async (socket, next) => {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new Error('User not found'));
    }

    if (!user.isActive) {
      return next(new Error('User account is deactivated'));
    }

    // Attach user to socket
    socket.user = user;
    socket.userId = user._id.toString();
    socket.userRole = user.role;
    // serviceCenterId removed - single center architecture

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

/**
 * Validate if user can join a specific appointment room
 * @param {Object} socket - Socket instance
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<Object>} { canJoin: boolean, message?: string }
 */
export const validateAppointmentAccess = async (socket, appointmentId) => {
  try {
    // Import Appointment model here to avoid circular dependency
    const { Appointment } = await import('../models/index.js');

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return { canJoin: false, message: 'Appointment not found' };
    }

    const user = socket.user;

    // Admin can access all appointments
    if (user.role === 'admin') {
      return { canJoin: true };
    }

    // Customer can only access their own appointments
    if (user.role === 'customer') {
      const canJoin = appointment.customerId.toString() === user._id.toString();
      return {
        canJoin,
        message: canJoin ? undefined : 'Access denied to this appointment'
      };
    }

    // Staff can access all appointments - single center architecture
    if (user.role === 'staff') {
      return { canJoin: true };
    }

    // Technician can access appointments assigned to them - single center architecture
    if (user.role === 'technician') {
      const isAssignedTechnician = appointment.assignedTechnician?.toString() === user._id.toString();
      return {
        canJoin: isAssignedTechnician,
        message: isAssignedTechnician ? undefined : 'Access denied to this appointment'
      };
    }

    return { canJoin: false, message: 'Invalid user role' };
  } catch (error) {
    console.error('Appointment access validation error:', error);
    return { canJoin: false, message: 'Validation error' };
  }
};

/**
 * Validate chat message data
 * @param {Object} messageData
 * @returns {Object} { isValid: boolean, errors?: string[] }
 */
export const validateChatMessage = (messageData) => {
  const errors = [];

  if (!messageData.appointmentId) {
    errors.push('Appointment ID is required');
  }

  if (!messageData.message || typeof messageData.message !== 'string') {
    errors.push('Message content is required and must be a string');
  }

  if (messageData.message && messageData.message.length > 1000) {
    errors.push('Message cannot exceed 1000 characters');
  }

  if (messageData.messageType && !['text', 'image', 'file'].includes(messageData.messageType)) {
    errors.push('Invalid message type');
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
};

/**
 * Sanitize message content to prevent XSS
 * @param {string} message
 * @returns {string}
 */
export const sanitizeMessage = (message) => {
  if (typeof message !== 'string') return message;

  return message
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
};