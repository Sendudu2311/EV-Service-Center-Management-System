# API Endpoints Reference

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `<PRODUCTION_URL>/api`

## Authentication Endpoints (`/api/auth`)

### POST /auth/register
Register a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "Nguyen",
  "lastName": "Van A",
  "phone": "0912345678",
  "role": "customer" // optional, default: customer
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "Nguyen",
      "lastName": "Van A",
      "role": "customer"
    }
  }
}
```

### POST /auth/login
Login with email and password.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "Nguyen",
      "lastName": "Van A",
      "fullName": "Nguyen Van A",
      "role": "customer",
      "avatar": "https://..."
    }
  }
}
```

### POST /auth/google-login
Login with Google OAuth.

**Request Body**:
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE4MmU..." // Google ID token
}
```

### GET /auth/me
Get current user profile (requires authentication).

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "Nguyen",
    "lastName": "Van A",
    "fullName": "Nguyen Van A",
    "role": "customer",
    "avatar": "https://...",
    "isActive": true
  }
}
```

### PUT /auth/profile
Update user profile (requires authentication).

**Request Body**:
```json
{
  "firstName": "Tran",
  "lastName": "Van B",
  "phone": "0987654321",
  "avatar": "https://..."
}
```

### PUT /auth/change-password
Change password (requires authentication).

**Request Body**:
```json
{
  "oldPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

### POST /auth/forgot-password
Request password reset.

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

### POST /auth/reset-password/:token
Reset password with token.

**Request Body**:
```json
{
  "password": "newpassword123"
}
```

---

## Appointment Endpoints (`/api/appointments`)

### GET /appointments
List appointments (filtered by user role).

**Query Parameters**:
- `status` - Filter by status (e.g., `pending`, `confirmed`)
- `coreStatus` - Filter by core status (e.g., `Scheduled`, `InService`)
- `vehicleId` - Filter by vehicle
- `customerId` - Filter by customer (staff/admin only)
- `technicianId` - Filter by technician
- `startDate`, `endDate` - Date range filter
- `page`, `limit` - Pagination (default: page=1, limit=10)
- `sort` - Sort field (default: `-scheduledDate`)

**Response** (200):
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### GET /appointments/:id
Get single appointment details.

**Response** (200):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "appointmentNumber": "APT20241030001",
    "customerId": {...},
    "vehicleId": {...},
    "services": [...],
    "status": "confirmed",
    "coreStatus": "Scheduled",
    "scheduledDate": "2024-11-01T00:00:00.000Z",
    "scheduledTime": "09:00",
    "assignedTechnician": {...},
    "totalAmount": 2500000,
    "paymentStatus": "partial",
    "depositInfo": {
      "amount": 200000,
      "paid": true,
      "paidAt": "2024-10-30T10:30:00.000Z"
    }
  }
}
```

### POST /appointments
Create new appointment (customer only).

**Request Body**:
```json
{
  "vehicleId": "507f1f77bcf86cd799439011",
  "services": ["serviceId1", "serviceId2"],
  "scheduledDate": "2024-11-01",
  "scheduledTime": "09:00",
  "bookingType": "deposit_booking",
  "customerNotes": "Please check battery thoroughly"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Tạo lịch hẹn thành công. Vui lòng thanh toán đặt cọc để hoàn tất.",
  "data": {...}
}
```

### PUT /appointments/:id
Update appointment.

**Request Body**:
```json
{
  "scheduledDate": "2024-11-02",
  "scheduledTime": "10:00",
  "customerNotes": "Updated notes"
}
```

### GET /appointments/availability
Check slot availability.

**Query Parameters**:
- `date` - Date (YYYY-MM-DD)
- `startTime` - Start time (HH:MM)
- `endTime` - End time (HH:MM)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "available": true,
    "availableSlots": 5,
    "totalSlots": 10
  }
}
```

### GET /appointments/pre-validate
Pre-validate booking before creating appointment.

**Query Parameters**:
- `vehicleId` - Vehicle ID
- `date` - Date
- `time` - Time

**Response** (200):
```json
{
  "success": true,
  "data": {
    "canBook": true,
    "message": "Có thể đặt lịch"
  }
}
```

### GET /appointments/available-technicians
Get available technicians for a date/time.

**Query Parameters**:
- `date` - Date
- `time` - Time

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "Nguyen",
      "lastName": "Van Kỹ Thuật",
      "specializations": ["battery", "motor"],
      "currentWorkload": 2,
      "averageRating": 4.8
    }
  ]
}
```

