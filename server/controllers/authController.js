import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { sendEmail } from "../utils/email.js";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendAuthError,
  sendConflictError,
  asyncHandler,
  formatMongooseError,
} from "../utils/response.js";

// Generate JWT Token with role and serviceCenterId
const generateToken = (user) => {
  const payload = {
    id: user._id || user.id,
    role: user.role,
  };

  // Add serviceCenterId for staff and technicians
  if (user.serviceCenterId && ["staff", "technician"].includes(user.role)) {
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
  const { email, password, firstName, lastName, phone } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return sendConflictError(res, "User already exists with this email");
  }

  // Import OTP utilities
  const { generateOTP, generateOTPEmailTemplate } = await import(
    "../utils/email.js"
  );

  // Generate OTP
  const otp = generateOTP();
  const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Create user (not verified initially)
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    phone,
    role: "customer", // Always customer for public registration
    isEmailVerified: false,
    emailVerificationToken: otp,
    emailVerificationExpire: otpExpire,
  });

  // Send OTP email
  try {
    const emailTemplate = generateOTPEmailTemplate(
      `${firstName} ${lastName}`,
      otp
    );
    await sendEmail({
      email: user.email,
      subject: "Email Verification - EV Service Center",
      html: emailTemplate,
    });

    // Remove password from response
    user.password = undefined;

    return sendSuccess(
      res,
      201,
      "Registration successful! Please check your email for verification code.",
      {
        userId: user._id,
        email: user.email,
        message: "OTP sent to your email address",
      }
    );
  } catch (error) {
    // Delete user if email sending fails
    await User.findByIdAndDelete(user._id);
    console.error("Email sending failed:", error);
    return sendError(
      res,
      500,
      "Could not send verification email. Please try again."
    );
  }
});
// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return sendValidationError(res, "Email and OTP are required");
  }

  // Find user with matching email and OTP
  const user = await User.findOne({
    email,
    emailVerificationToken: otp,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    return sendAuthError(res, "Invalid or expired OTP");
  }

  // Verify user email
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  // Generate token
  const token = generateToken(user);

  // Remove password from response
  user.password = undefined;

  return sendSuccess(res, 200, "Email verified successfully", {
    token,
    user,
  });
});

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return sendValidationError(res, "Email is required");
  }

  // Find unverified user
  const user = await User.findOne({
    email,
    isEmailVerified: false,
  });

  if (!user) {
    return sendAuthError(res, "User not found or already verified");
  }

  // Import OTP utilities
  const { generateOTP, generateOTPEmailTemplate } = await import(
    "../utils/email.js"
  );

  // Generate new OTP
  const otp = generateOTP();
  const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Update user with new OTP
  user.emailVerificationToken = otp;
  user.emailVerificationExpire = otpExpire;
  await user.save();

  // Send OTP email
  try {
    const emailTemplate = generateOTPEmailTemplate(
      `${user.firstName} ${user.lastName}`,
      otp
    );
    await sendEmail({
      email: user.email,
      subject: "Email Verification - EV Service Center",
      html: emailTemplate,
    });

    return sendSuccess(res, 200, "OTP sent successfully", {
      message: "New OTP sent to your email address",
    });
  } catch (error) {
    console.error("Email sending failed:", error);
    return sendError(
      res,
      500,
      "Could not send verification email. Please try again."
    );
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return sendValidationError(res, {
      email: !email ? "Email is required" : undefined,
      password: !password ? "Password is required" : undefined,
    });
  }

  // Check for user and include password
  const user = await User.findOne({ email })
    .select("+password")
    .populate("serviceCenterId");

  if (!user) {
    return sendAuthError(res, "Invalid credentials");
  }

  // Check if user is active
  if (!user.isActive) {
    return sendAuthError(
      res,
      "Account is deactivated. Please contact support."
    );
  }

  // Check if email is verified for customers
  if (user.role === "customer" && !user.isEmailVerified) {
    return sendAuthError(
      res,
      "Please verify your email before logging in. Check your email for verification code."
    );
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return sendAuthError(res, "Invalid credentials");
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate token
  const token = generateToken(user);

  // Remove password from response
  user.password = undefined;

  return sendSuccess(res, 200, "Login successful", {
    token,
    user,
  });
});
// Google OAuth login
export const googleAuth = asyncHandler(async (req, res) => {
  console.log("🔵 Google Auth endpoint called");
  console.log("📤 Request body:", req.body);

  const { credential } = req.body;

  if (!credential) {
    console.log("❌ No credential provided");
    return sendValidationError(res, "Google credential is required");
  }

  console.log("✅ Credential received, length:", credential.length);

  try {
    console.log("🔍 Verifying Google credential...");

    // Import Google Auth Library
    const { OAuth2Client } = await import("google-auth-library");

    // Create OAuth2 client
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    console.log(
      "🔑 Using Google Client ID:",
      process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + "..."
    );

    // Verify the credential
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    console.log("✅ Google credential verified successfully");

    const payload = ticket.getPayload();
    const {
      sub: googleId,
      email,
      given_name: firstName,
      family_name: lastName,
      picture: avatar,
    } = payload;

    console.log("👤 Google user data:", {
      googleId,
      email,
      firstName,
      lastName,
    });

    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId }).populate("serviceCenterId");
    console.log("🔍 Existing user with Google ID:", !!user);

    if (user) {
      console.log("✅ Existing Google user found, logging in...");
      // User exists, update last login and return token
      user.lastLogin = new Date();
      if (avatar && !user.avatar) {
        user.avatar = avatar; // Update avatar if not set
      }
      await user.save();

      const token = generateToken(user);
      user.password = undefined;

      console.log("✅ Login successful for existing user");
      return sendSuccess(res, 200, "Google login successful", {
        token,
        user,
      });
    }

    // Check if user exists with same email (any auth provider)
    const existingUser = await User.findOne({ email });
    console.log("🔍 Existing user with email:", !!existingUser);

    if (existingUser) {
      console.log("📝 Linking Google account to existing user...");
      if (existingUser.authProvider === "local") {
        // Offer to link Google account to existing local account
        existingUser.googleId = googleId;
        existingUser.authProvider = "google"; // Convert to Google auth
        existingUser.lastLogin = new Date();
        if (avatar && !existingUser.avatar) {
          existingUser.avatar = avatar;
        }
        await existingUser.save();

        const token = generateToken(existingUser);
        existingUser.password = undefined;

        console.log("✅ Account linking successful");
        return sendSuccess(
          res,
          200,
          "Google account linked successfully to existing account",
          {
            token,
            user: existingUser,
            isLinked: true,
          }
        );
      } else {
        console.log("❌ User already has Google auth");
        // User already has Google auth
        return sendConflictError(
          res,
          "An account with this email already exists with Google authentication."
        );
      }
    }

    console.log("📝 Creating new Google user...");

    // Create new user with Google OAuth
    user = await User.create({
      googleId,
      email,
      firstName,
      lastName,
      authProvider: "google",
      role: "customer", // Default role for Google OAuth users
      avatar: avatar || "",
      isEmailVerified: true, // Google emails are pre-verified
      lastLogin: new Date(),
    });

    console.log("✅ New user created:", user.email);

    // Populate serviceCenterId if needed
    await user.populate("serviceCenterId");

    // Generate token
    const token = generateToken(user);
    user.password = undefined;

    console.log("✅ New user authentication successful");
    return sendSuccess(
      res,
      201,
      "Google account created and logged in successfully",
      {
        token,
        user,
        isNewUser: true,
      }
    );
  } catch (error) {
    console.error("❌ Google OAuth Error:", error);
    console.error("❌ Error stack:", error.stack);
    return sendError(
      res,
      400,
      "Invalid Google credential or authentication failed"
    );
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate("serviceCenterId");

  return sendSuccess(res, 200, "User profile retrieved successfully", { user });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phone: req.body.phone,
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(
    (key) => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  }).populate("serviceCenterId");

  return sendSuccess(res, 200, "Profile updated successfully", { user });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return sendValidationError(res, {
      currentPassword: !currentPassword
        ? "Current password is required"
        : undefined,
      newPassword: !newPassword ? "New password is required" : undefined,
    });
  }

  // Get user with password
  const user = await User.findById(req.user.id).select("+password");

  // Check current password
  const isMatch = await user.matchPassword(currentPassword);

  if (!isMatch) {
    return sendAuthError(res, "Current password is incorrect");
  }

  // Validate new password strength
  if (newPassword.length < 6) {
    return sendValidationError(res, {
      newPassword: "New password must be at least 6 characters long",
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return sendSuccess(res, 200, "Password changed successfully");
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return sendValidationError(res, "Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    return sendAuthError(res, "No user found with this email");
  }

  // Generate reset token
  const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour

  await user.save();

  // Create reset URL
  const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password/${resetToken}`;

  try {
    // Import password reset template
    const { generatePasswordResetTemplate } = await import("../utils/email.js");

    const emailTemplate = generatePasswordResetTemplate(
      `${user.firstName} ${user.lastName}`,
      resetUrl
    );

    await sendEmail({
      email: user.email,
      subject: "Password Reset Request - EV Service Center",
      html: emailTemplate,
    });

    return sendSuccess(res, 200, "Password reset email sent successfully", {
      message: "Check your email for password reset instructions",
    });
  } catch (error) {
    console.error("Email send error:", error);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return sendError(
      res,
      500,
      "Could not send password reset email. Please try again."
    );
  }
});

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
        message: "Please provide a new password",
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(resettoken, process.env.JWT_SECRET);

      const user = await User.findOne({
        _id: decoded.id,
        resetPasswordToken: resettoken,
        resetPasswordExpire: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
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
        message: "Password reset successful",
        token,
      });
    } catch (jwtError) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  res.json({
    success: true,
    message: "Logged out successfully",
  });
};

// @desc    Get users (role-based filtering)
// @route   GET /api/auth/users
// @access  Private (Staff/Admin)
export const getUsers = async (req, res) => {
  try {
    const { role, search, isActive, page = 1, limit = 10 } = req.query;

    // Check if user has permission
    if (!["staff", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access user data",
      });
    }

    let filter = {};

    // Role filtering
    if (role) {
      filter.role = role;
    }

    // Status filtering
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Search filtering
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select("-password -resetPasswordToken -resetPasswordExpire")
      .populate("serviceCenterId", "name code")
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
      data: users,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
    });
  }
};

// @desc    Update user (Admin only)
// @route   PUT /api/auth/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res) => {
  try {
    // Check if user has permission
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update user data",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      role: req.body.role,
      isActive: req.body.isActive,
      serviceCenterId: req.body.serviceCenterId,
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(
      (key) => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("serviceCenterId", "name code")
      .select("-password");

    res.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
