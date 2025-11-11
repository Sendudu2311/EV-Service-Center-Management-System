# Service Reception Rejection Flow Analysis

## 🔍 Tổng Quan

Phân tích chi tiết luồng xử lý khi **Staff từ chối (reject)** đơn tiếp nhận dịch vụ (Service Reception).

---

## 📋 1. Khi Staff Reject - Controller Logic

### File: `server/controllers/serviceReceptionController.js`

### Function: `approveServiceReception` (Lines 576-950)

#### 1.1. Input Parameters

```javascript
{
  decision: 'approved' | 'rejected',  // Hoặc
  approved: boolean,                  // Legacy format
  reviewNotes: string,                // Lý do reject
  staffNotes: string                  // Alternative field
}
```

#### 1.2. Logic Xử Lý Rejection (Lines 634-644)

```javascript
// Line 586: Determine if approved or rejected
const isApproved = decision ? decision === "approved" : approved;
const notes = reviewNotes || staffNotes || "";

// Lines 634-644: Update ServiceReception
if (isApproved) {
  serviceReception.status = "approved";
} else {
  // ⚠️ QUAN TRỌNG: Status KHÔNG THAY ĐỔI khi reject
  // serviceReception.status vẫn giữ nguyên "received"
}

serviceReception.submissionStatus.staffReviewStatus = isApproved
  ? "approved"
  : "rejected"; // ← Chỉ update staffReviewStatus

serviceReception.submissionStatus.reviewedBy = req.user._id;
serviceReception.submissionStatus.reviewedAt = new Date();
serviceReception.submissionStatus.reviewNotes = notes;
serviceReception.updatedAt = new Date();
```

#### 1.3. Appointment Update When Rejected (Lines 824-835)

```javascript
} else if (appointment && !isApproved) {
  // When rejected, just add to history but keep current status
  appointment.workflowHistory.push({
    status: appointment.status, // ← Giữ nguyên status hiện tại
    changedBy: req.user._id,
    changedAt: new Date(),
    notes: `Service reception rejected by staff: ${
      notes || "No reason provided"
    }`,
  });
  await appointment.save();
}
```

---

## 📊 2. Status Changes Summary

### ServiceReception Status:

| Field                                | Before Reject | After Reject  | Thay Đổi?         |
| ------------------------------------ | ------------- | ------------- | ----------------- |
| `status`                             | `"received"`  | `"received"`  | ❌ KHÔNG THAY ĐỔI |
| `submissionStatus.staffReviewStatus` | `"pending"`   | `"rejected"`  | ✅ THAY ĐỔI       |
| `submissionStatus.reviewedBy`        | `undefined`   | `staffUserId` | ✅ THAY ĐỔI       |
| `submissionStatus.reviewedAt`        | `undefined`   | `new Date()`  | ✅ THAY ĐỔI       |
| `submissionStatus.reviewNotes`       | `""`          | `notes`       | ✅ THAY ĐỔI       |

### Appointment Status:

| Field             | Before Reject         | After Reject               | Thay Đổi?         |
| ----------------- | --------------------- | -------------------------- | ----------------- |
| `status`          | `"reception_created"` | `"reception_created"`      | ❌ KHÔNG THAY ĐỔI |
| `workflowHistory` | `[...]`               | `[..., {rejection entry}]` | ✅ THÊM ENTRY     |
| `services[]`      | `[]`                  | `[]`                       | ❌ KHÔNG THÊM     |
| `partsUsed[]`     | `[]`                  | `[]`                       | ❌ KHÔNG THÊM     |
| `totalAmount`     | `depositAmount`       | `depositAmount`            | ❌ KHÔNG THAY ĐỔI |

---

## 🔄 3. Resubmit Flow (After Rejection)

### Function: `resubmitServiceReception` (Lines 495-575)

#### 3.1. Preconditions

```javascript
// Line 524-531: Chỉ cho phép resubmit nếu đã bị rejected
if (serviceReception.submissionStatus.staffReviewStatus !== "rejected") {
  return sendError(
    res,
    400,
    "Can only resubmit rejected service receptions",
    null,
    "INVALID_STATUS"
  );
}
```

