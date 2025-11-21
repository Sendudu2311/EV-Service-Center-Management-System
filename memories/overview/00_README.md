# Serena MCP Memory Documentation

## Overview

This directory contains comprehensive memory documentation for the **Enhanced EV Service Center Management System** - a full-stack Vietnamese Electric Vehicle service center application.

Last Updated: 2024-10-30

## Memory Files

### 00_PROJECT_OVERVIEW.md
**Purpose**: High-level overview of the entire project
**Contains**:
- Executive summary
- Project scale and statistics
- Technology stack
- Key features
- Directory structure
- Development commands
- Database models overview
- API endpoints summary
- Vietnamese business compliance
- Production readiness checklist

**When to use**:
- First reference for understanding the project
- Quick lookup for tech stack and features
- Understanding business requirements

---

### 01_FRONTEND_ARCHITECTURE.md
**Purpose**: Complete frontend architecture and implementation details
**Contains**:
- React + TypeScript + Vite setup
- Component structure (57 components)
- Page structure (39 pages)
- Authentication system (AuthContext)
- Real-time features (SocketContext)
- Routing configuration
- Role-based dashboards
- Forms and validation (React Hook Form + Zod)
- API service layer
- Type definitions
- Vietnamese localization
- UI components and SPLASH theme
- Performance optimizations

**When to use**:
- Working on frontend components
- Understanding React patterns
- Implementing new features in UI
- Debugging frontend issues
- Understanding authentication flow

---

### 02_BACKEND_ARCHITECTURE.md
**Purpose**: Backend server architecture and API implementation
**Contains**:
- Express + MongoDB setup
- Server configuration (350 lines)
- Socket.io real-time features
- Authentication & authorization (JWT)
- Controllers (17 controllers)
- Middleware (auth, socketAuth, validation)
- Email system (Nodemailer)
- File upload (Cloudinary)
- Payment integration (VNPay)
- AI chatbot (Gemini)
- Background jobs and scheduler
- Error handling

**When to use**:
- Working on backend APIs
- Understanding authentication
- Implementing new endpoints
- Debugging server issues
- Understanding business logic in controllers

---

### 03_DATABASE_MODELS.md
**Purpose**: MongoDB models and schemas
**Contains**:
- 17 Mongoose models
- Model relationships diagram
- Schema definitions with all fields
- Indexes and optimizations
- Virtual fields
- Model methods (instance and static)
- Pre/post hooks
- Validation rules
- Business logic in models

**Key Models**:
- User (multi-role)
- Appointment (31KB, 800+ lines, 14 statuses)
- Vehicle (EV-specific)
- ServiceReception (20KB, Vietnamese form)
- Part (inventory with reservation)
- PartRequest (two-tier system)
- Invoice (Vietnamese compliant)
- Transaction (polymorphic)

**When to use**:
- Understanding data structure
- Querying database
- Adding new fields
- Understanding relationships
- Optimizing queries

---

### 04_API_ENDPOINTS.md
**Purpose**: Complete API reference documentation
**Contains**:
- All API endpoints with examples
- Request/response formats
- Authentication requirements
- Query parameters
- Error codes
- Vietnamese response messages

**Endpoint Categories**:
- Authentication (`/api/auth`)
- Appointments (`/api/appointments`) - 30+ endpoints
- VNPay Payment (`/api/vnpay`) - 20+ endpoints
- Parts (`/api/parts`)
- Part Requests (`/api/part-requests`)
- Invoices (`/api/invoices`)
- Service Receptions (`/api/service-receptions`)
- Transactions (`/api/transactions`)
- Dashboard (`/api/dashboard`)

**When to use**:
- Implementing API calls from frontend
- Understanding endpoint parameters
- Testing APIs
- Debugging API issues
- Understanding authentication flow

---

### 05_WORKFLOWS_AND_BUSINESS_LOGIC.md
**Purpose**: Business workflows and logic
**Contains**:
- 14-state appointment workflow (detailed diagram)
- Status descriptions and transitions
- Core status mapping (6 core statuses)
- Cancellation and refund workflow
- Parts management workflow (two-tier)
- Invoice generation and payment flow
- Real-time features (Socket.io events)
- Automated scheduler (cron jobs)
- Business rules and validations
- Refund calculation formulas
- Key metrics and KPIs

**When to use**:
- Understanding business processes
- Implementing workflow logic
- Debugging status transitions
- Understanding customer journey
- Implementing new workflows

---

## Quick Reference

### File Locations

**Frontend**:
- Components: `src/components/`
- Pages: `src/pages/`
- Types: `src/types/`
- Utils: `src/utils/`
- API: `src/services/api.ts`

**Backend**:
- Controllers: `server/controllers/`
- Models: `server/models/`
- Routes: `server/routes/`
- Utils: `server/utils/`
- Config: `server/config/`

**Important Files**:
- Main server: `server/server.js` (350 lines)
- Appointment controller: `server/controllers/appointmentController.js` (160KB, 4000+ lines)
- Appointment model: `server/models/Appointment.js` (31KB, 800+ lines)
- Frontend routing: `src/App.tsx` (383 lines)
- Auth context: `src/contexts/AuthContext.tsx`
- Socket context: `src/contexts/SocketContext.tsx`

---

### Common Tasks

#### Adding a new API endpoint
1. Check `02_BACKEND_ARCHITECTURE.md` for controller structure
2. Check `03_DATABASE_MODELS.md` for data models
3. Check `04_API_ENDPOINTS.md` for API patterns
4. Add route in `server/routes/`
5. Add controller logic in `server/controllers/`
6. Update frontend API service in `src/services/api.ts`