### GET /appointments/vehicle-status/:vehicleId
Check if vehicle has active appointment.

**Response** (200):
```json
{
  "success": true,
  "data": {
    "hasActiveAppointment": true,
    "appointment": {...}
  }
}
```

### PUT /appointments/:id/staff-confirm
Staff confirms appointment (staff/admin only).

**Request Body**:
```json
{
  "technicianId": "507f1f77bcf86cd799439011",
  "internalNotes": "Assign to experienced technician"
}
```

### PUT /appointments/:id/staff-reject
Staff rejects appointment (staff/admin only).

**Request Body**:
```json
{
  "reason": "Không đủ kỹ thuật viên",
  "reasonCode": "technician_unavailable"
}
```

### PUT /appointments/:id/customer-arrived
Mark customer arrival (staff/technician).

**Response** (200):
```json
{
  "success": true,
  "message": "Check-in thành công",
  "data": {...}
}
```

### PUT /appointments/:id/reschedule
Reschedule appointment.

**Request Body**:
```json
{
  "newDate": "2024-11-03",
  "newTime": "14:00",
  "reason": "Khách yêu cầu đổi lịch",
  "reasonCode": "customer_request"
}
```

### POST /appointments/:id/request-cancel
Customer requests cancellation.

**Request Body**:
```json
{
  "reason": "Đổi kế hoạch cá nhân",
  "refundMethod": "bank_transfer",
  "customerBankInfo": {
    "bankName": "Vietcombank",
    "accountNumber": "1234567890",
    "accountHolder": "NGUYEN VAN A"
  }
}
```

### POST /appointments/:id/approve-cancel
Staff approves/rejects cancellation (staff/admin only).

**Request Body**:
```json
{
  "approved": true,
  "rejectionReason": "Optional rejection reason"
}
```

### POST /appointments/:id/process-refund
Process refund after cancellation approval (staff/admin only).

**Request Body**:
```json
{
  "refundProofUrl": "https://cloudinary.com/...",
  "notes": "Đã chuyển khoản vào tài khoản khách"
}
```

### PUT /appointments/:id/start-work
Start service work (technician).

**Request Body**:
```json
{
  "estimatedCompletion": "2024-11-01T16:00:00.000Z"
}
```

### PUT /appointments/:id/complete
Complete appointment (technician).

**Request Body**:
```json
{
  "completionNotes": "Đã hoàn thành kiểm tra và bảo dưỡng pin",
  "partsUsed": [
    {
      "partId": "507f1f77bcf86cd799439011",
      "quantity": 1
    }
  ],
  "images": ["url1", "url2"]
}
```

### PUT /appointments/:id/parts-decision
Customer decides on parts shortage (customer).

**Request Body**:
```json
{
  "decision": "wait_for_parts", // or "reschedule" or "cancel"
  "notes": "I can wait for the parts"
}
```

### POST /appointments/:id/confirm-payment
Confirm final payment with proof.

**Request Body (multipart/form-data)**:
```
invoiceId: 507f1f77bcf86cd799439011
paymentMethod: cash
amount: 2300000
proofImage: <file>
notes: Paid in cash
```

### GET /appointments/work-queue
Get technician's work queue (technician only).

**Response** (200):
```json
{
  "success": true,
  "data": {
    "assigned": [...],
    "inProgress": [...],
    "completedToday": [...]
  }
}
```

### GET /appointments/pending-staff-confirmation
Get appointments pending staff confirmation (staff/admin).

