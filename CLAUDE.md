# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Enhanced EV Service Center Management System built for Vietnamese electric vehicle service centers. It's a full-stack application with React.js/TypeScript frontend and Node.js/Express backend, implementing a comprehensive workflow from customer booking to service completion with Vietnamese business compliance (VND currency, 10% VAT).

## Development Commands

### Frontend (React + Vite + TypeScript)
```bash
npm run dev              # Start frontend development server (port 5173)
npm run build            # Build frontend for production
npm run preview          # Preview production build
npm run lint             # Run ESLint
```

### Backend (Node.js + Express + MongoDB)
```bash
cd server
npm run dev              # Start backend with nodemon (port 3000)
npm start                # Start backend in production
npm run seed             # Seed database with comprehensive sample data
```

### Full Stack Development
```bash
npm run dev:full         # Run both frontend and backend concurrently
npm run server           # Start only backend server
npm run client           # Start only frontend (same as dev)
```

### Database Management
```bash
cd server
node utils/migration.js migrate    # Run database migrations
node utils/migration.js rollback   # Rollback migrations
node utils/migration.js verify     # Verify migration status
```

## System Architecture

### Enhanced Vietnamese EV Service Workflow
The system implements a sophisticated 14-state appointment workflow:
```
Customer Books → Staff Confirms → Customer Arrives → Technician Creates Reception Form 
→ Staff Reviews Parts → Work In Progress → EV Checklist Completion → Invoice Generation → Payment → Completion
```

**Core Status System**: Dual-status architecture with 6 core statuses (`Scheduled`, `CheckedIn`, `InService`, `OnHold`, `ReadyForPickup`, `Closed`) mapped from 14 detailed statuses for business reporting.

### Key Models & Relationships
- **Appointment**: Core entity with 14 detailed statuses and 6 core statuses
- **ServiceReception**: Vietnamese "Phiếu tiếp nhận dịch vụ" with EV checklists
- **PartRequest**: Sophisticated parts request/approval system with `initial_service` and `additional_during_service` types
- **Invoice**: Vietnamese-compliant billing with 10% VAT, VND formatting
- **User**: Multi-role system (Customer, Staff, Technician, Admin)
- **Vehicle**: EV-specific data (battery type, capacity, charging power)
- **Part**: Real-time inventory with reservation system

### Frontend Structure
- **Role-based Dashboards**: Separate interfaces for each user type
- **Protected Routes**: Role-based access control with AuthContext
- **Real-time Updates**: Socket.io integration for live status updates
- **Vietnamese Localization**: VND currency, Vietnamese UI elements

### Backend Structure
- **MongoDB with Mongoose**: Document-based storage optimized for EV service data
- **JWT Authentication**: Role-based access control
- **Socket.io**: Real-time notifications and chat
- **Express Middleware**: CORS, authentication, error handling

## Advanced Features

### Parts Management System
- **Real-time Inventory**: Live stock checking with reservation system
- **Approval Workflow**: Staff approval for parts requests with alternatives
- **Optimization**: Compound indexes, aggregation pipelines, batch operations
- **Two-tier Requests**: Initial service parts vs. additional parts during service

### Vietnamese Business Compliance
- **Currency**: VND formatting throughout system
- **Tax**: Automatic 10% VAT calculation
- **Invoice System**: Vietnamese invoice standards
- **Business Workflow**: Local service industry practices

### EV-Specific Features
- **Battery Diagnostics**: Specialized EV checklist items
- **Charging System**: Port and cable inspection protocols
- **Safety Protocols**: High-voltage safety procedures
- **Digital Documentation**: Photo and diagnostic records

## API Architecture

Base URL: `/api` (port 3000)

