# Status Lifecycle Verification - Diagram 03

## Mục đích

Kiểm tra chi tiết vòng đời của các status bars (activation bars) trong diagram 03 xem có đúng với luồng thực tế trong code không.

---

## 1. Appointment Status Lifecycle ✅

### 1.1. Status Enum Definition (Appointment.js)

```javascript
status: {
  type: String,
  enum: [
    'pending', 'confirmed', 'customer_arrived',
    'reception_created', 'reception_approved', 'in_progress',
    'completed', 'invoiced', 'cancelled', 'cancel_requested',
    'cancel_approved', 'cancel_refunded', 'no_show'
  ]
}
```

### 1.2. Status Flow in Diagram 03

| Message   | Status Update        | Code Location                  | Diagram Line | Status ✅/❌ |
| --------- | -------------------- | ------------------------------ | ------------ | ------------ |
| **msg3**  | `customer_arrived`   | Line 72 validation + DB update | Line 100     | ✅ ĐÚNG      |
| **msg11** | `reception_created`  | Line 246 in controller         | Line 181     | ✅ ĐÚNG      |
| **msg28** | `reception_approved` | Line 815 in controller         | Line 471     | ✅ ĐÚNG      |

### 1.3. Validation Logic ✅

**Precondition Check (Code line 72):**

```javascript
if (appointment.status !== "customer_arrived") {
  return res.status(400).json({
    success: false,
    message:
      "Cannot create service reception. Customer must be marked as arrived first.",
  });
}
```

**Diagram Representation:**

- `usecase-note` (line 73): "Pre-condition: Customer has checked in (status = customer_arrived)"
- ✅ **ĐÚNG**: Diagram thể hiện đúng precondition này

### 1.4. Status Transition Sequence ✅

**PHASE 1: Customer Arrives**

```
Initial Status → customer_arrived (msg3)
├── Actor: Staff performs check-in
├── Action: checkInCustomer(appointmentId)
├── Update: Appointment.status = 'customer_arrived'
└── Activation Bar: staff-act1 (line 86-89)
```

**PHASE 2: Technician Creates Reception**

```
customer_arrived → reception_created (msg11)
├── Actor: Technician fills form
├── Precondition: status MUST BE 'customer_arrived' ✅
├── Action: submitReception(receptionData)
├── Update: Appointment.status = 'reception_created'
└── Activation Bars:
    ├── tech-act1 (line 137-145): Technician working
    ├── ui-act1 (line 127-133): UI processing
    ├── recsvc-act1 (line 150-157): Service processing
    └── db-act2, db-act3 (line 171-178, 188-195): DB operations
```

**PHASE 3: Staff Approves Reception**

```
reception_created → reception_approved (msg28)
├── Actor: Staff reviews and approves
├── Precondition: Conflict check passed (NEW - line 298-323) ✅
├── Action: approveServiceReception()
├── Updates:
│   ├── ServiceReception.submissionStatus.staffReviewStatus = 'approved' (msg24)
│   ├── Appointment.status = 'reception_approved' (msg28)
│   └── Appointment.totalAmount += additionalCost
└── Activation Bars:
    ├── staff-act2 (line 245-249): Staff working
    ├── ui-act2 (line 248-254): UI processing approval
    ├── ui-act3 (line 288-294): UI showing results
    ├── recsvc-act-precheck (line 298-303): CONFLICT PRE-CHECK ✅
    ├── recsvc-act3 (line 354-361): Service processing approval
    └── db-act5, db-act6 (line 375-382, 471-478): DB operations
```

---

## 2. ServiceReception Status Lifecycle ✅

### 2.1. Status Enum Definition (ServiceReception.js)

```javascript
status: {
  type: String,
  enum: ['received', 'inspected', 'approved', 'in_service', 'completed', 'ready_for_pickup'],
  default: 'received'
}

submissionStatus: {
  staffReviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'needs_modification', 'partially_approved', 'pending_parts_restock'],
    default: 'pending'
  }
}
```

### 2.2. Status Flow in Diagram 03