**Response** (200):
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 5
  }
}
```

---

## VNPay Payment Endpoints (`/api/vnpay`)

### POST /vnpay/create-payment
Create VNPay payment URL.

**Request Body**:
```json
{
  "appointmentId": "507f1f77bcf86cd799439011",
  "amount": 200000,
  "purpose": "appointment_deposit",
  "bankCode": "NCB", // optional
  "language": "vn"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
    "transactionId": "507f1f77bcf86cd799439012"
  }
}
```

### GET /vnpay/return
VNPay return URL (public endpoint).

**Query Parameters**: (VNPay response parameters)

**Redirects to**:
- Success: `/payment-result?success=true&transactionId=...`
- Failure: `/payment-result?success=false&message=...`

### POST /vnpay/ipn
VNPay IPN handler (public endpoint for VNPay callbacks).

**Request Body**: VNPay IPN data

**Response** (200):
```json
{
  "RspCode": "00",
  "Message": "Confirm Success"
}
```

### POST /vnpay/verify-appointment-payment
Verify and trigger post-payment workflow.

**Request Body**:
```json
{
  "transactionId": "507f1f77bcf86cd799439012",
  "appointmentId": "507f1f77bcf86cd799439011"
}
```

### GET /vnpay/transactions
Get user's transaction history (requires auth).

**Query Parameters**:
- `status` - Filter by status
- `startDate`, `endDate` - Date range
- `page`, `limit` - Pagination

**Response** (200):
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 20,
    "page": 1,
    "limit": 10
  }
}
```

### GET /vnpay/transactions/all
Get all transactions (staff/admin only).

### GET /vnpay/transactions/:id
Get transaction details.

**Response** (200):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "transactionRef": "VNP20241030123456",
    "transactionType": "vnpay",
    "paymentPurpose": "appointment_deposit",
    "amount": 200000,
    "status": "completed",
    "appointmentId": "507f1f77bcf86cd799439011",
    "createdAt": "2024-10-30T10:30:00.000Z"
  }
}
```

### GET /vnpay/transactions/stats
Get transaction statistics (staff/admin).

**Query Parameters**:
- `startDate`, `endDate` - Date range

**Response** (200):
```json
{
  "success": true,
  "data": {
    "totalTransactions": 100,
    "totalAmount": 50000000,
    "byStatus": {
      "completed": 85,
      "pending": 10,
      "failed": 5
    },
    "byMethod": {
      "vnpay": 60,
      "cash": 25,
      "card": 10,
      "bank_transfer": 5
    }
  }
}
```

---

## Parts Endpoints (`/api/parts`)

### GET /parts
List parts with filters.

**Query Parameters**:
- `search` - Search by name, part number
- `category` - Filter by category
- `subcategory` - Filter by subcategory
- `brand` - Filter by brand
- `inStock` - Filter in-stock items (boolean)
- `lowStock` - Filter low-stock items (boolean)
- `page`, `limit` - Pagination

### POST /parts
Create new part (staff/admin).

**Request Body**:
```json
{
  "partNumber": "BAT-LI-001",
  "name": "Pin Lithium-Ion 60kWh",
  "category": "battery",
  "subcategory": "lithium-ion",
  "brand": "Tesla",
  "pricing": {
    "cost": 15000000,
    "retail": 20000000,
    "wholesale": 18000000
  },
  "inventory": {
    "currentStock": 10,
    "minStockLevel": 2,
    "maxStockLevel": 20
  },
  "compatibility": {
    "makes": ["Tesla", "VinFast"],
    "models": ["Model 3", "VF8"],
    "years": { "min": 2020, "max": 2024 }
  }
}
```

### GET /parts/:id
Get part details.

### PUT /parts/:id
Update part (staff/admin).

### DELETE /parts/:id
Delete part (admin only).

### GET /parts/check-availability
Check multiple parts availability.

**Query Parameters**:
- `parts` - JSON array: `[{"partId":"id1","quantity":2},{"partId":"id2","quantity":1}]`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "partId": "507f1f77bcf86cd799439011",
      "partName": "Pin Lithium-Ion 60kWh",
      "requestedQuantity": 2,
      "availableQuantity": 10,
      "available": true
    }
  ]
}
```

### POST /parts/:id/reserve
Reserve parts for appointment (technician/staff).

**Request Body**:
```json
{
  "appointmentId": "507f1f77bcf86cd799439011",
  "quantity": 1
}
```

### POST /parts/:id/release
Release reservation (technician/staff).

**Request Body**:
```json
{
  "appointmentId": "507f1f77bcf86cd799439011"
}
```

### POST /parts/:id/restock
Restock parts (staff/admin).

**Request Body**:
```json
{
  "quantity": 20,
  "notes": "Nhập hàng từ nhà cung cấp"
}
```

### POST /parts/bulk-import
Import parts from Excel file (staff/admin).

**Request Body (multipart/form-data)**:
```
file: <Excel file>
```

**Response** (200):
```json
{
  "success": true,
  "message": "Import thành công 15 linh kiện",
  "data": {
    "imported": 15,
    "failed": 2,
    "errors": [...]
  }
}
```

