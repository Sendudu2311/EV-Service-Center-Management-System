/**
 * Migration script to add deposit booking fields to existing appointments
 * Run this script to update existing appointments with new deposit booking fields
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const migrateToDepositBooking = async () => {
  try {
    console.log("🔄 Starting migration: Adding deposit booking fields...");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const Appointment = mongoose.model("Appointment");

    // Update all appointments to add new fields
    const result = await Appointment.updateMany(
      {},
      {
        $set: {
          bookingType: "full_service", // Existing appointments are full service
          "depositInfo.amount": 200000,
          "depositInfo.paid": true, // Assume existing appointments paid
          "depositInfo.paidAt": new Date(),
        },
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} appointments`);

    // Show some statistics
    const totalAppointments = await Appointment.countDocuments();
    const depositBookings = await Appointment.countDocuments({
      bookingType: "deposit_booking",
    });
    const fullServiceBookings = await Appointment.countDocuments({
      bookingType: "full_service",
    });

    console.log(`📈 Total appointments: ${totalAppointments}`);
    console.log(`📈 Deposit bookings: ${depositBookings}`);
    console.log(`📈 Full service bookings: ${fullServiceBookings}`);

    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
};

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToDepositBooking()
    .then(() => {
      console.log("🎉 Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration failed:", error);
      process.exit(1);
    });
}

export default migrateToDepositBooking;
