# Phân tích: Thêm tính năng "Khách không muốn thực hiện dịch vụ"

**Ngày:** 2025-11-21
**Yêu cầu:** Thêm checkbox "Khách không muốn thực hiện dịch vụ" trong ServiceReceptionReview. Khi check, chỉ hiện nút Reject và appointment chuyển sang trạng thái Cancelled.

---

## 🔍 Phân tích hiện tại

### 1. Frontend - ServiceReceptionReview Component

**File:** `src/components/ServiceReception/ServiceReceptionReview.tsx`

#### Cơ chế hiện tại:
- **Dòng 592-656**: Hàm `handleReviewSubmit(decision)` xử lý approve/reject
- **Dòng 1604-1641**: UI buttons (3 nút: Đóng, Từ chối, Duyệt)
- **Dòng 1625**: Nút "Duyệt" bị disable khi `hasStockIssues()` = true
- **Dòng 592**: Decision có 2 giá trị: `"approve"` hoặc `"reject"`

#### Logic reject hiện tại:
```javascript
onClick={() => handleReviewSubmit("reject")}
```
- Gọi API với `decision: "reject"`
- Backend cập nhật `appointment.status = "customer_arrived"`
- Technician có thể tạo lại phiếu mới

---

### 2. Backend - Service Reception Controller

**File:** `server/controllers/serviceReceptionController.js` (Dòng 628-1122)

#### Logic khi reject (Dòng 1098-1112):
```javascript
if (appointment && !isApproved) {
  appointment.status = "customer_arrived"; // ❌ Trở về customer_arrived
  appointment.staffRejectionReason = notes;
  appointment.rejectedAt = new Date();
  appointment.rejectedBy = req.user._id;
  // ...
}
```

---

## ✅ Các file cần sửa

### 📁 1. Frontend Component
**File:** `src/components/ServiceReception/ServiceReceptionReview.tsx`

#### A. Thêm state mới (sau dòng 175):
```typescript
const [customerDeclinedService, setCustomerDeclinedService] = useState(false);
```

#### B. Thêm checkbox trong modal (trước phần buttons, khoảng dòng 1600):
```tsx
{/* Checkbox: Khách không muốn thực hiện dịch vụ */}
<div className="mb-4 p-4 border border-orange-500/30 rounded-lg bg-orange-900/10">
  <label className="flex items-center space-x-3 cursor-pointer">
    <input
      type="checkbox"
      checked={customerDeclinedService}
      onChange={(e) => setCustomerDeclinedService(e.target.checked)}
      className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
    />
    <span className="text-white font-medium">
      ⚠️ Khách hàng không muốn thực hiện dịch vụ
    </span>
  </label>
  {customerDeclinedService && (
    <p className="text-sm text-orange-400 mt-2 ml-8">
      Khi chọn mục này, phiếu sẽ bị từ chối và lịch hẹn sẽ chuyển sang trạng thái Đã hủy.
    </p>
  )}
</div>
```

#### C. Sửa logic buttons (dòng 1604-1641):
```tsx
<div className="flex items-center justify-end space-x-4 w-full">
  <button
    onClick={() => setSelectedReception(null)}
    className="px-6 py-2 border border-dark-200 rounded-md text-text-secondary hover:bg-dark-900"
  >
    Đóng
  </button>

  {/* Nút Từ chối - CHỈ hiện khi checkbox được check */}
  {customerDeclinedService && (
    <button
      onClick={() => handleReviewSubmit("reject")}
      disabled={isSubmitting}
      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
    >
      {isSubmitting ? (
        <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <XMarkIcon className="w-4 h-4 mr-2" />
      )}
      Từ chối & Hủy lịch hẹn
    </button>
  )}

  {/* Nút Duyệt - CHỈ hiện khi checkbox KHÔNG được check */}
  {!customerDeclinedService && (
    <button
      onClick={() => handleReviewSubmit("approve")}
      disabled={isSubmitting || hasStockIssues()}
      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center relative group"
      title={hasStockIssues() ? "Không thể duyệt vì có phụ tùng thiếu hàng" : ""}
    >
      {isSubmitting ? (
        <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <CheckCircleIcon className="w-4 h-4 mr-2" />
      )}
      Duyệt
      {hasStockIssues() && !isSubmitting && (
        <span className="ml-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-yellow-300" />
        </span>
      )}
    </button>
  )}
</div>
```

