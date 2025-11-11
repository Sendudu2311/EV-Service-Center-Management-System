# Critical Fix: Conflict Detection Flow

## Problem Identified

Bạn đã phát hiện ra một **lỗi nghiêm trọng** trong diagram 03 về cách xử lý part conflicts:

### ❌ Diagram Cũ (SAI)

```
Staff clicks Approve
  ↓
System approves ServiceReception
  ↓
[ASYNC] detectPartConflicts() - runs AFTER approval
  ↓
If conflict found: Set hasConflict=true
  ↓
BUT: Approval already succeeded! TOO LATE!
```

**Vấn đề:** Conflicts được phát hiện SAU KHI đã approve → Không thể ngăn chặn việc over-allocation parts!

### ✅ Flow Thực Tế (ĐÚNG)

```
Staff clicks Approve button
  ↓
UI calls: GET /api/part-conflicts/check-reception/:id
  ↓
checkPartConflicts() - BEFORE approval
  ↓
IF hasConflict = true:
  ├─ UI BLOCKS approve button
  ├─ Show conflict warning
  └─ Staff must resolve via diagram 03.1 first

IF hasConflict = false OR conflicts resolved:
  └─ THEN allow: PUT /api/service-receptions/:id/approve
```

**Logic đúng:** Check conflicts TRƯỚC KHI approve để CHẶN việc approval nếu có conflict!

---

## Code Evidence

### 1. Endpoint Kiểm Tra Conflict (Pre-Check)

**File:** `server/routes/partConflicts.js`

```javascript
// Check if a service reception has conflicts (staff/admin)
router.get(
  "/check-reception/:receptionId",
  authorize("staff", "admin"),
  checkReceptionConflicts
);
```

### 2. Controller Implementation

**File:** `server/controllers/partConflictController.js` (line 384-444)

```javascript
export const checkReceptionConflicts = async (req, res) => {
  const { receptionId } = req.params;

  // Get unique part IDs from requested parts (only unapproved)
  const partIds = [
    ...new Set(
      reception.requestedParts
        .filter((p) => !p.isApproved)
        .map((p) => p.partId?.toString())
        .filter(Boolean)
    ),
  ];

  // Check conflicts for each part
  const conflictPromises = partIds.map((partId) => detectPartConflicts(partId));
  const conflicts = await Promise.all(conflictPromises);

  res.status(200).json({
    success: true,
    hasConflict: detectedConflicts.length > 0,
    conflicts: detectedConflicts,
  });
};
```

### 3. Conflict Detection Service

**File:** `server/services/partConflictService.js` (line 150-290)

```javascript
export async function detectPartConflicts(partId) {
  // Find all ServiceReceptions requesting this part where parts NOT yet approved
  const pendingReceptions = await ServiceReception.find({
    "requestedParts.partId": partId,
    "requestedParts.isApproved": false, // CRITICAL: Check unapproved parts
  }).populate("appointmentId", "scheduledDate priority");

  // Calculate total requested vs available stock
  const totalRequested = allRequests.reduce(
    (sum, req) => sum + req.requestedQuantity,
    0
  );

  // Check if there's a conflict
  if (totalRequested <= availableStock) {
    return null; // No conflict
  }

  // Create conflict record with prioritized requests
  const prioritizedRequests = prioritizeRequests([...allRequests]);
  return await createConflictRecord({
    partId,
    availableStock,
    totalRequested,
    shortfall: totalRequested - availableStock,
    conflictingRequests: prioritizedRequests,
  });
}
```

---

## Diagram Changes Applied

### 1. Added Pre-Check Before Approval (msg21b-21d)

**Location:** Before msg22 (PUT approve endpoint)

```xml
<msg21b> GET /api/part-conflicts/check-reception/:id
  ↓
<msg21c> checkPartConflicts()
  ↓
<msg21d> Return: {hasConflict, conflicts[]}
```

**Note:** "CRITICAL: Check if parts conflict BEFORE allowing approval!"

### 2. Added Alt Frame for Conditional Logic

**Location:** After conflict check, before approval

```
[alt] Conflict Check Decision
  ├─ [hasConflict = true]
  │   └─ showConflictWarning() → BLOCK approve button
  │      Staff must resolve via diagram 03.1
  │
  └─ [hasConflict = false OR conflicts resolved]
      └─ PUT /api/service-receptions/:id/approve → Continue with approval
```

### 3. Deprecated Old Async Detection (msg27d)

**Location:** After approval success (marked as deprecated)

```xml
<msg27d> [DEPRECATED] detectPartConflicts()
```

**Note:** "Old design: Detected conflicts AFTER approval. New design: Check conflicts BEFORE approval. This step is now done BEFORE msg22."

### 4. Updated Business Rules (Rule #7)

**Old:**

```
7. Conflict detection (ASYNC - happens AFTER approval completes):
   - System checks if requested parts conflict
   - If conflicts found: hasConflict=true
   - NON-BLOCKING - approval succeeds even if detection fails
```

**New:**

