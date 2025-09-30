// MongoDB Migration for Email Verification Fields
// Run this file to add new fields to existing User documents

import mongoose from "mongoose";
import { config } from "dotenv";

// Load environment variables
config();

const migrationScript = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for migration...");

    // Update all existing users to add the new email verification fields
    const result = await mongoose.connection.db.collection("users").updateMany(
      {}, // Empty filter to match all documents
      {
        $set: {
          isEmailVerified: true, // Existing users are considered verified
          emailVerificationToken: null,
          emailVerificationExpire: null,
        },
      }
    );

    console.log(
      `Migration completed! Updated ${result.modifiedCount} user documents.`
    );

    // Close connection
    await mongoose.disconnect();
    console.log("Migration finished successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

// Run migration
migrationScript();
