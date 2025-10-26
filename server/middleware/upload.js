import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "ev-service/parts",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 800, height: 600, crop: "fill" },
      { quality: "auto", fetch_format: "auto" },
    ],
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Multer configuration
export const uploadImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024, // 10MB
  },
});

// Excel file upload configuration
const excelStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/excel/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

export const uploadExcel = multer({
  storage: excelStorage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files are allowed!"), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for Excel files
  },
});

// Payment proof images upload configuration
const paymentProofStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "ev-service/payment-proofs",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
    transformation: [
      { width: 1200, height: 800, crop: "fill" },
      { quality: "auto", fetch_format: "auto" },
    ],
  },
});

export const uploadPaymentProof = multer({
  storage: paymentProofStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for payment proof images
  },
});
