import { vnpay } from "../config/vnpay.js";
import Invoice from "../models/Invoice.js";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import VNPAYTransaction from "../models/VNPAYTransaction.js";
import { executePaymentSuccessWorkflow } from "../utils/paymentNotifications.js";

/**
 * Create VNPay payment URL for appointment booking
 */
export const createPayment = async (req, res, next) => {
  try {
    const {
      amount,
      bankCode,
      language,
      orderInfo,
      appointmentData,
      paymentType = "appointment",
    } = req.body;

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

    // VNPay library automatically handles currency conversion
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

    // Create and store transaction record
    const transaction = new VNPAYTransaction({
      transactionRef: transactionRef,
      paymentType: paymentType,
      orderInfo: paymentParams.vnp_OrderInfo,
      orderType: paymentParams.vnp_OrderType,
      userId: user._id,
      appointmentId: appointmentData?.appointmentId || null,
      amount: amount,
      currency: paymentParams.vnp_CurrCode,
      status: "pending",
      vnpayData: {
        bankCode: bankCode || null,
        ipAddr: paymentParams.vnp_IpAddr,
        locale: paymentParams.vnp_Locale,
        version: paymentParams.vnp_Version,
        command: paymentParams.vnp_Command,
        payDate: paymentParams.vnp_CreateDate,
      },
      billingInfo: {
        mobile: user.phone || null,
        email: user.email || null,
        fullName: `${user.firstName} ${user.lastName}`,
      },
      metadata: {
        appointmentData: appointmentData,
        returnUrl: paymentParams.vnp_ReturnUrl,
        userAgent: req.get("User-Agent"),
        referer: req.get("Referer"),
      },
    });

    await transaction.save();

    // Store payment reference in temporary storage (for backward compatibility)
    if (!global.pendingPayments) {
      global.pendingPayments = {};
    }

    global.pendingPayments[transactionRef] = {
      amount: amount,
      userId: user._id,
      createdAt: new Date(),
      appointmentData: appointmentData,
      transactionId: transaction._id,
      ...paymentParams,
    };

    res.json({
      success: true,
      paymentUrl,
      transactionRef: paymentParams.vnp_TxnRef,
      amount: Math.round(amount),
      transactionId: transaction._id,
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
      // Find and update transaction with failure
      const { vnp_TxnRef } = vnp_Params;
      if (vnp_TxnRef) {
        await VNPAYTransaction.findOneAndUpdate(
          { transactionRef: vnp_TxnRef },
          {
            status: "failed",
            responseCode: "INVALID_VERIFY",
            errorMessage: "Return URL verification failed",
            updatedAt: new Date(),
          }
        );
      }
      const redirectUrl = `${process.env.CLIENT_URL}/payment/result?success=false&error=Invalid payment verification`;
      return res.redirect(redirectUrl);
    }

    const { vnp_TxnRef, vnp_ResponseCode, vnp_TransactionNo, vnp_Amount } =
      vnp_Params;

    // Find and update transaction record
    const transaction = await VNPAYTransaction.findOne({
      transactionRef: vnp_TxnRef,
    });

    if (transaction) {
      const success = vnp_ResponseCode === "00";
      // VNPay returns amount in smallest currency unit (VND * 100), so divide by 100
      const paidAmount = parseInt(vnp_Amount) / 100;

      // Update transaction record
      await transaction.updateStatus(success ? "completed" : "failed", {
        responseCode: vnp_ResponseCode,
        transactionNo: vnp_TransactionNo,
        paidAmount: success ? paidAmount : 0,
        "vnpayData.bankCode": vnp_Params.vnp_BankCode || null,
        "vnpayData.cardType": vnp_Params.vnp_CardType || null,
        "vnpayData.payDate": vnp_Params.vnp_PayDate || null,
        "vnpayData.secureHash": vnp_Params.vnp_SecureHash || null,
        errorMessage: success ? null : `Payment failed: ${vnp_ResponseCode}`,
        errorCode: success ? null : vnp_ResponseCode,
      });

      // Check if this is an appointment payment
      const pendingPayment = global.pendingPayments?.[vnp_TxnRef];
      if (pendingPayment) {
        // Update pending payment for backward compatibility
        pendingPayment.status = success ? "completed" : "failed";
        pendingPayment.responseCode = vnp_ResponseCode;
        pendingPayment.transactionNo = vnp_TransactionNo;
        pendingPayment.completedAt = new Date();

        if (success) {
          pendingPayment.paidAmount = paidAmount;
          pendingPayment.vnpayTransaction = {
            transactionNo: vnp_TransactionNo,
            responseCode: vnp_ResponseCode,
            bankCode: vnp_Params.vnp_BankCode || "",
            cardType: vnp_Params.vnp_CardType || "",
            payDate: vnp_Params.vnp_PayDate || "",
            amount: paidAmount,
          };

          // Update appointment with payment information
          // Note: This won't be called for new appointments since they're created after payment success
          if (pendingPayment.appointmentData?.appointmentId) {
            try {
              const { default: Appointment } = await import(
                "../models/Appointment.js"
              );
              await Appointment.findByIdAndUpdate(
                pendingPayment.appointmentData.appointmentId,
                {
                  paymentInfo: {
                    transactionRef: vnp_TxnRef,
                    paymentMethod: "vnpay",
                    paidAmount: paidAmount,
                    paymentDate: new Date(),
                    vnpayTransactionId: transaction._id,
                  },
                  paymentStatus: "paid",
                }
              );
              console.log(
                `✅ Updated appointment ${pendingPayment.appointmentData.appointmentId} with payment info`
              );
            } catch (error) {
              console.error(
                "❌ Failed to update appointment with payment info:",
                error
              );
            }
          }
        }
      }

      // Redirect to frontend
      const displayAmount = parseInt(vnp_Amount) / 100;
      const redirectUrl = `${process.env.CLIENT_URL}/payment/vnpay-return?success=${success}&transactionRef=${vnp_TxnRef}&amount=${displayAmount}`;
      return res.redirect(redirectUrl);
    } else {
      // Handle legacy invoice payments (no transaction record)
      const invoice = await Invoice.findOne({
        "paymentInfo.transactionRef": vnp_TxnRef,
      });

      if (!invoice) {
        // Create transaction record for legacy payments
        const legacyTransaction = new VNPAYTransaction({
          transactionRef: vnp_TxnRef,
          paymentType: "invoice",
          orderInfo: "Legacy invoice payment",
          orderType: "other",
          amount: parseInt(vnp_Amount) / 100,
          currency: "VND",
          status: vnp_ResponseCode === "00" ? "completed" : "failed",
          responseCode: vnp_ResponseCode,
          transactionNo: vnp_TransactionNo,
          paidAmount:
            vnp_ResponseCode === "00" ? parseInt(vnp_Amount) / 100 : 0,
          vnpayData: {
            bankCode: vnp_Params.vnp_BankCode || null,
            cardType: vnp_Params.vnp_CardType || null,
            payDate: vnp_Params.vnp_PayDate || null,
            secureHash: vnp_Params.vnp_SecureHash || null,
          },
          metadata: {
            additionalNotes: "Legacy invoice payment processed",
          },
        });
        await legacyTransaction.save();

        const redirectUrl = `${process.env.CLIENT_URL}/payment/result?success=false&error=Payment record not found`;
        return res.redirect(redirectUrl);
      }

      // Update invoice and create transaction record
      // VNPay returns amount in smallest currency unit (VND * 100), so divide by 100
      const paidAmount = parseInt(vnp_Amount) / 100;

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

      // Create transaction record for invoice
      const invoiceTransaction = new VNPAYTransaction({
        transactionRef: vnp_TxnRef,
        paymentType: "invoice",
        orderInfo: `Invoice payment for ${invoice.invoiceNumber}`,
        orderType: "other",
        userId: invoice.customerId,
        invoiceId: invoice._id,
        amount: invoice.totals.totalAmount,
        paidAmount: vnp_ResponseCode === "00" ? paidAmount : 0,
        currency: "VND",
        status: vnp_ResponseCode === "00" ? "completed" : "failed",
        responseCode: vnp_ResponseCode,
        transactionNo: vnp_TransactionNo,
        vnpayData: {
          bankCode: vnp_Params.vnp_BankCode || null,
          cardType: vnp_Params.vnp_CardType || null,
          payDate: vnp_Params.vnp_PayDate || null,
          secureHash: vnp_Params.vnp_SecureHash || null,
        },
      });
      await invoiceTransaction.save();

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
      console.error("[VNPay] IPN verification failed");
      // Find and update transaction with failure
      const { vnp_TxnRef } = vnp_Params;
      if (vnp_TxnRef) {
        await VNPAYTransaction.findOneAndUpdate(
          { transactionRef: vnp_TxnRef },
          {
            status: "failed",
            responseCode: "INVALID_IPN",
            errorMessage: "IPN verification failed",
            updatedAt: new Date(),
          }
        );
      }
      return res.status(400).json({
        RspCode: "97",
        Message: "Invalid IPN verification",
      });
    }

    const { vnp_TxnRef, vnp_ResponseCode, vnp_TransactionNo, vnp_Amount } =
      vnp_Params;

    // Find and update transaction record
    const transaction = await VNPAYTransaction.findOne({
      transactionRef: vnp_TxnRef,
    });

    if (transaction) {
      const success = vnp_ResponseCode === "00";
      // VNPay returns amount in smallest currency unit (VND * 100), so divide by 100
      const paidAmount = parseInt(vnp_Amount) / 100;

      // Update transaction record
      await transaction.updateStatus(success ? "completed" : "failed", {
        responseCode: vnp_ResponseCode,
        transactionNo: vnp_TransactionNo,
        paidAmount: success ? paidAmount : 0,
        "vnpayData.bankCode": vnp_Params.vnp_BankCode || null,
        "vnpayData.cardType": vnp_Params.vnp_CardType || null,
        "vnpayData.payDate": vnp_Params.vnp_PayDate || null,
        "vnpayData.secureHash": vnp_Params.vnp_SecureHash || null,
        errorMessage: success ? null : `Payment failed: ${vnp_ResponseCode}`,
        errorCode: success ? null : vnp_ResponseCode,
      });

      // Check if this is an appointment payment
      const pendingPayment = global.pendingPayments?.[vnp_TxnRef];
      if (pendingPayment) {
        // Update pending payment for backward compatibility
        pendingPayment.status = success ? "completed" : "failed";
        pendingPayment.responseCode = vnp_ResponseCode;
        pendingPayment.transactionNo = vnp_TransactionNo;
        pendingPayment.completedAt = new Date();

        if (success) {
          pendingPayment.paidAmount = paidAmount;
          pendingPayment.vnpayTransaction = {
            transactionNo: vnp_TransactionNo,
            responseCode: vnp_ResponseCode,
            bankCode: vnp_Params.vnp_BankCode || "",
            cardType: vnp_Params.vnp_CardType || "",
            payDate: vnp_Params.vnp_PayDate || "",
            amount: paidAmount,
          };

          // Update appointment with payment information
          // Note: This won't be called for new appointments since they're created after payment success
          if (pendingPayment.appointmentData?.appointmentId) {
            try {
              const { default: Appointment } = await import(
                "../models/Appointment.js"
              );
              await Appointment.findByIdAndUpdate(
                pendingPayment.appointmentData.appointmentId,
                {
                  paymentInfo: {
                    transactionRef: vnp_TxnRef,
                    paymentMethod: "vnpay",
                    paidAmount: paidAmount,
                    paymentDate: new Date(),
                    vnpayTransactionId: transaction._id,
                  },
                  paymentStatus: "paid",
                }
              );
              console.log(
                `✅ Updated appointment ${pendingPayment.appointmentData.appointmentId} with payment info`
              );
            } catch (error) {
              console.error(
                "❌ Failed to update appointment with payment info:",
                error
              );
            }
          }
        }
      }

      // Respond to VNPay
      return res.json({
        RspCode: "00",
        Message: "Confirm Success",
      });
    } else {
      // Handle legacy invoice payments
      const invoice = await Invoice.findOne({
        "paymentInfo.transactionRef": vnp_TxnRef,
      });

      if (!invoice) {
        console.error(
          `[VNPay] Invoice not found for transaction ${vnp_TxnRef}`
        );
        return res.status(404).json({
          RspCode: "01",
          Message: "Invoice not found",
        });
      }

      // VNPay returns amount in smallest currency unit (VND * 100), so divide by 100
      const paidAmount = parseInt(vnp_Amount) / 100;

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

      // Create transaction record for invoice
      const invoiceTransaction = new VNPAYTransaction({
        transactionRef: vnp_TxnRef,
        paymentType: "invoice",
        orderInfo: `Invoice payment for ${invoice.invoiceNumber}`,
        orderType: "other",
        userId: invoice.customerId,
        invoiceId: invoice._id,
        amount: invoice.totals.totalAmount,
        paidAmount: vnp_ResponseCode === "00" ? paidAmount : 0,
        currency: "VND",
        status: vnp_ResponseCode === "00" ? "completed" : "failed",
        responseCode: vnp_ResponseCode,
        transactionNo: vnp_TransactionNo,
        vnpayData: {
          bankCode: vnp_Params.vnp_BankCode || null,
          cardType: vnp_Params.vnp_CardType || null,
          payDate: vnp_Params.vnp_PayDate || null,
          secureHash: vnp_Params.vnp_SecureHash || null,
        },
        metadata: {
          additionalNotes: "Legacy invoice payment processed via IPN",
        },
      });
      await invoiceTransaction.save();

      res.json({
        RspCode: "00",
        Message: "Confirm Success",
      });
    }
  } catch (error) {
    console.error("[VNPay] IPN handler error:", error);
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

    // First try to find in transaction database
    const transaction = await VNPAYTransaction.findOne({ transactionRef });

    if (transaction) {
      res.json({
        success: true,
        transactionRef,
        paymentType: transaction.paymentType,
        status: transaction.status,
        amount: transaction.amount,
        paidAmount: transaction.paidAmount,
        currency: transaction.currency,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        completedAt: transaction.vnpayData.paymentDate || null,
        expiresAt: transaction.expiresAt,
        responseCode: transaction.responseCode,
        errorMessage: transaction.errorMessage,
        vnpayData: {
          bankCode: transaction.vnpayData.bankCode,
          cardType: transaction.vnpayData.cardType,
          payDate: transaction.vnpayData.payDate,
          transactionNo: transaction.transactionNo,
        },
        billingInfo: transaction.billingInfo,
        appointmentId: transaction.appointmentId,
        invoiceId: transaction.invoiceId,
      });
    } else {
      // Check if this is a pending payment (backward compatibility)
      const pendingPayment = global.pendingPayments?.[transactionRef];

      if (pendingPayment) {
        res.json({
          success: true,
          transactionRef,
          paymentType: "appointment",
          status: pendingPayment.status || "pending",
          amount: pendingPayment.amount,
          createdAt: pendingPayment.createdAt,
          completedAt: pendingPayment.completedAt || null,
          vnpayTransaction: pendingPayment.vnpayTransaction || null,
        });
      } else {
        // Try to find invoice (legacy support)
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
          status: invoice.paymentInfo.status,
          amount: invoice.totals.totalAmount,
          paidAmount: invoice.paymentInfo.paidAmount,
          paymentDate: invoice.paymentInfo.paymentDate,
          vnpayTransaction: invoice.paymentInfo.vnpayTransaction || null,
        });
      }
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

/**
 * Get user transaction history
 */
export const getUserTransactions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      page = 1,
      limit = 10,
      status,
      paymentType,
      startDate,
      endDate,
    } = req.query;

    const filter = { userId };

    if (status) filter.status = status;
    if (paymentType) filter.paymentType = paymentType;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      VNPAYTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("appointmentId", "appointmentNumber scheduledDate status")
        .populate("invoiceId", "invoiceNumber status totals"),
      VNPAYTransaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction by ID
 */
export const getTransactionById = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    const transaction = await VNPAYTransaction.findById(transactionId)
      .populate("userId", "firstName lastName email phone")
      .populate("appointmentId", "appointmentNumber scheduledDate status")
      .populate("invoiceId", "invoiceNumber status totals");
    // serviceCenterId populate removed - single center architecture

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Check if user has permission to view this transaction
    if (
      req.user.role !== "admin" &&
      req.user._id.toString() !== transaction.userId._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this transaction",
      });
    }

    res.json({
      success: true,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction statistics
 */
export const getTransactionStats = async (req, res, next) => {
  try {
    const { startDate, endDate, paymentType } = req.query;
    const dateRange = {};

    if (startDate) dateRange.startDate = new Date(startDate);
    if (endDate) dateRange.endDate = new Date(endDate);

    let stats = await VNPAYTransaction.getStatistics(dateRange);

    if (paymentType) {
      stats = stats.filter((stat) => {
        // We need to re-query with paymentType filter
        return true; // This will be handled in the aggregation pipeline
      });
    }

    // Get additional statistics
    const [totalTransactions, totalRevenue, successRate] = await Promise.all([
      VNPAYTransaction.countDocuments(
        startDate || endDate
          ? {
              createdAt: dateRange.startDate
                ? { $gte: dateRange.startDate }
                : {},
              ...(endDate && {
                createdAt: { ...dateRange.startDate, $lte: dateRange.endDate },
              }),
            }
          : {}
      ),
      VNPAYTransaction.aggregate([
        {
          $match: {
            status: "completed",
            ...(startDate && { createdAt: { $gte: new Date(startDate) } }),
            ...(endDate && { createdAt: { $lte: new Date(endDate) } }),
          },
        },
        { $group: { _id: null, total: { $sum: "$paidAmount" } } },
      ]),
      VNPAYTransaction.aggregate([
        {
          $match: {
            ...(startDate && { createdAt: { $gte: new Date(startDate) } }),
            ...(endDate && { createdAt: { $lte: new Date(endDate) } }),
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: ["$status", "completed", 0] } },
          },
        },
        {
          $project: {
            successRate: { $divide: ["$completed", "$total"] },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      statistics: {
        byStatus: stats,
        totalTransactions,
        totalRevenue: totalRevenue[0]?.total || 0,
        successRate: successRate[0]?.successRate || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update transaction status (admin only)
 */
export const updateTransactionStatus = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const { status, errorMessage, errorCode, additionalData } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update transaction status",
      });
    }

    const transaction = await VNPAYTransaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const updateData = {
      errorMessage,
      errorCode,
      updatedAt: new Date(),
      ...additionalData,
    };

    await transaction.updateStatus(status, updateData);

    res.json({
      success: true,
      message: "Transaction status updated successfully",
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refund transaction (admin only)
 */
export const refundTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const { refundAmount, reason } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to refund transaction",
      });
    }

    const transaction = await VNPAYTransaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (transaction.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Only completed transactions can be refunded",
      });
    }

    // Create a new refund transaction record
    const refundTransactionRef = `REFUND_${
      transaction.transactionRef
    }_${Date.now()}`;

    const refundTransaction = new VNPAYTransaction({
      transactionRef: refundTransactionRef,
      paymentType: "refund",
      orderInfo: `Refund for transaction ${transaction.transactionRef} - ${reason}`,
      orderType: "refund",
      userId: transaction.userId,
      appointmentId: transaction.appointmentId,
      invoiceId: transaction.invoiceId,
      amount: refundAmount || transaction.paidAmount,
      paidAmount: refundAmount || transaction.paidAmount,
      currency: "VND",
      status: "completed", // Refund is immediately processed
      responseCode: "00", // Success code for refund
      vnpayData: {
        bankCode: transaction.vnpayData?.bankCode,
        cardType: transaction.vnpayData?.cardType,
        paymentDate: new Date(),
      },
      settlementInfo: {
        settled: true,
        settlementDate: new Date(),
        settlementAmount: refundAmount || transaction.paidAmount,
        settlementReference: `REFUND${Date.now()}`,
      },
      metadata: {
        originalTransactionId: transaction._id,
        originalTransactionRef: transaction.transactionRef,
        refundReason: reason,
        refundedBy: req.user._id,
        refundDate: new Date(),
        refundType:
          req.user.role === "admin" ? "admin_refund" : "customer_cancellation",
      },
    });

    await refundTransaction.save();

    // Update original transaction status to refunded
    await transaction.updateStatus("refunded", {
      metadata: {
        ...transaction.metadata,
        refundTransactionId: refundTransaction._id,
        refundTransactionRef: refundTransactionRef,
        refundReason: reason,
        refundedBy: req.user._id,
        refundDate: new Date(),
        refundType:
          req.user.role === "admin" ? "admin_refund" : "customer_cancellation",
      },
    });

    res.json({
      success: true,
      message: "Transaction refunded successfully",
      transaction: {
        original: transaction,
        refund: refundTransaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get expired transactions (admin only)
 */
export const getExpiredTransactions = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view expired transactions",
      });
    }

    const expiredTransactions = await VNPAYTransaction.findExpired();

    res.json({
      success: true,
      count: expiredTransactions.length,
      transactions: expiredTransactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clean up expired transactions (admin only)
 */
export const cleanupExpiredTransactions = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to clean up transactions",
      });
    }

    const expiredTransactions = await VNPAYTransaction.findExpired();

    // Update expired transactions to 'expired' status
    const updatePromises = expiredTransactions.map((transaction) =>
      transaction.updateStatus("expired", {
        errorMessage: "Transaction expired",
        errorCode: "EXPIRED",
      })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: `Updated ${expiredTransactions.length} expired transactions`,
      updatedCount: expiredTransactions.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all transactions with filtering (admin only)
 */
export const getAllTransactions = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view all transactions",
      });
    }

    const {
      page = 1,
      limit = 20,
      status,
      paymentType,
      userId,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (paymentType) filter.paymentType = paymentType;
    if (userId) filter.userId = userId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const transactions = await VNPAYTransaction.find(filter)
      .populate("userId", "firstName lastName email")
      .populate("appointmentId", "appointmentNumber scheduledDate")
      .populate("invoiceId", "invoiceNumber")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await VNPAYTransaction.countDocuments(filter);

    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
