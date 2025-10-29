import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import VNPAYTransaction from "../models/transactions/VNPAYTransaction.js";
import CashTransaction from "../models/transactions/CashTransaction.js";
import CardTransaction from "../models/transactions/CardTransaction.js";
import BankTransferTransaction from "../models/transactions/BankTransferTransaction.js";
import Invoice from "../models/Invoice.js";
import Appointment from "../models/Appointment.js";

/**
 * Transaction Service - Factory pattern for creating and managing transactions
 */
class TransactionService {
  /**
   * Create a new transaction based on type
   * @param {string} type - Transaction type (vnpay, cash, card, bank_transfer)
   * @param {Object} data - Transaction data
   * @returns {Promise<Object>} Created transaction
   */
  static async createTransaction(type, data) {
    try {
      // Use existing transactionRef or generate new one
      const transactionRef =
        data.transactionRef || this.generateTransactionRef(type);

      const baseData = {
        transactionRef,
        transactionType: type,
        userId: data.userId ? new mongoose.Types.ObjectId(data.userId) : data.userId,
        appointmentId: data.appointmentId ? new mongoose.Types.ObjectId(data.appointmentId) : data.appointmentId,
        invoiceId: data.invoiceId ? new mongoose.Types.ObjectId(data.invoiceId) : data.invoiceId,
        amount: data.amount,
        paymentPurpose: data.paymentPurpose,
        status: data.status || "pending", // Use provided status or default to pending
        processedBy: data.processedBy,
        processedAt: data.processedAt,
        billingInfo: data.billingInfo,
        metadata: data.metadata || {},
        notes: data.notes,
        customerNotes: data.customerNotes,
      };

      let transaction;

      switch (type) {
        case "vnpay":
          transaction = new VNPAYTransaction({
            ...baseData,
            vnpayData: data.vnpayData || {},
          });
          break;

        case "cash":
          transaction = new CashTransaction({
            ...baseData,
            cashData: data.cashData || {},
          });
          break;

        case "card":
          transaction = new CardTransaction({
            ...baseData,
            cardData: data.cardData || {},
          });
          break;

        case "bank_transfer":
          transaction = new BankTransferTransaction({
            ...baseData,
            bankTransferData: data.bankTransferData || {},
          });
          break;

        default:
          throw new Error(`Unsupported transaction type: ${type}`);
      }

      const savedTransaction = await transaction.save();
      console.log("Transaction saved successfully:", {
        id: savedTransaction._id,
        transactionRef: savedTransaction.transactionRef,
        transactionType: savedTransaction.transactionType,
        paymentPurpose: savedTransaction.paymentPurpose,
        appointmentId: savedTransaction.appointmentId,
        status: savedTransaction.status,
        discriminatorKey: savedTransaction.__t, // Check discriminator key
      });

      // Link transaction to related entities
      await this.linkTransactionToEntities(savedTransaction);

      return savedTransaction;
    } catch (error) {
      console.error("Error creating transaction:", error);
      throw error;
    }
  }

  /**
   * Record a payment for an invoice
   * @param {string} invoiceId - Invoice ID
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Created transaction and updated invoice
   */
  static async recordPayment(invoiceId, paymentData) {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error("Invoice not found");
      }

      // Create transaction
      const transaction = await this.createTransaction(paymentData.method, {
        userId: paymentData.userId,
        invoiceId: invoiceId,
        amount: paymentData.amount,
        paymentPurpose: "invoice_payment",
        billingInfo: paymentData.billingInfo,
        notes: paymentData.notes,
        customerNotes: paymentData.customerNotes,
        [this.getDataFieldName(paymentData.method)]:
          paymentData.transactionData,
      });

      // Update invoice payment info
      const newPaidAmount =
        (invoice.paymentInfo.paidAmount || 0) + paymentData.amount;
      const isFullPayment = newPaidAmount >= invoice.totals.totalAmount;