| Message   | Status Update                                   | Code Implementation  | Diagram Line | Status ✅/❌    |
| --------- | ----------------------------------------------- | -------------------- | ------------ | --------------- |
| **msg9**  | `status='received'`                             | Default when created | Line 163     | ✅ ĐÚNG         |
| **msg24** | `submissionStatus.staffReviewStatus='approved'` | On staff approval    | Line 385     | ✅ ĐÚNG (FIXED) |
| **msg35** | `staffReviewStatus='rejected'`                  | On staff rejection   | Line 530     | ✅ ĐÚNG         |

### 2.3. Status Transition Sequence ✅

**Creation:**

```
null → received (msg9)
├── Actor: Technician submits
├── Action: createServiceReception()
├── Insert: ServiceReception with status='received'
├── Activation Bar: recsvc-act1 (line 150-157)
└── submissionStatus.staffReviewStatus = 'pending' (default)
```

**Approval Path:**

```
received + pending → received + approved (msg24)
├── Actor: Staff approves
├── Action: approveServiceReception()
├── Update: submissionStatus.staffReviewStatus = 'approved'
├── Then: Appointment.status = 'reception_approved' (msg28)
└── Activation Bar: recsvc-act3 (line 354-361)
```

**Rejection Path:**

```
received + pending → received + rejected (msg35)
├── Actor: Staff rejects
├── Action: rejectServiceReception()
├── Update: staffReviewStatus = 'rejected'
├── ServiceReception.status stays 'received' ✅
├── Note: Technician can update and resubmit
└── Activation Bar: recsvc-act4 (line 548-558)
```

---

## 3. Activation Bars Analysis ✅

### 3.1. All Activation Bars in Diagram

| Bar ID                  | Actor/Component         | Y-Position | Height | Duration  | Purpose                                 | Status ✅/❌ |
| ----------------------- | ----------------------- | ---------- | ------ | --------- | --------------------------------------- | ------------ |
| **staff-act1**          | Staff                   | 340        | 80px   | Short     | Check in customer                       | ✅ ĐÚNG      |
| **tech-act1**           | Technician              | 540        | 460px  | Long      | Fill reception form                     | ✅ ĐÚNG      |
| **ui-act1**             | AppointmentPage         | 540        | 160px  | Medium    | Show form, submit                       | ✅ ĐÚNG      |
| **recsvc-act1**         | ServiceReceptionService | 710        | 240px  | Medium    | Create reception                        | ✅ ĐÚNG      |
| **checklist-act1**      | EVChecklistService      | 910        | 90px   | Short     | Create checklist instance               | ✅ ĐÚNG      |
| **db-act1**             | Database                | 410        | 30px   | Short     | Update Appointment (customer_arrived)   | ✅ ĐÚNG      |
| **db-act2**             | Database                | 790        | 30px   | Short     | Insert ServiceReception                 | ✅ ĐÚNG      |
| **db-act3**             | Database                | 840        | 30px   | Short     | Update Appointment (reception_created)  | ✅ ĐÚNG      |
| **db-act4**             | Database                | 940        | 30px   | Short     | Insert ChecklistInstance                | ✅ ĐÚNG      |
| **staff-act2**          | Staff                   | 1120       | 800px  | Very Long | Review & approve/reject                 | ✅ ĐÚNG      |
| **ui-act2**             | AppointmentPage         | 1120       | 150px  | Medium    | Load reception data                     | ✅ ĐÚNG      |
| **recsvc-act2**         | ServiceReceptionService | 1150       | 60px   | Short     | Get reception data                      | ✅ ĐÚNG      |
| **ui-act3**             | AppointmentPage         | 1320       | 760px  | Long      | Handle approval/rejection               | ✅ ĐÚNG      |
| **recsvc-act-precheck** | ServiceReceptionService | 1350       | 60px   | Short     | **CONFLICT PRE-CHECK** ✅               | ✅ ĐÚNG      |
| **recsvc-act3**         | ServiceReceptionService | 1600       | 1050px | Very Long | Process approval                        | ✅ ĐÚNG      |
| **db-act5**             | Database                | 1680       | 30px   | Short     | Update staffReviewStatus='approved'     | ✅ ĐÚNG      |
| **db-act6a**            | Database                | 1920       | 30px   | Short     | Update external parts                   | ✅ ĐÚNG      |
| **db-act6b**            | Database                | 1970       | 30px   | Short     | Save external parts to reception        | ✅ ĐÚNG      |
| **db-act6**             | Database                | 2020       | 30px   | Short     | Update Appointment (reception_approved) | ✅ ĐÚNG      |
| **db-act7**             | Database                | 2070       | 30px   | Short     | Push workflowHistory                    | ✅ ĐÚNG      |
| **ui-act4**             | AppointmentPage         | 2480       | 280px  | Medium    | Handle rejection                        | ✅ ĐÚNG      |
| **recsvc-act4**         | ServiceReceptionService | 2510       | 210px  | Medium    | Process rejection                       | ✅ ĐÚNG      |
| **db-act8**             | Database                | 2540       | 30px   | Short     | Update staffReviewStatus='rejected'     | ✅ ĐÚNG      |
| **db-act9**             | Database                | 2590       | 30px   | Short     | Push workflowHistory (rejected)         | ✅ ĐÚNG      |

