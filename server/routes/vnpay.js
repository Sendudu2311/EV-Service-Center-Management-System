import express from "express";
import { protect } from "../middleware/auth.js";
import * as vnpayController from "../controllers/vnpayController.js";

const router = express.Router();

/**
 * @route   POST /api/vnpay/create-payment
 * @desc    Create VNPay payment URL for appointment booking
 * @access  Private
 */
router.post("/create-payment", protect, vnpayController.createPayment);

/**
 * @route   GET /api/vnpay/return
 * @desc    VNPay return URL handler - just verify and redirect
 * @access  Public
 */
router.get("/return", vnpayController.handleReturn);

/**
 * @route   POST /api/vnpay/ipn
 * @desc    VNPay IPN (Instant Payment Notification) handler
 * @access  Public
 */
router.post("/ipn", vnpayController.handleIPN);

/**
 * @route   GET /api/vnpay/payment-methods
 * @desc    Get available VNPay payment methods
 * @access  Private
 */
router.get("/payment-methods", protect, vnpayController.getPaymentMethods);

/**
 * @route   POST /api/vnpay/check-transaction
 * @desc    Check transaction status
 * @access  Private
 */
router.post("/check-transaction", protect, vnpayController.checkTransaction);

/**
 * @route   POST /api/vnpay/verify-appointment-payment
 * @desc    Verify appointment payment and trigger post-payment workflow
 *          This is called AFTER user confirms booking in frontend
 * @access  Private
 */
router.post(
  "/verify-appointment-payment",
  protect,
  vnpayController.verifyAppointmentPayment
);

/**
 * @route   GET /api/vnpay/test
 * @desc    Test VNPay configuration
 * @access  Public
 */
router.get("/test", vnpayController.testConfig);

/**
 * @route   GET /api/vnpay/debug-pending-payments
 * @desc    Debug endpoint to check pending payments
 * @access  Private
 */
router.get(
  "/debug-pending-payments",
  protect,
  vnpayController.debugPendingPayments
);

/**
 * @route   GET /api/vnpay/transactions
 * @desc    Get user transaction history
 * @access  Private
 */
router.get("/transactions", protect, vnpayController.getUserTransactions);

/**
 * @route   GET /api/vnpay/transactions/:transactionId
 * @desc    Get transaction by ID
 * @access  Private
 */
router.get("/transactions/:transactionId", protect, vnpayController.getTransactionById);

/**
 * @route   GET /api/vnpay/transactions/stats
 * @desc    Get transaction statistics
 * @access  Private
 */
router.get("/transactions/stats", protect, vnpayController.getTransactionStats);

/**
 * @route   PUT /api/vnpay/transactions/:transactionId/status
 * @desc    Update transaction status (admin only)
 * @access  Private/Admin
 */
router.put(
  "/transactions/:transactionId/status",
  protect,
  vnpayController.updateTransactionStatus
);

/**
 * @route   POST /api/vnpay/transactions/:transactionId/refund
 * @desc    Refund transaction (admin only)
 * @access  Private/Admin
 */
router.post(
  "/transactions/:transactionId/refund",
  protect,
  vnpayController.refundTransaction
);

/**
 * @route   GET /api/vnpay/transactions/expired
 * @desc    Get expired transactions (admin only)
 * @access  Private/Admin
 */
router.get(
  "/transactions/expired",
  protect,
  vnpayController.getExpiredTransactions
);

/**
 * @route   POST /api/vnpay/transactions/cleanup-expired
 * @desc    Clean up expired transactions (admin only)
 * @access  Private/Admin
 */
router.post(
  "/transactions/cleanup-expired",
  protect,
  vnpayController.cleanupExpiredTransactions
);

export default router;