#### 3.2. Authorization Check

```javascript
// Lines 511-519: Chỉ technician được phân công mới được resubmit
if (
  req.user.role !== "admin" &&
  serviceReception.receivedBy?.toString() !== req.user._id.toString()
) {
  return sendError(
    res,
    403,
    "Only assigned technician can resubmit service reception",
    null,
    "UNAUTHORIZED_TECHNICIAN"
  );
}
```

#### 3.3. Reset Submission Status

```javascript
// Lines 534-543: Reset về trạng thái pending
serviceReception.submissionStatus.submittedToStaff = true;
serviceReception.submissionStatus.staffReviewStatus = "pending"; // ← Reset về pending
serviceReception.submissionStatus.submittedBy = req.user._id;
serviceReception.submissionStatus.submittedAt = new Date();

// Clear previous review
serviceReception.submissionStatus.reviewedBy = undefined; // ← Xóa reviewer cũ
serviceReception.submissionStatus.reviewedAt = undefined; // ← Xóa review date
serviceReception.submissionStatus.reviewNotes = ""; // ← Xóa notes cũ

serviceReception.updatedAt = new Date();
```

---

## ❌ 4. Những Gì KHÔNG XẢY RA Khi Reject

### 4.1. Không Auto-Approve Services/Parts

```javascript
// Lines 650-684: Logic này CHỈ chạy khi isApproved = true
if (isApproved) {
  // Auto-approve recommended services
  serviceReception.recommendedServices.forEach((rs) => {
    rs.customerApproved = true; // ← KHÔNG CHẠY khi reject
  });

  // Auto-approve available parts
  serviceReception.requestedParts.forEach((part) => {
    if (part.isAvailable) {
      part.isApproved = true; // ← KHÔNG CHẠY khi reject
    }
  });
}
```

### 4.2. Không Cập Nhật Appointment Details

```javascript
// Lines 690-822: Toàn bộ block này CHỈ chạy khi isApproved = true
if (appointment && isApproved) {
  // ❌ KHÔNG CHẠY khi reject:
  // - Không add services vào appointment.services[]
  // - Không add parts vào appointment.partsUsed[]
  // - Không calculate costs
  // - Không update totalAmount
  // - Không update appointment.status = "reception_approved"
}
```

### 4.3. Không Xử Lý External Parts

```javascript
// Lines 837-885: CHỈ chạy khi isApproved = true
if (
  isApproved &&
  serviceReception.externalParts &&
  serviceReception.externalParts.length > 0
) {
  // ❌ KHÔNG CHẠY khi reject
}
```

### 4.4. Không Detect Conflicts

```javascript
// Lines 887-920: CHỈ chạy khi isApproved = true
if (
  isApproved &&
  serviceReception.requestedParts &&
  serviceReception.requestedParts.length > 0
) {
  // ❌ KHÔNG CHẠY khi reject
}
```

### 4.5. ❌ KHÔNG CÓ Email Notification

**QUAN TRỌNG**: Hiện tại code **KHÔNG GỬI** email hoặc notification nào khi reject!

---

## 🎯 5. Complete Rejection Workflow