### 3.2. Activation Bar Consistency ✅

**Overlapping Bars (Correct):**

- `tech-act1` overlaps with `ui-act1`, `recsvc-act1`, `checklist-act1` → ✅ Technician waits while system processes
- `staff-act2` overlaps with `ui-act2`, `ui-act3`, `recsvc-act3` → ✅ Staff interacts throughout approval process
- `recsvc-act3` is very long (1050px) → ✅ Covers all approval steps including conflict check, filtering, calculations

**Sequential Bars (Correct):**

- DB activation bars (`db-act1` through `db-act9`) appear sequentially → ✅ Each DB operation completes before next one

**Timing Validation:**

- Conflict pre-check (`recsvc-act-precheck`) appears BEFORE approval (`recsvc-act3`) → ✅ CRITICAL FIX APPLIED
- Staff decision (`staff-act2`) starts before approval processing → ✅ Correct interaction flow

---

## 4. Critical Issues Found & Fixed ✅

### 4.1. ✅ FIXED: Conflict Detection Timing

**Old Design (WRONG):**

```
Staff approves → Update statuses → Detect conflicts (async)
└── msg27d (line 496): detectPartConflicts() AFTER approval
```

**New Design (CORRECT):**

```
Staff approves → Check conflicts FIRST → IF no conflict THEN proceed
├── msg21b (line 299): GET /api/part-conflicts/check-reception/:id
├── msg21c (line 308): checkPartConflicts()
├── msg21d (line 326): Return conflictCheck={hasConflict, conflicts[]}
└── alt-conflict-check (line 342-389): BLOCK if hasConflict=true
```

**Status:** ✅ **ĐÃ SỬA** - Conflict detection moved to PRE-CHECK before approval

### 4.2. ✅ FIXED: Field Name for Staff Review Status

**Old (WRONG):**

```
msg24: UPDATE ServiceReception SET status='approved'
```

**New (CORRECT):**

```
msg24: UPDATE ServiceReception SET submissionStatus.staffReviewStatus='approved'
```

**Status:** ✅ **ĐÃ SỬA** - Field name matches model schema

### 4.3. ✅ VERIFIED: Rejection Status

**Diagram (msg35):**

```
UPDATE ServiceReception SET staffReviewStatus='rejected'
```

**Code Implementation:**

```javascript
// ServiceReception.status stays 'received'
// Only submissionStatus.staffReviewStatus changes to 'rejected'
```

**Note in Diagram (line 555-562):**

```
"Status stays 'received'
Technician can update
and resubmit"
```

**Status:** ✅ **ĐÚNG** - Rejection doesn't change main status, allows resubmission

---

## 5. Status Lifecycle Summary ✅

### 5.1. Complete Appointment Status Flow

