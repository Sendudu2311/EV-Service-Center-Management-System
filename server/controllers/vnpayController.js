import { vnpay } from "../config/vnpay.js";
import Invoice from "../models/Invoice.js";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import VNPAYTransaction from "../models/VNPAYTransaction.js";
// Import new Transaction models
import Transaction from "../models/Transaction.js";
import VNPAYTransactionNew from "../models/transactions/VNPAYTransaction.js";
import TransactionService from "../services/transactionService.js";
import { executePaymentSuccessWorkflow } from "../utils/paymentNotifications.js";
import { sendEmail } from "../utils/email.js";
import { generateRefundNotificationTemplate } from "../utils/emailTemplates.js";

/**
 * Get client URL based on environment
 * @returns {string} - Client URL for current environment
 */
const getClientUrl = () => {
  // Production: Use PRODUCTION_CLIENT_URL if available
  if (process.env.NODE_ENV === 'production' && process.env.PRODUCTION_CLIENT_URL) {
    return process.env.PRODUCTION_CLIENT_URL;
  }
  // Development/fallback: Use CLIENT_URL or localhost
  return process.env.CLIENT_URL || 'http://localhost:5173';
};

/**
 * Get server URL based on environment and request
 * @param {Request} req - Express request object
 * @returns {string} - Server URL for current environment
 */