#### D. Sửa hàm handleReviewSubmit (dòng 592-656):
```typescript
const handleReviewSubmit = async (decision: "approve" | "reject") => {
  if (!selectedReception) return;

  try {
    setIsSubmitting(true);

    // Validate modification reason if there are changes
    if (hasAnyModifications() && !modificationReason.trim()) {
      toast.error("Vui lòng nhập lý do thay đổi services/parts");
      setIsSubmitting(false);
      return;
    }

    // Prepare modification data
    const modificationsData = hasAnyModifications() ? {
      servicesChanges: getServicesChanges(),
      partsChanges: getPartsChanges(),
      modificationReason: modificationReason.trim(),
      modifiedServices: editedServices,
      modifiedParts: editedParts
    } : null;

    await onReview(
      selectedReception._id,
      decision,
      reviewNotes,
      externalParts,
      extendedCompletionDate,
      modificationsData,
      customerDeclinedService // ✅ THÊM PARAMETER MỚI
    );

    toast.success(
      decision === "approve"
        ? "Đã duyệt phiếu tiếp nhận"
        : customerDeclinedService
        ? "Đã từ chối phiếu và hủy lịch hẹn"
        : "Đã từ chối phiếu tiếp nhận"
    );

    setSelectedReception(null);
    setReviewNotes("");
    setExternalParts([]);
    setExtendedCompletionDate("");
    setCustomerDeclinedService(false); // ✅ RESET STATE
    if (onReceptionUpdated) {
      onReceptionUpdated();
    }
  } catch (error: any) {
    console.error("Error submitting review:", error);
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Không thể submit đánh giá";
    toast.error(errorMessage, { duration: 5000 });
  } finally {
    setIsSubmitting(false);
  }
};
```

#### E. Reset state khi đóng modal (thêm vào hàm handleOpenReviewModal, dòng 288):
```typescript
const handleOpenReviewModal = (reception: ServiceReception) => {
  setSelectedReception(reception);
  setEditedServices([...(reception.recommendedServices || [])]);
  setEditedParts([...(reception.requestedParts || [])]);
  setReviewNotes("");
  setModificationReason("");
  setIsEditingServices(false);
  setIsEditingParts(false);
  setCustomerDeclinedService(false); // ✅ THÊM DÒNG NÀY

  // ... rest of the code
};
```

---

### 📁 2. Parent Component (nơi gọi ServiceReceptionReview)

**Cần tìm:** Component sử dụng `<ServiceReceptionReview />` và truyền prop `onReview`

**Thay đổi:** Sửa hàm `onReview` nhận thêm parameter `customerDeclinedService`:

```typescript
const handleReview = async (
  receptionId: string,
  decision: "approve" | "reject",
  notes: string,
  externalParts?: any[],
  extendedCompletionDate?: string,
  modifications?: any,
  customerDeclinedService?: boolean // ✅ THÊM PARAMETER
) => {
  // ... existing code

  // Gọi API với parameter mới
  await serviceReceptionAPI.approve(receptionId, {
    decision,
    reviewNotes: notes,
    externalParts,
    extendedCompletionDate,
    modifications,
    customerDeclinedService, // ✅ TRUYỀN VÀO API
  });
};
```

---

### 📁 3. Backend Controller
**File:** `server/controllers/serviceReceptionController.js` (Dòng 628-1122)

#### A. Nhận parameter mới (dòng 634-640):
```javascript
const {
  decision,
  reviewNotes,
  approved,
  staffNotes,
  externalParts,
  extendedCompletionDate,
  modifications,
  customerDeclinedService, // ✅ THÊM PARAMETER MỚI
} = req.body;
```

