# Fix Part Inventory Populate Issue

## Vấn đề
Frontend log hiển thị `partId.inventory: undefined` mặc dù đã fix backend populate.

## Nguyên nhân chính
**Data cũ cached trong browser/frontend state** - không phải từ API mới sau khi fix.

## Giải pháp

### Bước 1: Hard Refresh Frontend
```bash
# Ctrl + Shift + R (hoặc Ctrl + F5)
# Hoặc
Ctrl + Shift + Delete → Clear cache
```

### Bước 2: Verify Backend Response
Check log server khi fetch service reception - phải thấy:
```
📤 [getServiceReceptionByAppointment] Sending data to frontend
   Part ID.inventory: {currentStock: 8, reservedStock: 2, ...}
```

### Bước 3: Verify Frontend Log
Sau khi refresh, console log phải hiển thị:
```javascript
partId.inventory: {
  currentStock: 8,
  reservedStock: 2,
  usedStock: 0
}
```

## Files đã fix
1. **src/components/ServiceReception/ServiceReceptionReview.tsx:211,231**
   - Đổi `new Map(partStockInfo)` → `new Map()`

2. **server/controllers/serviceReceptionController.js** (5 chỗ)
   - Đổi populate string từ `"inventory"` → `"inventory.currentStock inventory.reservedStock inventory.usedStock"`

## Test checklist
- [ ] Hard refresh frontend (Ctrl+Shift+R)
- [ ] Clear browser cache
- [ ] Mở Staff → Review phiếu
- [ ] Click vào reception có parts
- [ ] Check console log - partId.inventory phải có data
- [ ] Button "Duyệt" không bị disable với parts có stock > 0