```
┌─────────────────────────────────────────────────────────┐
│ PHASE 1: Staff Reviews Reception                       │
│ - Staff calls PUT /api/service-receptions/:id/approve  │
│ - Body: { decision: "rejected", reviewNotes: "..." }   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 2: Update ServiceReception                       │
│ ✅ submissionStatus.staffReviewStatus = "rejected"     │
│ ✅ submissionStatus.reviewedBy = staffId               │
│ ✅ submissionStatus.reviewedAt = now                   │
│ ✅ submissionStatus.reviewNotes = "rejection reason"   │
│ ❌ status stays "received" (NOT changed)               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 3: Update Appointment History                    │
│ ✅ Push to workflowHistory with rejection note         │
│ ❌ appointment.status stays "reception_created"        │
│ ❌ NO services added                                   │
│ ❌ NO parts added                                      │
│ ❌ NO totalAmount change                               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 4: Response to Client                            │
│ - Return 200 OK                                        │
│ - Message: "Service reception rejected successfully"   │
│ - Return populated ServiceReception                    │
│ ❌ NO email sent to technician or customer             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 5: Technician Can Update & Resubmit              │
│ - Technician updates ServiceReception via PUT          │
│ - Then calls POST /api/service-receptions/:id/resubmit │
│ - Reset staffReviewStatus = "pending"                  │
│ - Clear reviewedBy, reviewedAt, reviewNotes            │
│ - Staff can review again → Go back to PHASE 1          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 6. Database State After Rejection

### ServiceReception Document:

```javascript
{
  _id: ObjectId("..."),
  status: "received",  // ← Vẫn giữ nguyên

  submissionStatus: {
    submittedToStaff: true,
    staffReviewStatus: "rejected",  // ← Changed
    submittedBy: ObjectId("technician"),
    submittedAt: ISODate("2025-11-08T10:00:00Z"),
    reviewedBy: ObjectId("staff"),  // ← Added
    reviewedAt: ISODate("2025-11-08T11:00:00Z"),  // ← Added
    reviewNotes: "Cần bổ sung thêm thông tin về tình trạng pin"  // ← Added
  },

  recommendedServices: [
    {
      serviceId: ObjectId("..."),
      customerApproved: false  // ← Vẫn false
    }
  ],

  requestedParts: [
    {
      partId: ObjectId("..."),
      isApproved: false  // ← Vẫn false
    }
  ]
}
```

### Appointment Document:

```javascript
{
  _id: ObjectId("..."),
  status: "reception_created",  // ← Không đổi

  services: [],  // ← Vẫn rỗng
  partsUsed: [],  // ← Vẫn rỗng

  totalAmount: 500000,  // ← Chỉ có deposit, không đổi

  workflowHistory: [
    {
      status: "pending",
      changedAt: ISODate("2025-11-01T08:00:00Z"),
      notes: "Customer booked appointment"
    },
    {
      status: "confirmed",
      changedAt: ISODate("2025-11-07T09:00:00Z"),
      notes: "Staff confirmed appointment"
    },
    {
      status: "customer_arrived",
      changedAt: ISODate("2025-11-08T08:00:00Z"),
      notes: "Customer checked in"
    },
    {
      status: "reception_created",
      changedAt: ISODate("2025-11-08T10:00:00Z"),
      notes: "Technician created service reception"
    },
    {
      status: "reception_created",  // ← Giữ nguyên status
      changedBy: ObjectId("staff"),
      changedAt: ISODate("2025-11-08T11:00:00Z"),
      notes: "Service reception rejected by staff: Cần bổ sung thêm thông tin về tình trạng pin"
    }
  ]
}
```

---

## ⚠️ 7. Vấn Đề & Recommendations

### 7.1. ❌ THIẾU: Email Notification

**Vấn đề**: Khi reject, technician KHÔNG nhận được thông báo tự động.

**Nên thêm**:

```javascript
// Sau khi save appointment (line 835)
if (!isApproved) {
  // Send email to technician
  const technician = await User.findById(serviceReception.receivedBy);
  if (technician && technician.email) {
    await sendEmail({
      to: technician.email,
      subject: "Service Reception Rejected - Action Required",
      template: "reception-rejected",
      data: {
        technicianName: technician.firstName,
        appointmentId: appointment._id,
        receptionId: serviceReception._id,
        reviewNotes: notes,
        customerName: appointment.customerId.firstName,
        vehicleInfo: `${appointment.vehicleId.make} ${appointment.vehicleId.model}`,
      },
    });
  }
}
```

### 7.2. ⚠️ THIẾU: Customer Notification

**Vấn đề**: Customer cũng không biết reception bị reject.

**Cân nhắc**: Có nên thông báo cho customer không?

- ✅ **Nên**: Tăng transparency
- ❌ **Không nên**: Tránh gây confusion (chỉ là internal workflow)

### 7.3. ✅ ĐÃ ĐÚNG: Status Management

- ServiceReception.status giữ "received" → Technician có thể update
- staffReviewStatus = "rejected" → Track rejection state
- Appointment.status giữ "reception_created" → Workflow không bị break

### 7.4. ✅ ĐÃ ĐÚNG: Resubmit Flow

- Chỉ cho phép resubmit nếu rejected
- Chỉ technician được phân công mới resubmit được
- Reset về pending state để staff review lại

---

## 📝 8. API Endpoints Summary

### 8.1. Reject Reception

```http
PUT /api/service-receptions/:id/approve
Authorization: Bearer <staff_token>
Content-Type: application/json