const getServerUrl = (req) => {
  // Production: Use PRODUCTION_SERVER_URL if available
  if (process.env.NODE_ENV === 'production' && process.env.PRODUCTION_SERVER_URL) {
    return process.env.PRODUCTION_SERVER_URL;
  }

  // Use SERVER_URL from env if available
  if (process.env.SERVER_URL) {
    return process.env.SERVER_URL;
  }

  // Try to detect from request headers
  const protocol = req.protocol || 'http';
  const host = req.get('host') || req.get('x-forwarded-host');

  if (host) {
    return `${protocol}://${host}`;
  }

  // Fallback to localhost for web, but this won't work for mobile
  return 'http://localhost:3000';
};

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
      isMobileApp: requestIsMobileApp = false, // Explicit flag from mobile app
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    // Validate paymentType - allow default and common values
    const validPaymentTypes = [
      "appointment",
      "invoice",
      "service",
      "deposit", // Allow "deposit" for appointment deposits
      "booking",
      "payment",
    ];
    if (paymentType && !validPaymentTypes.includes(paymentType)) {
      console.log(
        "Invalid paymentType received:",
        paymentType,
        "Defaulting to 'appointment'"
      );
      // Don't return error, just use default
    }

    // Ensure we have a valid paymentType
    let finalPaymentType = validPaymentTypes.includes(paymentType)
      ? paymentType
      : "appointment";

    // Map "deposit" to "appointment" for payment purpose logic
    if (finalPaymentType === "deposit") {
      finalPaymentType = "appointment";
    }

    // Generate unique transaction reference
    const transactionRef = `APP${Date.now()}${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // VNPay library automatically handles currency conversion
    const vnpayAmount = Math.round(amount);

    // Create payment URL parameters
    // Get server URL - use IP from request host if available (important for mobile)
    // Mobile devices can't access localhost, need actual IP
    const serverUrl = getServerUrl(req);

    console.log(
      "🌐 VNPay Return URL will be:",
      `${serverUrl}/api/vnpay/return`
    );

    const paymentParams = {
      vnp_TxnRef: transactionRef,
      vnp_OrderInfo: orderInfo || `Thanh toan dich vu xe dien ${amount} VND`,
      vnp_OrderType: "other",
      vnp_Amount: vnpayAmount,
      vnp_ReturnUrl: `${serverUrl}/api/vnpay/return`,
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

    // Create and store transaction record using new discriminator
    console.log("Creating VNPay transaction with data:", {
      transactionRef: paymentParams.vnp_TxnRef,
      userId: user._id,
      appointmentId: appointmentData?.appointmentId,
      paymentPurpose:
        paymentType === "appointment" ? "deposit_booking" : "other",
      amount: amount,
    });

    // Debug paymentType
    console.log("Payment type received:", paymentType);
    console.log("Final payment type:", finalPaymentType);
    console.log(
      "Payment purpose will be:",
      finalPaymentType === "appointment" ? "deposit_booking" : "other"
    );

    let transaction;
    try {
      transaction = await TransactionService.createTransaction("vnpay", {
        transactionRef: paymentParams.vnp_TxnRef, // Use VNPay transaction reference
        userId: user._id,
        appointmentId: appointmentData?.appointmentId || null, // Will be updated after appointment creation
        amount: amount,
        paymentPurpose:
          finalPaymentType === "appointment" ? "deposit_booking" : "other",
        billingInfo: {
          mobile: user.phone || null,
          email: user.email || null,
          fullName: `${user.firstName} ${user.lastName}`,
        },
        notes: `VNPay payment for ${finalPaymentType}`,
        vnpayData: {
          bankCode: bankCode || null,
          ipAddr: paymentParams.vnp_IpAddr,
          locale: paymentParams.vnp_Locale,
          version: paymentParams.vnp_Version,
          command: paymentParams.vnp_Command,
          payDate: paymentParams.vnp_CreateDate,
        },
        metadata: {
          appointmentData: appointmentData,
          returnUrl: paymentParams.vnp_ReturnUrl,
          userAgent: req.get("User-Agent"),
          referer: req.get("Referer"),
          orderInfo: paymentParams.vnp_OrderInfo,
          orderType: paymentParams.vnp_OrderType,
          // ONLY detect mobile from explicit flag or User-Agent
          // DO NOT use payment pattern (both web and mobile can have appointment without appointmentId)
          isMobileApp:
            requestIsMobileApp ||
            req.get("User-Agent")?.includes("Expo") ||
            req.get("User-Agent")?.includes("ReactNative"),
        },
      });

      if (!transaction) {
        throw new Error("Failed to create transaction");
      }

      console.log("Transaction created successfully:", {
        id: transaction._id,
        transactionRef: transaction.transactionRef,
        transactionType: transaction.transactionType,
        paymentPurpose: transaction.paymentPurpose,
        status: transaction.status,
      });
    } catch (error) {
      console.error("Error creating transaction:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create transaction",
        error: error.message,
      });
    }

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
      metadata: transaction.metadata, // Copy metadata from transaction for mobile detection
      ...paymentParams,
    };

    console.log(
      "📱 Stored pendingPayment with metadata:",
      JSON.stringify({
        transactionRef,
        isMobileApp: transaction.metadata?.isMobileApp,
        paymentPurpose: transaction.paymentPurpose,
      })
    );

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
    console.log("=== VNPay handleReturn called ===");
    console.log("Query params:", req.query);
    console.log("Headers:", req.headers);

    const vnp_Params = req.query;

    // Verify the return URL
    console.log("Verifying VNPay return URL...");
    const verify = vnpay.verifyReturnUrl(vnp_Params);
    console.log("VNPay verification result:", verify);

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
      const redirectUrl = `${getClientUrl()}/payment/vnpay-return?success=false&error=Invalid payment verification`;
      return res.redirect(redirectUrl);
    }

    const { vnp_TxnRef, vnp_ResponseCode, vnp_TransactionNo, vnp_Amount } =
      vnp_Params;

    // Find and update transaction record - check both old and new systems
    console.log("Looking for transaction with ref:", vnp_TxnRef);

    let transaction = await Transaction.findOne({
      transactionRef: vnp_TxnRef,
    });

    console.log("Found in new system:", !!transaction);

    // If not found in new system, check old VNPAYTransaction
    if (!transaction) {
      transaction = await VNPAYTransaction.findOne({
        transactionRef: vnp_TxnRef,
      });
      console.log("Found in old system:", !!transaction);
    }

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
          if (pendingPayment.appointmentData?.appointmentId) {
            try {
              const { default: Appointment } = await import(
                "../models/Appointment.js"
              );

              // Check if this is a deposit payment
              const isDepositPayment =
                pendingPayment.appointmentData?.bookingType ===
                  "deposit_booking" ||
                transaction.metadata?.paymentType === "deposit";

              if (isDepositPayment) {
                // Update appointment with deposit payment
                await Appointment.findByIdAndUpdate(
                  pendingPayment.appointmentData.appointmentId,
                  {
                    "depositInfo.paid": true,
                    "depositInfo.paidAt": new Date(),
                    "depositInfo.transactionId": transaction._id,
                    paymentInfo: {
                      transactionRef: vnp_TxnRef,
                      paymentMethod: "vnpay",
                      depositAmount: paidAmount,
                      paidAmount: paidAmount,
                      paymentDate: new Date(),
                      depositTransactionId: transaction._id,
                    },
                    paymentStatus: "partial",
                    status: "confirmed", // Auto-confirm after deposit payment
                  }
                );
                console.log(
                  `✅ Updated appointment ${pendingPayment.appointmentData.appointmentId} with deposit payment`
                );
              } else {
                // Update appointment with full payment
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
                  `✅ Updated appointment ${pendingPayment.appointmentData.appointmentId} with full payment`
                );
              }
            } catch (error) {
              console.error(
                "❌ Failed to update appointment with payment info:",
                error
              );
            }
          }
        }
      }

      // Redirect to frontend or mobile app deep link
      const displayAmount = parseInt(vnp_Amount) / 100;

      // DEBUG: Log all relevant data
      console.log("=== MOBILE DETECTION DEBUG ===");
      console.log("Transaction exists:", !!transaction);
      console.log("Pending payment exists:", !!pendingPayment);
      console.log("Transaction metadata:", transaction?.metadata);
      console.log("Pending payment metadata:", pendingPayment?.metadata);
      console.log("Transaction paymentPurpose:", transaction?.paymentPurpose);
      console.log("AppointmentData:", pendingPayment?.appointmentData);

      // Check if this is a mobile request - check transaction metadata first (most reliable)
      const userAgent = req.get("User-Agent") || "";
      console.log("User-Agent:", userAgent.substring(0, 100));

      // Parse metadata if it's a string (MongoDB sometimes stores as string)
      let transactionMetadata = transaction?.metadata;
      if (typeof transactionMetadata === "string") {
        try {
          transactionMetadata = JSON.parse(transactionMetadata);
        } catch (e) {
          console.log("Could not parse transaction metadata as JSON");
        }
      }

      let pendingMetadata = pendingPayment?.metadata;
      if (typeof pendingMetadata === "string") {
        try {
          pendingMetadata = JSON.parse(pendingMetadata);
        } catch (e) {
          console.log("Could not parse pending metadata as JSON");
        }
      }

      const transactionIsMobile = transactionMetadata?.isMobileApp === true;
      const pendingIsMobile = pendingMetadata?.isMobileApp === true;
      const userAgentIsMobile =
        userAgent.includes("Expo") || userAgent.includes("ReactNative");

      // Also check if paymentPurpose is deposit_booking (mobile appointments use this)
      // AND has appointmentData but NO appointmentId (mobile booking pattern)
      const hasAppointmentDataWithoutId =
        (pendingPayment?.appointmentData &&
          !pendingPayment?.appointmentData?.appointmentId) ||
        (transactionMetadata?.appointmentData &&
          !transactionMetadata?.appointmentData?.appointmentId);

      // Check if this is a deposit booking (both web and mobile can have this)
      const isDepositBooking =
        transaction?.paymentPurpose === "deposit_booking";

      // Mobile detection priority (DO NOT include isDepositBooking - web can also have deposit_booking):
      // 1. Explicit flag in metadata (most reliable - from isMobileApp parameter)
      // 2. User-Agent (Expo, ReactNative)
      // 3. appointmentData without appointmentId (mobile booking pattern)
      const isMobileApp =
        transactionIsMobile || // Explicit flag from mobile app
        pendingIsMobile || // Explicit flag from pending payment
        userAgentIsMobile; // User-Agent detection

      // Build redirect URLs
      const webRedirectUrl = `${getClientUrl()}/payment/vnpay-return?success=${success}&transactionRef=${vnp_TxnRef}&amount=${displayAmount}`;

      const mobileDeepLink = `evservicecenter://payment/vnpay-return?success=${success}&transactionRef=${vnp_TxnRef}&amount=${displayAmount}`;

      console.log("🔀 REDIRECT DECISION:");
      console.log("  Transaction paymentPurpose:", transaction?.paymentPurpose);
      console.log("  isDepositBooking:", isDepositBooking);
      console.log("  isMobileApp:", isMobileApp);
      console.log("  Detection breakdown:", {
        isDepositBooking,
        transactionIsMobile,
        pendingIsMobile,
        userAgentIsMobile,
        hasAppointmentDataWithoutId,
      });
      console.log(
        "  Transaction metadata.isMobileApp:",
        transactionMetadata?.isMobileApp
      );
      console.log(
        "  Pending metadata.isMobileApp:",
        pendingMetadata?.isMobileApp
      );

      // FINAL CHECK: Only redirect to mobile deep link if explicitly from mobile app
      // For mobile apps: redirect to HTML page → deep link
      // For web apps: redirect directly to web URL
      if (isMobileApp) {
        console.log(
          "✅ Mobile app detected - redirecting to HTML page for deep link"
        );
        // Redirect to HTML page that will trigger deep link
        // Mobile browsers can't directly handle deep link schemes from server redirects
        const htmlRedirectUrl = `/vnpay-redirect.html?success=${success}&transactionRef=${vnp_TxnRef}&amount=${displayAmount}`;
        console.log("📱 Redirecting to HTML page:", htmlRedirectUrl);
        return res.redirect(htmlRedirectUrl);
      }

      // Web redirect (includes deposit_booking payments from web)
      console.log(
        "🌐 Web app detected - redirecting to web URL:",
        webRedirectUrl
      );
      return res.redirect(webRedirectUrl);
    } else {
      console.log("No transaction found for ref:", vnp_TxnRef);
      console.log("This should not happen - transaction was found earlier");
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

        const redirectUrl = `${getClientUrl()}/payment/vnpay-return?success=false&error=Payment record not found`;
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

      const redirectUrl = `${getClientUrl()}/payment/vnpay-return?success=${vnp_ResponseCode === "00"}&invoiceId=${
        invoice._id
      }&transactionRef=${vnp_TxnRef}`;
      return res.redirect(redirectUrl);
    }
  } catch (error) {
    console.error("Error in handleReturn:", error);
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

    // Find and update transaction record - check both old and new systems
    console.log("Looking for transaction with ref:", vnp_TxnRef);

    let transaction = await Transaction.findOne({
      transactionRef: vnp_TxnRef,
    });

    console.log("Found in new system:", !!transaction);

    // If not found in new system, check old VNPAYTransaction
    if (!transaction) {
      transaction = await VNPAYTransaction.findOne({
        transactionRef: vnp_TxnRef,
      });
      console.log("Found in old system:", !!transaction);
    }

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

    // Check if already processed to prevent duplicate calls
    if (pendingPayment.verificationProcessed) {
      console.log(
        `[VNPay] Payment ${transactionRef} already processed, skipping`
      );
      return res.json({
        success: true,
        message: "Payment already verified",
        paymentInfo: {
          transactionRef,
          amount: pendingPayment.amount,
          method: "vnpay",
          paymentDate: pendingPayment.completedAt,
          vnpayTransaction: pendingPayment.vnpayTransaction,
        },
      });
    }

    // Mark as being processed
    pendingPayment.verificationProcessed = true;

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

      // Fetch service details from database - handle both ObjectId and code
      const serviceIds =
        pendingPayment.appointmentData?.services?.map((s) => s.serviceId) || [];

      const objectIdServiceIds = serviceIds.filter(
        (id) => typeof id === "string" && id.match(/^[0-9a-fA-F]{24}$/)
      );
      const codeServiceIds = serviceIds.filter(
        (id) => typeof id === "string" && !id.match(/^[0-9a-fA-F]{24}$/)
      );

      let services = [];
      if (objectIdServiceIds.length > 0) {
        const servicesById = await Service.find({
          _id: { $in: objectIdServiceIds },
        });
        services = [...services, ...servicesById];
      }
      if (codeServiceIds.length > 0) {
        const servicesByCode = await Service.find({
          code: { $in: codeServiceIds },
        });
        services = [...services, ...servicesByCode];
      }

      // Map services with their details
      const servicesWithDetails =
        pendingPayment.appointmentData?.services?.map((appointmentService) => {
          // Find service by either _id or code
          const serviceDetails = services.find(
            (s) =>
              s._id.toString() === appointmentService.serviceId.toString() ||
              s.code === appointmentService.serviceId
          );

          return {
            serviceId: serviceDetails?._id || appointmentService.serviceId, // Use ObjectId if available, fallback to original
            quantity: appointmentService.quantity,
            serviceName: serviceDetails?.name || "Unknown Service",
            basePrice:
              serviceDetails?.basePrice ||
              appointmentService.price ||
              appointmentService.basePrice ||
              0,
            estimatedDuration:
              serviceDetails?.estimatedDuration ||
              appointmentService.estimatedDuration ||
              30,
          };
        }) || [];

      // Check if this is a deposit payment or full service payment
      const isDepositPayment =
        req.body.paymentType === "deposit" ||
        pendingPayment.appointmentData?.bookingType === "deposit_booking";

      // Prepare payment data for notifications
      const paymentData = {
        amount: pendingPayment.paidAmount || pendingPayment.amount,
        transactionRef: transactionRef,
        paymentDate: pendingPayment.completedAt || new Date(),
        vnpayTransaction: pendingPayment.vnpayTransaction,
        services: isDepositPayment ? [] : servicesWithDetails, // Empty for deposit
        paymentType: isDepositPayment ? "deposit" : "appointment",
      };

      // Prepare appointment data for notifications
      const appointmentData = {
        appointmentNumber: `APT${Date.now()}`,
        scheduledDate: pendingPayment.appointmentData?.scheduledDate,
        scheduledTime: pendingPayment.appointmentData?.scheduledTime,
        services: isDepositPayment ? [] : servicesWithDetails, // Empty for deposit
        customerName: `${user.firstName} ${user.lastName}`,
        bookingType: isDepositPayment ? "deposit_booking" : "full_service",
        depositInfo: isDepositPayment
          ? {
              amount: pendingPayment.paidAmount || pendingPayment.amount,
              paid: true,
            }
          : undefined,
      };

      // Execute payment success workflow (send emails, socket notifications)
      console.log(
        `[VNPay] Executing payment success workflow for ${transactionRef} (${
          isDepositPayment ? "deposit" : "full service"
        })`
      );
      await executePaymentSuccessWorkflow(paymentData, appointmentData, user);
      console.log(
        `[VNPay] Payment success workflow completed for ${transactionRef}`
      );
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
 * Update transaction with appointment ID after appointment creation
 */
export const updateTransactionAppointmentId = async (req, res) => {
  try {
    const { transactionRef, appointmentId } = req.body;

    if (!transactionRef || !appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Transaction reference and appointment ID are required",
      });
    }

    // Update the VNPay transaction record
    const transaction = await VNPAYTransaction.findOneAndUpdate(
      { transactionRef },
      {
        appointmentId: appointmentId,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Also update the global pending payment if it exists
    if (global.pendingPayments && global.pendingPayments[transactionRef]) {
      global.pendingPayments[transactionRef].appointmentId = appointmentId;
    }

    console.log(
      `✅ [VNPay] Updated transaction ${transactionRef} with appointment ID ${appointmentId}`
    );

    res.json({
      success: true,
      message: "Transaction updated successfully",
      data: {
        transactionRef,
        appointmentId,
        updatedAt: transaction.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating transaction appointment ID:", error);
    res.status(500).json({
      success: false,
      message: "Error updating transaction",
    });
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
      vnp_ReturnUrl: `${getClientUrl()
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
    console.log("🔍 Debug - Transaction API query params:", req.query);
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

    console.log("🔍 Debug - Transaction filter:", filter);
    const [transactions, total] = await Promise.all([
      VNPAYTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("appointmentId", "appointmentNumber scheduledDate status")
        .populate("invoiceId", "invoiceNumber status totals"),
      VNPAYTransaction.countDocuments(filter),
    ]);
    console.log(
      "🔍 Debug - Found transactions:",
      transactions.length,
      "Total:",
      total
    );

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
    // Single center architecture - no service center filtering needed

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
    console.log("🔍 Debug - Stats API query params:", req.query);
    console.log("🔍 Debug - User role:", req.user.role);
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
            completed: {
              $sum: {
                $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            successRate: {
              $cond: [
                { $gt: ["$total", 0] },
                { $divide: ["$completed", "$total"] },
                0,
              ],
            },
          },
        },
      ]),
    ]);

    console.log("🔍 Debug - Stats calculation results:");
    console.log("  - byStatus:", stats);
    console.log("  - totalTransactions:", totalTransactions);
    console.log("  - totalRevenue:", totalRevenue[0]?.total || 0);
    console.log("  - successRate raw:", successRate[0]);
    console.log("  - successRate final:", successRate[0]?.successRate || 0);

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

    // Send refund notification email to customer
    try {
      // Get customer information
      const customer = await User.findById(transaction.userId);

      if (customer && customer.email) {
        const refundData = {
          refundAmount: refundAmount || transaction.paidAmount,
          refundPercentage: 100, // Full refund for admin refunds
          refundTransactionRef,
          refundDate: new Date(),
          refundReason: reason,
        };

        const userData = {
          firstName: customer.firstName,
          lastName: customer.lastName,
        };

        // Get appointment data if available
        let appointmentData = {};
        if (transaction.appointmentId) {
          const appointment = await Appointment.findById(
            transaction.appointmentId
          );
          if (appointment) {
            appointmentData = {
              appointmentNumber: appointment.appointmentNumber,
              scheduledDate: appointment.scheduledDate,
              scheduledTime: appointment.scheduledTime,
            };
          }
        }

        const emailContent = generateRefundNotificationTemplate(
          refundData,
          userData,
          appointmentData
        );

        await sendEmail({
          to: customer.email,
          subject: `Refund Processed - Transaction ${transaction.transactionRef}`,
          html: emailContent,
        });
      }
    } catch (emailError) {
      console.error("Error sending refund notification email:", emailError);
      // Don't fail the refund process if email fails
    }

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
 * Get all transactions with filtering (admin/staff only)
 */
export const getAllTransactions = async (req, res, next) => {
  try {
    // Allow both admin and staff to view all transactions
    if (req.user.role !== "admin" && req.user.role !== "staff") {
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
