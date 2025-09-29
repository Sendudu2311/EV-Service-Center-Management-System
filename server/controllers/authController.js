import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { sendEmail } from '../utils/email.js';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendAuthError,
  sendConflictError,
  asyncHandler,
  formatMongooseError
} from '../utils/response.js';

// Generate JWT Token with role and serviceCenterId
const generateToken = (user) => {
  const payload = {
    id: user._id || user.id,
    role: user.role
  };

  // Add serviceCenterId for staff and technicians
  if (user.serviceCenterId && ['staff', 'technician'].includes(user.role)) {
    payload.serviceCenterId = user.serviceCenterId;
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, role = 'customer' } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return sendConflictError(res, 'User already exists with this email');
  }

  // Create user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    phone,
    role
  });

  // Generate token
  const token = generateToken(user);

  // Remove password from response
  user.password = undefined;

  return sendSuccess(res, 201, 'User registered successfully', {
    token,
    user
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return sendValidationError(res, {
      email: !email ? 'Email is required' : undefined,
      password: !password ? 'Password is required' : undefined
    });
  }

  // Check for user and include password
  const user = await User.findOne({ email }).select('+password').populate('serviceCenterId');

  if (!user) {
    return sendAuthError(res, 'Invalid credentials');
  }

  // Check if user is active
  if (!user.isActive) {
    return sendAuthError(res, 'Account is deactivated. Please contact support.');
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return sendAuthError(res, 'Invalid credentials');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate token
  const token = generateToken(user);

  // Remove password from response
  user.password = undefined;

  return sendSuccess(res, 200, 'Login successful', {
    token,
    user
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('serviceCenterId');

  return sendSuccess(res, 200, 'User profile retrieved successfully', { user });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phone: req.body.phone
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key =>
    fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  const user = await User.findByIdAndUpdate(
    req.user.id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true
    }
  ).populate('serviceCenterId');

  return sendSuccess(res, 200, 'Profile updated successfully', { user });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return sendValidationError(res, {
      currentPassword: !currentPassword ? 'Current password is required' : undefined,
      newPassword: !newPassword ? 'New password is required' : undefined
    });
  }

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  const isMatch = await user.matchPassword(currentPassword);

  if (!isMatch) {
    return sendAuthError(res, 'Current password is incorrect');
  }

  // Validate new password strength
  if (newPassword.length < 6) {
    return sendValidationError(res, {
      newPassword: 'New password must be at least 6 characters long'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return sendSuccess(res, 200, 'Password changed successfully');
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '10m'
    });

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const message = `
      You are receiving this email because you (or someone else) has requested the reset of a password.
      Please click on the following link to reset your password:
      
      ${resetUrl}
      
      If you did not request this, please ignore this email and your password will remain unchanged.
      This link will expire in 10 minutes.
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request - EV Service Center',
        message
      });

      res.json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch (error) {
      console.error('Email send error:', error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { resettoken } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new password'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(resettoken, process.env.JWT_SECRET);
      
      const user = await User.findOne({
        _id: decoded.id,
        resetPasswordToken: resettoken,
        resetPasswordExpire: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      // Set new password
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      // Generate new token
      const token = generateToken(user);

      res.json({
        success: true,
        message: 'Password reset successful',
        token
      });
    } catch (jwtError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Get users (role-based filtering)
// @route   GET /api/auth/users
// @access  Private (Staff/Admin)
export const getUsers = async (req, res) => {
  try {
    const { role, search, isActive, page = 1, limit = 10 } = req.query;
    
    // Check if user has permission
    if (!['staff', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access user data'
      });
    }

    let filter = {};
    
    // Role filtering
    if (role) {
      filter.role = role;
    }
    
    // Status filtering
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    // Search filtering
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const users = await User.find(filter)
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .populate('serviceCenterId', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// @desc    Update user (Admin only)
// @route   PUT /api/auth/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res) => {
  try {
    // Check if user has permission
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update user data'
      });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      role: req.body.role,
      isActive: req.body.isActive,
      serviceCenterId: req.body.serviceCenterId
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    ).populate('serviceCenterId', 'name code').select('-password');

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};