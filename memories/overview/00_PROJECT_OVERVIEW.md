# Enhanced EV Service Center Management System - Project Overview

## Executive Summary

This is a full-stack Vietnamese Electric Vehicle Service Center Management System built with:
- **Frontend**: React 18.3 + TypeScript 5.5 + Vite 5.4
- **Backend**: Node.js + Express 4.18 + MongoDB (Mongoose 8.0)
- **Real-time**: Socket.io 4.8
- **Payment**: VNPay integration
- **AI**: Google Gemini chatbot

## Project Scale

- **Frontend**: 39 pages, 57 components, 8 type definition files
- **Backend**: 17 controllers, 18 routes, 17 models
- **Total Code**: 250+ files (excluding node_modules)
- **Key File Sizes**:
  - `server/controllers/appointmentController.js`: 160KB (4000+ lines)
  - `server/models/Appointment.js`: 31KB (800+ lines)
  - `server/utils/seeder.js`: 132KB (comprehensive test data)
  - `server/controllers/vnpayController.js`: 54KB (1400+ lines)

## Core Business Logic

### 14-State Appointment Workflow
The system implements a sophisticated Vietnamese EV service workflow with 14 detailed statuses:

1. **pending** - Customer books, awaits staff confirmation
2. **confirmed** - Staff confirms, technician assigned
3. **customer_arrived** - Customer brings vehicle
4. **reception_created** - Technician creates reception form
5. **reception_approved** - Staff approves reception + parts
6. **parts_insufficient** - Not enough parts, decision needed
7. **waiting_for_parts** - Customer agrees to wait for parts order
8. **rescheduled** - Rescheduled due to parts shortage
9. **in_progress** - Service work in progress
10. **parts_requested** - Additional parts needed during service
11. **completed** - All work completed
12. **invoiced** - Invoice generated and sent
13. **cancelled** - Appointment cancelled
14. **no_show** - Customer didn't show up

### Dual-Status System
- **Detailed Status** (14): For workflow control and business logic
- **Core Status** (6): For reporting and UI simplification
  - `Scheduled`: pending, confirmed, rescheduled
  - `CheckedIn`: customer_arrived, reception_created
  - `InService`: reception_approved, in_progress, parts_requested
  - `OnHold`: parts_insufficient, waiting_for_parts
  - `ReadyForPickup`: completed, invoiced
  - `Closed`: cancelled, no_show, cancel_requested, cancel_approved, cancel_refunded

## Vietnamese Business Compliance

### Currency
- All amounts in VND (Vietnamese Dong)
- Formatting: `123.456.789 ₫` (dot separators)
- No decimal places

### Tax (VAT)
- Automatic 10% VAT on all services and parts
- Separate VAT line in invoices

### Invoice Format
- Invoice number: `INV + YYYYMMDD + sequence`
- Company information with tax code
- Itemized services and parts
- Subtotal, VAT, Total
- Payment terms and signatures

## Key Features

### 1. Role-Based System
- **Customer**: Book appointments, view vehicles, track service history
- **Staff**: Confirm appointments, review receptions, approve parts, generate invoices
- **Technician**: Service reception, checklist execution, parts request
- **Admin**: System-wide management, reports, user management

### 2. Parts Management
- Real-time inventory tracking
- Parts reservation system
- Two-tier parts request (initial + additional during service)
- Excel import/export
- Alternative parts suggestion
- Low stock alerts

### 3. Payment Integration
- **VNPay**: Online payment (ATM, credit card, e-wallet)
- **Offline**: Cash, card, bank transfer
- Deposit booking: 200,000 VND default
- Payment proof upload
- Refund processing with time-based percentages

### 4. EV-Specific Features
- Battery diagnostics (level, health, temperature)
- Charging system inspection
- High-voltage safety protocols
- EV checklist templates
- Battery type compatibility

### 5. Real-time Features
- Socket.io integration
- Live status updates
- Chat system (per appointment)
- Real-time notifications
- Payment status updates

### 6. Vietnamese Localization
- All UI in Vietnamese
- Vietnamese email templates
- VND currency formatting
- Vietnamese date/time formats
- Vietnamese status translations

## Directory Structure

```
EV-Service-Center-Management-System/
├── src/                      # Frontend React + TypeScript
│   ├── components/          # 57 components
│   ├── pages/              # 39 pages
│   ├── contexts/           # AuthContext, SocketContext
│   ├── services/           # API service layer
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utilities (vietnamese.ts, etc.)
├── server/                  # Backend Node.js + Express
│   ├── controllers/        # 17 controllers
│   ├── models/             # 17 Mongoose models
│   ├── routes/             # 18 route files
│   ├── middleware/         # auth, socketAuth, validation
│   ├── utils/              # seeder, email, geminiAI
│   └── config/             # database, cloudinary, vnpay
├── docs/                    # PlantUML diagrams
├── CLAUDE.md               # AI assistant documentation
└── TECHNICAL_SPECIFICATION.md
```