#### Adding a new status to appointment workflow
1. Check `05_WORKFLOWS_AND_BUSINESS_LOGIC.md` for current workflow
2. Update `status` enum in `server/models/Appointment.js`
3. Update status translations in `src/types/appointment.ts`
4. Add transition logic in appointment controller
5. Update UI status badges and colors
6. Update workflow diagram documentation

#### Working with Vietnamese features
1. Currency formatting: `src/utils/vietnamese.ts`
2. Status translations: `src/types/appointment.ts`
3. Email templates: `server/utils/emailTemplates.js` (Vietnamese)
4. Invoice format: Check `03_DATABASE_MODELS.md` Invoice model
5. VAT calculation: Always 10% in invoice generation

#### Debugging authentication issues
1. Check `01_FRONTEND_ARCHITECTURE.md` → Authentication System
2. Check `02_BACKEND_ARCHITECTURE.md` → JWT Middleware
3. Verify token in browser localStorage
4. Check token expiry (7 days default)
5. Check user role and permissions

---

## Important Patterns

### Status Transitions
Always validate status transitions using `appointment.canTransitionTo(newStatus)` before changing status.

### Parts Reservation
When requesting parts, always check availability and create reservation to prevent double-booking.

### Payment Integration
VNPay requires:
1. Create payment URL
2. Redirect to VNPay
3. Handle IPN callback
4. Verify payment with secure hash
5. Update appointment status

### Real-time Updates
Use Socket.io to broadcast:
- Appointment status changes
- Payment confirmations
- Chat messages
- Service progress

### Error Handling
Always return Vietnamese error messages:
```javascript
{
  success: false,
  message: "Lỗi...",
  errors: [...]
}
```

---

## Development Environment

### Frontend
- Port: 5173
- Command: `npm run dev`
- Hot reload: Enabled (Vite HMR)

### Backend
- Port: 3000
- Command: `cd server && npm run dev`
- Nodemon: Enabled

### Full Stack
- Command: `npm run dev:full`

### Database
- MongoDB Atlas: `mongodb+srv://duytq:...`
- Seeder: `cd server && npm run seed`

---

## Key Business Rules

1. **Deposit**: 200,000 VND for all bookings
2. **VAT**: 10% on all services and parts
3. **Currency**: VND only, no decimal places
4. **Refund**: Time-based percentage (100% if >24h, 70% if 12-24h, etc.)
5. **Customer Approval**: Required if additional cost > 500,000 VND
6. **No-show**: Marked automatically 2 hours after scheduled time
7. **Parts Reservation**: Automatic when appointment confirmed
8. **Invoice Format**: Vietnamese standard with tax code

---

## Common Queries

### Get all pending appointments
```javascript
const appointments = await Appointment.find({
  status: 'pending',
  'depositInfo.paid': true
}).populate('customerId vehicleId');
```

### Check parts availability
```javascript
const available = await Part.getAvailableStock(partId);
// or
const canBook = part.getAvailableStock() >= requestedQuantity;
```

### Generate invoice
```javascript
const invoice = await Invoice.create({
  appointmentId,
  serviceItems: appointment.services,
  partItems: appointment.partsUsed,
  subtotal: calculateSubtotal(),
  tax: { vatRate: 10, vatAmount: subtotal * 0.1 },
  totalAmount: subtotal * 1.1
});
```

---

## Testing

### Seed Database
```bash
cd server
npm run seed
```

Creates:
- 4 users per role (16 users total)
- 20+ vehicles
- 40+ appointments in various statuses
- 50+ parts
- Invoices and transactions

### Test Accounts
- Customer: `customer1@example.com` / `password123`
- Staff: `staff1@example.com` / `password123`
- Technician: `technician1@example.com` / `password123`
- Admin: `admin1@example.com` / `password123`

---

## Production Checklist

Current Status: **Development**

Recommended for Production:
- [ ] Add Redis caching
- [ ] Implement rate limiting
- [ ] Add comprehensive logging (Winston)
- [ ] Set up monitoring (DataDog, New Relic)
- [ ] Add automated testing (Jest, Supertest, React Testing Library)
- [ ] Implement CI/CD pipeline
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Enhance security headers
- [ ] Add backup and recovery procedures
- [ ] Implement feature flags

Already Implemented:
- [x] JWT authentication
- [x] Role-based access control
- [x] Input validation
- [x] Error handling
- [x] Email notifications
- [x] Real-time features
- [x] Payment integration
- [x] File upload
- [x] Database migrations

---

## Contact & Support

For questions about:
- **Architecture**: See memory files above
- **API**: Check `04_API_ENDPOINTS.md`
- **Workflows**: Check `05_WORKFLOWS_AND_BUSINESS_LOGIC.md`
- **Models**: Check `03_DATABASE_MODELS.md`
- **Frontend**: Check `01_FRONTEND_ARCHITECTURE.md`
- **Backend**: Check `02_BACKEND_ARCHITECTURE.md`

---

## Version History

- **2024-10-30**: Initial comprehensive memory documentation
  - Complete codebase analysis
  - All 5 memory files created
  - Full API reference
  - Workflow diagrams
  - Business logic documentation

---

## Notes for AI Assistants

When working with this codebase:

1. **Always check memory files first** before asking questions
2. **Use Vietnamese** for user-facing messages and documentation
3. **Follow existing patterns** in the codebase
4. **Validate status transitions** before changing appointment status
5. **Apply 10% VAT** to all financial calculations
6. **Format VND currency** with dot separators (123.456.789 ₫)
7. **Use Socket.io** for real-time updates
8. **Test with seeded data** before production
9. **Keep documentation updated** when making changes
10. **Follow Vietnamese business rules** (tax code, invoice format, etc.)

Happy coding! 🚗⚡