#### B. Sửa logic reject (dòng 1098-1112):
```javascript
} else if (appointment && !isApproved) {
  // ✅ KIỂM TRA CUSTOMER DECLINED SERVICE
  if (customerDeclinedService) {
    // Khách không muốn thực hiện dịch vụ → Cancel appointment
    appointment.status = "cancelled";
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = req.user._id;
    appointment.cancellationReason = notes || "Khách hàng không muốn thực hiện dịch vụ sau khi xem phiếu tiếp nhận";

    appointment.workflowHistory.push({
      status: "cancelled",
      changedBy: req.user._id,
      changedAt: new Date(),
      notes: `Appointment cancelled because customer declined service after reviewing reception form: ${
        notes || "Customer chose not to proceed with service"
      }`,
    });
  } else {
    // Reject bình thường → Trở về customer_arrived
    appointment.status = "customer_arrived";
    appointment.staffRejectionReason =
      notes || "Service reception rejected by staff. Please review and resubmit.";
    appointment.rejectedAt = new Date();
    appointment.rejectedBy = req.user._id;

    appointment.workflowHistory.push({
      status: "customer_arrived",
      changedBy: req.user._id,
      changedAt: new Date(),
      notes: `Service reception rejected by staff: ${
        notes || "Please review reception details and resubmit"
      }. Appointment returned to customer_arrived for technician to create new reception.`,
    });
  }

  await appointment.save();
}
```

---

## 📝 Tóm tắt các file cần sửa

| # | File | Vị trí | Thay đổi |
|---|------|--------|----------|
| 1 | `src/components/ServiceReception/ServiceReceptionReview.tsx` | Dòng 175 | Thêm state `customerDeclinedService` |
| 2 | `src/components/ServiceReception/ServiceReceptionReview.tsx` | Dòng 1600 | Thêm checkbox UI |
| 3 | `src/components/ServiceReception/ServiceReceptionReview.tsx` | Dòng 1604-1641 | Sửa logic hiển thị buttons |
| 4 | `src/components/ServiceReception/ServiceReceptionReview.tsx` | Dòng 592-656 | Sửa `handleReviewSubmit` truyền parameter mới |
| 5 | `src/components/ServiceReception/ServiceReceptionReview.tsx` | Dòng 288 | Reset state trong `handleOpenReviewModal` |
| 6 | **Parent component** (cần tìm) | - | Sửa hàm `onReview` nhận thêm parameter |
| 7 | `server/controllers/serviceReceptionController.js` | Dòng 634 | Nhận parameter `customerDeclinedService` |
| 8 | `server/controllers/serviceReceptionController.js` | Dòng 1098-1112 | Thêm logic cancel khi customer declined |

---

## 🎯 Workflow sau khi sửa

```
Staff review phiếu → Check checkbox "Khách không muốn thực hiện dịch vụ"
                ↓
        Chỉ hiện nút "Từ chối & Hủy lịch hẹn"
                ↓
        Click → API reject với customerDeclinedService=true
                ↓
        Backend cập nhật appointment.status = "cancelled"
                ↓
        Appointment bị hủy (không thể tạo lại phiếu)
```

### So sánh với workflow hiện tại:

#### Hiện tại (Reject thông thường):
```
Reject → appointment.status = "customer_arrived"
      → Technician có thể tạo lại phiếu
```

#### Mới (Customer declined):
```
Reject + customerDeclinedService=true
      → appointment.status = "cancelled"
      → Appointment kết thúc (terminal state)
```

---

## 🔍 Cần làm tiếp theo

1. ✅ Tìm parent component gọi `ServiceReceptionReview`
2. ✅ Implement các thay đổi theo thứ tự:
   - Frontend component trước
   - Parent component
   - Backend controller
3. ✅ Test workflow:
   - Test reject bình thường (không check checkbox)
   - Test customer declined (có check checkbox)
4. ✅ Kiểm tra UI/UX:
   - Checkbox hiển thị đúng
   - Buttons toggle đúng logic
   - Toast messages phù hợp

---

**Ghi chú:** File này được tạo trước khi compact để lưu lại toàn bộ phân tích và hướng dẫn implement.
