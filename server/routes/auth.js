import express from "express";
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  getUsers,
  getUserById,
  updateUser,
  verifyEmail,
  resendOTP,
  googleAuth,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google-auth", googleAuth);
router.post("/logout", logout);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendOTP);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:resettoken", resetPassword);

// Protected routes
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

// User management routes (all authenticated users)
router.get("/users", protect, getUsers);
router.get("/users/:id", protect, getUserById);
router.put("/users/:id", protect, updateUser);

export default router;
