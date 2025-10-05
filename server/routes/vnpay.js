import express from 'express';
import { vnpay } from '../config/vnpay.js';
import { protect } from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';
import Appointment from '../models/Appointment.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/vnpay/create-payment
 * @desc    Create VNPay payment URL for appointment booking
 * @access  Private
 */
router.post('/create-payment', async (req, res, next) => {
  try {
    console.log('VNPay create-payment called with body:', req.body);

    const { amount, bankCode, language, orderInfo, appointmentData } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    // Generate unique transaction reference
    const transactionRef = `APP${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    // Convert VND to VNPay amount (multiply by 100)
    const vnpayAmount = Math.round(amount) * 100;

    // Create payment URL parameters
    const paymentParams = {
      vnp_TxnRef: transactionRef,
      vnp_OrderInfo: orderInfo || `Thanh toan dich vu xe dien ${amount} VND`,
      vnp_OrderType: 'other', // Changed from 'billpayment' to 'other' for better compatibility
      vnp_Amount: vnpayAmount,
      vnp_ReturnUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment/vnpay-return`,
      vnp_IpAddr: req.ip || '127.0.0.1',
      vnp_CreateDate: parseInt(new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)), // Fixed: convert to number
      vnp_CurrCode: 'VND',
      vnp_Locale: language || 'vn',
      vnp_Version: '2.1.0', // Include version directly
      vnp_Command: 'pay' // Include command directly
    };

    // Add bank code if provided
    if (bankCode) {
      paymentParams.vnp_BankCode = bankCode;
    }

    // Get user info for billing
    const user = req.user;
    if (user) {
      paymentParams.vnp_Bill_Mobile = user.phone || '';
      paymentParams.vnp_Bill_Email = user.email || '';
    }

    // Create payment URL
    console.log('Creating payment with params:', paymentParams);

    let paymentUrl;
    try {
      paymentUrl = vnpay.buildPaymentUrl(paymentParams);
      console.log('Generated payment URL:', paymentUrl);

      if (!paymentUrl) {
        throw new Error('Failed to generate payment URL');
      }
    } catch (vnpayError) {
      console.error('VNPay library error:', vnpayError);
      console.error('VNPay library error stack:', vnpayError.stack);
      throw new Error(`VNPay error: ${vnpayError.message}`);
    }

    // Store payment reference in session or temporary storage
    // For now, we'll store it in a simple object (in production, use Redis or similar)
    if (!global.pendingPayments) {
      global.pendingPayments = {};
    }

    global.pendingPayments[transactionRef] = {
      amount: amount,
      userId: user._id,
      createdAt: new Date(),
      appointmentData: appointmentData, // Store complete appointment data
      ...paymentParams
    };

    res.json({
      success: true,
      paymentUrl,
      transactionRef: paymentParams.vnp_TxnRef,
      amount: Math.round(amount)
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/vnpay/return
 * @desc    VNPay return URL handler for appointment payments
 * @access  Public
 */
router.get('/return', async (req, res, next) => {
  try {
    const vnp_Params = req.query;

    // Verify the return URL
    const verify = vnpay.verifyReturnUrl(vnp_Params);

    if (!verify) {
      const redirectUrl = `${process.env.CLIENT_URL}/payment/result?success=false&error=Invalid payment verification`;
      return res.redirect(redirectUrl);
    }

    const { vnp_TxnRef, vnp_ResponseCode, vnp_TransactionNo, vnp_Amount } = vnp_Params;

    // Check if this is an appointment payment (stored in pendingPayments)
    const pendingPayment = global.pendingPayments?.[vnp_TxnRef];

    console.log('VNPay Return - Checking for pending payment:', {
      vnp_TxnRef,
      hasPendingPayment: !!pendingPayment,
      allPendingPayments: Object.keys(global.pendingPayments || {})
    });

    if (pendingPayment) {
      console.log('Found pending payment:', JSON.stringify(pendingPayment, null, 2));

      // This is an appointment payment
      const success = vnp_ResponseCode === '00';
      console.log('Payment success:', success, 'Response code:', vnp_ResponseCode);

      // Update pending payment status
      pendingPayment.status = success ? 'completed' : 'failed';
      pendingPayment.responseCode = vnp_ResponseCode;
      pendingPayment.transactionNo = vnp_TransactionNo;
      pendingPayment.completedAt = new Date();

      let createdAppointment = null;

      if (success) {
        // Convert amount back from VNPay format
        const paidAmount = parseInt(vnp_Amount) / 100;
        pendingPayment.paidAmount = paidAmount;

        pendingPayment.vnpayTransaction = {
          transactionNo: vnp_TransactionNo,
          responseCode: vnp_ResponseCode,
          bankCode: vnp_Params.vnp_BankCode || '',
          cardType: vnp_Params.vnp_CardType || '',
          payDate: vnp_Params.vnp_PayDate || '',
          amount: paidAmount
        };

        // Note: Auto-appointment creation has been removed.
      // The frontend will handle appointment creation after payment verification.
      console.log('Payment successful, waiting for frontend to complete appointment booking');
      }

      // Convert amount back from VNPay format for consistency
      const displayAmount = parseInt(vnp_Amount) / 100;

      // Redirect to frontend with result
      const redirectUrl = `${process.env.CLIENT_URL}/payment/vnpay-return?success=${success}&transactionRef=${vnp_TxnRef}&amount=${displayAmount}${createdAppointment ? `&appointmentId=${createdAppointment._id}` : ''}`;
      return res.redirect(redirectUrl);
    } else {
      // Try to find invoice by transaction reference (fallback for invoice payments)
      const invoice = await Invoice.findOne({ 'paymentInfo.transactionRef': vnp_TxnRef });

      if (!invoice) {
        const redirectUrl = `${process.env.CLIENT_URL}/payment/result?success=false&error=Payment record not found`;
        return res.redirect(redirectUrl);
      }

      // Convert amount back from VNPay format
      const paidAmount = parseInt(vnp_Amount) / 100;

      // Update invoice based on payment result
      if (vnp_ResponseCode === '00') {
        // Payment successful
        invoice.paymentInfo.status = 'paid';
        invoice.paymentInfo.paidAmount = paidAmount;
        invoice.paymentInfo.remainingAmount = 0;
        invoice.paymentInfo.paymentDate = new Date();
        invoice.status = 'paid';

        // Add payment transaction details
        invoice.paymentInfo.vnpayTransaction = {
          transactionNo: vnp_TransactionNo,
          responseCode: vnp_ResponseCode,
          bankCode: vnp_Params.vnp_BankCode || '',
          cardType: vnp_Params.vnp_CardType || '',
          payDate: vnp_Params.vnp_PayDate || ''
        };
      } else {
        // Payment failed
        invoice.paymentInfo.status = 'unpaid';
        invoice.paymentInfo.paymentNotes = `Payment failed: ${vnp_ResponseCode}`;
      }

      await invoice.save();

      // Redirect to frontend with result
      const redirectUrl = `${process.env.CLIENT_URL}/payment/vnpay-return?success=${vnp_ResponseCode === '00'}&invoiceId=${invoice._id}&transactionRef=${vnp_TxnRef}`;
      return res.redirect(redirectUrl);
    }

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/vnpay/ipn
 * @desc    VNPay IPN (Instant Payment Notification) handler
 * @access  Public
 */
router.post('/ipn', async (req, res, next) => {
  try {
    const vnp_Params = req.body;

    // Verify the IPN
    const verify = vnpay.verifyReturnUrl(vnp_Params);

    if (!verify) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IPN verification'
      });
    }

    const { vnp_TxnRef, vnp_ResponseCode, vnp_TransactionNo, vnp_Amount } = vnp_Params;

    // Check if this is an appointment payment (stored in pendingPayments)
    const pendingPayment = global.pendingPayments?.[vnp_TxnRef];

    console.log('VNPay IPN - Checking for pending payment:', {
      vnp_TxnRef,
      hasPendingPayment: !!pendingPayment,
      allPendingPayments: Object.keys(global.pendingPayments || {})
    });

    if (pendingPayment) {
      console.log('IPN - Found pending payment:', JSON.stringify(pendingPayment, null, 2));

      // This is an appointment payment
      const success = vnp_ResponseCode === '00';
      console.log('IPN - Payment success:', success, 'Response code:', vnp_ResponseCode);

      // Update pending payment status
      pendingPayment.status = success ? 'completed' : 'failed';
      pendingPayment.responseCode = vnp_ResponseCode;
      pendingPayment.transactionNo = vnp_TransactionNo;
      pendingPayment.completedAt = new Date();

      if (success) {
        // Convert amount back from VNPay format
        const paidAmount = parseInt(vnp_Amount) / 100;
        pendingPayment.paidAmount = paidAmount;

        pendingPayment.vnpayTransaction = {
          transactionNo: vnp_TransactionNo,
          responseCode: vnp_ResponseCode,
          bankCode: vnp_Params.vnp_BankCode || '',
          cardType: vnp_Params.vnp_CardType || '',
          payDate: vnp_Params.vnp_PayDate || '',
          amount: paidAmount
        };

        // Note: Auto-appointment creation has been removed from IPN as well.
      // The frontend will handle appointment creation after payment verification.
      console.log('IPN - Payment successful, waiting for frontend to complete appointment booking');
      }

      // Respond to VNPay
      return res.json({
        RspCode: '00',
        Message: 'Confirm Success'
      });
    } else {
      // Try to find invoice by transaction reference (fallback for invoice payments)
      const invoice = await Invoice.findOne({ 'paymentInfo.transactionRef': vnp_TxnRef });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }

      // Convert amount back from VNPay format
      const paidAmount = parseInt(vnp_Amount) / 100;

      // Update invoice based on payment result
      if (vnp_ResponseCode === '00') {
        // Payment successful
        invoice.paymentInfo.status = 'paid';
        invoice.paymentInfo.paidAmount = paidAmount;
        invoice.paymentInfo.remainingAmount = 0;
        invoice.paymentInfo.paymentDate = new Date();
        invoice.status = 'paid';

        // Add payment transaction details
        invoice.paymentInfo.vnpayTransaction = {
          transactionNo: vnp_TransactionNo,
          responseCode: vnp_ResponseCode,
          bankCode: vnp_Params.vnp_BankCode || '',
          cardType: vnp_Params.vnp_CardType || '',
          payDate: vnp_Params.vnp_PayDate || ''
        };
      } else {
        // Payment failed
        invoice.paymentInfo.status = 'unpaid';
        invoice.paymentInfo.paymentNotes = `Payment failed: ${vnp_ResponseCode}`;
      }

      await invoice.save();

      // Respond to VNPay
      res.json({
        RspCode: '00',
        Message: 'Confirm Success'
      });
    }

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/vnpay/payment-methods
 * @desc    Get available VNPay payment methods
 * @access  Private
 */
router.get('/payment-methods', async (req, res, next) => {
  try {
    // Common VNPay bank codes
    const paymentMethods = [
      {
        code: 'VNPAYQR',
        name: 'VNPay QR Code',
        description: 'Thanh toán bằng mã QR'
      },
      {
        code: 'VNBANK',
        name: 'VNBank',
        description: 'Thẻ nội địa Việt Nam'
      },
      {
        code: 'INTCARD',
        name: 'International Card',
        description: 'Thẻ quốc tế (Visa, Mastercard)'
      },
      {
        code: 'VISA',
        name: 'Visa',
        description: 'Thẻ Visa'
      },
      {
        code: 'MASTERCARD',
        name: 'Mastercard',
        description: 'Thẻ Mastercard'
      },
      {
        code: 'JCB',
        name: 'JCB',
        description: 'Thẻ JCB'
      },
      {
        code: 'UPI',
        name: 'UPI',
        description: 'United Payments International'
      }
    ];

    res.json({
      success: true,
      paymentMethods
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/vnpay/check-transaction
 * @desc    Check transaction status
 * @access  Private
 */
router.post('/check-transaction', async (req, res, next) => {
  try {
    const { transactionRef } = req.body;

    if (!transactionRef) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    // Check if this is an appointment payment
    const pendingPayment = global.pendingPayments?.[transactionRef];

    if (pendingPayment) {
      // This is an appointment payment
      res.json({
        success: true,
        transactionRef,
        paymentType: 'appointment',
        paymentStatus: pendingPayment.status || 'pending',
        amount: pendingPayment.amount,
        createdAt: pendingPayment.createdAt,
        completedAt: pendingPayment.completedAt || null,
        vnpayTransaction: pendingPayment.vnpayTransaction || null
      });
    } else {
      // Try to find invoice by transaction reference (fallback for invoice payments)
      const invoice = await Invoice.findOne({ 'paymentInfo.transactionRef': transactionRef });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      res.json({
        success: true,
        transactionRef,
        paymentType: 'invoice',
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        paymentStatus: invoice.paymentInfo.status,
        amount: invoice.totals.totalAmount,
        paidAmount: invoice.paymentInfo.paidAmount,
        paymentDate: invoice.paymentInfo.paymentDate,
        vnpayTransaction: invoice.paymentInfo.vnpayTransaction || null
      });
    }

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/vnpay/verify-appointment-payment
 * @desc    Verify appointment payment for booking
 * @access  Private
 */
router.post('/verify-appointment-payment', async (req, res, next) => {
  try {
    const { transactionRef } = req.body;

    if (!transactionRef) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    // Check if this is a completed appointment payment
    const pendingPayment = global.pendingPayments?.[transactionRef];

    if (!pendingPayment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    if (pendingPayment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed or failed'
      });
    }

    // Verify user ownership
    if (pendingPayment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to payment'
      });
    }

    // Clean up the pending payment (in production, you might want to keep it for audit)
    delete global.pendingPayments[transactionRef];

    res.json({
      success: true,
      message: 'Payment verified successfully',
      paymentInfo: {
        transactionRef,
        amount: pendingPayment.amount,
        method: 'vnpay',
        paymentDate: pendingPayment.completedAt,
        vnpayTransaction: pendingPayment.vnpayTransaction
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/vnpay/test
 * @desc    Test VNPay configuration
 * @access  Private
 */
router.get('/test', async (req, res) => {
  try {
    console.log('VNPay test endpoint called');
    console.log('VNPay instance:', typeof vnpay);
    console.log('Environment:', {
      tmnCode: process.env.VNPAY_TMN_CODE ? 'Set' : 'Not set',
      secureSecret: process.env.VNPAY_SECURE_SECRET ? 'Set' : 'Not set',
      vnpayHost: process.env.VNPAY_HOST || 'Not set',
      clientUrl: process.env.CLIENT_URL || 'Not set'
    });

    // Test with minimal parameters
    const testParams = {
      vnp_TxnRef: 'TEST123',
      vnp_OrderInfo: 'Test payment',
      vnp_OrderType: 'other',
      vnp_Amount: 100000, // 1000 VND * 100
      vnp_ReturnUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment/vnpay-return`,
      vnp_IpAddr: '127.0.0.1',
      vnp_CreateDate: parseInt(new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)), // Fixed: convert to number
      vnp_CurrCode: 'VND',
      vnp_Locale: 'vn',
      vnp_Version: '2.1.0',
      vnp_Command: 'pay'
    };

    console.log('Test parameters:', testParams);

    const paymentUrl = vnpay.buildPaymentUrl(testParams);

    res.json({
      success: true,
      message: 'VNPay configuration test successful',
      paymentUrl: paymentUrl,
      testParams: testParams
    });

  } catch (error) {
    console.error('VNPay test error:', error);
    res.status(500).json({
      success: false,
      message: 'VNPay test failed',
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * @route   GET /api/vnpay/debug-pending-payments
 * @desc    Debug endpoint to check pending payments
 * @access  Private
 */
router.get('/debug-pending-payments', async (req, res) => {
  try {
    console.log('Debug pending payments endpoint called');

    const pendingPayments = global.pendingPayments || {};
    const pendingPaymentKeys = Object.keys(pendingPayments);

    console.log('Current pending payments:', pendingPaymentKeys);

    const details = {};
    for (const key of pendingPaymentKeys) {
      details[key] = {
        ...pendingPayments[key],
        // Don't log sensitive data in production
        appointmentData: pendingPayments[key].appointmentData ? 'EXISTS' : 'NOT FOUND'
      };
    }

    res.json({
      success: true,
      count: pendingPaymentKeys.length,
      pendingPaymentKeys: pendingPaymentKeys,
      details: details
    });
  } catch (error) {
    console.error('Debug pending payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/vnpay/test-appointment-creation
 * @desc    Test appointment creation with sample data
 * @access  Private
 */
router.post('/test-appointment-creation', async (req, res) => {
  try {
    console.log('Test appointment creation endpoint called');

    const testAppointmentData = {
      vehicleId: '64f7b8e9a1b2c3d4e5f6a7b8', // Replace with real ID
      serviceCenterId: '64f7b8e9a1b2c3d4e5f6a7b9', // Replace with real ID
      scheduledDate: '2025-01-15',
      scheduledTime: '10:00',
      services: [
        {
          serviceId: '64f7b8e9a1b2c3d4e5f6a7ba',
          quantity: 1,
          price: 200000,
          estimatedDuration: 60
        }
      ],
      priority: 'normal',
      customerNotes: 'Test appointment creation'
    };

    console.log('Test appointment data:', testAppointmentData);

    // Generate appointment number
    const appointmentCount = await Appointment.countDocuments();
    const appointmentNumber = `APT${String(appointmentCount + 1).padStart(6, '0')}`;

    const scheduledDateTime = new Date(`${testAppointmentData.scheduledDate}T${testAppointmentData.scheduledTime}:00`);

    const appointmentPayload = {
      appointmentNumber,
      customerId: req.user._id,
      vehicleId: testAppointmentData.vehicleId,
      serviceCenterId: testAppointmentData.serviceCenterId,
      services: testAppointmentData.services,
      scheduledDate: scheduledDateTime,
      scheduledTime: testAppointmentData.scheduledTime,
      status: 'Scheduled',
      detailedStatus: 'PendingConfirmation',
      priority: testAppointmentData.priority,
      customerNotes: testAppointmentData.customerNotes,
      technicianId: null,
      paymentInfo: {
        method: 'test',
        transactionRef: 'TEST123',
        amount: 200000,
        status: 'paid',
        paymentDate: new Date()
      }
    };

    console.log('Test appointment payload:', appointmentPayload);

    const createdAppointment = await Appointment.create(appointmentPayload);

    console.log('✅ Test appointment created successfully:', createdAppointment._id);

    res.json({
      success: true,
      message: 'Test appointment created successfully',
      appointmentId: createdAppointment._id,
      appointmentNumber: createdAppointment.appointmentNumber
    });

  } catch (error) {
    console.error('❌ Test appointment creation failed:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);

    res.status(500).json({
      success: false,
      message: 'Test appointment creation failed',
      error: error.message,
      code: error.code,
      name: error.name
    });
  }
});

export default router;