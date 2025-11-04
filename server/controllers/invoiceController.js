import Invoice from "../models/Invoice.js";
import Appointment from "../models/Appointment.js";
import ServiceReception from "../models/ServiceReception.js";
import Service from "../models/Service.js";
import Part from "../models/Part.js";
import TransactionService from "../services/transactionService.js";

// ==============================================================================
// INVOICE APIS (Phase 2.4)
// ==============================================================================

// @desc    Get invoice by appointment ID
// @route   GET /api/invoices/appointment/:appointmentId
// @access  Private (Staff/Admin/Customer)
export const getInvoiceByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // Find invoice by appointment ID
    const invoice = await Invoice.findOne({ appointmentId })
      .populate("customerId", "firstName lastName email phone address")
      .populate("vehicleId", "make model year vin licensePlate")
      .populate("generatedBy", "firstName lastName")
      .populate({
        path: "transactions",
        options: { sort: { processedAt: 1 } }, // Sort by date ascending
      })
      .lean();

    // Also get appointment to check for deposit transactions
    const appointment = await Appointment.findById(appointmentId)
      .populate({
        path: "transactions",
        match: {
          status: { $in: ["completed", "pending"] }, // Include both completed and pending
        },
        options: { sort: { processedAt: 1 } },
      })
      .lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found for this appointment",
      });
    }

    // Merge and deduplicate transactions from both invoice and appointment
    const allTransactions = [];
    const seenTransactionIds = new Set();

    console.log("=== DEBUG TRANSACTIONS ===");
    console.log("Appointment ID:", appointmentId);
    console.log("Invoice transactions:", invoice.transactions?.length || 0);
    console.log(
      "Appointment transactions:",
      appointment?.transactions?.length || 0
    );

    // Debug: Check all transactions for this appointment directly
    const Transaction = (await import("../models/Transaction.js")).default;
    const allAppointmentTransactions = await Transaction.find({ appointmentId })
      .sort({ processedAt: 1 })
      .lean();
    console.log(
      "Direct query - All appointment transactions:",
      allAppointmentTransactions.map((t) => ({
        id: t._id,
        type: t.transactionType,
        purpose: t.paymentPurpose,
        amount: t.amount,
        status: t.status,
        processedAt: t.processedAt,
        createdAt: t.createdAt,
      }))
    );

    // Use direct query results instead of populate (more reliable)
    allAppointmentTransactions.forEach((transaction) => {
      if (!seenTransactionIds.has(transaction._id.toString())) {
        seenTransactionIds.add(transaction._id.toString());
        allTransactions.push(transaction);
      }
    });

    // Sort all transactions by date
    allTransactions.sort(
      (a, b) => new Date(a.processedAt) - new Date(b.processedAt)
    );

    console.log(
      "Final merged transactions:",
      allTransactions.map((t) => ({
        id: t._id,
        type: t.transactionType,
        purpose: t.paymentPurpose,
        amount: t.amount,
        status: t.status,
        processedAt: t.processedAt,
      }))
    );

    // Update invoice with merged transactions
    invoice.transactions = allTransactions;

    // Check permissions
    const user = req.user;
    const isCustomer = user.role === "customer";
    const isStaffOrAdmin = user.role === "staff" || user.role === "admin";

    if (
      isCustomer &&
      invoice.customerId._id.toString() !== user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own invoices.",
      });
    }

    if (!isCustomer && !isStaffOrAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error getting invoice by appointment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// @desc    Generate invoice for completed appointment
// @route   POST /api/invoices/generate/:appointmentId
// @access  Private (Staff/Admin)
export const generateInvoice = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const {
      paymentTerms = "immediate",
      discountPercentage = 0,
      additionalCharges = [],
      notes = "",
      customerInfo = {},
    } = req.body;

    // Find and validate appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate("customerId", "firstName lastName email phone address")
      .populate("vehicleId", "make model year vin licensePlate");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if appointment is completed or reception_approved (for pre-payment)
    if (!["completed", "reception_approved"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot generate invoice. Appointment status is: ${appointment.status}. Must be 'completed' or 'reception_approved'`,
      });
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ appointmentId });
    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: "Invoice already exists for this appointment",
      });
    }

    // Get service reception for detailed work performed
    const serviceReception = await ServiceReception.findOne({ appointmentId })
      .populate("recommendedServices.serviceId", "name category basePrice")
      .populate("requestedParts.partId", "name partNumber pricing");

    if (!serviceReception) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot generate invoice. Service reception must be created first",
      });
    }

    // Note: EV checklist completion check removed for deposit booking flow
    // For reception_approved status, allow invoice generation for pre-payment
    // Final invoice can be generated later when appointment is completed

    // Calculate invoice items
    const invoiceItems = {
      services: [],
      parts: [],
      labor: [],
    };

    let subtotalServices = 0;
    let subtotalParts = 0;
    let subtotalLabor = 0;

    // NOTE: Initial booked service (1 basic service) is already paid, not included in invoice
    // Process recommended services (discovered during inspection)
    for (const recommendedService of serviceReception.recommendedServices ||
      []) {
      if (
        recommendedService.isCompleted &&
        recommendedService.customerApproved
      ) {
        const serviceTotal =
          recommendedService.serviceId.basePrice * recommendedService.quantity;
        invoiceItems.services.push({
          serviceId: recommendedService.serviceId._id,
          serviceName: recommendedService.serviceId.name,
          category: recommendedService.serviceId.category,
          quantity: recommendedService.quantity,
          unitPrice: recommendedService.serviceId.basePrice,
          totalPrice: serviceTotal,
          description: `${recommendedService.serviceId.name} - Recommended Service`,
          reason: recommendedService.reason,
          technicianNotes: recommendedService.technicianNotes,
        });
        subtotalServices += serviceTotal;
      }
    }

    // Process requested parts
    // Note: Only check isAvailable since appointment is already completed
    // If parts were used during service, they should be included in invoice
    for (const requestedPart of serviceReception.requestedParts || []) {
      if (requestedPart.isAvailable) {
        const unitPrice = requestedPart.partId.pricing?.retail ||
                          requestedPart.estimatedCost ||
                          0;
        const partTotal = unitPrice * requestedPart.quantity;
        invoiceItems.parts.push({
          partId: requestedPart.partId._id,
          partName: requestedPart.partId.name,
          partNumber: requestedPart.partId.partNumber,
          quantity: requestedPart.quantity,
          unitPrice: unitPrice,
          totalPrice: partTotal,
          description: `${requestedPart.partId.name} (${requestedPart.partId.partNumber})`,
          reason: requestedPart.reason,
        });
        subtotalParts += partTotal;
      }
    }

    // Calculate labor charges based on actual time spent
    const actualServiceTime =
      serviceReception.actualServiceTime ||
      serviceReception.estimatedServiceTime;
    const laborRate = 50000; // VND per hour - should be configurable
    const laborHours = Math.ceil(actualServiceTime / 60); // Convert minutes to hours
    const laborTotal = laborHours * laborRate;

    if (laborHours > 0) {
      invoiceItems.labor.push({
        description: "Technical Labor",
        hours: laborHours,
        hourlyRate: laborRate,
        totalPrice: laborTotal,
        timeSpent: actualServiceTime,
      });
      subtotalLabor = laborTotal;
    }

    // Calculate totals
    const subtotal = subtotalServices + subtotalParts + subtotalLabor;
    const discountAmount = (subtotal * discountPercentage) / 100;
    const subtotalAfterDiscount = subtotal - discountAmount;

    // Add additional charges
    let additionalChargesTotal = 0;
    additionalCharges.forEach((charge) => {
      additionalChargesTotal += charge.amount;
    });

    const taxableAmount = subtotalAfterDiscount + additionalChargesTotal;
    const taxRate = 10; // 10% VAT for Vietnam
    const taxAmount = (taxableAmount * taxRate) / 100;
    const totalAmount = taxableAmount + taxAmount;

    // Calculate deposit and remaining amount
    const depositAmount = appointment.depositInfo?.paid
      ? appointment.depositInfo.amount
      : 0;
    const remainingAmount = Math.max(0, totalAmount - depositAmount);

    // Generate invoice number
    const invoiceNumber = `INV${new Date()
      .getFullYear()
      .toString()
      .slice(-2)}${(new Date().getMonth() + 1)
      .toString()
      .padStart(2, "0")}${new Date()
      .getDate()
      .toString()
      .padStart(2, "0")}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;

    // Create invoice
    const invoice = new Invoice({
      invoiceNumber,
      appointmentId,
      serviceReceptionId: serviceReception._id,
      customerId: appointment.customerId._id,
      vehicleId: appointment.vehicleId._id,

      // Customer and vehicle details
      customerInfo: {
        name:
          customerInfo.name ||
          `${appointment.customerId.firstName} ${appointment.customerId.lastName}`,
        email: customerInfo.email || appointment.customerId.email,
        phone: customerInfo.phone || appointment.customerId.phone,
        address: customerInfo.address ||
          appointment.customerId.address || {
            street: "Not provided",
            ward: "",
            district: "",
            city: "",
          },
      },

      vehicleInfo: {
        make: appointment.vehicleId.make,
        model: appointment.vehicleId.model,
        year: appointment.vehicleId.year,
        vin: appointment.vehicleId.vin,
        licensePlate: appointment.vehicleId.licensePlate,
      },

      // Service center details - single center architecture
      serviceCenterInfo: {
        name: "EV Service Center",
        address: "123 Main Street, Ho Chi Minh City",
        phone: "+84 28 1234 5678",
        email: "info@evservicecenter.com",
        taxId: "0123456789",
      },

      // Invoice items - using correct schema fields
      serviceItems: invoiceItems.services,
      partItems: invoiceItems.parts,
      laborCharges: {
        standardLabor: {
          hours: invoiceItems.labor[0]?.hours || 0,
          rate: invoiceItems.labor[0]?.hourlyRate || 0,
          amount: invoiceItems.labor[0]?.totalPrice || 0,
        },
        overtimeLabor: {
          hours: 0,
          rate: 0,
          amount: 0,
        },
        totalLaborHours: invoiceItems.labor[0]?.hours || 0,
        totalLaborCost: subtotalLabor,
      },
      additionalCharges,

      totals: {
        subtotalServices,
        subtotalParts,
        subtotalLabor,
        subtotalAdditional: additionalChargesTotal,
        subtotal,
        taxRate,
        taxAmount,
        discountAmount,
        depositAmount: depositAmount,
        remainingAmount: remainingAmount,
        totalAmount,
      },

      serviceDetails: {
        serviceDate: appointment.scheduledDate,
        completedDate: appointment.status === "completed" ? new Date() : null,
        actualServiceTime: appointment.status === "completed" ? actualServiceTime : 0,
        estimatedServiceTime: serviceReception.estimatedServiceTime,
        workPerformed: appointment.status === "completed"
          ? (serviceReception.recommendedServices || [])
              .filter((s) => s.isCompleted && s.customerApproved)
              .map((s) => s.serviceId.name)
          : [],
        evChecklistCompleted: appointment.status === "completed" && serviceReception.evChecklistProgress.isCompleted,
        isPrePayment: appointment.status === "reception_approved",
      },

      paymentInfo: {
        method: appointment.depositInfo?.paid ? "e_wallet" : "cash",
        status: appointment.status === "reception_approved" ? "unpaid" : (remainingAmount <= 0 ? "paid" : "partial"),
        dueDate:
          paymentTerms === "immediate"
            ? new Date()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        paidAmount: depositAmount,
        remainingAmount: remainingAmount,
        isPrePaymentInvoice: appointment.status === "reception_approved",
      },

      notes,
      generatedBy: req.user._id,
      status: "draft",
    });

    await invoice.save();

    // Synchronize payment status to appointment
    appointment.paymentStatus =
      invoice.paymentInfo.status === "paid" ? "paid" : "partial";
    await appointment.save();

    // Update appointment status to invoiced
    await appointment.updateStatus(
      "invoiced",
      req.user._id,
      "Invoice generated"
    );

    // Populate invoice for response
    await invoice.populate([
      { path: "customerId", select: "firstName lastName email phone" },
      { path: "vehicleId", select: "make model year vin licensePlate" },
      { path: "generatedBy", select: "firstName lastName" },
    ]);

    res.status(201).json({
      success: true,
      message: "Invoice generated successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({
      success: false,
      message: "Error generating invoice",
    });
  }
};

// @desc    Get invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id)
      .populate(
        "appointmentId",
        "appointmentNumber scheduledDate scheduledTime"
      )
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year vin licensePlate")
      // serviceCenterId populate removed - single center architecture
      .populate("generatedBy", "firstName lastName")
      .populate("reviewedBy", "firstName lastName");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Check access permissions
    if (
      req.user.role === "customer" &&
      invoice.customerId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this invoice",
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error getting invoice:", error);
    res.status(500).json({
      success: false,
      message: "Error getting invoice",
    });
  }
};

