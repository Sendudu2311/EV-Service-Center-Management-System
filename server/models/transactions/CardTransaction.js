import mongoose from "mongoose";
import Transaction from "../Transaction.js";

// Card Transaction Schema - extends base Transaction
const cardTransactionSchema = new mongoose.Schema(
  {
    // Card specific data
    cardData: {
      cardType: {
        type: String,
        required: true,
        enum: ["visa", "mastercard", "amex", "jcb", "unionpay", "other"],
        description: "Type of card used",
      },
      last4Digits: {
        type: String,
        required: true,
        match: /^\d{4}$/,
        description: "Last 4 digits of the card",
      },
      authCode: {
        type: String,
        description: "Authorization code from card processor",
      },
      transactionId: {
        type: String,
        description: "Transaction ID from card processor",
      },
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        description: "Staff member who processed the card payment",
      },
      processedAt: {
        type: Date,
        default: Date.now,
        description: "When the card payment was processed",
      },
      terminalId: {
        type: String,
        description: "POS terminal ID used for the transaction",
      },
      merchantId: {
        type: String,
        description: "Merchant ID for the transaction",
      },
      batchNumber: {
        type: String,
        description: "Batch number for settlement",
      },
      referenceNumber: {
        type: String,
        description: "Reference number for the transaction",
      },
      notes: {
        type: String,
        description: "Additional notes about the card transaction",
      },
    },
  },
  {
    discriminatorKey: "transactionType",
  }
);

// Create indexes for card transactions
cardTransactionSchema.index({ "cardData.processedBy": 1, createdAt: -1 });
cardTransactionSchema.index({ "cardData.transactionId": 1 });
cardTransactionSchema.index({ "cardData.authCode": 1 });
cardTransactionSchema.index({ "cardData.processedAt": 1 });

// Method to record card payment
cardTransactionSchema.methods.recordCardPayment = function (cardData) {
  this.status = "completed";
  this.cardData.cardType = cardData.cardType;
  this.cardData.last4Digits = cardData.last4Digits;
  this.cardData.authCode = cardData.authCode;
  this.cardData.transactionId = cardData.transactionId;
  this.cardData.processedBy = cardData.processedBy;
  this.cardData.terminalId = cardData.terminalId;
  this.cardData.merchantId = cardData.merchantId;
  this.cardData.batchNumber = cardData.batchNumber;
  this.cardData.referenceNumber = cardData.referenceNumber;
  this.cardData.notes = cardData.notes;
  this.cardData.processedAt = new Date();
  this.paidAmount = this.amount;
  this.processedBy = cardData.processedBy;
  this.processedAt = new Date();
  this.updatedAt = new Date();

  return this.save();
};

// Method to generate reference number
cardTransactionSchema.statics.generateReferenceNumber = function () {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const timestamp = Date.now().toString().slice(-6);

  return `CARD${year}${month}${day}${timestamp}`;
};

// Method to mask card number
cardTransactionSchema.methods.maskCardNumber = function (cardNumber) {
  if (!cardNumber || cardNumber.length < 4) return "****";
  return "**** **** **** " + cardNumber.slice(-4);
};

// Pre-save middleware to auto-generate reference number
cardTransactionSchema.pre("save", function (next) {
  if (this.isNew && !this.cardData.referenceNumber) {
    this.cardData.referenceNumber = this.constructor.generateReferenceNumber();
  }
  next();
});

// Create CardTransaction discriminator
const CardTransaction = Transaction.discriminator(
  "card",
  cardTransactionSchema
);

export default CardTransaction;