```
[Customer Books] → pending
     ↓
[Staff Confirms] → confirmed
     ↓
[Customer Arrives] → customer_arrived (msg3) ← PRECONDITION FOR RECEPTION
     ↓
[Technician Creates Reception] → reception_created (msg11)
     ↓
[Staff Checks Conflicts] → IF conflict → BLOCK ← NEW PRE-CHECK
     ↓
[Staff Approves] → reception_approved (msg28)
     ↓
[Work In Progress] → in_progress
     ↓
[Service Completed] → completed
     ↓
[Invoice Created] → invoiced
```

### 5.2. Complete ServiceReception Status Flow

```
[Created by Technician]
├── status: 'received' (msg9)
└── submissionStatus.staffReviewStatus: 'pending'
     ↓
[Staff Reviews]
     ├── [APPROVE PATH]
     │   ├── Check conflicts FIRST (msg21b-21d) ← NEW
     │   ├── IF no conflict → Proceed
     │   ├── staffReviewStatus: 'approved' (msg24)
     │   └── Appointment.status: 'reception_approved' (msg28)
     │
     └── [REJECT PATH]
         ├── staffReviewStatus: 'rejected' (msg35)
         ├── status: stays 'received'
         └── Allows resubmission
```

### 5.3. Activation Bar Lifecycle Summary

```
PHASE 1: Customer Check-In
├── staff-act1: Staff performs check-in
└── db-act1: Update Appointment to 'customer_arrived'

PHASE 2: Reception Creation
├── tech-act1: Technician fills form (460px - longest user interaction)
├── ui-act1: UI processes submission
├── recsvc-act1: Service creates reception
├── db-act2: Insert ServiceReception (status='received')
├── db-act3: Update Appointment to 'reception_created'
├── checklist-act1: Create pre-service checklist
└── db-act4: Insert ChecklistInstance

PHASE 3: Staff Approval
├── staff-act2: Staff reviews (800px - longest overall)
├── ui-act2: Load reception details
├── recsvc-act2: Get reception data
├── ui-act3: Process approval decision
├── recsvc-act-precheck: CHECK CONFLICTS FIRST ← CRITICAL
├── IF conflict → BLOCK (show warning, stop process)
├── IF no conflict → Continue:
│   ├── recsvc-act3: Process approval (1050px - complex logic)
│   ├── db-act5: Update staffReviewStatus='approved'
│   ├── db-act6a, db-act6b: Handle external parts (optional)
│   ├── db-act6: Update Appointment to 'reception_approved'
│   └── db-act7: Push workflowHistory
└── IF rejected:
    ├── recsvc-act4: Process rejection
    ├── db-act8: Update staffReviewStatus='rejected'
    └── db-act9: Push workflowHistory
```

---

## 6. Kết Luận ✅

### ✅ Status Lifecycle - CHÍNH XÁC

1. **Appointment.status transitions:** ✅ ĐÚNG

   - customer_arrived → reception_created → reception_approved
   - Đúng với code implementation (lines 72, 246, 815)

2. **ServiceReception.status:** ✅ ĐÚNG

   - Stays 'received' throughout approval process
   - Only submissionStatus.staffReviewStatus changes

3. **Precondition validation:** ✅ ĐÚNG

   - Code line 72 checks customer_arrived before allowing reception
   - Diagram shows this in usecase-note

4. **Conflict detection:** ✅ ĐÃ SỬA

   - Moved from AFTER approval to BEFORE approval
   - Added recsvc-act-precheck activation bar
   - Added alt frame to BLOCK if conflict exists

5. **Activation bars:** ✅ ĐÚNG
   - All 24 activation bars correctly positioned
   - Overlapping bars show concurrent operations
   - Sequential bars show dependent operations
   - Bar heights reflect operation complexity

### ❌ Không Có Lỗi Nghiêm Trọng

Tất cả các vấn đề nghiêm trọng đã được sửa trong các commits trước:

- ✅ Conflict detection timing fixed
- ✅ Field names corrected
- ✅ Status transitions validated

### 📊 Độ Chính Xác: 100%

**Tất cả status bars và lifecycle transitions trong diagram 03 đã đúng hoàn toàn với code implementation.**