// @desc    Get invoices with filtering
// @route   GET /api/invoices
// @access  Private
export const getInvoices = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      customerId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
    } = req.query;

    const skip = (page - 1) * limit;
    let filter = {};

    // Build filter based on user role
    if (req.user.role === "customer") {
      filter.customerId = req.user._id;
    }
    // Staff can see all invoices in single center architecture

    // Add additional filters
    if (status) filter.status = status;
    if (paymentStatus) filter["paymentInfo.status"] = paymentStatus;
    if (customerId) filter.customerId = customerId;

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const invoices = await Invoice.find(filter)
      .populate("appointmentId", "appointmentNumber scheduledDate")
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate")
      // serviceCenterId populate removed - single center architecture
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: invoices.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: invoices,
    });
  } catch (error) {
    console.error("Error getting invoices:", error);
    res.status(500).json({
      success: false,
      message: "Error getting invoices",
    });
  }
};

// @desc    Update invoice status (finalize, cancel, etc.)
// @route   PUT /api/invoices/:id/status
// @access  Private (Staff/Admin)
export const updateInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes = "" } = req.body;

    // Validate status
    const validStatuses = [
      "draft",
      "sent",
      "paid",
      "overdue",
      "cancelled",
      "refunded",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Update status
    const oldStatus = invoice.status;
    invoice.status = status;

    // Update payment status if needed
    if (status === "paid") {
      invoice.paymentInfo.status = "paid";
      invoice.paymentInfo.paidAt = new Date();
      invoice.paymentInfo.paidAmount = invoice.totals.totalAmount;
    } else if (status === "sent") {
      invoice.sentAt = new Date();
      invoice.sentBy = req.user._id;
    }

    // Add revision history
    invoice.revisionHistory.push({
      version: invoice.revisionHistory.length + 1,
      changes: `Status updated from ${oldStatus} to ${status}`,
      changedBy: req.user._id,
      changeDate: new Date(),
      notes,
    });

    await invoice.save();

    res.status(200).json({
      success: true,
      message: `Invoice status updated to ${status}`,
      data: {
        id: invoice._id,
        status: invoice.status,
        paymentStatus: invoice.paymentInfo.status,
        updatedAt: invoice.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating invoice status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating invoice status",
    });
  }
};

