# Service Reception to Appointment Logic

## Overview
This document explains how parts and services are transferred from a Service Reception (staff review) to an Appointment when the reception is approved.

## Key Files
- **Main Controller**: `server/controllers/appointmentController.js`
  - Function: `reviewServiceReception()` - lines ~3960-4100
  - Function: `checkPartsAvailability()` - lines ~4450+
  - Function: `reducePartsForCompletedAppointment()` - lines ~4840+

## Workflow: Service Reception Approval

### 1. **Request Submission**
When a technician creates a service reception, they include:
- `recommendedServices[]` - Array of services they recommend (with serviceId, quantity, estimatedCost)
- `requestedParts[]` - Array of parts they need (with partId, quantity, reason, etc.)

### 2. **Staff Review Phase**
Staff review the service reception and make a decision:
- `approved` - Everything looks good
- `partially_approved` - Some items approved, some need modification
- `rejected` - Send back to technician for revision
- `needs_modification` - Request changes

### 3. **Approval Process** (When decision = "approved" or "partially_approved")

#### Step 3a: Check Parts Availability
```javascript
const { allPartsAvailable, insufficientParts } = 
  await checkPartsAvailability(serviceReception, appointment, req.user._id);
```

This function:
- Iterates through all `requestedParts` in the service reception
- Checks if each part has sufficient stock in the inventory
- If stock < requested quantity:
  - Sets `allPartsAvailable = false`
  - Adds part to `insufficientParts` array
- Returns both values to determine next action

#### Step 3b: CONDITIONAL - Add Services & Parts (Only if ALL parts available)

**IMPORTANT: This is the KEY logic**

```javascript
if (allPartsAvailable) {
  // 2a. Add recommended services to appointment
  if (serviceReception.recommendedServices && serviceReception.recommendedServices.length > 0) {
    for (const recService of serviceReception.recommendedServices) {
      const serviceData = await Service.findById(recService.serviceId);
      if (serviceData) {
        appointment.services.push({
          serviceId: recService.serviceId,
          quantity: recService.quantity || 1,
          price: serviceData.basePrice || recService.estimatedCost || 0,
          estimatedDuration: recService.estimatedDuration || serviceData.estimatedDuration || 60,
        });
      }
    }
  }

  // 2b. Add requested parts to appointment
  if (serviceReception.requestedParts && serviceReception.requestedParts.length > 0) {
    for (const reqPart of serviceReception.requestedParts) {
      const partData = await Part.findById(reqPart.partId);
      if (partData) {
        const unitPrice = partData.pricing?.retail || 
                         reqPart.actualCost || 
                         reqPart.estimatedCost || 
                         0;
        appointment.partsUsed.push({
          partId: reqPart.partId,
          quantity: reqPart.quantity,
          unitPrice: unitPrice,
          totalPrice: unitPrice * reqPart.quantity,
        });
      }
    }
  }

  // 2c. Recalculate total amount
  appointment.calculateTotal();
  await appointment.save();
}
```

#### Step 3c: Status Updates
The appointment status is updated based on decision:
- `approved` → `reception_approved`
- `partially_approved` → `reception_approved`
- `rejected` → `confirmed` (back to previous)
- `needs_modification` → `reception_created` (back to technician)

### 4. **If Parts Insufficient**
If `allPartsAvailable === false`:
- Services and parts are NOT added to appointment
- Appointment status becomes `parts_insufficient`
- Customer notified of shortage
- Customer decides: wait for parts, reschedule, or cancel

## Data Structures

### Appointment.services Array
```javascript
{
  serviceId: ObjectId,          // Reference to Service model
  quantity: Number,              // How many of this service
  price: Number,                 // Unit price at time of approval
  estimatedDuration: Number,     // In minutes
}
```

### Appointment.partsUsed Array
```javascript
{
  partId: ObjectId,              // Reference to Part model
  quantity: Number,              // How many units
  unitPrice: Number,             // Price per unit (from Part.pricing.retail)
  totalPrice: Number,            // quantity × unitPrice
}
```

### ServiceReception.recommendedServices Array
```javascript
{
  serviceId: ObjectId,
  quantity: Number,
  estimatedCost: Number,         // Optional: technician's estimate
  estimatedDuration: Number,     // Optional
}
```

### ServiceReception.requestedParts Array
```javascript
{
  partId: ObjectId,
  quantity: Number,
  reason: String,                // Why this part is needed
  isAvailable: Boolean,          // Set during staff check
  estimatedCost: Number,         // Technician's estimate
  actualCost: Number,            // May differ from estimate
  shortfall: Number,             // If insufficient: quantity - available
}
```

