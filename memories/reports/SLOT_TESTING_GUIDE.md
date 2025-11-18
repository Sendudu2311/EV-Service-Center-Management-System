# Slot Management - Quick Test Guide

## ✅ Testing Checklist

### 1. Test Duplicate Prevention
```bash
# Scenario: Try to create duplicate slots
1. Navigate to Slot Manager
2. Click "Edit" on Monday 08:00-10:00
3. Assign a technician, click Save
4. Click "Edit" again on the same slot
5. Try to create it again
✅ Expected: Should update existing slot, not create duplicate
```

### 2. Test Capacity Management
```bash
# Scenario: Configure custom capacity
1. Click "Edit" on empty slot
2. Set capacity to 5
3. Click Save
4. Verify slot shows "Cap: 5"
5. Edit again, change to 3
✅ Expected: Capacity updates correctly
```

### 3. Test Auto-Assign
```bash
# Scenario: Quickly assign all technicians
1. Find empty slot (shows "No technicians assigned")
2. Click "Auto Assign" button
3. Check slot display
✅ Expected: 
   - All technicians assigned
   - Capacity = number of technicians
   - "Auto Assign" button disappears
   - Only "Edit" button remains
```

### 4. Test UI Conditional Display
```bash
# Scenario: Verify correct buttons show
Empty Slot:
✅ Shows: "No technicians assigned" + Edit + Auto Assign

Slot with Technicians:
✅ Shows: Technician names + Edit only
✅ No "Auto Assign" button
```

### 5. Test Overlap Prevention
```bash
# Backend test using API
POST /api/slots
{
  "technicianIds": ["..."],
  "start": "2025-10-13T08:00:00.000Z",
  "end": "2025-10-13T11:00:00.000Z"  // 08:00-11:00
}

POST /api/slots (again)
{
  "technicianIds": ["..."],
  "start": "2025-10-13T09:00:00.000Z",
  "end": "2025-10-13T12:00:00.000Z"  // 09:00-12:00 (overlaps!)
}

✅ Expected: Second request fails with error message
```

### 6. Test Atomic Reservation
```bash
# This requires concurrent testing - simulate multiple users
# Use browser dev tools or Postman to send parallel requests

Slot capacity: 2
Booked count: 1

Send 3 simultaneous requests:
POST /api/slots/{slotId}/reserve

✅ Expected:
   - Only 1 request succeeds (capacity reached)
   - 2 requests fail with "Slot not available"
   - bookedCount = 2 (not 3 or 4)
```

---

## 🧹 Cleanup Existing Data

If you have duplicate slots in the database:

```bash
cd server
npm run cleanup-slots
```

This will:
1. Find all duplicate slots
2. Keep the first one
3. Delete the rest
4. Create unique index

---

## 🔍 Verify Database State

```javascript
// In MongoDB shell or Compass
// Check for duplicates
db.slots.aggregate([
  {
    $group: {
      _id: { date: "$date", startTime: "$startTime", endTime: "$endTime" },
      count: { $sum: 1 },
      ids: { $push: "$_id" }
    }
  },
  { $match: { count: { $gt: 1 } } }
])

// Should return empty array []

// Check indexes
db.slots.getIndexes()

// Should include:
// { date: 1, startTime: 1, endTime: 1 } with unique: true
```

---

## 🎯 Expected Outcomes

After all fixes:

1. ✅ **No duplicate slots** can be created
2. ✅ **Race conditions prevented** - atomic operations work
3. ✅ **Overlapping slots rejected** - validation works
4. ✅ **Capacity configurable** - staff can set 1-20
5. ✅ **UI shows correct state** - buttons based on assignment
6. ✅ **Auto-assign works** - all techs assigned with proper capacity

---

## 🚨 Common Errors (Expected Behavior)

### "A slot already exists for this time period"
**Cause:** Trying to create duplicate slot
**Solution:** This is correct! Edit existing slot instead

### "Slot overlaps with existing slot"
**Cause:** New slot time conflicts with existing
**Solution:** This is correct! Choose different time or edit existing

### "Slot not available or already full"
**Cause:** Slot capacity reached
**Solution:** This is correct! Atomic reservation working

---

## 📊 Test Data

After running `npm run seed`, you should have:

- **Technicians:** 3 active technicians
- **Slots:** 4 time periods per day × 14 days = 56 slots
  - 08:00-10:00
  - 10:00-12:00
  - 13:00-15:00
  - 15:00-17:00
- **Capacity:** Varies (1 or 2 per slot)
- **Technician Assignment:** Most slots pre-assigned

---

## 🎬 Quick Demo Script

```bash
# 1. Start server
cd server
npm run dev

# 2. In another terminal, start frontend
cd ..
npm run dev

# 3. Login as staff
Email: staff@example.com
Password: password123

# 4. Navigate to Slot Manager

# 5. Test sequence:
   a. Find empty slot → Click "Auto Assign" → Verify all techs assigned
   b. Find slot with techs → Verify only Edit button shows
   c. Click Edit → Change capacity → Save → Verify update
   d. Try to create duplicate → Verify error
```

---

## ✨ Success Criteria

- [ ] No duplicate slots in database
- [ ] Capacity editable and persists
- [ ] Auto-assign works correctly
- [ ] UI shows correct buttons
- [ ] Concurrent reservations handled atomically
- [ ] Overlaps prevented
- [ ] Technician names display correctly
- [ ] Past slots are disabled

---

**Ready to Test!** 🚀
