# Workflows and Business Logic

## 14-State Appointment Workflow

This is the core business process of the system, handling the complete lifecycle from booking to completion.

### State Diagram

```
                              ┌──────────┐
                              │ CUSTOMER │
                              │  BOOKS   │
                              └─────┬────┘
                                    │
                                    ▼
                              ┌──────────┐
                       ┌──────┤ pending  ├──────┐
                       │      └─────┬────┘      │
                       │            │           │
                  REJECT│            │CONFIRM    │CANCEL
                       │            ▼           │
                       │      ┌──────────┐      │
                       │      │confirmed │      │
                       │      └─────┬────┘      │
                       │            │           │
                       │       CUSTOMER         │
                       │       ARRIVES          │
                       │            ▼           │
                       │      ┌──────────────┐  │
                       │      │customer_     │  │
                       │      │arrived       │  │
                       │      └──────┬───────┘  │
                       │             │          │
                       │        TECHNICIAN      │
                       │        CREATES         │
                       │        RECEPTION       │
                       │             ▼          │
                       │      ┌──────────────┐  │
                       │      │reception_    │  │
                       │      │created       │  │
                       │      └──────┬───────┘  │
                       │             │          │
                       │        STAFF REVIEWS   │
                ┌──────┴──────┐      ▼          │
                │   REJECTED  │ ┌────────────┐  │
                │             │ │reception_  │  │
                └─────────────┘ │approved    │  │
                                └─────┬──────┘  │
                                      │         │
           ┌──────────────────────────┼─────────┘
           │                          │
           │ INSUFFICIENT             │SUFFICIENT
           │ PARTS                    │PARTS
           │                          │
           ▼                          ▼
    ┌──────────────┐          ┌─────────────┐
    │parts_        │          │in_progress  │
    │insufficient  │          └──────┬──────┘
    └──────┬───────┘                 │
           │                         │ADDITIONAL
           │CUSTOMER                 │PARTS NEEDED
           │DECIDES                  │
           │                         ▼
    ┌──────┴──────┐          ┌─────────────┐
    │             │          │parts_       │
    │ WAIT  RESCHEDULE       │requested    │
    │             │          └──────┬──────┘
    ▼             ▼                 │
┌───────────┐ ┌───────────┐        │APPROVED
│waiting_   │ │rescheduled│        │
│for_parts  │ └───────────┘        ▼
└─────┬─────┘                 ┌─────────────┐
      │                       │in_progress  │
      │PARTS ARRIVE           │(continue)   │
      └───────────────────────►└──────┬──────┘
                                      │
                                      │WORK COMPLETE
                                      ▼
                               ┌─────────────┐
                               │completed    │
                               └──────┬──────┘
                                      │
                                      │INVOICE
                                      │GENERATED
                                      ▼
                               ┌─────────────┐
                               │invoiced     │
                               └──────┬──────┘
                                      │
                                      │PAYMENT
                                      │CONFIRMED
                                      ▼
                                  [CLOSED]


        CANCELLATION BRANCH:

        pending/confirmed
              ▼
        ┌──────────────┐
        │cancel_       │
        │requested     │
        └──────┬───────┘
               │
          STAFF REVIEWS
               │
        ┌──────┴──────┐
        │             │
    APPROVE      REJECT
        │             │
        ▼             ▼
    ┌──────────┐  Back to
    │cancel_   │  previous
    │approved  │  status
    └────┬─────┘
         │
    REFUND PROCESSED
         │
         ▼
    ┌──────────┐
    │cancel_   │
    │refunded  │
    └──────────┘
```

## Status Descriptions

### 1. pending
**Vietnamese**: "Chờ xác nhận"
**Description**: Customer has created appointment and may have paid deposit, waiting for staff confirmation.

**Actors**: Customer
**Actions**:
- Customer books appointment
- Selects vehicle, services, date/time
- Pays deposit (200,000 VND) if deposit_booking type

**Next States**:
- `confirmed` - Staff confirms and assigns technician
- `cancelled` - Customer or staff cancels before confirmation
- `cancel_requested` - Customer requests cancellation

**Business Rules**:
- Deposit must be paid for deposit_booking type
- Slot must be available
- Vehicle cannot have another active appointment
- Appointment number auto-generated: `APT + YYYYMMDD + sequence`

---

### 2. confirmed
**Vietnamese**: "Đã xác nhận"
**Description**: Staff has confirmed appointment and assigned a technician.

