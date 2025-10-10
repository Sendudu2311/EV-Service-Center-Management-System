import Appointment from "../models/Appointment.js";

// Dynamic import to avoid circular dependency
let io = null;
const getSocketInstance = async () => {
  if (!io) {
    try {
      const serverModule = await import("../server.js");
      io = serverModule.io;
    } catch (error) {
      console.warn("Socket.io instance not available for notifications");
    }
  }
  return io;
};

/**
 * Check for appointments that should be marked as no-show
 * Runs every 10 minutes to check overdue appointments
 */
export const checkNoShowAppointments = async () => {
  try {
    const now = new Date();
    const gracePeridMinutes = 30; // 30 minutes grace period after scheduled time
    const cutoffTime = new Date(now.getTime() - gracePeridMinutes * 60 * 1000);

    console.log(
      `[${now.toISOString()}] Checking for no-show appointments before ${cutoffTime.toISOString()}`
    );

    // Find appointments that are overdue and should be marked as no-show
    const overdueAppointments = await Appointment.find({
      status: { $in: ["confirmed", "pending"] }, // Only confirmed/pending appointments
      scheduledDate: { $lt: cutoffTime }, // Scheduled time + grace period has passed
      $or: [
        { "customerArrival.arrivedAt": { $exists: false } }, // Customer never arrived
        { "customerArrival.arrivedAt": null },
      ],
    })
      .populate("customerId", "firstName lastName email phone")
      // serviceCenterId populate removed - single center architecture
      .populate("assignedTechnician", "firstName lastName");

    console.log(
      `Found ${overdueAppointments.length} overdue appointments to mark as no-show`
    );

    const results = [];

    for (const appointment of overdueAppointments) {
      try {
        // Update appointment status to no_show
        await appointment.updateStatus(
          "no_show",
          null, // System action, no user
          "system",
          "automatic_no_show",
          `Customer did not arrive within ${gracePeridMinutes} minutes of scheduled time`
        );

        console.log(
          `✅ Appointment ${appointment.appointmentNumber} marked as no-show`
        );

        // Emit real-time notification
        const socketInstance = await getSocketInstance();
        if (socketInstance) {
          const notificationData = {
            appointmentId: appointment._id,
            appointmentNumber: appointment.appointmentNumber,
            customerId: appointment.customerId._id,
            customerName: `${appointment.customerId.firstName} ${appointment.customerId.lastName}`,
            serviceCenterName: appointment.serviceCenterId.name,
            scheduledDate: appointment.scheduledDate,
            scheduledTime: appointment.scheduledTime,
            newStatus: "no_show",
            previousStatus: appointment.status,
            reason: "Customer did not arrive",
            timestamp: new Date(),
          };

          // Notify service center staff
          socketInstance
            .to(`service_center_${appointment.serviceCenterId._id}`)
            .emit("appointment_status_updated", notificationData);

          // Notify assigned technician if any
          if (appointment.assignedTechnician) {
            socketInstance
              .to(`user_${appointment.assignedTechnician._id}`)
              .emit("appointment_no_show", {
                ...notificationData,
                technicianId: appointment.assignedTechnician._id,
                message: `Appointment ${appointment.appointmentNumber} marked as no-show - customer did not arrive`,
              });
          }

          // Log for dashboard updates
          socketInstance.emit("dashboard_update", {
            type: "appointment_no_show",
            appointmentId: appointment._id,
            serviceCenterId: appointment.serviceCenterId._id,
          });
        }

        results.push({
          appointmentId: appointment._id,
          appointmentNumber: appointment.appointmentNumber,
          customer: `${appointment.customerId.firstName} ${appointment.customerId.lastName}`,
          scheduledDate: appointment.scheduledDate,
          action: "marked_no_show",
          success: true,
        });
      } catch (error) {
        console.error(
          `❌ Failed to mark appointment ${appointment.appointmentNumber} as no-show:`,
          error.message
        );
        results.push({
          appointmentId: appointment._id,
          appointmentNumber: appointment.appointmentNumber,
          action: "mark_no_show_failed",
          error: error.message,
          success: false,
        });
      }
    }

    if (results.length > 0) {
      console.log(
        `✅ No-show check completed. Processed ${results.length} appointments:`,
        results.map((r) => `${r.appointmentNumber}: ${r.action}`).join(", ")
      );
    }

    return {
      success: true,
      processed: results.length,
      results,
    };
  } catch (error) {
    console.error("❌ Error in checkNoShowAppointments:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check for confirmed appointments approaching their scheduled time
 * Send reminders to customers and staff
 */
export const checkUpcomingAppointments = async () => {
  try {
    const now = new Date();
    const reminderWindow = 60; // 1 hour before appointment
    const reminderTime = new Date(now.getTime() + reminderWindow * 60 * 1000);

    console.log(
      `[${now.toISOString()}] Checking for upcoming appointments at ${reminderTime.toISOString()}`
    );

    // Find appointments scheduled within the next hour that need reminders
    const upcomingAppointments = await Appointment.find({
      status: "confirmed",
      scheduledDate: {
        $gte: now,
        $lte: reminderTime,
      },
      remindersSent: { $lt: 2 }, // Maximum 2 reminders per appointment
      $or: [
        { lastReminderSent: { $exists: false } }, // Never sent reminder
        {
          lastReminderSent: {
            $lt: new Date(now.getTime() - 30 * 60 * 1000), // Last reminder > 30 min ago
          },
        },
      ],
    })
      .populate("customerId", "firstName lastName email phone")
      // serviceCenterId populate removed - single center architecture
      .populate("assignedTechnician", "firstName lastName");

    console.log(
      `Found ${upcomingAppointments.length} upcoming appointments for reminders`
    );

    const results = [];

    for (const appointment of upcomingAppointments) {
      try {
        // Update reminder count and timestamp
        appointment.remindersSent = (appointment.remindersSent || 0) + 1;
        appointment.lastReminderSent = now;
        await appointment.save();

        // Emit real-time reminder notification
        const socketInstance = await getSocketInstance();
        if (socketInstance) {
          const reminderData = {
            appointmentId: appointment._id,
            appointmentNumber: appointment.appointmentNumber,
            customerId: appointment.customerId._id,
            customerName: `${appointment.customerId.firstName} ${appointment.customerId.lastName}`,
            serviceCenterName: appointment.serviceCenterId.name,
            scheduledDate: appointment.scheduledDate,
            scheduledTime: appointment.scheduledTime,
            minutesUntil: Math.round(
              (appointment.scheduledDate - now) / (1000 * 60)
            ),
            reminderCount: appointment.remindersSent,
            timestamp: now,
          };

          // Send reminder to customer
          socketInstance
            .to(`user_${appointment.customerId._id}`)
            .emit("appointment_reminder", {
              ...reminderData,
              message: `Reminder: Your appointment is in ${reminderData.minutesUntil} minutes`,
              type: "customer_reminder",
            });

          // Send notification to service center staff
          socketInstance
            .to(`service_center_${appointment.serviceCenterId._id}`)
            .emit("upcoming_appointment", {
              ...reminderData,
              message: `Customer ${reminderData.customerName} has appointment in ${reminderData.minutesUntil} minutes`,
              type: "staff_notification",
            });

          // Notify assigned technician
          if (appointment.assignedTechnician) {
            socketInstance
              .to(`user_${appointment.assignedTechnician._id}`)
              .emit("upcoming_appointment", {
                ...reminderData,
                technicianId: appointment.assignedTechnician._id,
                message: `Your appointment with ${reminderData.customerName} is in ${reminderData.minutesUntil} minutes`,
                type: "technician_notification",
              });
          }
        }

        console.log(
          `✅ Reminder sent for appointment ${appointment.appointmentNumber} (${appointment.remindersSent}/2)`
        );

        results.push({
          appointmentId: appointment._id,
          appointmentNumber: appointment.appointmentNumber,
          customer: `${appointment.customerId.firstName} ${appointment.customerId.lastName}`,
          scheduledDate: appointment.scheduledDate,
          reminderCount: appointment.remindersSent,
          action: "reminder_sent",
          success: true,
        });
      } catch (error) {
        console.error(
          `❌ Failed to send reminder for appointment ${appointment.appointmentNumber}:`,
          error.message
        );
        results.push({
          appointmentId: appointment._id,
          appointmentNumber: appointment.appointmentNumber,
          action: "reminder_failed",
          error: error.message,
          success: false,
        });
      }
    }

    if (results.length > 0) {
      console.log(
        `✅ Appointment reminders completed. Processed ${results.length} appointments`
      );
    }

    return {
      success: true,
      processed: results.length,
      results,
    };
  } catch (error) {
    console.error("❌ Error in checkUpcomingAppointments:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Start the appointment scheduler
 * Runs checks at regular intervals
 */
export const startAppointmentScheduler = () => {
  console.log("🚀 Starting appointment scheduler...");

  // Check for no-shows every 10 minutes
  const noShowInterval = setInterval(() => {
    checkNoShowAppointments();
  }, 10 * 60 * 1000); // 10 minutes

  // Check for upcoming appointments every 5 minutes
  const reminderInterval = setInterval(() => {
    checkUpcomingAppointments();
  }, 5 * 60 * 1000); // 5 minutes

  // Run initial checks after 30 seconds
  setTimeout(() => {
    console.log("🔍 Running initial appointment checks...");
    checkNoShowAppointments();
    checkUpcomingAppointments();
  }, 30 * 1000);

  console.log("✅ Appointment scheduler started successfully");
  console.log("   • No-show checks: every 10 minutes");
  console.log("   • Appointment reminders: every 5 minutes");
  console.log("   • Grace period for no-show: 30 minutes");

  return {
    noShowInterval,
    reminderInterval,
    stop: () => {
      clearInterval(noShowInterval);
      clearInterval(reminderInterval);
      console.log("🛑 Appointment scheduler stopped");
    },
  };
};

export default {
  checkNoShowAppointments,
  checkUpcomingAppointments,
  startAppointmentScheduler,
};