### Core Endpoints
```
# Authentication & Users
POST   /api/auth/login              # User authentication
GET    /api/auth/me                 # Get current user profile

# Appointment Workflow
POST   /api/appointments             # Create appointment (requires vehicleId, serviceCenterId)
PUT    /api/appointments/:id/confirm # Staff confirmation
PUT    /api/appointments/:id/checkin # Customer arrival
POST   /api/service-receptions      # Create service reception form
PUT    /api/service-receptions/:id/approve # Staff approval

# Parts Management
POST   /api/part-requests           # Request parts (initial or additional)
PUT    /api/part-requests/:id/approve # Staff review/approval
GET    /api/part-requests/summary   # Aggregated analytics

# Invoice System
POST   /api/invoices                # Generate Vietnamese invoice
PUT    /api/invoices/:id/payment    # Process payment
```

## Development Patterns

### Status Management
The system uses a hybrid status approach:
- **Detailed Status**: 14 technical statuses for workflow control
- **Core Status**: 6 business statuses for reporting and UI simplification
- **Auto-computation**: Core status automatically derived from detailed status

### Error Handling
- **Alternative Flows**: Comprehensive handling of parts shortage, cancellations, rescheduling
- **Business Logic**: Vietnamese service industry workflows
- **Data Validation**: Mongoose schemas with business rule validation

### Performance Optimizations
- **Compound Indexes**: Optimized for common query patterns
- **Aggregation Pipelines**: Complex analytics queries
- **Batch Operations**: Efficient parts availability checking
- **Caching Strategy**: Part info caching to reduce repeated queries

## Database Seeding & Migration

### Sample Data
The seeder creates comprehensive test data:
- **Users**: All 4 roles with realistic Vietnamese data
- **Vehicles**: Tesla, VinFast, and other EV models
- **Appointments**: Diverse statuses demonstrating full workflow
- **Parts**: EV-specific parts with Vietnamese suppliers
- **Service Centers**: Multiple locations with Vietnamese addresses

### Migration System
- **Schema Updates**: Safe migration of existing appointments
- **Data Integrity**: Verification and rollback capabilities
- **Status Mapping**: Automatic conversion to new status system

## Real-time Features

### Socket.io Integration
- **Live Status Updates**: Real-time appointment progress
- **Chat System**: Customer-staff communication
- **Notifications**: Vietnamese-language notifications
- **Dashboard Updates**: Live data refresh for all user types

## Testing & Quality

### API Testing
- **Booking Flow Tests**: Comprehensive end-to-end workflow testing
- **Status Transitions**: Validation of all state changes
- **Alternative Flows**: Testing edge cases and error scenarios
- **Performance Tests**: Parts system optimization validation

### Code Quality
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality enforcement
- **Mongoose Validation**: Database-level data integrity
- **Error Boundaries**: Comprehensive error handling

## Environment Configuration

### Required Environment Variables (server/.env)
```
MONGODB_URI=mongodb://...
JWT_SECRET=your_jwt_secret
PORT=3000
NODE_ENV=development
```

### Development Ports
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend**: http://localhost:3000 (Express server)
- **Database**: MongoDB Atlas or local MongoDB

## Deployment Considerations

### Production Requirements
- **Database**: MongoDB Atlas recommended for production
- **File Storage**: Cloud storage for vehicle/service documents
- **Real-time**: WebSocket support required for Socket.io
- **SSL**: HTTPS required for payment processing
- **Performance**: Consider Redis caching for high-traffic scenarios

### Vietnamese Localization
- **Currency**: VND formatting and calculations
- **Language**: Vietnamese interface elements
- **Business Rules**: Local service industry practices
- **Tax Compliance**: 10% VAT calculation and reporting

## Documentation

### Comprehensive Diagrams
- **State Diagram**: All 14 appointment states and transitions
- **Activity Diagram**: Complete workflow from booking to completion  
- **Sequence Diagram**: Actor interactions and system communications
- **Component Diagram**: System architecture and relationships

Located in `/docs/` directory with detailed PlantUML diagrams explaining the Vietnamese EV service workflow.