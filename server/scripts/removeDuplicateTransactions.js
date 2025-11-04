/**
 * Script to remove duplicate transactions for a specific appointment
 * Usage: node server/scripts/removeDuplicateTransactions.js <appointmentId>
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

// Import models
const Transaction = mongoose.model(
  "Transaction",
  new mongoose.Schema({}, { strict: false, collection: "transactions" })
);

async function removeDuplicateTransactions(appointmentId) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all transactions for this appointment
    const transactions = await Transaction.find({
      appointmentId: appointmentId,
    }).sort({ createdAt: 1 }); // Sort by oldest first

    console.log(
      `\n📊 Found ${transactions.length} transactions for appointment ${appointmentId}`
    );

    if (transactions.length === 0) {
      console.log("❌ No transactions found");
      return;
    }

    if (transactions.length === 1) {
      console.log("✅ Only one transaction exists, no duplicates to remove");
      return;
    }

    // Display all transactions
    console.log("\n📋 Transaction details:");
    transactions.forEach((txn, index) => {
      console.log(`\n${index + 1}. Transaction ID: ${txn._id}`);
      console.log(`   Ref: ${txn.transactionRef}`);
      console.log(`   Amount: ${txn.amount?.toLocaleString("vi-VN")} VND`);
      console.log(`   Type: ${txn.transactionType}`);
      console.log(`   Status: ${txn.status}`);
      console.log(
        `   Created: ${txn.createdAt?.toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
        })}`
      );
      console.log(
        `   Purpose: ${txn.paymentPurpose || txn.transactionPurpose || "N/A"}`
      );
    });

    // Keep the first (oldest) transaction, delete the rest
    const toKeep = transactions[0];
    const toDelete = transactions.slice(1);

    console.log(`\n⚠️  Will KEEP transaction: ${toKeep._id} (${toKeep.transactionRef})`);
    console.log(
      `🗑️  Will DELETE ${toDelete.length} duplicate transaction(s):`
    );
    toDelete.forEach((txn) => {
      console.log(`   - ${txn._id} (${txn.transactionRef})`);
    });

    // Ask for confirmation
    console.log("\n⚠️  WARNING: This action cannot be undone!");
    console.log(
      "To proceed, run the script with --confirm flag: node server/scripts/removeDuplicateTransactions.js <appointmentId> --confirm"
    );

    if (process.argv.includes("--confirm")) {
      console.log("\n🔄 Deleting duplicate transactions...");

      const deleteIds = toDelete.map((txn) => txn._id);
      const result = await Transaction.deleteMany({ _id: { $in: deleteIds } });

      console.log(`✅ Deleted ${result.deletedCount} duplicate transaction(s)`);
      console.log(`✅ Kept transaction: ${toKeep._id} (${toKeep.transactionRef})`);
    } else {
      console.log("\n❌ Deletion cancelled. Use --confirm flag to proceed.");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

// Get appointmentId from command line
const appointmentId = process.argv[2];

if (!appointmentId) {
  console.error("❌ Usage: node server/scripts/removeDuplicateTransactions.js <appointmentId> [--confirm]");
  console.error("Example: node server/scripts/removeDuplicateTransactions.js 690903f9890cae279be881ef --confirm");
  process.exit(1);
}

// Run the script
removeDuplicateTransactions(appointmentId);