**Actors**: Staff
**Actions**:
- Staff reviews appointment
- Verifies deposit payment
- Assigns technician
- Sends confirmation email

**Next States**:
- `customer_arrived` - Customer brings vehicle
- `rescheduled` - Appointment rescheduled
- `no_show` - Customer doesn't show up
- `cancel_requested` - Cancellation request

**Business Rules**:
- Technician must be available
- Technician specialization should match service type
- Email notification sent to customer and technician

---

### 3. customer_arrived
**Vietnamese**: "Khách hàng đã đến"
**Description**: Customer has arrived at service center with vehicle.

**Actors**: Staff/Technician
**Actions**:
- Check-in customer
- Verify appointment details
- Notify assigned technician

**Next States**:
- `reception_created` - Technician creates service reception form
- `cancelled` - Emergency cancellation

**Business Rules**:
- Customer must be within scheduled time window (±30 minutes tolerance)
- Real-time notification to technician
- Vehicle condition photos can be taken

---

### 4. reception_created
**Vietnamese**: "Đã tạo phiếu tiếp nhận"
**Description**: Technician has created service reception form with vehicle inspection and diagnosis.

**Actors**: Technician
**Actions**:
- Complete EV checklist
- Document vehicle condition (exterior, interior, battery)
- Take photos of damages and odometer
- Perform initial diagnosis
- Request initial parts

**Next States**:
- `reception_approved` - Staff approves reception and parts
- `parts_insufficient` - Not enough parts available

**Business Rules**:
- All mandatory checklist items must be completed
- Battery diagnostics required (level, health, temperature)
- Mileage must be recorded with photo
- Parts request automatically created if parts needed

---

### 5. reception_approved
**Vietnamese**: "Đã duyệt phiếu tiếp nhận"
**Description**: Staff has reviewed and approved service reception and parts request.

**Actors**: Staff
**Actions**:
- Review service reception form
- Check parts availability
- Approve or suggest alternative parts
- Reserve parts for appointment

**Next States**:
- `in_progress` - Start service work

**Business Rules**:
- All requested parts must be available or alternatives approved
- Parts are reserved in inventory
- Customer approval required if additional cost exceeds threshold (500,000 VND)

---

### 6. parts_insufficient
**Vietnamese**: "Thiếu linh kiện"
**Description**: Required parts are not available in inventory.

**Actors**: Staff
**Actions**:
- Notify customer about parts shortage
- Provide options: wait for parts or reschedule
- Suggest alternative parts if available

**Next States**:
- `waiting_for_parts` - Customer agrees to wait
- `rescheduled` - Customer reschedules appointment

**Business Rules**:
- Customer must decide within 24 hours
- If parts can be ordered, estimated arrival time provided
- If no ETA, rescheduling recommended

---

### 7. waiting_for_parts
**Vietnamese**: "Đang chờ linh kiện"
**Description**: Customer has agreed to wait for parts to arrive.

**Actors**: Staff
**Actions**:
- Order parts from supplier
- Track delivery
- Notify customer when parts arrive

**Next States**:
- `in_progress` - Parts arrived, start work

**Business Rules**:
- Maximum wait time: 7 days
- Daily updates sent to customer
- Vehicle stored securely at service center

---

### 8. rescheduled
**Vietnamese**: "Đã lên lại lịch"
**Description**: Appointment has been rescheduled to a new date/time.

**Actors**: Staff/Customer
**Actions**:
- Select new date/time
- Update slot booking
- Send rescheduling notification

**Next States**:
- `confirmed` - New date confirmed
- `cancelled` - Customer decides to cancel

**Business Rules**:
- Original slot released
- New slot must be available
- Deposit remains valid for 30 days
- Rescheduling history tracked

---

### 9. in_progress
**Vietnamese**: "Đang thực hiện"
**Description**: Service work is actively being performed.

**Actors**: Technician
**Actions**:
- Perform services as per appointment
- Install parts
- Document work progress
- Take photos of work

**Next States**:
- `parts_requested` - Additional parts needed
- `completed` - All work finished

**Business Rules**:
- Progress updates sent every 2 hours
- Customer can chat with technician via Socket.io
- Service notes added to timeline
- Photos uploaded to appointment

---

### 10. parts_requested
**Vietnamese**: "Yêu cầu linh kiện bổ sung"
**Description**: Technician discovered additional parts needed during service.