### GET /parts/export
Export parts to Excel.

**Response**: Excel file download

### GET /parts/template
Download import template.

**Response**: Excel file download

---

## Part Request Endpoints (`/api/part-requests`)

### GET /part-requests
List part requests (filtered by role).

### POST /part-requests
Create part request (technician).

**Request Body**:
```json
{
  "type": "initial_service",
  "appointmentId": "507f1f77bcf86cd799439011",
  "serviceReceptionId": "507f1f77bcf86cd799439012",
  "requestedParts": [
    {
      "partId": "507f1f77bcf86cd799439013",
      "quantity": 1,
      "reason": "Pin cần thay thế",
      "priority": "high"
    }
  ],
  "urgency": "normal"
}
```

### PUT /part-requests/:id/approve
Staff approves/rejects part request (staff/admin).

**Request Body**:
```json
{
  "decision": "approve_all", // or "approve_partial" or "reject_insufficient_stock" or "reject_unnecessary"
  "staffNotes": "Đã duyệt tất cả linh kiện",
  "alternativeParts": [
    {
      "originalPartId": "507f1f77bcf86cd799439013",
      "alternativePartId": "507f1f77bcf86cd799439014",
      "reason": "Linh kiện gốc hết hàng"
    }
  ]
}
```

### PUT /part-requests/:id/fulfill
Mark part request as fulfilled (technician/staff).

**Request Body**:
```json
{
  "actualPartsUsed": [
    {
      "partId": "507f1f77bcf86cd799439013",
      "quantity": 1,
      "condition": "new"
    }
  ]
}
```

### GET /part-requests/summary
Get aggregated part requests summary (staff/admin).

**Response** (200):
```json
{
  "success": true,
  "data": {
    "byStatus": {
      "pending": 5,
      "approved": 10,
      "fulfilled": 20
    },
    "totalCost": 15000000,
    "topRequestedParts": [...]
  }
}
```

---

## Invoice Endpoints (`/api/invoices`)

### GET /invoices
List invoices (filtered by role).

### POST /invoices
Generate invoice (staff/admin).

**Request Body**:
```json
{
  "appointmentId": "507f1f77bcf86cd799439011",
  "serviceReceptionId": "507f1f77bcf86cd799439012",
  "discount": {
    "type": "percentage",
    "value": 10,
    "reason": "Khách hàng thân thiết"
  },
  "notes": "Cảm ơn quý khách"
}
```

### GET /invoices/:id
Get invoice details.

### POST /invoices/:id/payment
Record payment (staff/admin).

**Request Body**:
```json
{
  "method": "cash",
  "amount": 2500000,
  "transactionRef": "CASH20241030001",
  "notes": "Thanh toán tiền mặt"
}
```

### POST /invoices/:id/upload-proof
Upload payment proof image.

**Request Body (multipart/form-data)**:
```
proof: <image file>
```

---

## Dashboard Endpoints (`/api/dashboard`)

### GET /dashboard/stats
Get overall statistics (filtered by role).

**Response** (200):
```json
{
  "success": true,
  "data": {
    // Role-specific stats
  }
}
```

### GET /dashboard/customer-stats
Customer-specific statistics (customer only).

**Response** (200):
```json
{
  "success": true,
  "data": {
    "totalVehicles": 2,
    "activeAppointments": 1,
    "upcomingAppointments": 2,
    "completedAppointments": 15,
    "totalSpent": 35000000
  }
}
```

### GET /dashboard/technician-stats
Technician statistics (technician only).

### GET /dashboard/staff-stats
Staff statistics (staff only).

### GET /dashboard/admin-stats
Admin statistics (admin only).

---

## Common Response Format

### Success Response
```json
{
  "success": true,
  "message": "Optional success message",
  "data": {}, // or []
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message in Vietnamese",
  "errors": [
    {
      "field": "email",
      "message": "Email không hợp lệ"
    }
  ]
}
```

## Authentication

Most endpoints require authentication via JWT token:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Rate Limiting

- **General**: 100 requests per 15 minutes per IP
- **Authentication**: 5 login attempts per 15 minutes per IP
- **Payment**: 10 requests per 5 minutes per user

## Error Codes

- **400**: Bad Request (validation error)
- **401**: Unauthorized (no token or invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (duplicate resource)
- **500**: Internal Server Error
