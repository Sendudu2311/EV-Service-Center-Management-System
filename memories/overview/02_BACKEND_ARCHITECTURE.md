# Backend Architecture - Node.js + Express + MongoDB

## Technology Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 4.18.2
- **Database**: MongoDB with Mongoose 8.0.3
- **Authentication**: JWT (jsonwebtoken 9.0.2) + bcryptjs 2.4.3
- **Real-time**: Socket.io 4.7.4
- **Payment**: VNPay 2.4.4, Stripe 14.9.0
- **File Upload**: Cloudinary 1.41.3, Multer 1.4.5
- **Email**: Nodemailer 6.9.7
- **AI**: Google Generative AI 0.24.1 (Gemini)
- **Excel**: xlsx 0.18.5
- **Utilities**: axios, cors, dotenv

## Directory Structure

```
server/
├── config/                    # Configuration files
│   ├── database.js           # MongoDB connection
│   ├── cloudinary.js         # Cloudinary setup
│   └── vnpay.js              # VNPay configuration
├── controllers/               # 17 controllers
│   ├── appointmentController.js    # 160KB, 4000+ lines
│   ├── authController.js
│   ├── invoiceController.js
│   ├── partController.js           # 27KB, 700+ lines
│   ├── partRequestController.js    # 16KB
│   ├── serviceReceptionController.js # 30KB
│   ├── transactionController.js    # 12KB
│   ├── vnpayController.js          # 54KB, 1400+ lines
│   ├── dashboardController.js      # 17KB
│   ├── checklistController.js
│   ├── slotController.js
│   └── ... (other controllers)
├── middleware/                # Express middleware
│   ├── auth.js               # JWT authentication
│   ├── socketAuth.js         # Socket.io auth
│   └── validation.js         # Request validation
├── models/                    # 17 Mongoose models
│   ├── Appointment.js        # 31KB, 800+ lines
│   ├── User.js               # 125 lines
│   ├── Vehicle.js            # 126 lines
│   ├── ServiceReception.js   # 20KB, 500+ lines
│   ├── Part.js               # 256 lines
│   ├── PartRequest.js        # 420 lines
│   ├── Invoice.js            # 14KB, 400+ lines
│   ├── Transaction.js        # 310 lines
│   ├── Slot.js               # 15KB, 450+ lines
│   ├── TechnicianProfile.js  # 13KB, 450+ lines
│   ├── EVChecklist.js        # 8KB, 250+ lines
│   └── ... (other models)
├── routes/                    # 18 route files
│   ├── appointments.js       # 109 lines - extensive workflow
│   ├── auth.js
│   ├── vnpay.js              # 167 lines
│   ├── transactions.js
│   ├── parts.js
│   ├── partRequests.js
│   ├── invoices.js
│   ├── serviceReception.js
│   ├── slots.js
│   ├── checklist.js
│   ├── dashboard.js
│   ├── reports.js
│   ├── chatbot.js
│   └── ... (other routes)
├── services/                  # Business logic services
│   └── transactionService.js # 15KB
├── utils/                     # Utility functions
│   ├── seeder.js             # 132KB - comprehensive test data
│   ├── appointmentScheduler.js # 12KB - cron jobs
│   ├── paymentNotifications.js # 14KB
│   ├── email.js
│   ├── emailTemplates.js     # 20KB - Vietnamese templates
│   ├── geminiAI.js           # Gemini integration
│   ├── paymentAudit.js
│   ├── migration.js
│   ├── transactionMigration.js
│   ├── response.js
│   ├── validation.js
│   └── timezone.js
├── server.js                  # 350 lines - main server
├── package.json
└── .env.example
```

## Server Setup (server.js - 350 lines)

### Express Configuration
```javascript
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// Security headers for Google OAuth
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/vnpay', vnpayRoutes);
// ... other routes

// Global error handler
app.use(errorHandler);

// Socket.io with authentication
io.use(socketAuthMiddleware);
io.on('connection', (socket) => {
  // Socket event handlers
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT);
```

### Socket.io Events
```javascript
// Room management
socket.on('join_appointment', (appointmentId) => {
  socket.join(`appointment_${appointmentId}`);
});

socket.on('leave_appointment', (appointmentId) => {
  socket.leave(`appointment_${appointmentId}`);
});

// Chat messages
socket.on('send_message', async (data) => {
  const { appointmentId, message } = data;
  // Validate, save, broadcast
  io.to(`appointment_${appointmentId}`).emit('receive_message', messageData);
});

// Status updates
socket.on('appointment_update', async (data) => {
  // Update appointment, broadcast to all users in room
  io.to(`appointment_${appointmentId}`).emit('appointment_updated', update);
});

// Service progress
socket.on('service_progress_update', async (data) => {
  io.to(`appointment_${appointmentId}`).emit('service_progress_updated', progress);
});
```

