import mongoose from "mongoose";
import VNPAYTransaction from "../models/VNPAYTransaction.js";
import Transaction from "../models/Transaction.js";
import VNPAYTransactionNew from "../models/transactions/VNPAYTransaction.js";

/**
 * Transaction Migration Utilities
 * Handles backward compatibility between old and new transaction systems
 */

/**
 * Detect if a transaction ID belongs to old or new system
 * @param {string} transactionId - Transaction ID to check
 * @returns {Promise<{isOld: boolean, model: string}>} Detection result
 */
export const getTransactionModel = async (transactionId) => {
  try {
    // First check in new transactions collection
    const newTransaction = await Transaction.findById(transactionId);
    if (newTransaction) {
      return {
        isOld: false,
        model: "Transaction",
        transaction: newTransaction,
      };
    }

    // Then check in old VNPAY transactions collection
    const oldTransaction = await VNPAYTransaction.findById(transactionId);
    if (oldTransaction) {
      return {
        isOld: true,
        model: "VNPAYTransaction",
        transaction: oldTransaction,
      };
    }

    return {
      isOld: null,
      model: null,
      transaction: null,
    };
  } catch (error) {
    console.error("Error detecting transaction model:", error);
    throw error;
  }
};

/**
 * Normalize transaction response format for API consistency
 * @param {Object} transaction - Transaction object (old or new)
 * @param {boolean} isOld - Whether it's from old system
 * @returns {Object} Normalized transaction
 */
export const normalizeTransaction = (transaction, isOld = false) => {
  if (!transaction) return null;

  if (isOld) {
    // Convert old VNPAYTransaction to new format
    return {
      _id: transaction._id,
      transactionRef: transaction.transactionRef,
      transactionType: "vnpay",
      paymentPurpose: mapOldPaymentType(transaction.paymentType),
      userId: transaction.userId,
      appointmentId: transaction.appointmentId,
      invoiceId: transaction.invoiceId,
      amount: transaction.amount,
      paidAmount: transaction.paidAmount || 0,
      currency: transaction.currency || "VND",
      status: transaction.status,
      processedBy: transaction.processedBy,
      processedAt: transaction.vnpayData?.paymentDate,
      errorMessage: transaction.errorMessage,
      errorCode: transaction.errorCode,
      metadata: {
        ...transaction.metadata,
        orderInfo: transaction.orderInfo,
        orderType: transaction.orderType,
        responseCode: transaction.responseCode,
        transactionNo: transaction.vnpayData?.transactionNo,
      },
      billingInfo: transaction.billingInfo || {},
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      expiresAt: transaction.expiresAt,
      settlementInfo: transaction.settlementInfo || {
        settled: false,
      },
      notes: transaction.notes,
      customerNotes: transaction.customerNotes,
      vnpayData: transaction.vnpayData || {},
      // Legacy fields for backward compatibility
      legacy: true,
      paymentType: transaction.paymentType,
      orderInfo: transaction.orderInfo,
      orderType: transaction.orderType,
    };
  } else {
    // New transaction format - return as is with legacy fields
    return {
      ...transaction.toObject(),
      // Add legacy fields for backward compatibility
      paymentType: mapNewPaymentPurpose(transaction.paymentPurpose),
      orderInfo: transaction.metadata?.orderInfo,
      orderType: transaction.metadata?.orderType,
      responseCode: transaction.metadata?.responseCode,
      transactionNo: transaction.vnpayData?.transactionNo,
      legacy: false,
    };
  }
};

/**
 * Map old payment type to new payment purpose
 * @param {string} oldPaymentType - Old payment type
 * @returns {string} New payment purpose
 */
const mapOldPaymentType = (oldPaymentType) => {
  const mapping = {
    appointment: "appointment_deposit",
    invoice: "invoice_payment",
    service: "service_payment",
    refund: "refund",
    deposit: "deposit_booking",
    other: "other",
  };
  return mapping[oldPaymentType] || "other";
};

/**
 * Map new payment purpose to old payment type
 * @param {string} paymentPurpose - New payment purpose
 * @returns {string} Old payment type
 */
