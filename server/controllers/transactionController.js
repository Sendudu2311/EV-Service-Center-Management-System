import TransactionService from "../services/transactionService.js";
import Transaction from "../models/Transaction.js";
import { sendSuccess, sendError } from "../utils/response.js";

/**
 * Transaction Controller - Handle all transaction-related API endpoints
 */

// @desc    Get all transactions (Admin/Staff only)
// @route   GET /api/transactions
// @access  Private (Admin/Staff)
export const getAllTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      transactionType,
      status,
      paymentPurpose,
      userId,
      appointmentId,
      invoiceId,
      startDate,
      endDate,
    } = req.query;

    const filters = {
      transactionType,
      status,
      paymentPurpose,
      userId,
      appointmentId,
      invoiceId,
      limit: parseInt(limit),
    };

    // Add date range filter
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    const transactions = await TransactionService.getTransactionHistory(
      filters
    );

    // Calculate pagination
    const total = await Transaction.countDocuments(filters);
    const totalPages = Math.ceil(total / limit);

    sendSuccess(res, 200, "Transactions retrieved successfully", {
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error getting all transactions:", error);
    sendError(res, 500, "Error getting transactions", error.message);
  }
};

// @desc    Get user's transactions
// @route   GET /api/transactions/my
// @access  Private (Customer)
export const getMyTransactions = async (req, res) => {
  try {
    const { transactionType, status, paymentPurpose, limit = 20 } = req.query;

    const filters = {
      userId: req.user._id,
      transactionType,
      status,
      paymentPurpose,
      limit: parseInt(limit),
    };

    console.log("🔍 Getting transactions for user:", req.user._id);
    console.log("📋 Filters:", filters);

    const transactions = await TransactionService.getTransactionHistory(
      filters
    );

    console.log("✅ Found transactions:", transactions?.length || 0);

    sendSuccess(res, 200, "Transactions retrieved successfully", { transactions });
  } catch (error) {
    console.error("Error getting user transactions:", error);
    sendError(res, 500, "Error getting your transactions", error.message);
  }
};

// @desc    Get transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await TransactionService.getTransactionById(id);

    if (!transaction) {
      return sendNotFoundError(res, "Transaction");
    }

    // Check if user can access this transaction
    if (req.user.role !== "admin" && req.user.role !== "staff") {
      if (transaction.userId._id.toString() !== req.user._id.toString()) {
        return sendAuthorizationError(res, "Access denied");
      }
    }

    sendSuccess(res, 200, "Transaction retrieved successfully", { transaction });
  } catch (error) {
    console.error("Error getting transaction by ID:", error);
    sendError(res, 500, "Error getting transaction", error.message);
  }
};

// @desc    Record cash payment
// @route   POST /api/transactions/cash
// @access  Private (Staff/Admin)
export const recordCashPayment = async (req, res) => {
  try {
    const {
      userId,
      appointmentId,
      invoiceId,
      amount,
      billingInfo,
      notes,
      customerNotes,
      cashData,
    } = req.body;

    // Validate required fields
    if (!userId || !amount) {
      return sendError(res, 400, "User ID and amount are required");
    }

    if (amount <= 0) {
      return sendError(res, 400, "Amount must be greater than 0");
    }

    // Determine payment purpose
    let paymentPurpose = "other";
    if (appointmentId) paymentPurpose = "appointment_deposit";
    if (invoiceId) paymentPurpose = "invoice_payment";

    const transactionData = {
      userId,
      appointmentId,
      invoiceId,
      amount,
      paymentPurpose,
      billingInfo,
      notes,
      customerNotes,
      cashData: {
        ...cashData,
        receivedBy: req.user._id,
      },
    };

    const transaction = await TransactionService.createTransaction(
      "cash",
      transactionData
    );

    sendSuccess(res, 201, "Cash payment recorded successfully", {
      transaction,
    });
  } catch (error) {
    console.error("Error recording cash payment:", error);
    sendError(res, 500, "Error recording cash payment", error.message);
  }
};

// @desc    Record card payment
// @route   POST /api/transactions/card
// @access  Private (Staff/Admin)
export const recordCardPayment = async (req, res) => {
  try {
    const {
      userId,
      appointmentId,
      invoiceId,
      amount,
      billingInfo,
      notes,
      customerNotes,
      cardData,
    } = req.body;

    // Validate required fields
    if (!userId || !amount || !cardData?.cardType || !cardData?.last4Digits) {
      return res
        .status(400)
        .json(
          sendError(
            "User ID, amount, card type, and last 4 digits are required"
          )
        );
    }

    if (amount <= 0) {
      return sendError(res, 400, "Amount must be greater than 0");
    }

    // Determine payment purpose
    let paymentPurpose = "other";
    if (appointmentId) paymentPurpose = "appointment_deposit";
    if (invoiceId) paymentPurpose = "invoice_payment";

    const transactionData = {
      userId,
      appointmentId,
      invoiceId,
      amount,
      paymentPurpose,
      billingInfo,
      notes,
      customerNotes,
      cardData: {
        ...cardData,
        processedBy: req.user._id,
      },
    };

    const transaction = await TransactionService.createTransaction(
      "card",
      transactionData
    );

    sendSuccess(res, 201, "Card payment recorded successfully", {
      transaction,
    });
  } catch (error) {
    console.error("Error recording card payment:", error);
    sendError(res, 500, "Error recording card payment", error.message);
  }
};

