import { sendEmail } from "./email.js";
import {
  generatePaymentSuccessTemplate,
  generateAppointmentConfirmationTemplate,
  generatePaymentReceiptTemplate,
} from "./emailTemplates.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import {
  logPaymentSuccess,
  logEmailSent,
  logNotificationSent,
  logError,
} from "./paymentAudit.js";

// Socket instance for real-time notifications
let socketInstance = null;

export const setSocketInstance = (io) => {
  socketInstance = io;
};

export const getSocketInstance = () => socketInstance;

/**
 * Send payment success notification to customer
 */
export const sendPaymentSuccessNotification = async (paymentData, userData) => {
  try {
    const emailOptions = {
      email: userData.email,
      subject: "Payment Successful - EV Service Center",
      html: generatePaymentSuccessTemplate(paymentData, userData),
    };

    await sendEmail(emailOptions);
    console.log("✅ Payment success email sent to:", userData.email);

    // Log email sent in audit trail
    await logEmailSent({
      transactionRef: paymentData.transactionRef,
      userId: userData._id,
      appointmentId: paymentData.appointmentId,
      amount: paymentData.amount,
      paymentMethod: "vnpay",
      emailType: "payment_success",
      recipientEmail: userData.email,
      metadata: {
        customerInfo: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone,
        },
      },
    });

    return { success: true, message: "Payment success email sent" };
  } catch (error) {
    console.error("❌ Failed to send payment success email:", error);

    // Log error in audit trail
    await logError({
      transactionRef: paymentData.transactionRef,
      userId: userData._id,
      appointmentId: paymentData.appointmentId,
      amount: paymentData.amount,
      paymentMethod: "vnpay",
      errorMessage: error.message,
      errorCode: "EMAIL_SEND_FAILED",
      metadata: {
        customerInfo: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
        },
      },
    });

    return { success: false, error: error.message };
  }
};

/**
 * Send appointment confirmation notification
 */
export const sendAppointmentConfirmation = async (
  appointmentData,
  userData
) => {
  try {
    // Single center architecture - use default service center data
    let serviceCenter = appointmentData.serviceCenter;

    // Provide default service center data if not found
    if (!serviceCenter) {
      serviceCenter = {
        name: "EV Service Center",
        address: "123 Main Street, Ho Chi Minh City",
      };
    }

    const emailHTML = generateAppointmentConfirmationTemplate(
      {
        ...appointmentData,
        serviceCenter,
      },
      userData
    );

    const emailOptions = {
      email: userData.email,
      subject: "Appointment Confirmed - EV Service Center",
      html: emailHTML,
    };

    await sendEmail(emailOptions);
    console.log("✅ Appointment confirmation email sent to:", userData.email);
    return { success: true, message: "Appointment confirmation email sent" };
  } catch (error) {
    console.error("❌ Failed to send appointment confirmation email:", error);
    console.error("❌ Error stack:", error.stack);
    return { success: false, error: error.message };
  }
};

/**
 * Send payment receipt to customer
 * Note: This is used for invoice payments, not booking appointments
 * Booking appointments only send confirmation emails
 */