```
7. Conflict detection (CRITICAL - BLOCKING check BEFORE approval):
   - UI calls GET /api/part-conflicts/check-reception/:id BEFORE allowing approval
   - System checks if requested parts conflict with other pending receptions
   - If conflicts found: UI BLOCKS approval button, displays conflict warning
   - Staff MUST resolve conflicts via diagram 03.1 BEFORE approval is allowed
   - Only after conflicts resolved (or no conflicts) can approval proceed
   - This prevents over-allocation of limited parts inventory
```

---

## Visual Changes in Diagram

### Color Coding

- **Red (#cc0000):** Conflict detection steps (critical blocking checks)
- **Orange (#ff6600):** Alt frame for conditional logic
- **Gray (#999999) + Dashed:** Deprecated old async detection
- **Red background (#ffe6e6):** Conflict-related notes

### Positioning Changes

All elements after conflict check shifted down by **250 pixels** to accommodate:

- Pre-check messages (msg21b, msg21c, msg21d)
- Alt frame (200px height)
- Conflict warning note

### UI Flow Changes

- **ui-act3** height: 640px → 760px (added 120px for pre-check)
- **recsvc-act3** start: y=1350 → y=1600 (shifted down 250px)
- **msg23-msg26** (approval steps): All shifted down 250px

---

## Impact Analysis

### Before Fix (Risk)

1. ❌ Staff approves reception with conflicting parts
2. ❌ System allocates parts that may not be available
3. ❌ Conflict detected AFTER approval → Too late to prevent
4. ❌ Multiple receptions could claim the same limited parts
5. ❌ Over-commitment of inventory

### After Fix (Safe)

1. ✅ Staff clicks approve → System checks conflicts FIRST
2. ✅ If conflict exists → UI blocks approval immediately
3. ✅ Staff sees conflict warning with details
4. ✅ Staff resolves conflict via diagram 03.1 (manual decision)
5. ✅ Only after resolution → Approval is allowed
6. ✅ Prevents over-allocation of parts inventory

---

## Testing Checklist

### Scenario 1: No Conflict (Happy Path)

- [ ] Staff clicks "Approve" button
- [ ] UI calls `GET /api/part-conflicts/check-reception/:id`
- [ ] Response: `{ hasConflict: false, conflicts: [] }`
- [ ] UI allows approval to proceed
- [ ] `PUT /api/service-receptions/:id/approve` succeeds

### Scenario 2: Conflict Detected (Blocking)

- [ ] Staff clicks "Approve" button
- [ ] UI calls `GET /api/part-conflicts/check-reception/:id`
- [ ] Response: `{ hasConflict: true, conflicts: [...] }`
- [ ] UI displays conflict warning modal
- [ ] UI BLOCKS "Approve" button (disabled/hidden)
- [ ] Staff redirected to conflict resolution screen (diagram 03.1)

### Scenario 3: Conflict Resolved

- [ ] Staff resolves conflict in diagram 03.1 flow
- [ ] All conflicting requests marked as approved/rejected
- [ ] PartConflict status updated to "resolved"
- [ ] Staff returns to service reception approval
- [ ] Pre-check now returns `hasConflict: false`
- [ ] Approval proceeds successfully

---

## Related Diagrams

### Diagram 03: Service Reception Checklist (This Diagram)

- **Focus:** Pre-check conflicts BEFORE approval
- **Key Change:** Added alt frame with blocking logic

### Diagram 03.1: Conflict Resolution Flow

- **Focus:** Manual conflict resolution by staff
- **Triggered When:** hasConflict = true in diagram 03
- **Actions:** Staff manually approves/rejects conflicting requests
- **Return To:** Diagram 03 after resolution complete

---

## API Endpoints Reference

### Pre-Approval Conflict Check

```
GET /api/part-conflicts/check-reception/:receptionId
Auth: Staff, Admin
Returns: { hasConflict: boolean, conflicts: PartConflict[] }
```

### Conflict Resolution (See Diagram 03.1)

```
GET /api/part-conflicts/:id
POST /api/part-conflicts/:id/approve-request
POST /api/part-conflicts/:id/reject-request
```

### Approval (After Conflict Check)

```
PUT /api/service-receptions/:id/approve
Body: { isApproved: boolean, notes: string, ... }
Auth: Staff, Admin
```

---

## Summary

**Lỗi được phát hiện bởi người dùng:**

> "Diagram 03 ghi là sẽ xử lý conflict sau khi approve, nhưng bản chất luồng phải là sẽ xử lý chặn nếu staff confirm reception đang có conflict"

**Fix đã áp dụng:**

1. ✅ Thêm pre-check conflict TRƯỚC approval (msg21b-21d)
2. ✅ Thêm alt frame với logic chặn approval nếu có conflict
3. ✅ Đánh dấu deprecated async detection cũ (msg27d)
4. ✅ Cập nhật Business Rules #7 với logic mới
5. ✅ Điều chỉnh vị trí tất cả elements phía sau

**Kết quả:**

- Diagram 03 bây giờ mô tả đúng flow: CHECK → BLOCK if conflict → RESOLVE → APPROVE
- Phù hợp 100% với code implementation thực tế
- Ngăn chặn over-allocation parts inventory

---

**Date:** November 8, 2025  
**Status:** ✅ FIXED - Diagram now correctly represents blocking conflict check before approval