**Actors**: Technician
**Actions**:
- Create additional parts request
- Explain reason for additional parts
- Wait for staff and customer approval

**Next States**:
- `in_progress` - Parts approved and available

**Business Rules**:
- Customer approval required
- Customer notified with cost estimate
- Staff checks parts availability
- Work paused until approval

---

### 11. completed
**Vietnamese**: "Hoàn thành"
**Description**: All service work has been completed successfully.

**Actors**: Technician
**Actions**:
- Mark all services as complete
- Final vehicle inspection
- Update parts used
- Upload completion photos
- Notify staff

**Next States**:
- `invoiced` - Staff generates invoice

**Business Rules**:
- All checklist items must be completed
- Final vehicle condition documented
- Quality control check performed
- Customer notified via SMS and app

---

### 12. invoiced
**Vietnamese**: "Đã xuất hóa đơn"
**Description**: Invoice has been generated and sent to customer.

**Actors**: Staff
**Actions**:
- Generate Vietnamese invoice
- Calculate total (services + parts + VAT)
- Send invoice to customer email
- Create payment record

**Next States**:
- [Closed] - Payment confirmed

**Business Rules**:
- Invoice number: `INV + YYYYMMDD + sequence`
- 10% VAT applied to all items
- Deposit deducted from total
- Multiple payment methods supported

---

### 13. cancelled
**Vietnamese**: "Đã hủy"
**Description**: Appointment has been cancelled.

**Actors**: Customer/Staff/System
**Actions**:
- Release slot
- Process refund if applicable
- Update vehicle status
- Send cancellation notification

**Business Rules**:
- Refund based on cancellation time
- Slot immediately available for rebooking
- Cancellation reason tracked

---

### 14. no_show
**Vietnamese**: "Không đến"
**Description**: Customer did not show up for appointment.

**Actors**: System (automated)
**Actions**:
- Mark as no-show 2 hours after scheduled time
- Forfeit deposit
- Release slot
- Send notification

**Business Rules**:
- Deposit not refunded
- Automatic status change by scheduler
- Customer can explain reason and request rescheduling

---

## Core Status Mapping

For simplified reporting and UI, detailed statuses are mapped to 6 core statuses:

### Scheduled
- `pending`
- `confirmed`
- `rescheduled`

**UI Color**: Blue
**Description**: Appointment is scheduled and waiting

---

### CheckedIn
- `customer_arrived`
- `reception_created`

**UI Color**: Purple
**Description**: Customer has arrived, initial inspection in progress

---

### InService
- `reception_approved`
- `in_progress`
- `parts_requested`

**UI Color**: Orange
**Description**: Service work is being performed

---

### OnHold
- `parts_insufficient`
- `waiting_for_parts`

**UI Color**: Yellow
**Description**: Service on hold due to parts or other issues

---

### ReadyForPickup
- `completed`
- `invoiced`

**UI Color**: Green
**Description**: Service complete, ready for customer pickup and payment

---

### Closed
- `cancelled`
- `no_show`
- `cancel_requested`
- `cancel_approved`
- `cancel_refunded`

**UI Color**: Gray
**Description**: Appointment closed (completed or cancelled)

---

## Cancellation and Refund Workflow

### Customer Cancellation Request

**Initiated By**: Customer
**Status Transition**: Any state → `cancel_requested`

**Steps**:
1. Customer clicks "Request Cancellation"
2. Enters reason for cancellation
3. System calculates refund percentage based on time
4. Customer selects refund method:
   - **Cash**: Pick up at service center
   - **Bank Transfer**:
     - Provide bank details (bank name, account number, account holder)
     - Upload bank account proof image (ID card + bank book/card)
5. Status changes to `cancel_requested`
6. Staff notification sent

**Refund Calculation**:
```javascript
const hoursBefore = (scheduledDateTime - now) / (1000 * 60 * 60);
let refundPercentage;

if (hoursBefore >= 24) {
  refundPercentage = 100; // Full refund
} else if (hoursBefore >= 12) {
  refundPercentage = 70;
} else if (hoursBefore >= 6) {
  refundPercentage = 50;
} else if (hoursBefore >= 2) {
  refundPercentage = 30;
} else {
  refundPercentage = 0; // No refund if less than 2 hours
}

const refundAmount = depositAmount * (refundPercentage / 100);
```

### Staff Approval

