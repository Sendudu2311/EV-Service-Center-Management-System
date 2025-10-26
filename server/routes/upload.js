import express from "express";
import { uploadImage } from "../middleware/upload.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   POST /api/upload/image
// @desc    Upload image to Cloudinary
// @access  Private
router.post("/image", uploadImage.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    res.json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl: req.file.path,
      publicId: req.file.filename,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading image",
      error: error.message,
    });
  }
});

export default router;