const mapNewPaymentPurpose = (paymentPurpose) => {
  const mapping = {
    appointment_deposit: "appointment",
    appointment_payment: "appointment",
    invoice_payment: "invoice",
    service_payment: "service",
    refund: "refund",
    deposit_booking: "deposit",
    other: "other",
  };
  return mapping[paymentPurpose] || "other";
};

/**
 * Get transaction with normalized format
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object>} Normalized transaction
 */
export const getNormalizedTransaction = async (transactionId) => {
  try {
    const detection = await getTransactionModel(transactionId);

    if (!detection.transaction) {
      return null;
    }

    return normalizeTransaction(detection.transaction, detection.isOld);
  } catch (error) {
    console.error("Error getting normalized transaction:", error);
    throw error;
  }
};

/**
 * Get transactions with normalized format
 * @param {Object} filters - Filter options
 * @param {boolean} includeOld - Whether to include old transactions
 * @returns {Promise<Array>} Array of normalized transactions
 */
export const getNormalizedTransactions = async (
  filters = {},
  includeOld = true
) => {
  try {
    const transactions = [];

    // Get new transactions
    const newTransactions = await Transaction.find(filters)
      .populate("userId", "firstName lastName email phone")
      .populate("appointmentId", "appointmentNumber scheduledDate")
      .populate("invoiceId", "invoiceNumber")
      .populate("processedBy", "firstName lastName")
      .sort({ createdAt: -1 });

    for (const transaction of newTransactions) {
      transactions.push(normalizeTransaction(transaction, false));
    }

    // Get old transactions if requested
    if (includeOld) {
      const oldFilters = {
        ...filters,
        // Map new filters to old format
        paymentType: filters.paymentPurpose
          ? mapNewPaymentPurpose(filters.paymentPurpose)
          : undefined,
      };

      // Remove undefined values
      Object.keys(oldFilters).forEach((key) => {
        if (oldFilters[key] === undefined) {
          delete oldFilters[key];
        }
      });

      const oldTransactions = await VNPAYTransaction.find(oldFilters)
        .populate("userId", "firstName lastName email phone")
        .populate("appointmentId", "appointmentNumber scheduledDate")
        .populate("invoiceId", "invoiceNumber")
        .sort({ createdAt: -1 });

      for (const transaction of oldTransactions) {
        transactions.push(normalizeTransaction(transaction, true));
      }
    }

    // Sort by creation date
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return transactions;
  } catch (error) {
    console.error("Error getting normalized transactions:", error);
    throw error;
  }
};

/**
 * Migrate old VNPAYTransaction to new Transaction system
 * @param {string} transactionId - Old transaction ID
 * @returns {Promise<Object>} New transaction
 */
export const migrateTransaction = async (transactionId) => {
  try {
    const oldTransaction = await VNPAYTransaction.findById(transactionId);
    if (!oldTransaction) {
      throw new Error("Old transaction not found");
    }

    // Check if already migrated
    const existingNewTransaction = await Transaction.findOne({
      transactionRef: oldTransaction.transactionRef,
    });
    if (existingNewTransaction) {
      return existingNewTransaction;
    }

    // Create new transaction
    const newTransaction = await VNPAYTransactionNew.create({
      transactionRef: oldTransaction.transactionRef,
      transactionType: "vnpay",
      paymentPurpose: mapOldPaymentType(oldTransaction.paymentType),
      userId: oldTransaction.userId,
      appointmentId: oldTransaction.appointmentId,
      invoiceId: oldTransaction.invoiceId,
      amount: oldTransaction.amount,
      paidAmount: oldTransaction.paidAmount || 0,
      currency: oldTransaction.currency || "VND",
      status: oldTransaction.status,
      processedBy: oldTransaction.processedBy,
      processedAt: oldTransaction.vnpayData?.paymentDate,
      errorMessage: oldTransaction.errorMessage,
      errorCode: oldTransaction.errorCode,
      metadata: {
        ...oldTransaction.metadata,
        orderInfo: oldTransaction.orderInfo,
        orderType: oldTransaction.orderType,
        responseCode: oldTransaction.responseCode,
        transactionNo: oldTransaction.vnpayData?.transactionNo,
        migratedFrom: oldTransaction._id,
        migrationDate: new Date(),
      },
      billingInfo: oldTransaction.billingInfo || {},
      createdAt: oldTransaction.createdAt,
      updatedAt: oldTransaction.updatedAt,
      expiresAt: oldTransaction.expiresAt,
      settlementInfo: oldTransaction.settlementInfo || {
        settled: false,
      },
      notes: oldTransaction.notes,
      customerNotes: oldTransaction.customerNotes,
      vnpayData: oldTransaction.vnpayData || {},
    });

    // Mark old transaction as migrated
    oldTransaction.metadata = oldTransaction.metadata || {};
    oldTransaction.metadata.migratedTo = newTransaction._id;
    oldTransaction.metadata.migrationDate = new Date();
    await oldTransaction.save();

    return newTransaction;
  } catch (error) {
    console.error("Error migrating transaction:", error);
    throw error;
  }
};