**Initiated By**: Staff/Admin
**Status Transition**: `cancel_requested` → `cancel_approved` or back to previous status

**Steps**:
1. Staff reviews cancellation request
2. Verifies refund percentage
3. Checks customer bank info (if bank transfer)
4. Makes decision:
   - **Approve**: Status → `cancel_approved`
   - **Reject**: Status → back to previous status (e.g., `confirmed`)

**If Approved**:
- Slot is released immediately
- Refund record created
- Customer notified

### Refund Processing

**Initiated By**: Staff
**Status Transition**: `cancel_approved` → `cancel_refunded`

**Steps**:
1. **For Cash Refund**:
   - Customer comes to service center
   - Staff hands over cash
   - Staff uploads refund receipt photo
   - Customer signs receipt

2. **For Bank Transfer Refund**:
   - Staff verifies bank account details
   - Staff processes bank transfer
   - Staff uploads transfer confirmation screenshot
   - System records transfer details

3. Status changes to `cancel_refunded`
4. Customer receives confirmation notification
5. Refund marked as complete

**Business Rules**:
- Refund must be processed within 3 business days
- All refunds must have proof uploaded
- Customer can track refund status in real-time

---

## Parts Management Workflow

### Two-Tier Parts Request System

#### Type 1: Initial Service Parts
**Created**: During service reception (`reception_created` status)
**Purpose**: Parts needed based on initial diagnosis

**Flow**:
1. Technician creates service reception
2. Technician requests parts in reception form
3. System checks parts availability
4. If all available:
   - Status → `reception_approved`
   - Parts reserved
5. If shortage:
   - Status → `parts_insufficient`
   - Customer decides to wait or reschedule

#### Type 2: Additional During Service
**Created**: During service work (`in_progress` status)
**Purpose**: Parts discovered during service work

**Flow**:
1. Technician discovers additional parts needed
2. Technician creates parts request with reason
3. Status → `parts_requested`
4. Staff checks availability
5. If cost > 500,000 VND:
   - Customer approval required
   - Customer notified with cost estimate
   - Customer approves/rejects via app
6. If cost ≤ 500,000 VND:
   - Staff approves directly
7. If approved and available:
   - Parts reserved
   - Status → `in_progress`
   - Work continues

### Parts Approval Process

**Staff Reviews**:
1. Check requested parts
2. Verify availability
3. Calculate cost
4. Make decision:
   - `approve_all` - All parts available and approved
   - `approve_partial` - Some parts approved, some not
   - `reject_insufficient_stock` - Not enough stock
   - `reject_unnecessary` - Parts not needed

**If Insufficient Stock**:
- Staff can suggest alternative parts
- Alternative must be compatible
- Customer approval required if different price
- System creates alternative parts list

**Parts Reservation**:
- Reserved stock deducted from available stock
- Reservation linked to appointment
- Reservation valid until appointment completion or cancellation
- Auto-release on cancellation

---

## Invoice Generation and Payment

### Invoice Generation

**Triggered By**: Appointment status → `completed`
**Initiated By**: Staff

**Steps**:
1. Staff clicks "Generate Invoice"
2. System gathers data:
   - Service items from `appointment.services`
   - Parts used from `appointment.partsUsed`
   - Labor cost (if applicable)
3. Calculate subtotal
4. Apply 10% VAT
5. Apply discount (if any)
6. Subtract deposit already paid
7. Generate invoice number: `INV + YYYYMMDD + sequence`
8. Create Invoice document
9. Status → `invoiced`
10. Send email with invoice PDF

**Invoice Format**:
```
CÔNG TY DỊCH VỤ XE ĐIỆN
Mã số thuế: 0123456789

HÓA ĐƠN DỊCH VỤ
Số hóa đơn: INV20241030001
Ngày: 30/10/2024

Khách hàng: Nguyễn Văn A
Điện thoại: 0912345678
Xe: Tesla Model 3 (51A-12345)

Dịch vụ:
1. Bảo dưỡng pin                1    500.000₫    500.000₫
2. Kiểm tra hệ thống sạc        1    300.000₫    300.000₫

Linh kiện:
1. Pin Lithium-Ion 60kWh        1  20.000.000₫  20.000.000₫

Tạm tính:                            20.800.000₫
VAT (10%):                            2.080.000₫
Tổng cộng:                           22.880.000₫
Đã đặt cọc:                             -200.000₫
Còn phải trả:                        22.680.000₫
```

