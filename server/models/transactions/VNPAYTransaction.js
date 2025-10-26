import mongoose from "mongoose";
import Transaction from "../Transaction.js";

// VNPAY Transaction Schema - extends base Transaction
const vnpayTransactionSchema = new mongoose.Schema(
  {
    // VNPay specific data
    vnpayData: {
      bankCode: {
        type: String,
        description: "Bank code used for payment",
      },
      cardType: {
        type: String,
        description: "Card type used",
      },
      payDate: {
        type: String,
        description: "VNPay payment date (vnp_PayDate format)",
      },
      paymentDate: {
        type: Date,
        description: "Actual payment completion date",
      },
      secureHash: {
        type: String,
        description: "VNPay secure hash for verification",
      },
      ipAddr: {
        type: String,
        description: "Client IP address",
      },
      locale: {
        type: String,
        default: "vn",
        description: "Payment interface language",
      },
      version: {
        type: String,
        default: "2.1.0",
        description: "VNPay API version",
      },
      command: {
        type: String,
        default: "pay",
        description: "VNPay command type",
      },
      transactionNo: {
        type: String,
        description: "VNPay transaction number (vnp_TransactionNo)",
      },
      responseCode: {
        type: String,
        description: "VNPay response code (vnp_ResponseCode)",
      },
    },
  },
  {
    discriminatorKey: "transactionType",
  }
);

// Create compound indexes for VNPay specific queries
vnpayTransactionSchema.index({ "vnpayData.payDate": 1 });
vnpayTransactionSchema.index({ "vnpayData.transactionNo": 1 });
vnpayTransactionSchema.index({ "vnpayData.responseCode": 1 });

// Method to handle VNPay payment success
vnpayTransactionSchema.methods.handlePaymentSuccess = function (vnpayResponse) {
  this.status = "completed";
  this.vnpayData.paymentDate = new Date();
  this.vnpayData.transactionNo = vnpayResponse.vnp_TransactionNo;
  this.vnpayData.responseCode = vnpayResponse.vnp_ResponseCode;
  this.vnpayData.secureHash = vnpayResponse.vnp_SecureHash;
  this.vnpayData.bankCode = vnpayResponse.vnp_BankCode;
  this.vnpayData.cardType = vnpayResponse.vnp_CardType;
  this.paidAmount = parseInt(vnpayResponse.vnp_Amount) / 100; // VNPay returns amount in cents
  this.processedAt = new Date();
  this.updatedAt = new Date();

  return this.save();
};

// Method to handle VNPay payment failure
vnpayTransactionSchema.methods.handlePaymentFailure = function (vnpayResponse) {
  this.status = "failed";
  this.vnpayData.responseCode = vnpayResponse.vnp_ResponseCode;
  this.vnpayData.secureHash = vnpayResponse.vnp_SecureHash;
  this.errorCode = vnpayResponse.vnp_ResponseCode;
  this.errorMessage = this.getVNPayErrorMessage(vnpayResponse.vnp_ResponseCode);
  this.updatedAt = new Date();

  return this.save();
};

// Method to get VNPay error message
vnpayTransactionSchema.methods.getVNPayErrorMessage = function (responseCode) {
  const errorMessages = {
    "00": "Giao dịch thành công",
    "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)",
    "09": "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking của ngân hàng",
    10: "Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần",
    11: "Đã hết hạn chờ thanh toán. Xin vui lòng thực hiện lại giao dịch",
    12: "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa",
    13: "Nhập sai mật khẩu xác thực giao dịch (OTP). Quá số lần cho phép",
    51: "Tài khoản không đủ số dư để thực hiện giao dịch",
    65: "Tài khoản đã vượt quá hạn mức giao dịch trong ngày",
    75: "Ngân hàng thanh toán đang bảo trì",
    79: "Nhập sai mật khẩu thanh toán quá số lần quy định",
    99: "Lỗi không xác định",
  };

  return errorMessages[responseCode] || "Lỗi không xác định";
};

// Method to verify VNPay hash
vnpayTransactionSchema.methods.verifyHash = function (
  vnpayResponse,
  secretKey
) {
  const crypto = require("crypto");
  const querystring = require("qs");

  // Remove hash field and sort parameters
  const { vnp_SecureHash, ...params } = vnpayResponse;
  const sortedParams = querystring.stringify(params, { encode: false });

  // Create hash
  const hash = crypto
    .createHmac("sha512", secretKey)
    .update(sortedParams)
    .digest("hex");

  return hash === vnp_SecureHash;
};

// Create VNPAYTransaction discriminator
const VNPAYTransaction = Transaction.discriminator(
  "vnpay",
  vnpayTransactionSchema
);

export default VNPAYTransaction;
