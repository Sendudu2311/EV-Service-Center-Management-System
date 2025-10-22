// Email templates for payment and appointment notifications

/**
 * Generate payment success email template
 */
export const generatePaymentSuccessTemplate = (paymentData, userData) => {
  const { amount, transactionRef, paymentDate, vnpayTransaction } = paymentData;
  const { firstName, lastName, email } = userData;

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Payment Successful - EV Service Center</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-badge { background: #10b981; color: white; font-size: 18px; font-weight: bold; text-align: center; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .payment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .amount { font-size: 24px; font-weight: bold; color: #10b981; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚗 EV Service Center</h1>
                <p>Payment Successful</p>
            </div>
            <div class="content">
                <div class="success-badge">✅ Payment Completed Successfully</div>
                
                <h2>Hello ${firstName} ${lastName}!</h2>
                <p>Your payment has been processed successfully. Thank you for choosing EV Service Center!</p>
                
                <div class="payment-details">
                    <h3>Payment Details</h3>
                    <p><strong>Amount:</strong> <span class="amount">${amount.toLocaleString(
                      "vi-VN"
                    )} VND</span></p>
                    <p><strong>Transaction Reference:</strong> ${transactionRef}</p>
                    <p><strong>Payment Date:</strong> ${new Date(
                      paymentDate
                    ).toLocaleString("vi-VN")}</p>
                    ${
                      vnpayTransaction
                        ? `
                        <p><strong>VNPay Transaction:</strong> ${vnpayTransaction.transactionNo}</p>
                        <p><strong>Bank Code:</strong> ${vnpayTransaction.bankCode}</p>
                    `
                        : ""
                    }
                </div>
                
                <p><strong>What's next?</strong></p>
                <ul>
                    <li>Your appointment will be confirmed shortly</li>
                    <li>You will receive an appointment confirmation email</li>
                    <li>Please arrive on time for your scheduled service</li>
                </ul>
                
                <div style="text-align: center;">
                    <a href="${
                      process.env.CLIENT_URL
                    }/appointments" class="button">View My Appointments</a>
                </div>
                
                <p>If you have any questions, feel free to contact our support team.</p>
                
                <p>Best regards,<br>EV Service Center Team</p>
            </div>
            <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

/**
 * Generate appointment confirmation email template
 */
export const generateAppointmentConfirmationTemplate = (
  appointmentData,
  userData
) => {
  const {
    appointmentNumber,
    scheduledDate,
    scheduledTime,
    services,
    serviceCenter,
  } = appointmentData;
  const { firstName, lastName } = userData;

  // Safely handle services array
  const servicesList =
    (services || [])
      .map((service) => {
        const serviceName =
          service.serviceName || service.name || "Unknown Service";
        const duration = service.estimatedDuration || service.duration || 30;
        return `<li>${serviceName} - ${duration} minutes</li>`;
      })
      .join("") || "<li>No services specified</li>";

  // Safely handle service center data
  const centerName = serviceCenter?.name || "EV Service Center";

  // Format address properly
  let centerAddress = "Address not available";
  if (serviceCenter?.address) {
    if (typeof serviceCenter.address === "string") {
      centerAddress = serviceCenter.address;
    } else if (typeof serviceCenter.address === "object") {
      // Build address from object parts
      const parts = [];
      if (serviceCenter.address.street)
        parts.push(serviceCenter.address.street);
      if (serviceCenter.address.city) parts.push(serviceCenter.address.city);
      if (serviceCenter.address.state) parts.push(serviceCenter.address.state);
      if (serviceCenter.address.zipCode)
        parts.push(serviceCenter.address.zipCode);
      if (serviceCenter.address.country)
        parts.push(serviceCenter.address.country);
      centerAddress = parts.filter((p) => p).join(", ");
    }
  }

  const centerPhone = serviceCenter?.phone || "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Appointment Confirmed</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#3b82f6,#10b981);color:#fff;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.badge{background:#3b82f6;color:#fff;font-size:18px;font-weight:700;text-align:center;padding:15px;border-radius:8px;margin:20px 0}.details{background:#fff;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #3b82f6}.center{background:#f3f4f6;padding:15px;border-radius:6px;margin:10px 0}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:20px}.btn{display:inline-block;background:#10b981;color:#fff;padding:12px 30px;text-decoration:none;border-radius:6px;font-weight:700;margin:20px 0}ul{margin:10px 0;padding-left:20px}li{margin:5px 0}</style></head><body><div class="container"><div class="header"><h1>🚗 EV Service Center</h1><p>Appointment Confirmed</p></div><div class="content"><div class="badge">📅 Appointment Confirmed</div><h2>Hello ${firstName} ${lastName}!</h2><p>Your appointment has been confirmed. We look forward to serving you!</p><div class="details"><h3>Appointment Details</h3><p><strong>Number:</strong> ${
    appointmentNumber || "N/A"
  }</p><p><strong>Date:</strong> ${
    scheduledDate
      ? new Date(scheduledDate).toLocaleDateString("vi-VN")
      : "Not specified"
  }</p><p><strong>Time:</strong> ${
    scheduledTime || "Not specified"
  }</p><div class="center"><h4>Service Center</h4><p><strong>Name:</strong> ${centerName}</p><p><strong>Address:</strong> ${centerAddress}</p>${
    centerPhone ? `<p><strong>Phone:</strong> ${centerPhone}</p>` : ""
  }</div><h4>Services Booked</h4><ul>${servicesList}</ul></div><p><strong>Important Reminders:</strong></p><ul><li>Please arrive 15 minutes before your scheduled time</li><li>Bring your vehicle registration and ID</li><li>Remove personal items from your vehicle</li><li>We will send you a reminder 24 hours before your appointment</li></ul><div style="text-align:center"><a href="${
    process.env.CLIENT_URL
  }/appointments" class="btn">View Appointment Details</a></div><p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p><p>Best regards,<br>EV Service Center Team</p></div><div class="footer"><p>This is an automated email. Please do not reply to this message.</p></div></div></body></html>`;
};