## Technology Stack

### Frontend
- React 18.3, TypeScript 5.5, Vite 5.4
- Tailwind CSS (SPLASH theme: Neon Lime + Dark Mode)
- React Router DOM 7.8
- React Query 5.89 (data fetching)
- React Hook Form 7.62 + Zod 4.1 (forms)
- Socket.io-client 4.8
- Axios 1.12, date-fns 4.1, xlsx 0.18

### Backend
- Node.js + Express 4.18
- MongoDB + Mongoose 8.0
- JWT authentication
- Socket.io 4.7
- VNPay 2.4, Stripe 14.9
- Cloudinary 1.41 (file upload)
- Nodemailer 6.9 (email)
- Google Generative AI 0.24 (Gemini chatbot)

## Development Commands

### Frontend
```bash
npm run dev              # Start frontend (port 5173)
npm run build            # Build for production
npm run preview          # Preview production build
```

### Backend
```bash
cd server
npm run dev              # Start with nodemon (port 3000)
npm start                # Production start
npm run seed             # Seed database
```

### Full Stack
```bash
npm run dev:full         # Run both frontend and backend
```

## Database Models (17 Models)

1. **User** - Multi-role authentication
2. **Vehicle** - EV-specific data
3. **Appointment** - Core entity with 14 statuses
4. **ServiceReception** - Vietnamese "Phiếu tiếp nhận dịch vụ"
5. **Part** - Inventory with reservation system
6. **PartRequest** - Two-tier parts request
7. **Invoice** - Vietnamese compliant invoicing
8. **Transaction** - Base transaction model (polymorphic)
9. **VNPAYTransaction** - VNPay specific
10. **CashTransaction** - Cash payment
11. **CardTransaction** - Card payment
12. **BankTransferTransaction** - Bank transfer
13. **Slot** - Technician scheduling
14. **TechnicianProfile** - Technician details
15. **EVChecklist** - EV inspection templates
16. **ChecklistInstance** - Checklist execution
17. **Service** - Service catalog

## API Endpoints (Base: /api)

- `/auth` - Authentication (login, register, Google OAuth)
- `/appointments` - Appointment workflow (30+ endpoints)
- `/vnpay` - Payment processing (20+ endpoints)
- `/parts` - Parts inventory management
- `/part-requests` - Parts request workflow
- `/invoices` - Invoice generation and payment
- `/service-receptions` - Service reception workflow
- `/transactions` - Unified transaction management
- `/dashboard` - Analytics and KPIs
- `/slots` - Technician slot management
- `/vehicles` - Vehicle management
- `/services` - Service catalog
- `/technicians` - Technician profiles
- `/checklist-instances` - Checklist execution
- `/chatbot` - AI chatbot
- `/reports` - Advanced reporting

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://...
JWT_SECRET=...
JWT_EXPIRE=7d
EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
VNPAY_TMN_CODE, VNPAY_SECURE_SECRET, VNPAY_HOST
CLIENT_URL=http://localhost:5173
```

## Unique Features

1. **Dual-Status System** - 14 detailed + 6 core statuses
2. **Two-Tier Parts Request** - Initial vs. additional during service
3. **Parts Reservation** - Real-time inventory with reservation
4. **Time-Based Refund** - Automatic percentage calculation
5. **Bank Transfer Refund** - Customer uploads bank info
6. **EV Checklists** - Comprehensive EV-specific inspection
7. **VNPay Integration** - Vietnamese payment gateway
8. **AI Chatbot** - Gemini-powered support
9. **Real-time Chat** - Per-appointment chat rooms
10. **Vietnamese Compliance** - Full localization and business rules

## Production Readiness

### Implemented
✓ Comprehensive error handling
✓ Input validation and sanitization
✓ JWT authentication with role-based access
✓ Email notifications (Vietnamese)
✓ VNPay payment integration
✓ Real-time features (Socket.io)
✓ Analytics and reporting
✓ File upload (Cloudinary)
✓ Database migrations
✓ Comprehensive seed data

### Recommended Enhancements
- Add Redis caching
- Implement rate limiting
- Add comprehensive logging (Winston)
- Set up monitoring (DataDog, New Relic)
- Add automated testing (Jest, Supertest, React Testing Library)
- Implement CI/CD pipeline
- Add API documentation (Swagger/OpenAPI)
- Enhance security headers
- Add backup and recovery procedures
- Implement feature flags

## Current Git Branch
- **Current**: `sdd`
- **Main**: `main`
- **Status**: Clean (no uncommitted changes)

## Recent Development Activity
- New overall app theme implementation
- Transaction routes and handling enhancement
- Excel import/merge feature for parts
- Appointment auto-parts reduction implementation
- Parts inventory reduction analysis
- Payment system improvements