// @desc    Record bank transfer payment
// @route   POST /api/transactions/bank-transfer
// @access  Private (Staff/Admin)
export const recordBankTransferPayment = async (req, res) => {
  try {
    const {
      userId,
      appointmentId,
      invoiceId,
      amount,
      billingInfo,
      notes,
      customerNotes,
      bankTransferData,
    } = req.body;

    // Validate required fields
    if (
      !userId ||
      !amount ||
      !bankTransferData?.bankName ||
      !bankTransferData?.transferRef
    ) {
      return res
        .status(400)
        .json(
          sendError(
            "User ID, amount, bank name, and transfer reference are required"
          )
        );
    }

    if (amount <= 0) {
      return sendError(res, 400, "Amount must be greater than 0");
    }

    // Determine payment purpose
    let paymentPurpose = "other";
    if (appointmentId) paymentPurpose = "appointment_deposit";
    if (invoiceId) paymentPurpose = "invoice_payment";

    const transactionData = {
      userId,
      appointmentId,
      invoiceId,
      amount,
      paymentPurpose,
      billingInfo,
      notes,
      customerNotes,
      bankTransferData: {
        ...bankTransferData,
        verifiedBy: req.user._id,
      },
    };

    const transaction = await TransactionService.createTransaction(
      "bank_transfer",
      transactionData
    );

    res.status(201).json(
      sendSuccess({
        message: "Bank transfer payment recorded successfully",
        transaction,
      })
    );
  } catch (error) {
    console.error("Error recording bank transfer payment:", error);
    res
      .status(500)
      .json(sendError("Error recording bank transfer payment", error.message));
  }
};

// @desc    Process refund for a transaction
// @route   POST /api/transactions/:id/refund
// @access  Private (Admin/Staff)
export const processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason, customerNotes } = req.body;

    if (!reason) {
      return sendError(res, 400, "Refund reason is required");
    }

    const refundData = {
      amount,
      reason,
      customerNotes,
    };

    const refundTransaction = await TransactionService.processRefund(
      id,
      refundData
    );

    res.json(
      sendSuccess({
        message: "Refund processed successfully",
        refundTransaction,
      })
    );
  } catch (error) {
    console.error("Error processing refund:", error);
    sendError(res, 500, "Error processing refund", error.message);
  }
};

// @desc    Update transaction status
// @route   PUT /api/transactions/:id/status
// @access  Private (Admin/Staff)
export const updateTransactionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, additionalData } = req.body;

    if (!status) {
      return sendError(res, 400, "Status is required");
    }

    const transaction = await TransactionService.updateTransactionStatus(
      id,
      status,
      additionalData
    );

    res.json(
      sendSuccess({
        message: "Transaction status updated successfully",
        transaction,
      })
    );
  } catch (error) {
    console.error("Error updating transaction status:", error);
    res
      .status(500)
      .json(sendError("Error updating transaction status", error.message));
  }
};

// @desc    Get transaction statistics
// @route   GET /api/transactions/statistics
// @access  Private (Admin/Staff)
export const getTransactionStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateRange = {};
    if (startDate) dateRange.startDate = new Date(startDate);
    if (endDate) dateRange.endDate = new Date(endDate);

    const statistics = await TransactionService.getTransactionStatistics(
      dateRange
    );

    sendSuccess(res, 200, "Statistics retrieved successfully", { statistics });
  } catch (error) {
    console.error("Error getting transaction statistics:", error);
    res
      .status(500)
      .json(sendError("Error getting transaction statistics", error.message));
  }
};

// @desc    Process expired transactions
// @route   POST /api/transactions/process-expired
// @access  Private (Admin/Staff)
export const processExpiredTransactions = async (req, res) => {
  try {
    const expiredTransactions =
      await TransactionService.processExpiredTransactions();

    res.json(
      sendSuccess({
        message: "Expired transactions processed successfully",
        expiredCount: expiredTransactions.length,
        expiredTransactions,
      })
    );
  } catch (error) {
    console.error("Error processing expired transactions:", error);
    res
      .status(500)
      .json(sendError("Error processing expired transactions", error.message));
  }
};