## Database Configuration

### MongoDB Connection (config/database.js)
```javascript
import mongoose from 'mongoose';

export const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});
```

## Authentication & Authorization

### JWT Middleware (middleware/auth.js)
```javascript
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không có quyền truy cập. Vui lòng đăng nhập.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập đã hết hạn'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ'
    });
  }
};

// Role-based authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này'
      });
    }
    next();
  };
};
```

### Socket.io Authentication (middleware/socketAuth.js)
```javascript
import jwt from 'jsonwebtoken';

export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.userId = decoded.id;
    socket.userRole = decoded.role;

    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};

// Validate appointment access
export const validateAppointmentAccess = async (socket, appointmentId) => {
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    return false;
  }

  const userId = socket.userId;
  const userRole = socket.userRole;

  // Customer can only access their appointments
  if (userRole === 'customer') {
    return appointment.customerId.toString() === userId;
  }

  // Technician can access assigned appointments
  if (userRole === 'technician') {
    return appointment.assignedTechnician?.toString() === userId;
  }

  // Staff and admin can access all appointments
  return ['staff', 'admin'].includes(userRole);
};
```

## Authentication Controller (controllers/authController.js)

### User Registration
```javascript
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phone,
      role: role || 'customer',
      authProvider: 'local'
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### User Login
```javascript
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findOne({
      email: email.toLowerCase(),
      authProvider: 'local'
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### Google OAuth Login
```javascript
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name, picture, sub: googleId } = payload;

    // Find or create user
    let user = await User.findOne({
      $or: [
        { googleId },
        { email: email.toLowerCase(), authProvider: 'google' }
      ]
    });

    if (!user) {
      user = await User.create({
        email: email.toLowerCase(),
        firstName: given_name,
        lastName: family_name,
        avatar: picture,
        googleId,
        authProvider: 'google',
        isEmailVerified: true,
        role: 'customer'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập Google thành công',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xác thực Google: ' + error.message
    });
  }
};
```

## Appointment Controller (controllers/appointmentController.js - 160KB, 4000+ lines)

This is the most complex controller handling the entire 14-state workflow.

### Create Appointment
```javascript
export const createAppointment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { vehicleId, services, scheduledDate, scheduledTime, bookingType, customerNotes } = req.body;

    // Validate vehicle ownership
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      customerId: req.user.id
    });

    if (!vehicle) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy xe hoặc bạn không có quyền sử dụng xe này'
      });
    }

    // Check vehicle doesn't have active appointment
    const activeAppointment = await Appointment.findOne({
      vehicleId,
      status: {
        $nin: ['completed', 'cancelled', 'no_show', 'cancel_refunded']
      }
    });

    if (activeAppointment) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Xe này đã có lịch hẹn đang hoạt động'
      });
    }

    // Find slot and check availability
    const slot = await Slot.findOne({
      date: scheduledDate,
      startTime: scheduledTime
    });

    if (!slot || !slot.canBook()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Khung giờ không khả dụng'
      });
    }

    // Get service details
    const serviceDetails = await Service.find({
      _id: { $in: services }
    });

    // Calculate total
    const serviceItems = serviceDetails.map(service => ({
      serviceId: service._id,
      serviceName: service.name,
      description: service.description,
      quantity: 1,
      price: service.basePrice,
      totalPrice: service.basePrice,
      estimatedDuration: service.estimatedDuration
    }));

    const totalAmount = serviceItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // Create appointment
    const appointment = await Appointment.create([{
      customerId: req.user.id,
      vehicleId,
      services: serviceItems,
      scheduledDate,
      scheduledTime,
      bookingType: bookingType || 'deposit_booking',
      depositInfo: {
        amount: 200000, // 200,000 VND deposit
        paid: false
      },
      status: 'pending',
      coreStatus: 'Scheduled',
      totalAmount,
      customerNotes,
      priority: 'normal',
      paymentStatus: 'pending'
    }], { session });

    // Book slot
    await slot.book(session);

    // Add to workflow history
    await appointment[0].addToHistory('pending', req.user.id, 'Khách hàng tạo lịch hẹn');

    await session.commitTransaction();

    // Send confirmation email
    await sendAppointmentConfirmationEmail(appointment[0]);

    res.status(201).json({
      success: true,
      message: 'Tạo lịch hẹn thành công. Vui lòng thanh toán đặt cọc để hoàn tất.',
      data: appointment[0]
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};
```

### Staff Confirm Appointment
```javascript
export const staffConfirmAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { technicianId, internalNotes } = req.body;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch hẹn'
      });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể xác nhận lịch hẹn đang chờ'
      });
    }

    // Check deposit payment
    if (appointment.bookingType === 'deposit_booking' && !appointment.depositInfo.paid) {
      return res.status(400).json({
        success: false,
        message: 'Khách hàng chưa thanh toán đặt cọc'
      });
    }

    // Verify technician
    const technician = await User.findOne({
      _id: technicianId,
      role: 'technician',
      isActive: true
    });

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy kỹ thuật viên'
      });
    }

    // Update appointment
    appointment.status = 'confirmed';
    appointment.coreStatus = 'Scheduled';
    appointment.assignedTechnician = technicianId;
    if (internalNotes) {
      appointment.internalNotes = internalNotes;
    }

    await appointment.addToHistory('confirmed', req.user.id,
      `Nhân viên xác nhận và giao cho kỹ thuật viên ${technician.fullName}`);

    await appointment.save();

    // Send notification
    io.to(`appointment_${appointment._id}`).emit('appointment_updated', {
      appointmentId: appointment._id,
      status: 'confirmed',
      coreStatus: 'Scheduled',
      message: 'Lịch hẹn đã được xác nhận'
    });

    // Send email to customer
    await sendAppointmentStatusEmail(appointment, 'confirmed');

    res.json({
      success: true,
      message: 'Xác nhận lịch hẹn thành công',
      data: appointment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### Customer Check-in
```javascript
export const customerCheckIn = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id)
      .populate('customerId', 'firstName lastName phone email')
      .populate('vehicleId')
      .populate('assignedTechnician', 'firstName lastName phone');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch hẹn'
      });
    }

    if (appointment.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể check-in lịch hẹn đã xác nhận'
      });
    }

    // Update status
    appointment.status = 'customer_arrived';
    appointment.coreStatus = 'CheckedIn';

    await appointment.addToHistory('customer_arrived', req.user.id,
      'Khách hàng đã đến trung tâm dịch vụ');

    await appointment.save();

    // Notify technician
    io.to(`user_${appointment.assignedTechnician._id}`).emit('notification', {
      type: 'customer_arrived',
      message: `Khách hàng ${appointment.customerId.fullName} đã đến`,
      appointmentId: appointment._id
    });

    // Broadcast to appointment room
    io.to(`appointment_${appointment._id}`).emit('appointment_updated', {
      appointmentId: appointment._id,
      status: 'customer_arrived',
      coreStatus: 'CheckedIn'
    });

    res.json({
      success: true,
      message: 'Check-in thành công',
      data: appointment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### Process Cancellation Request
```javascript
export const approveCancellation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { approved, rejectionReason } = req.body;

    const appointment = await Appointment.findById(id).session(session);

    if (!appointment || appointment.status !== 'cancel_requested') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy yêu cầu hủy'
      });
    }

    if (!approved) {
      // Reject cancellation
      appointment.cancelRequest.rejectionReason = rejectionReason;
      appointment.status = appointment.cancelRequest.previousStatus || 'confirmed';

      await appointment.addToHistory('cancel_rejected', req.user.id,
        `Từ chối hủy: ${rejectionReason}`);

      await appointment.save({ session });
      await session.commitTransaction();

      return res.json({
        success: true,
        message: 'Đã từ chối yêu cầu hủy',
        data: appointment
      });
    }

    // Approve cancellation
    const hoursBefore = (new Date(appointment.scheduledDate) - new Date()) / (1000 * 60 * 60);
    const refundPercentage = appointment.calculateRefundAmount(hoursBefore);

    appointment.status = 'cancel_approved';
    appointment.coreStatus = 'Closed';
    appointment.cancelRequest.approvedBy = req.user.id;
    appointment.cancelRequest.approvedAt = new Date();
    appointment.cancelRequest.refundPercentage = refundPercentage;

    await appointment.addToHistory('cancel_approved', req.user.id,
      `Chấp thuận hủy. Hoàn ${refundPercentage}%`);

    await appointment.save({ session });

    // Release slot
    const slot = await Slot.findOne({
      date: appointment.scheduledDate,
      startTime: appointment.scheduledTime
    }).session(session);

    if (slot) {
      await slot.release(session);
    }

    await session.commitTransaction();

    // Notify customer
    io.to(`user_${appointment.customerId}`).emit('notification', {
      type: 'cancellation_approved',
      message: `Yêu cầu hủy đã được chấp thuận. Hoàn lại ${refundPercentage}%`,
      appointmentId: appointment._id
    });

    res.json({
      success: true,
      message: 'Đã chấp thuận yêu cầu hủy',
      data: appointment
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};
```

[Continue in next message due to length...]
