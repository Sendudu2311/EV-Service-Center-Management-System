import { VNPay } from "vnpay";
import dotenv from "dotenv";

dotenv.config();

// VNPay configuration
const vnpayConfig = {
  tmnCode: process.env.VNP_TMNCODE || process.env.VNPAY_TMN_CODE || "",
  secureSecret:
    process.env.VNP_HASH_SECRET || process.env.VNPAY_SECURE_SECRET || "",
  vnpayHost:
    process.env.VNP_URL ||
    process.env.VNPAY_HOST ||
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  hashAlgorithm: "sha512",
  testMode: true,
};

// Create VNPay instance
const vnpayInstance = new VNPay(vnpayConfig);

export { vnpayInstance as vnpay };