/**
 * Generate payment receipt email template
 * Note: This template is used for invoice payments, not booking appointments
 * Booking appointments only send confirmation emails, not receipts
 */
export const generatePaymentReceiptTemplate = (paymentData, userData) => {
  const { amount, transactionRef, paymentDate, vnpayTransaction, services } =
    paymentData;
  const { firstName, lastName } = userData;

  // DEBUG: Log the data being processed
  console.log("📧 [Receipt Template] Payment data:", {
    amount,
    transactionRef,
    paymentDate,
    servicesCount: services?.length,
    services: services?.map((s) => ({
      serviceName: s.serviceName,
      quantity: s.quantity,
      basePrice: s.basePrice,
      serviceId: s.serviceId,
    })),
  });

  // Handle service data with proper details
  const servicesList = services
    .map((service) => {
      const serviceName = service.serviceName || "Unknown Service";
      const quantity = service.quantity || 1;
      const basePrice = service.basePrice || 0;
      const totalPrice = basePrice * quantity;

      return `<tr>
        <td>${serviceName}</td>
        <td>${quantity}</td>
        <td>${basePrice.toLocaleString("vi-VN")} VND</td>
        <td>${totalPrice.toLocaleString("vi-VN")} VND</td>
      </tr>`;
    })
    .join("");

  // Calculate total amount safely
  const totalAmount = services.reduce((sum, service) => {
    const quantity = service.quantity || 1;
    const basePrice = service.basePrice || 0;
    return sum + basePrice * quantity;
  }, 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Payment Receipt - EV Service Center</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .receipt { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .receipt-header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px; }
            .receipt-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .receipt-table th, .receipt-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            .receipt-table th { background: #f3f4f6; font-weight: bold; }
            .total-row { background: #f3f4f6; font-weight: bold; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚗 EV Service Center</h1>
                <p>Payment Receipt</p>
            </div>
            <div class="content">
                <div class="receipt">
                    <div class="receipt-header">
                        <h2>Payment Receipt</h2>
                        <p><strong>Receipt #:</strong> ${transactionRef}</p>
                        <p><strong>Date:</strong> ${new Date(
                          paymentDate
                        ).toLocaleString("vi-VN")}</p>
                    </div>
                    
                    <h3>Customer Information</h3>
                    <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                    
                    <h3>Services</h3>
                    <table class="receipt-table">
                        <thead>
                            <tr>
                                <th>Service</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${servicesList}
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <td colspan="3"><strong>Total Amount</strong></td>
                                <td><strong>${amount.toLocaleString(
                                  "vi-VN"
                                )} VND</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <h3>Payment Information</h3>
                    <p><strong>Payment Method:</strong> VNPay</p>
                    <p><strong>Transaction Reference:</strong> ${transactionRef}</p>
                    ${
                      vnpayTransaction
                        ? `
                        <p><strong>VNPay Transaction:</strong> ${vnpayTransaction.transactionNo}</p>
                        <p><strong>Bank Code:</strong> ${vnpayTransaction.bankCode}</p>
                    `
                        : ""
                    }
                </div>
                
                <p>Thank you for your payment. This receipt confirms your transaction with EV Service Center.</p>
                
                <p>Best regards,<br>EV Service Center Team</p>
            </div>
            <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

/**
 * Generate refund notification email template
 */
export const generateRefundNotificationTemplate = (
  refundData,
  userData,
  appointmentData
) => {
  const {
    refundAmount,
    refundPercentage,
    refundTransactionRef,
    refundDate,
    refundReason,
  } = refundData;
  const { firstName, lastName } = userData;
  const { appointmentNumber, scheduledDate, scheduledTime } = appointmentData;

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Refund Processed - EV Service Center</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .refund-badge { background: #10b981; color: white; font-size: 18px; font-weight: bold; text-align: center; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .refund-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .amount { font-size: 24px; font-weight: bold; color: #10b981; }
            .appointment-info { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .highlight { background: #fef3c7; padding: 10px; border-radius: 6px; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚗 EV Service Center</h1>
                <p>Refund Processed Successfully</p>
            </div>
            <div class="content">
                <div class="refund-badge">💰 Refund Processed Successfully</div>
                
                <h2>Hello ${firstName} ${lastName}!</h2>
                <p>Your refund has been processed successfully for your cancelled appointment. The refund amount will be credited back to your original payment method.</p>
                
                <div class="refund-details">
                    <h3>Refund Details</h3>
                    <p><strong>Refund Amount:</strong> <span class="amount">${refundAmount.toLocaleString(
                      "vi-VN"
                    )} VND</span></p>
                    <p><strong>Refund Percentage:</strong> ${refundPercentage}%</p>
                    <p><strong>Transaction Reference:</strong> ${refundTransactionRef}</p>
                    <p><strong>Processed Date:</strong> ${new Date(
                      refundDate
                    ).toLocaleString("vi-VN")}</p>
                    <p><strong>Reason:</strong> ${refundReason}</p>
                </div>
                
                <div class="appointment-info">
                    <h4>Cancelled Appointment Details</h4>
                    <p><strong>Appointment Number:</strong> ${appointmentNumber}</p>
                    <p><strong>Original Date:</strong> ${new Date(
                      scheduledDate
                    ).toLocaleDateString("vi-VN")}</p>
                    <p><strong>Original Time:</strong> ${scheduledTime}</p>
                </div>
                
                <div class="highlight">
                    <p><strong>⏰ Processing Time:</strong> Refunds typically take 3-5 business days to appear in your account, depending on your bank's processing time.</p>
                </div>
                
                <p><strong>What's next?</strong></p>
                <ul>
                    <li>You will receive the refund amount in your original payment method</li>
                    <li>Check your bank statement for the refund transaction</li>
                    <li>Contact us if you don't see the refund within 5 business days</li>
                </ul>
                
                <div style="text-align: center;">
                    <a href="${
                      process.env.CLIENT_URL
                    }/appointments" class="button">View My Appointments</a>
                </div>
                
                <p>If you have any questions about this refund or need to book a new appointment, please don't hesitate to contact our support team.</p>
                
                <p>We apologize for any inconvenience and hope to serve you again in the future.</p>
                
                <p>Best regards,<br>EV Service Center Team</p>
            </div>
            <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
                <p>For support, contact us at support@evservicecenter.com</p>
            </div>
        </div>
    </body>
    </html>
  `;
};