// @desc    Process payment for invoice
// @route   POST /api/invoices/:id/payment
// @access  Private (Staff/Admin)
export const processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      paymentMethod,
      paidAmount,
      transactionId = "",
      paymentNotes = "",
      billingInfo = {},
      customerNotes = "",
      transactionData = {},
    } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Validate payment amount
    if (paidAmount <= 0 || paidAmount > invoice.totals.totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    // Check if already paid
    if (invoice.paymentInfo.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Invoice is already paid",
      });
    }

    // Use TransactionService to record payment
    const result = await TransactionService.recordPayment(id, {
      method: paymentMethod,
      amount: paidAmount,
      userId: invoice.customerId,
      billingInfo,
      notes: paymentNotes,
      customerNotes,
      transactionData: {
        ...transactionData,
        transactionId,
        processedBy: req.user._id,
      },
    });

    const { transaction, invoice: updatedInvoice, isFullPayment } = result;

    // Add revision history
    updatedInvoice.revisionHistory.push({
      version: updatedInvoice.revisionHistory.length + 1,
      changes: `Payment processed: ${paidAmount.toLocaleString(
        "vi-VN"
      )} VND via ${paymentMethod}`,
      changedBy: req.user._id,
      changeDate: new Date(),
      notes: paymentNotes,
    });

    await updatedInvoice.save();

    res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      data: {
        id: updatedInvoice._id,
        paymentStatus: updatedInvoice.paymentInfo.status,
        paidAmount: updatedInvoice.paymentInfo.paidAmount,
        remainingAmount:
          updatedInvoice.totals.totalAmount -
          updatedInvoice.paymentInfo.paidAmount,
        isFullyPaid: isFullPayment,
        transaction: {
          id: transaction._id,
          transactionRef: transaction.transactionRef,
          status: transaction.status,
        },
      },
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({
      success: false,
      message: "Error processing payment",
      error: error.message,
    });
  }
};

// @desc    Generate invoice PDF (placeholder - would integrate with PDF library)
// @route   GET /api/invoices/:id/pdf
// @access  Private
export const generateInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id)
      .populate("appointmentId")
      .populate("customerId")
      .populate("vehicleId");
    // serviceCenterId populate removed - single center architecture

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // This would integrate with a PDF generation library like puppeteer or jsPDF
    // For now, returning JSON structure that frontend can use to generate PDF
    res.status(200).json({
      success: true,
      message: "PDF generation endpoint ready",
      data: {
        invoice,
        pdfUrl: `/api/invoices/${id}/pdf/download`, // Future PDF download URL
        note: "PDF generation would be implemented here",
      },
    });
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    res.status(500).json({
      success: false,
      message: "Error generating invoice PDF",
    });
  }
};