      invoice.paymentInfo.paidAmount = newPaidAmount;
      invoice.paymentInfo.status = isFullPayment ? "paid" : "partially_paid";
      invoice.paymentInfo.paymentDate = new Date();
      invoice.paymentInfo.method = paymentData.method;
      invoice.paymentInfo.transactionRef = transaction.transactionRef;
      invoice.paymentInfo.paymentNotes = paymentData.notes;

      if (isFullPayment) {
        invoice.status = "paid";
      }

      // Add transaction to invoice
      invoice.transactions.push(transaction._id);

      await invoice.save();

      // Sync payment status to appointment
      if (invoice.appointmentId) {
        const appointment = await Appointment.findById(invoice.appointmentId);
        if (appointment) {
          appointment.paymentStatus = isFullPayment ? "paid" : "partial";
          appointment.transactions.push(transaction._id);
          await appointment.save();
        }
      }

      return {
        transaction,
        invoice,
        isFullPayment,
      };
    } catch (error) {
      console.error("Error recording payment:", error);
      throw error;
    }
  }

  /**
   * Process a refund for a transaction
   * @param {string} transactionId - Transaction ID to refund
   * @param {Object} refundData - Refund data
   * @returns {Promise<Object>} Refund transaction
   */
  static async processRefund(transactionId, refundData) {
    try {
      const originalTransaction = await Transaction.findById(transactionId);
      if (!originalTransaction) {
        throw new Error("Transaction not found");
      }

      if (originalTransaction.status !== "completed") {
        throw new Error("Can only refund completed transactions");
      }

      // Create refund transaction
      const refundTransaction = await this.createTransaction(
        originalTransaction.transactionType,
        {
          userId: new mongoose.Types.ObjectId(originalTransaction.userId),
          appointmentId: originalTransaction.appointmentId ? new mongoose.Types.ObjectId(originalTransaction.appointmentId) : undefined,
          invoiceId: originalTransaction.invoiceId ? new mongoose.Types.ObjectId(originalTransaction.invoiceId) : undefined,
          amount: refundData.amount || originalTransaction.amount,
          paymentPurpose: "refund",
          billingInfo: originalTransaction.billingInfo,
          notes: `Refund for transaction ${originalTransaction.transactionRef}`,
          customerNotes: refundData.customerNotes,
          metadata: {
            originalTransactionId: originalTransaction._id,
            refundReason: refundData.reason,
          },
        }
      );

      // Update original transaction status
      originalTransaction.status = "refunded";
      originalTransaction.updatedAt = new Date();
      await originalTransaction.save();

      return refundTransaction;
    } catch (error) {
      console.error("Error processing refund:", error);
      throw error;
    }
  }

  /**
   * Get transaction history for a user, appointment, or invoice
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Transaction history
   */
  static async getTransactionHistory(filters = {}) {
    try {
      const query = {};

      if (filters.userId) query.userId = filters.userId;
      if (filters.appointmentId) query.appointmentId = filters.appointmentId;
      if (filters.invoiceId) query.invoiceId = filters.invoiceId;
      if (filters.transactionType)
        query.transactionType = filters.transactionType;
      if (filters.status) query.status = filters.status;
      if (filters.paymentPurpose) query.paymentPurpose = filters.paymentPurpose;

      const transactions = await Transaction.find(query)
        .populate("userId", "firstName lastName email phone")
        .populate("appointmentId", "appointmentNumber scheduledDate")
        .populate("invoiceId", "invoiceNumber")
        .populate("processedBy", "firstName lastName")
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50);

      return transactions;
    } catch (error) {
      console.error("Error getting transaction history:", error);
      throw error;
    }
  }

  /**
   * Get transaction statistics
   * @param {Object} dateRange - Date range for statistics
   * @returns {Promise<Object>} Transaction statistics
   */
  static async getTransactionStatistics(dateRange = {}) {
    try {
      const stats = await Transaction.getStatistics(dateRange);
      return stats;
    } catch (error) {
      console.error("Error getting transaction statistics:", error);
      throw error;
    }
  }

  /**
   * Update transaction status
   * @param {string} transactionId - Transaction ID
   * @param {string} newStatus - New status
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise<Object>} Updated transaction
   */
  static async updateTransactionStatus(
    transactionId,
    newStatus,
    additionalData = {}
  ) {
    try {
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error("Transaction not found");
      }

      await transaction.updateStatus(newStatus, additionalData);
      return transaction;
    } catch (error) {
      console.error("Error updating transaction status:", error);
      throw error;
    }
  }

  /**
   * Generate unique transaction reference
   * @param {string} type - Transaction type
   * @returns {string} Transaction reference
   */
  static generateTransactionRef(type) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();

    const prefix =
      {
        vnpay: "VNP",
        cash: "CASH",
        card: "CARD",
        bank_transfer: "TRF",
      }[type] || "TXN";

    return `${prefix}${year}${month}${day}${timestamp}${random}`;
  }

  /**
   * Get data field name for transaction type
   * @param {string} type - Transaction type
   * @returns {string} Data field name
   */
  static getDataFieldName(type) {
    const fieldMap = {
      vnpay: "vnpayData",
      cash: "cashData",
      card: "cardData",
      bank_transfer: "bankTransferData",
    };
    return fieldMap[type] || "metadata";
  }

  /**
   * Link transaction to related entities
   * @param {Object} transaction - Transaction object
   */
  static async linkTransactionToEntities(transaction) {
    try {
      // Link to appointment if applicable
      if (transaction.appointmentId) {
        await Appointment.findByIdAndUpdate(transaction.appointmentId, {
          $push: { transactions: transaction._id },
        });
      }

      // Link to invoice if applicable
      if (transaction.invoiceId) {
        await Invoice.findByIdAndUpdate(transaction.invoiceId, {
          $push: { transactions: transaction._id },
        });
      }
    } catch (error) {
      console.error("Error linking transaction to entities:", error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Find expired transactions and mark them as expired
   * @returns {Promise<Array>} Expired transactions
   */
  static async processExpiredTransactions() {
    try {
      const expiredTransactions = await Transaction.findExpired();

      for (const transaction of expiredTransactions) {
        await transaction.updateStatus("expired");
      }

      return expiredTransactions;
    } catch (error) {
      console.error("Error processing expired transactions:", error);
      throw error;
    }
  }

  /**
   * Get transaction by ID with full population
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Transaction with populated fields
   */
  static async getTransactionById(transactionId) {
    try {
      const transaction = await Transaction.findById(transactionId)
        .populate("userId", "firstName lastName email phone")
        .populate("appointmentId", "appointmentNumber scheduledDate")
        .populate("invoiceId", "invoiceNumber")
        .populate("processedBy", "firstName lastName");

      return transaction;
    } catch (error) {
      console.error("Error getting transaction by ID:", error);
      throw error;
    }
  }

  /**
   * Update transaction appointment ID after appointment creation
   * @param {string} transactionRef - Transaction reference
   * @param {string} appointmentId - Appointment ID
   * @returns {Promise<Object>} Updated transaction
   */
  static async updateTransactionAppointmentId(transactionRef, appointmentId) {
    try {
      const transaction = await Transaction.findOne({ transactionRef });
      if (transaction) {
        transaction.appointmentId = appointmentId;
        await transaction.save();
        console.log(
          `Updated transaction ${transactionRef} with appointment ${appointmentId}`
        );
        return transaction;
      }
      console.warn(`Transaction not found: ${transactionRef}`);
      return null;
    } catch (error) {
      console.error("Error updating transaction appointment ID:", error);
      throw error;
    }
  }

  /**
   * Update transaction invoice ID after invoice creation
   * @param {string} transactionRef - Transaction reference
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} Updated transaction
   */
  static async updateTransactionInvoiceId(transactionRef, invoiceId) {
    try {
      const transaction = await Transaction.findOne({ transactionRef });
      if (transaction) {
        transaction.invoiceId = invoiceId;
        await transaction.save();
        console.log(
          `Updated transaction ${transactionRef} with invoice ${invoiceId}`
        );
        return transaction;
      }
      console.warn(`Transaction not found: ${transactionRef}`);
      return null;
    } catch (error) {
      console.error("Error updating transaction invoice ID:", error);
      throw error;
    }
  }
}

export default TransactionService;
