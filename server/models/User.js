import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([-.]?\w+)*@\w+([-.]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId; // Password not required for Google OAuth users
      },
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: function () {
        return !this.googleId; // Phone not required for Google OAuth users initially
      },
    },
    role: {
      type: String,
      enum: ["customer", "staff", "technician", "admin"],
      default: "customer",
    },
    avatar: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,

    // Google OAuth fields
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness for non-null values
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    serviceCenterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCenter",
      required: function () {
        return ["staff", "technician", "admin"].includes(this.role);
      },
    },
    specializations: [
      {
        type: String,
        enum: ["battery", "motor", "charging", "electronics", "general"],
      },
    ],
    certifications: [
      {
        name: String,
        issuer: String,
        issueDate: Date,
        expiryDate: Date,
        certificateUrl: String,
      },
    ],
    lastLogin: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Skip password hashing for Google OAuth users or if password is not modified
  if (!this.isModified("password") || !this.password) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Get full name virtual
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes for performance optimization (email already has unique index from schema)
userSchema.index({ role: 1, serviceCenterId: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ resetPasswordToken: 1 });

export default mongoose.model("User", userSchema);