## Pricing Logic

### Service Pricing
1. When adding service to appointment:
   - Use `Service.basePrice` from Service model
   - Fallback to `recService.estimatedCost` if not found
   - Fallback to `0` if neither exists

### Part Pricing
1. When adding part to appointment:
   - Use `Part.pricing.retail` (primary)
   - Fallback to `reqPart.actualCost` (if technician provided)
   - Fallback to `reqPart.estimatedCost` (if technician estimated)
   - Fallback to `0` if none exist

**Key Point**: Prices are locked in at the moment of staff approval. They don't change later even if inventory prices change.

## Total Amount Calculation
After adding services and parts:
```javascript
appointment.calculateTotal();
```

This function (in Appointment model):
1. Sum all `appointment.services[].price * quantity`
2. Sum all `appointment.partsUsed[].totalPrice`
3. Apply 10% VAT
4. Subtract deposit if applicable
5. Store final total in `appointment.totalAmount`

## Part Inventory Management

### Two-Step Process

#### Step 1: Parts Availability Check (Staff Approval)
```javascript
checkPartsAvailability(serviceReception, appointment, req.user._id)
```
- Only CHECKS if stock is available
- Does NOT reduce inventory yet
- If insufficient → appointment status = `parts_insufficient`

#### Step 2: Parts Reduction (Appointment Completion)
```javascript
reducePartsForCompletedAppointment(appointmentId)
```
- Called when appointment status → `completed`
- ACTUALLY reduces part quantities
- Handles both `requestedParts` (from service reception) and `commonParts` (from services)
- Updates Part model: `part.inventory.currentStock -= quantity`

**Why Two Steps?**
1. Parts can become available between staff approval and completion
2. Technician might use different parts than planned
3. Only confirmed usage reduces inventory

## Related Controllers

### ServiceReceptionController
- Creates reception with `requestedParts[]`
- Validates parts exist (but doesn't check stock)

### PartRequestController
- Creates standalone part requests (not tied to reception)
- Can be approved/rejected independently
- Updates `Appointment.partsUsed` when fulfilled

### InvoiceController
- Retrieves `Appointment.partsUsed` for billing
- Uses locked-in prices from parts added during staff approval
- Does NOT recalculate prices

## Error Handling

### Part Not Found
If a part ID in `requestedParts` doesn't exist:
- Service Reception creation fails with validation error
- Technician must select valid parts

### Insufficient Stock
If stock < requested quantity during staff approval:
- Part added to `insufficientParts` array
- Whole appointment update blocked
- Appointment status changes to `parts_insufficient`
- Technician must resolve (customer decides next action)

### Part Becomes Unavailable
Between staff approval and appointment completion:
- This can happen if another appointment uses same parts
- Handled by `reducePartsForCompletedAppointment()`
- If shortfall detected: Appointment completion may fail

## Code Locations

### Main Logic: `appointmentController.js`

**reviewServiceReception()**: ~3960-4100
- Receives staff decision on reception
- Checks parts availability
- Adds services and parts to appointment (if available)
- Updates appointment status and total amount

**checkPartsAvailability()**: ~4450-4490
- Iterates through `requestedParts`
- Checks Part.currentStock vs requested quantity
- Builds `insufficientParts` list
- Returns `allPartsAvailable` boolean

**reducePartsForCompletedAppointment()**: ~4840-5020
- Runs on appointment completion
- Reduces Part inventory for both:
  - `ServiceReception.requestedParts[]` (explicitly requested)
  - `Service.commonParts[]` (from service definition)
- Preserves prices set during staff approval
- Creates audit trail of what was used

## Important Notes

1. **Prices are locked** - Once added during staff approval, prices don't change
2. **Parts checked, not reserved** - Inventory is only updated on completion
3. **Conditional addition** - Services and parts ONLY added if ALL parts available
4. **No partial additions** - It's all or nothing for a service reception
5. **Fallback pricing** - Multiple sources tried: actual → estimated → model default
6. **Audit trail** - All changes to `partsUsed` tracked with user and timestamp

## Business Rules

✓ Services added only after staff approves reception
✓ Parts checked for availability before adding to appointment
✓ If parts insufficient → customer decides (wait/reschedule/cancel)
✓ Prices locked at approval time
✓ Inventory reduced only on appointment completion
✓ Both service common parts and reception requested parts reduced
✓ VAT applied to final total
✓ Deposit subtracted from invoice