/**
 * Batch migrate old transactions
 * @param {Object} options - Migration options
 * @returns {Promise<Object>} Migration results
 */
export const batchMigrateTransactions = async (options = {}) => {
  try {
    const {
      limit = 100,
      skip = 0,
      dryRun = false,
      status = "completed", // Only migrate completed transactions
    } = options;

    const oldTransactions = await VNPAYTransaction.find({
      status,
      "metadata.migratedTo": { $exists: false },
    })
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: 1 });

    const results = {
      total: oldTransactions.length,
      migrated: 0,
      errors: 0,
      skipped: 0,
      errors: [],
    };

    for (const oldTransaction of oldTransactions) {
      try {
        if (dryRun) {
          results.skipped++;
          continue;
        }

        await migrateTransaction(oldTransaction._id);
        results.migrated++;
      } catch (error) {
        results.errors++;
        results.errors.push({
          transactionId: oldTransaction._id,
          error: error.message,
        });
        console.error(
          `Error migrating transaction ${oldTransaction._id}:`,
          error
        );
      }
    }

    return results;
  } catch (error) {
    console.error("Error in batch migration:", error);
    throw error;
  }
};

/**
 * Get migration statistics
 * @returns {Promise<Object>} Migration statistics
 */
export const getMigrationStatistics = async () => {
  try {
    const totalOld = await VNPAYTransaction.countDocuments();
    const migratedOld = await VNPAYTransaction.countDocuments({
      "metadata.migratedTo": { $exists: true },
    });
    const totalNew = await Transaction.countDocuments();
    const vnpayNew = await VNPAYTransactionNew.countDocuments();

    return {
      oldSystem: {
        total: totalOld,
        migrated: migratedOld,
        remaining: totalOld - migratedOld,
      },
      newSystem: {
        total: totalNew,
        vnpay: vnpayNew,
        other: totalNew - vnpayNew,
      },
      migrationProgress: totalOld > 0 ? (migratedOld / totalOld) * 100 : 0,
    };
  } catch (error) {
    console.error("Error getting migration statistics:", error);
    throw error;
  }
};

/**
 * Wrapper function to handle both old and new transactions
 * @param {string} transactionId - Transaction ID
 * @param {Function} handler - Handler function
 * @returns {Promise<any>} Handler result
 */
export const handleTransaction = async (transactionId, handler) => {
  try {
    const detection = await getTransactionModel(transactionId);

    if (!detection.transaction) {
      throw new Error("Transaction not found");
    }

    return await handler(detection.transaction, detection.isOld);
  } catch (error) {
    console.error("Error handling transaction:", error);
    throw error;
  }
};

export default {
  getTransactionModel,
  normalizeTransaction,
  getNormalizedTransaction,
  getNormalizedTransactions,
  migrateTransaction,
  batchMigrateTransactions,
  getMigrationStatistics,
  handleTransaction,
};
