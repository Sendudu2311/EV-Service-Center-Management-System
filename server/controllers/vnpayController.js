import { vnpay } from "../config/vnpay.js";
import Invoice from "../models/Invoice.js";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import { executePaymentSuccessWorkflow } from "../utils/paymentNotifications.js";

/**
 * Create VNPay payment URL for appointment booking
 */
export const createPayment = async (req, res, next) => {
  try {
    const { amount, bankCode, language, orderInfo, appointmentData } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    // Generate unique transaction reference
    const transactionRef = `APP${Date.now()}${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // VNPay amount (no multiplication, direct VND amount)
    const vnpayAmount = Math.round(amount);

    // Create payment URL parameters
    const paymentParams = {
      vnp_TxnRef: transactionRef,
      vnp_OrderInfo: orderInfo || `Thanh toan dich vu xe dien ${amount} VND`,
      vnp_OrderType: "other",
      vnp_Amount: vnpayAmount,
      vnp_ReturnUrl: `${
        process.env.SERVER_URL || "http://localhost:3000"
      }/api/vnpay/return`,
      vnp_IpAddr: req.ip || "127.0.0.1",
      vnp_CreateDate: parseInt(
        new Date()
          .toISOString()
          .replace(/[^0-9]/g, "")
          .slice(0, 14)
      ),
      vnp_CurrCode: "VND",
      vnp_Locale: language || "vn",
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
    };

    // Add bank code if provided
    if (bankCode) {
      paymentParams.vnp_BankCode = bankCode;
    }

    // Get user info for billing
    const user = req.user;
    if (user) {
      paymentParams.vnp_Bill_Mobile = user.phone || "";
      paymentParams.vnp_Bill_Email = user.email || "";
    }

    // Create payment URL
    const paymentUrl = vnpay.buildPaymentUrl(paymentParams);

    if (!paymentUrl) {
      throw new Error("Failed to generate payment URL");
    }

    // Store payment reference in temporary storage
    if (!global.pendingPayments) {
      global.pendingPayments = {};
    }

    global.pendingPayments[transactionRef] = {
      amount: amount,
      userId: user._id,
      createdAt: new Date(),
      appointmentData: appointmentData,
      ...paymentParams,
    };

    res.json({
      success: true,
      paymentUrl,
      transactionRef: paymentParams.vnp_TxnRef,
      amount: Math.round(amount),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * VNPay return URL handler - just verify and redirect to frontend
 * NO post-payment notifications here
 */
export const handleReturn = async (req, res, next) => {
  try {
    const vnp_Params = req.query;

    // Verify the return URL
    const verify = vnpay.verifyReturnUrl(vnp_Params);

    if (!verify) {
      console.error("[VNPay] Return URL verification failed");
      const redirectUrl = `${process.env.CLIENT_URL}/payment/result?success=false&error=Invalid payment verification`;
      return res.redirect(redirectUrl);
    }

    const { vnp_TxnRef, vnp_ResponseCode, vnp_TransactionNo, vnp_Amount } =
      vnp_Params;

    // Check if this is an appointment payment
    const pendingPayment = global.pendingPayments?.[vnp_TxnRef];

    if (pendingPayment) {
      // This is an appointment payment
      const success = vnp_ResponseCode === "00";

      // Update pending payment status
      pendingPayment.status = success ? "completed" : "failed";
      pendingPayment.responseCode = vnp_ResponseCode;
      pendingPayment.transactionNo = vnp_TransactionNo;
      pendingPayment.completedAt = new Date();

      if (success) {
        // Store VNPay transaction details
        const paidAmount = parseInt(vnp_Amount);
        pendingPayment.paidAmount = paidAmount;

        pendingPayment.vnpayTransaction = {
          transactionNo: vnp_TransactionNo,
          responseCode: vnp_ResponseCode,
          bankCode: vnp_Params.vnp_BankCode || "",
          cardType: vnp_Params.vnp_CardType || "",
          payDate: vnp_Params.vnp_PayDate || "",
          amount: paidAmount,
        };
      }

      // Redirect to frontend - let user confirm booking there
      const displayAmount = parseInt(vnp_Amount);
      const redirectUrl = `${process.env.CLIENT_URL}/payment/vnpay-return?success=${success}&transactionRef=${vnp_TxnRef}&amount=${displayAmount}`;
      return res.redirect(redirectUrl);
    } else {
      // Handle invoice payment
      const invoice = await Invoice.findOne({
        "paymentInfo.transactionRef": vnp_TxnRef,
      });

      if (!invoice) {
        const redirectUrl = `${process.env.CLIENT_URL}/payment/result?success=false&error=Payment record not found`;
        return res.redirect(redirectUrl);
      }

      const paidAmount = parseInt(vnp_Amount);

      // Update invoice based on payment result
      if (vnp_ResponseCode === "00") {
        invoice.paymentInfo.status = "paid";
        invoice.paymentInfo.paidAmount = paidAmount;
        invoice.paymentInfo.remainingAmount = 0;
        invoice.paymentInfo.paymentDate = new Date();
        invoice.status = "paid";

        invoice.paymentInfo.vnpayTransaction = {
          transactionNo: vnp_TransactionNo,
          responseCode: vnp_ResponseCode,
          bankCode: vnp_Params.vnp_BankCode || "",
          cardType: vnp_Params.vnp_CardType || "",
          payDate: vnp_Params.vnp_PayDate || "",
        };
      } else {
        invoice.paymentInfo.status = "unpaid";
        invoice.paymentInfo.paymentNotes = `Payment failed: ${vnp_ResponseCode}`;
      }

      await invoice.save();

      const redirectUrl = `${
        process.env.CLIENT_URL
      }/payment/vnpay-return?success=${vnp_ResponseCode === "00"}&invoiceId=${
        invoice._id
      }&transactionRef=${vnp_TxnRef}`;
      return res.redirect(redirectUrl);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * VNPay IPN handler - just verify and update status
 * NO post-payment notifications here
 */
export const handleIPN = async (req, res, next) => {
  try {
    const vnp_Params = req.body;

    // Verify the IPN
    const verify = vnpay.verifyReturnUrl(vnp_Params);

    if (!verify) {
      return res.status(400).json({
        success: false,
        message: "Invalid IPN verification",
      });
    }

    const { vnp_TxnRef, vnp_ResponseCode, vnp_TransactionNo, vnp_Amount } =
      vnp_Params;

    // Check if this is an appointment payment
    const pendingPayment = global.pendingPayments?.[vnp_TxnRef];

    if (pendingPayment) {
      const success = vnp_ResponseCode === "00";

      // Update pending payment status
      pendingPayment.status = success ? "completed" : "failed";
      pendingPayment.responseCode = vnp_ResponseCode;
      pendingPayment.transactionNo = vnp_TransactionNo;
      pendingPayment.completedAt = new Date();

      if (success) {
        const paidAmount = parseInt(vnp_Amount);
        pendingPayment.paidAmount = paidAmount;

        pendingPayment.vnpayTransaction = {
          transactionNo: vnp_TransactionNo,
          responseCode: vnp_ResponseCode,
          bankCode: vnp_Params.vnp_BankCode || "",
          cardType: vnp_Params.vnp_CardType || "",
          payDate: vnp_Params.vnp_PayDate || "",
          amount: paidAmount,
        };
      }

      // Respond to VNPay
      return res.json({
        RspCode: "00",
        Message: "Confirm Success",
      });
    } else {
      // Handle invoice payment
      const invoice = await Invoice.findOne({
        "paymentInfo.transactionRef": vnp_TxnRef,
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      const paidAmount = parseInt(vnp_Amount);

      if (vnp_ResponseCode === "00") {
        invoice.paymentInfo.status = "paid";
        invoice.paymentInfo.paidAmount = paidAmount;
        invoice.paymentInfo.remainingAmount = 0;
        invoice.paymentInfo.paymentDate = new Date();
        invoice.status = "paid";

        invoice.paymentInfo.vnpayTransaction = {
          transactionNo: vnp_TransactionNo,
          responseCode: vnp_ResponseCode,
          bankCode: vnp_Params.vnp_BankCode || "",
          cardType: vnp_Params.vnp_CardType || "",
          payDate: vnp_Params.vnp_PayDate || "",
        };
      } else {
        invoice.paymentInfo.status = "unpaid";
        invoice.paymentInfo.paymentNotes = `Payment failed: ${vnp_ResponseCode}`;
      }

      await invoice.save();

      res.json({
        RspCode: "00",
        Message: "Confirm Success",
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get available VNPay payment methods
 */
export const getPaymentMethods = async (req, res, next) => {
  try {
    const paymentMethods = [
      {
        code: "VNPAYQR",
        name: "VNPay QR Code",
        description: "Thanh toán bằng mã QR",
      },
      {
        code: "VNBANK",
        name: "VNBank",
        description: "Thẻ nội địa Việt Nam",
      },
      {
        code: "INTCARD",
        name: "International Card",
        description: "Thẻ quốc tế (Visa, Mastercard)",
      },
      {
        code: "VISA",
        name: "Visa",
        description: "Thẻ Visa",
      },
      {
        code: "MASTERCARD",
        name: "Mastercard",
        description: "Thẻ Mastercard",
      },
      {
        code: "JCB",
        name: "JCB",
        description: "Thẻ JCB",
      },
      {
        code: "UPI",
        name: "UPI",
        description: "United Payments International",
      },
    ];

    res.json({
      success: true,
      paymentMethods,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check transaction status
 */
export const checkTransaction = async (req, res, next) => {
  try {
    const { transactionRef } = req.body;

    if (!transactionRef) {
      return res.status(400).json({
        success: false,
        message: "Transaction reference is required",
      });
    }

    // Check if this is an appointment payment
    const pendingPayment = global.pendingPayments?.[transactionRef];

    if (pendingPayment) {
      res.json({
        success: true,
        transactionRef,
        paymentType: "appointment",
        paymentStatus: pendingPayment.status || "pending",
        amount: pendingPayment.amount,
        createdAt: pendingPayment.createdAt,
        completedAt: pendingPayment.completedAt || null,
        vnpayTransaction: pendingPayment.vnpayTransaction || null,
      });
    } else {
      // Try to find invoice
      const invoice = await Invoice.findOne({
        "paymentInfo.transactionRef": transactionRef,
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      res.json({
        success: true,
        transactionRef,
        paymentType: "invoice",
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        paymentStatus: invoice.paymentInfo.status,
        amount: invoice.totals.totalAmount,
        paidAmount: invoice.paymentInfo.paidAmount,
        paymentDate: invoice.paymentInfo.paymentDate,
        vnpayTransaction: invoice.paymentInfo.vnpayTransaction || null,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Verify appointment payment and trigger post-payment workflow
 * This is called AFTER user confirms booking in frontend
 */
export const verifyAppointmentPayment = async (req, res, next) => {
  try {
    const { transactionRef } = req.body;
    console.log(
      `[VNPay] verifyAppointmentPayment called with transactionRef: ${transactionRef}`
    );

    if (!transactionRef) {
      console.error("[VNPay] ❌ No transaction reference provided");
      return res.status(400).json({
        success: false,
        message: "Transaction reference is required",
      });
    }

    // Check if this is a completed appointment payment
    const pendingPayment = global.pendingPayments?.[transactionRef];

    if (!pendingPayment) {
      console.error(`[VNPay] Payment record not found for ${transactionRef}`);
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    if (pendingPayment.status !== "completed") {
      console.error(
        `[VNPay] Payment not completed. Status: ${pendingPayment.status}`
      );
      return res.status(400).json({
        success: false,
        message: "Payment not completed or failed",
        currentStatus: pendingPayment.status,
      });
    }

    // Verify user ownership
    if (pendingPayment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to payment",
      });
    }

    // NOW trigger post-payment notifications (emails, etc.)
    try {
      const user = await User.findById(pendingPayment.userId);
      if (!user) {
        console.error(`[VNPay] User not found for payment ${transactionRef}`);
        throw new Error("User not found");
      }

      // Fetch service details from database
      const serviceIds =
        pendingPayment.appointmentData?.services?.map((s) => s.serviceId) || [];

      const services = await Service.find({ _id: { $in: serviceIds } });

      // Map services with their details
      const servicesWithDetails =
        pendingPayment.appointmentData?.services?.map((appointmentService) => {
          const serviceDetails = services.find(
            (s) => s._id.toString() === appointmentService.serviceId.toString()
          );
          return {
            serviceId: appointmentService.serviceId,
            quantity: appointmentService.quantity,
            serviceName: serviceDetails?.name || "Unknown Service",
            basePrice: serviceDetails?.basePrice || 0,
            estimatedDuration: serviceDetails?.estimatedDuration || 30,
          };
        }) || [];

      // Prepare payment data for notifications
      const paymentData = {
        amount: pendingPayment.paidAmount || pendingPayment.amount,
        transactionRef: transactionRef,
        paymentDate: pendingPayment.completedAt || new Date(),
        vnpayTransaction: pendingPayment.vnpayTransaction,
        services: servicesWithDetails,
      };

      // Prepare appointment data for notifications
      const appointmentData = {
        appointmentNumber: `APT${Date.now()}`,
        scheduledDate: pendingPayment.appointmentData?.scheduledDate,
        scheduledTime: pendingPayment.appointmentData?.scheduledTime,
        services: servicesWithDetails,
        serviceCenterId: pendingPayment.appointmentData?.serviceCenterId,
        customerName: `${user.firstName} ${user.lastName}`,
      };

      // Execute payment success workflow (send emails, socket notifications)
      await executePaymentSuccessWorkflow(paymentData, appointmentData, user);
    } catch (notificationError) {
      console.error(
        "[VNPay] Failed to send post-payment notifications:",
        notificationError
      );
      // Don't fail the verification if notifications fail
    }

    // Clean up the pending payment AFTER notifications are sent
    delete global.pendingPayments[transactionRef];

    res.json({
      success: true,
      message: "Payment verified successfully",
      paymentInfo: {
        transactionRef,
        amount: pendingPayment.amount,
        method: "vnpay",
        paymentDate: pendingPayment.completedAt,
        vnpayTransaction: pendingPayment.vnpayTransaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Test VNPay configuration
 */
export const testConfig = async (req, res) => {
  try {
    const testParams = {
      vnp_TxnRef: "TEST123",
      vnp_OrderInfo: "Test payment",
      vnp_OrderType: "other",
      vnp_Amount: 100000,
      vnp_ReturnUrl: `${
        process.env.CLIENT_URL || "http://localhost:5173"
      }/payment/vnpay-return`,
      vnp_IpAddr: "127.0.0.1",
      vnp_CreateDate: parseInt(
        new Date()
          .toISOString()
          .replace(/[^0-9]/g, "")
          .slice(0, 14)
      ),
      vnp_CurrCode: "VND",
      vnp_Locale: "vn",
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
    };

    const paymentUrl = vnpay.buildPaymentUrl(testParams);

    res.json({
      success: true,
      message: "VNPay configuration test successful",
      paymentUrl: paymentUrl,
      testParams: testParams,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "VNPay test failed",
      error: error.message,
    });
  }
};

/**
 * Debug endpoint to check pending payments
 */
export const debugPendingPayments = async (req, res) => {
  try {
    const pendingPayments = global.pendingPayments || {};
    const pendingPaymentKeys = Object.keys(pendingPayments);

    const details = {};
    for (const key of pendingPaymentKeys) {
      details[key] = {
        ...pendingPayments[key],
        appointmentData: pendingPayments[key].appointmentData
          ? "EXISTS"
          : "NOT FOUND",
      };
    }

    res.json({
      success: true,
      count: pendingPaymentKeys.length,
      pendingPaymentKeys: pendingPaymentKeys,
      details: details,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Debug failed",
      error: error.message,
    });
  }
};