{
  "decision": "rejected",
  "reviewNotes": "Cần bổ sung thêm thông tin về tình trạng pin"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Service reception rejected successfully",
  "data": {
    "_id": "...",
    "status": "received",
    "submissionStatus": {
      "staffReviewStatus": "rejected",
      "reviewedBy": "...",
      "reviewedAt": "2025-11-08T11:00:00Z",
      "reviewNotes": "Cần bổ sung thêm thông tin về tình trạng pin"
    }
  }
}
```

### 8.2. Update & Resubmit

```http
# Step 1: Update reception
PUT /api/service-receptions/:id
Authorization: Bearer <technician_token>
Content-Type: application/json

{
  "recommendedServices": [...],  // Updated data
  "requestedParts": [...],
  "specialInstructions": {
    "fromTechnician": "Đã bổ sung đầy đủ thông tin về pin"
  }
}

# Step 2: Resubmit
POST /api/service-receptions/:id/resubmit
Authorization: Bearer <technician_token>
```

**Response**:

```json
{
  "success": true,
  "message": "Service reception resubmitted successfully",
  "data": {
    "_id": "...",
    "status": "received",
    "submissionStatus": {
      "staffReviewStatus": "pending", // ← Reset về pending
      "reviewedBy": null, // ← Cleared
      "reviewedAt": null, // ← Cleared
      "reviewNotes": "" // ← Cleared
    }
  }
}
```

---

## 🎓 9. Best Practices

1. **Always provide reviewNotes**: Giúp technician hiểu lý do reject
2. **Technician should update before resubmit**: Sửa theo feedback
3. **Staff should check resubmit history**: Xem technician đã sửa gì
4. **Consider adding notification**: Email hoặc in-app notification

---

## 📊 10. Comparison: Approve vs Reject

| Action                      | Approve ✅             | Reject ❌                 |
| --------------------------- | ---------------------- | ------------------------- |
| ServiceReception.status     | → "approved"           | stays "received"          |
| staffReviewStatus           | → "approved"           | → "rejected"              |
| Appointment.status          | → "reception_approved" | stays "reception_created" |
| Add services to Appointment | ✅ YES                 | ❌ NO                     |
| Add parts to Appointment    | ✅ YES                 | ❌ NO                     |
| Calculate costs             | ✅ YES                 | ❌ NO                     |
| Update totalAmount          | ✅ YES                 | ❌ NO                     |
| Detect conflicts            | ✅ YES                 | ❌ NO                     |
| Process external parts      | ✅ YES                 | ❌ NO                     |
| Send email                  | ❌ NO                  | ❌ NO                     |
| Can resubmit                | ❌ NO                  | ✅ YES                    |

---

## 🔚 Kết Luận

**Khi Staff Reject:**

1. ✅ ServiceReception được đánh dấu rejected
2. ✅ Appointment history được update
3. ❌ KHÔNG có thay đổi về services, parts, costs
4. ❌ KHÔNG có email notification (CẦN BỔ SUNG)
5. ✅ Technician có thể update và resubmit
6. ✅ Luồng resubmit hoạt động đúng

**Điểm Mạnh:**

- Status management rõ ràng
- Cho phép resubmit với proper authorization
- Không break workflow khi reject

**Điểm Cần Cải Thiện:**

- ❌ Thiếu email notification cho technician
- ⚠️ Cân nhắc thêm in-app notification
- 📝 Có thể thêm rejection reason dropdown để standardize
