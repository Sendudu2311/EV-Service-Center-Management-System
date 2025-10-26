import express from "express";
import {
  getAllTransactions,
  getMyTransactions,
  getTransactionById,
  recordCashPayment,
  recordCardPayment,
  recordBankTransferPayment,
  processRefund,
  updateTransactionStatus,
  getTransactionStatistics,
  processExpiredTransactions,
} from "../controllers/transactionController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// @route   GET /api/transactions
// @desc    Get all transactions (Admin/Staff only)
// @access  Private (Admin/Staff)
router.get("/", protect, getAllTransactions);

// @route   GET /api/transactions/my
// @desc    Get user's transactions
// @access  Private (Customer)
router.get("/my", protect, getMyTransactions);

// @route   GET /api/transactions/statistics
// @desc    Get transaction statistics
// @access  Private (Admin/Staff)
router.get("/statistics", protect, getTransactionStatistics);

// @route   GET /api/transactions/:id
// @desc    Get transaction by ID
// @access  Private
router.get("/:id", protect, getTransactionById);

// @route   POST /api/transactions/cash
// @desc    Record cash payment
// @access  Private (Staff/Admin)
router.post("/cash", protect, recordCashPayment);

// @route   POST /api/transactions/card
// @desc    Record card payment
// @access  Private (Staff/Admin)
router.post("/card", protect, recordCardPayment);

// @route   POST /api/transactions/bank-transfer
// @desc    Record bank transfer payment
// @access  Private (Staff/Admin)
router.post("/bank-transfer", protect, recordBankTransferPayment);

// @route   POST /api/transactions/:id/refund
// @desc    Process refund for a transaction
// @access  Private (Admin/Staff)
router.post("/:id/refund", protect, processRefund);

// @route   PUT /api/transactions/:id/status
// @desc    Update transaction status
// @access  Private (Admin/Staff)
router.put("/:id/status", protect, updateTransactionStatus);

// @route   POST /api/transactions/process-expired
// @desc    Process expired transactions
// @access  Private (Admin/Staff)
router.post("/process-expired", protect, processExpiredTransactions);

export default router;
