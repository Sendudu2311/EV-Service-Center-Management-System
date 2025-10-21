import { Contact, User } from "../models/index.js";
import { sendEmail } from "../utils/email.js";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  asyncHandler,
  formatMongooseError,
} from "../utils/response.js";

// @desc    Create a new contact message
// @route   POST /api/contacts
// @access  Public
export const createContact = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validation
  if (!name || !email || !subject || !message) {
    return sendValidationError(res, "All fields are required");
  }

  // Create contact
  const contact = await Contact.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    subject,
    message: message.trim(),
  });

  // Send confirmation email to user
  try {
    const subjectText = "Contact Received - EV Service Center";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Thank you for contacting EV Service Center</h2>
        <p>Dear ${contact.name},</p>
        <p>We have received your message regarding <strong>${contact.formattedSubject}</strong>. Our team will review your inquiry and get back to you within 24-48 hours.</p>

        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Your Message:</h3>
          <p style="margin-bottom: 0; color: #6b7280;">${contact.message}</p>
        </div>

        <p>If you have any additional information or urgent concerns, please don't hesitate to reply to this email.</p>

        <p>Best regards,<br>EV Service Center Team</p>
      </div>
    `;

    await sendEmail(contact.email, subjectText, html);
  } catch (emailError) {
    console.error("Error sending confirmation email:", emailError);
    // Don't fail the request if email fails
  }

  // Notify staff about new contact (optional - could be implemented later)

  sendSuccess(res, 201, "Contact message sent successfully", contact);
});

// @desc    Get all contacts (for staff/admin)
// @route   GET /api/contacts
// @access  Private (Staff, Admin)
export const getContacts = asyncHandler(async (req, res) => {
  const {
    status = "all",
    assignedTo,
    subject,
    search,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  let filter = {};

  // Status filter
  if (status !== "all") {
    filter.status = status;
  }

  // Assigned to filter
  if (assignedTo) {
    if (assignedTo === "unassigned") {
      filter.assignedTo = null;
    } else {
      filter.assignedTo = assignedTo;
    }
  }

  // Subject filter
  if (subject) {
    filter.subject = subject;
  }

  // Search filter
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { message: { $regex: search, $options: "i" } },
    ];
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const skip = (pageNum - 1) * limitNum;

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

  const contacts = await Contact.find(filter)
    .populate("assignedTo", "firstName lastName email")
    .populate("readBy", "firstName lastName")
    .populate("notes.addedBy", "firstName lastName")
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  const total = await Contact.countDocuments(filter);

  // Add virtual fields
  const contactsWithVirtuals = contacts.map((contact) => ({
    ...contact,
    formattedSubject: contact.subject === "service"
      ? "Service Inquiry"
      : contact.subject === "appointment"
      ? "Appointment Booking"
      : contact.subject === "parts"
      ? "Parts & Accessories"
      : contact.subject === "warranty"
      ? "Warranty Claim"
      : contact.subject === "feedback"
      ? "Feedback"
      : "Other",
    formattedStatus: contact.status === "open"
      ? "Open"
      : contact.status === "in-progress"
      ? "In Progress"
      : "Closed",
    timeAgo: getTimeAgo(contact.createdAt),
  }));

  sendSuccess(res, 200, "Contacts retrieved successfully", {
    contacts: contactsWithVirtuals,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get single contact
// @route   GET /api/contacts/:id
// @access  Private (Staff, Admin)
export const getContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id)
    .populate("assignedTo", "firstName lastName email")
    .populate("readBy", "firstName lastName")
    .populate("notes.addedBy", "firstName lastName");

  if (!contact) {
    return sendError(res, "Contact not found", 404);
  }

  // Mark as read if not already read
  if (!contact.isRead) {
    contact.isRead = true;
    contact.readAt = new Date();
    contact.readBy = req.user.id;
    await contact.save();
  }

  sendSuccess(res, 200, "Contact retrieved successfully", contact);
});

// @desc    Update contact status
// @route   PUT /api/contacts/:id/status
// @access  Private (Staff, Admin)
export const updateContactStatus = asyncHandler(async (req, res) => {
  const { status, assignedTo } = req.body;

  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return sendError(res, "Contact not found", 404);
  }

  // Update status
  if (status) {
    contact.status = status;
  }

  // Update assignment
  if (assignedTo !== undefined) {
    if (assignedTo === null || assignedTo === "") {
      contact.assignedTo = null;
    } else {
      // Verify user exists and has appropriate role
      const user = await User.findById(assignedTo);
      if (!user || !["staff", "admin"].includes(user.role)) {
        return sendError(res, "Invalid user assignment", 400);
      }
      contact.assignedTo = assignedTo;
    }
  }

  await contact.save();

  const updatedContact = await Contact.findById(req.params.id)
    .populate("assignedTo", "firstName lastName email")
    .populate("readBy", "firstName lastName");

  sendSuccess(res, 200, "Contact status updated successfully", updatedContact);
});

// @desc    Add note to contact
// @route   POST /api/contacts/:id/notes
// @access  Private (Staff, Admin)
export const addContactNote = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content || !content.trim()) {
    return sendValidationError(res, "Note content is required");
  }

  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return sendError(res, "Contact not found", 404);
  }

  contact.notes.push({
    content: content.trim(),
    addedBy: req.user.id,
  });

  await contact.save();

  const updatedContact = await Contact.findById(req.params.id)
    .populate("assignedTo", "firstName lastName email")
    .populate("readBy", "firstName lastName")
    .populate("notes.addedBy", "firstName lastName");

  sendSuccess(res, 200, "Note added successfully", updatedContact);
});

// @desc    Get contact statistics
// @route   GET /api/contacts/stats
// @access  Private (Staff, Admin)
export const getContactStats = asyncHandler(async (req, res) => {
  const stats = await Contact.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const totalContacts = await Contact.countDocuments();
  const unreadContacts = await Contact.countDocuments({ isRead: false });
  const todayContacts = await Contact.countDocuments({
    createdAt: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
    },
  });

  const statusStats = {
    open: 0,
    "in-progress": 0,
    closed: 0,
  };

  stats.forEach((stat) => {
    statusStats[stat._id] = stat.count;
  });

  sendSuccess(res, 200, "Contact statistics retrieved successfully", {
    total: totalContacts,
    unread: unreadContacts,
    today: todayContacts,
    byStatus: statusStats,
  });
});

// Helper function to get time ago
const getTimeAgo = (date) => {
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  return `${Math.ceil(diffDays / 30)} months ago`;
};