### Payment Methods

#### VNPay (Online)
1. Customer scans QR code or clicks payment link
2. Redirects to VNPay gateway
3. Customer selects bank/payment method
4. Completes payment
5. VNPay IPN callback to server
6. Server verifies payment
7. Updates invoice status → `paid`
8. Updates appointment payment status
9. Customer receives receipt

#### Cash (Offline)
1. Customer pays at service center
2. Staff records payment in system
3. Staff uploads cash receipt photo
4. Invoice status → `paid`
5. Appointment payment status → `paid`
6. Receipt printed for customer

#### Card (POS Terminal)
1. Customer swaps card at POS terminal
2. Staff records payment in system
3. Staff uploads POS receipt photo
4. Invoice status → `paid`

#### Bank Transfer
1. Customer transfers to company account
2. Customer uploads transfer screenshot
3. Staff verifies transfer
4. Staff marks payment as confirmed
5. Invoice status → `paid`

---

## Real-Time Features

### Socket.io Events

**Appointment Room**: `appointment_{appointmentId}`

**Events Broadcasted**:
- `appointment_updated` - Status changed
- `service_progress_updated` - Progress update
- `parts_approved` - Parts request approved
- `invoice_generated` - Invoice ready
- `payment_confirmed` - Payment successful
- `receive_message` - Chat message

**Example Flow**:
1. Technician completes service
2. Server updates appointment status → `completed`
3. Server broadcasts to appointment room:
   ```javascript
   io.to(`appointment_${id}`).emit('appointment_updated', {
     appointmentId: id,
     status: 'completed',
     message: 'Dịch vụ đã hoàn thành'
   });
   ```
4. All connected users in room receive update
5. Frontend updates UI in real-time
6. Customer receives push notification

---

## Automated Scheduler

**File**: `server/utils/appointmentScheduler.js`

### Cron Jobs

#### Reminder Notifications
**Schedule**: Every hour
**Action**: Send appointment reminders

```javascript
// 24 hours before
if (appointment is 24 hours away) {
  sendReminderEmail(appointment, '24h');
  mark appointment.notificationsSent.reminder = true;
}

// 2 hours before
if (appointment is 2 hours away) {
  sendReminderSMS(appointment, '2h');
}
```

#### No-Show Detection
**Schedule**: Every 30 minutes
**Action**: Mark appointments as no-show

```javascript
// 2 hours after scheduled time
if (appointment is confirmed && 2 hours past scheduled time) {
  appointment.status = 'no_show';
  appointment.coreStatus = 'Closed';
  deposit forfeited;
  release slot;
  notify customer;
}
```

#### Overdue Invoice Reminders
**Schedule**: Daily at 9:00 AM
**Action**: Send overdue invoice reminders

```javascript
if (invoice is overdue) {
  sendOverdueInvoiceEmail(customer);
  mark invoice as overdue;
}
```

---

## Business Rules Summary

### Appointment Booking
- ✓ Customer must own the vehicle
- ✓ Vehicle cannot have active appointment
- ✓ Slot must be available
- ✓ Deposit required for deposit_booking type (200,000 VND)
- ✓ Services must be valid and active

### Staff Confirmation
- ✓ Deposit must be paid (for deposit_booking)
- ✓ Technician must be available and active
- ✓ Technician specialization should match

### Service Reception
- ✓ All mandatory checklist items completed
- ✓ Battery diagnostics required
- ✓ Mileage recorded with photo
- ✓ Damage photos required

### Parts Request
- ✓ Customer approval if cost > 500,000 VND
- ✓ Parts must be available or alternatives suggested
- ✓ Staff approval required

### Cancellation
- ✓ Refund based on hours before appointment
- ✓ Bank transfer requires account verification
- ✓ Refund processed within 3 business days
- ✓ Staff approval required

### Invoice
- ✓ 10% VAT applied
- ✓ Deposit deducted from total
- ✓ Payment proof required for offline payments
- ✓ Email invoice PDF to customer

---

## Key Metrics and KPIs

### Customer Metrics
- Appointment completion rate
- Average service time
- Customer satisfaction rating
- Rebooking rate

### Technician Metrics
- Jobs completed per day
- Average completion time
- Quality rating
- On-time completion rate

### Business Metrics
- Revenue per day/week/month
- Parts usage and inventory turnover
- Cancellation rate
- No-show rate
- Payment method distribution