export const sendPaymentReceipt = async (paymentData, userData) => {
  try {
    const emailOptions = {
      email: userData.email,
      subject: "Payment Receipt - EV Service Center",
      html: generatePaymentReceiptTemplate(paymentData, userData),
    };

    await sendEmail(emailOptions);
    console.log("✅ Payment receipt email sent to:", userData.email);
    return { success: true, message: "Payment receipt email sent" };
  } catch (error) {
    console.error("❌ Failed to send payment receipt email:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to service center staff about new paid appointment
 */
export const notifyServiceCenterStaff = async (appointmentData) => {
  try {
    // Single center architecture - use default service center data
    const serviceCenter = {
      name: "EV Service Center",
      address: {
        street: "123 Main Street",
        city: "Ho Chi Minh City",
        state: "Ho Chi Minh",
        zipCode: "700000",
        country: "Vietnam",
      },
      contact: {
        phone: "+84 28 1234 5678",
        email: "info@evservicecenter.com",
      },
    };

    // For now, send to a default admin email or skip staff notifications
    // In a real system, you would have staff emails configured
    const adminEmail = process.env.ADMIN_EMAIL || "admin@evservicecenter.com";

    const emailOptions = {
      email: adminEmail,
      subject: "New Paid Appointment - EV Service Center",
      html: generateStaffNotificationTemplate(appointmentData, serviceCenter),
    };

    await sendEmail(emailOptions);
    console.log("✅ Staff notification sent to admin");
    return { success: true, message: "Staff notification sent" };
  } catch (error) {
    console.error("❌ Failed to send staff notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate staff notification email template
 */
const generateStaffNotificationTemplate = (appointmentData, serviceCenter) => {
  const {
    appointmentNumber,
    customerName,
    scheduledDate,
    scheduledTime,
    amount,
  } = appointmentData;

  // Safely format the amount
  const formattedAmount = amount ? amount.toLocaleString("vi-VN") : "N/A";
  const formattedDate = scheduledDate
    ? new Date(scheduledDate).toLocaleDateString("vi-VN")
    : "N/A";

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>New Paid Appointment - EV Service Center</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6, #10b981); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .notification-badge { background: #3b82f6; color: white; font-size: 18px; font-weight: bold; text-align: center; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚗 EV Service Center</h1>
                <p>New Paid Appointment</p>
            </div>
            <div class="content">
                <div class="notification-badge">📅 New Appointment Received</div>
                
                <h2>New Paid Appointment</h2>
                <p>A customer has made a payment and booked an appointment at your service center.</p>
                
                <div class="appointment-details">
                    <h3>Appointment Details</h3>
                    <p><strong>Appointment Number:</strong> ${
                      appointmentNumber || "N/A"
                    }</p>
                    <p><strong>Customer:</strong> ${customerName || "N/A"}</p>
                    <p><strong>Date:</strong> ${formattedDate}</p>
                    <p><strong>Time:</strong> ${scheduledTime || "N/A"}</p>
                    <p><strong>Amount Paid:</strong> ${formattedAmount} VND</p>
                </div>
                
                <p>Please prepare for this appointment and ensure all necessary resources are available.</p>
                
                <p>Best regards,<br>EV Service Center System</p>
            </div>
            <div class="footer">
                <p>This is an automated notification. Please do not reply to this message.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

/**
 * Send real-time socket notification for payment success
 */
export const sendPaymentSuccessSocketNotification = async (
  paymentData,
  appointmentData,
  userData
) => {
  try {
    const io = getSocketInstance();
    if (!io) {
      console.log("Socket instance not available for payment notifications");
      return { success: false, message: "Socket instance not available" };
    }

    // Notify the customer
    io.to(`user_${userData._id}`).emit("payment_success", {
      type: "payment_success",
      transactionRef: paymentData.transactionRef,
      amount: paymentData.amount,
      paymentDate: paymentData.paymentDate,
      appointmentNumber: appointmentData.appointmentNumber,
      message: `Payment of ${paymentData.amount.toLocaleString(
        "vi-VN"
      )} VND successful!`,
      timestamp: new Date(),
    });

    // Notify service center staff about new paid appointment (single center)
    io.to("service_center_staff").emit("new_paid_appointment", {
      type: "new_paid_appointment",
      appointmentNumber: appointmentData.appointmentNumber,
      customerName: appointmentData.customerName,
      amount: paymentData.amount,
      scheduledDate: appointmentData.scheduledDate,
      scheduledTime: appointmentData.scheduledTime,
      message: `New paid appointment from ${appointmentData.customerName}`,
      timestamp: new Date(),
    });

    // Log socket notification sent in audit trail
    await logNotificationSent({
      transactionRef: paymentData.transactionRef,
      userId: userData._id,
      appointmentId: appointmentData.appointmentId,
      amount: paymentData.amount,
      paymentMethod: "vnpay",
      notificationType: "payment_success",
      recipientId: userData._id,
      channel: "socket",
      metadata: {
        customerInfo: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
        },
      },
    });

    console.log("✅ Payment success socket notifications sent");
    return { success: true, message: "Socket notifications sent" };
  } catch (error) {
    console.error(
      "❌ Failed to send payment success socket notifications:",
      error
    );

    // Log error in audit trail
    await logError({
      transactionRef: paymentData.transactionRef,
      userId: userData._id,
      appointmentId: appointmentData.appointmentId,
      amount: paymentData.amount,
      paymentMethod: "vnpay",
      errorMessage: error.message,
      errorCode: "SOCKET_NOTIFICATION_FAILED",
      metadata: {
        customerInfo: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
        },
      },
    });

    return { success: false, error: error.message };
  }
};

/**
 * Comprehensive payment success workflow
 */
export const executePaymentSuccessWorkflow = async (
  paymentData,
  appointmentData,
  userData
) => {
  const results = {
    paymentSuccess: null,
    appointmentConfirmation: null,
    paymentReceipt: null,
    staffNotification: null,
    socketNotification: null,
  };

  try {
    // 0. Log payment success in audit trail
    await logPaymentSuccess({
      transactionRef: paymentData.transactionRef,
      userId: userData._id,
      appointmentId: appointmentData.appointmentId,
      amount: paymentData.amount,
      paymentMethod: "vnpay",
      vnpayTransaction: paymentData.vnpayTransaction,
      metadata: {
        customerInfo: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone,
        },
        services: paymentData.services || [],
      },
    });

    // 1. Send payment success notification
    results.paymentSuccess = await sendPaymentSuccessNotification(
      paymentData,
      userData
    );

    // 2. Send appointment confirmation
    results.appointmentConfirmation = await sendAppointmentConfirmation(
      appointmentData,
      userData
    );

    // 3. Send payment receipt (skip for booking appointments and deposits, keep for invoice payments)
    if (
      paymentData.paymentType !== "appointment" &&
      paymentData.paymentType !== "deposit"
    ) {
      results.paymentReceipt = await sendPaymentReceipt(paymentData, userData);
    } else {
      results.paymentReceipt = {
        success: true,
        message: `Receipt skipped for ${paymentData.paymentType}`,
      };
    }

    // 4. Notify service center staff (single center architecture)
    results.staffNotification = await notifyServiceCenterStaff(appointmentData);

    // 5. Send real-time socket notifications
    results.socketNotification = await sendPaymentSuccessSocketNotification(
      paymentData,
      appointmentData,
      userData
    );

    console.log("✅ Payment success workflow completed:", results);
    return { success: true, results };
  } catch (error) {
    console.error("❌ Payment success workflow failed:", error);

    // Log workflow error in audit trail
    await logError({
      transactionRef: paymentData.transactionRef,
      userId: userData._id,
      appointmentId: appointmentData.appointmentId,
      amount: paymentData.amount,
      paymentMethod: "vnpay",
      errorMessage: error.message,
      errorCode: "WORKFLOW_FAILED",
      metadata: {
        customerInfo: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
        },
      },
    });

    return { success: false, error: error.message, results };
  }
};
