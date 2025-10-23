# Hướng dẫn Cơ chế Real-time Notification

## 📡 Tổng quan kiến trúc

```
┌─────────────────┐         Socket.io          ┌──────────────────┐
│  Backend Server │ ◄─────────────────────────► │   Mobile App     │
│  (Node.js)      │    WebSocket/Polling        │  (React Native)  │
└─────────────────┘                             └──────────────────┘
        │                                                │
        │ 1. Emit event                                  │ 2. Listen event
        │    (khi có sự kiện)                           │    (nhận và xử lý)
        ▼                                                ▼
  appointment_status_updated                    Auto refresh list
  invoice_generated                             Show Alert notification
  payment_success                               Update UI real-time
```

## 🔄 Luồng hoạt động chi tiết

### **Bước 1: Kết nối (Connection)**

Khi user **đăng nhập** vào app:

```typescript
// app/src/contexts/SocketContext.tsx (dòng 37-50)

// ✅ Tự động kết nối khi có user và token
useEffect(() => {
  if (isAuthenticated && token && user) {
    const socketInstance = io('http://172.20.10.5:3000', {
      auth: {
        token,              // JWT token để xác thực
        userId: user._id,
        role: user.role,
      },
      transports: ['websocket', 'polling'],  // Thử WebSocket trước, fallback sang polling
      reconnection: true,                     // Tự động kết nối lại
      reconnectionAttempts: 5,
    });
  }
}, [isAuthenticated, token, user]);
```

**Log console sẽ thấy:**
```
📡 Initializing Socket.io connection...
✅ Socket connected: abc123xyz
✅ Socket authenticated successfully
```

---

### **Bước 2: Backend phát sự kiện (Emit Events)**

Khi có **thay đổi dữ liệu** ở backend (ví dụ: staff xác nhận lịch hẹn), backend sẽ **emit** socket event:

#### **Ví dụ 1: Cập nhật status appointment**

```javascript
// server/controllers/appointmentController.js (giả định)

const confirmAppointment = async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  appointment.status = 'confirmed';
  await appointment.save();

  // 🔥 PHÁT SOCKET EVENT
  const io = req.app.get('io');
  io.emit('appointment_status_updated', {
    appointmentId: appointment._id,
    appointmentNumber: appointment.appointmentNumber,
    status: 'confirmed',
    customerId: appointment.customerId,
    technicianId: appointment.technicianId,
  });

  res.json({ success: true, data: appointment });
};
```

#### **Ví dụ 2: Tạo hóa đơn mới**

```javascript
// server/controllers/invoiceController.js (giả định)

const createInvoice = async (req, res) => {
  const invoice = await Invoice.create(req.body);

  // 🔥 PHÁT SOCKET EVENT
  const io = req.app.get('io');
  io.emit('invoice_generated', {
    invoiceId: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    amount: invoice.totalAmount,
  });

  res.json({ success: true, data: invoice });
};
```

#### **Ví dụ 3: Thanh toán thành công (VNPay)**

```javascript
// server/utils/paymentNotifications.js (dòng 316-330)

io.to(`user_${userData._id}`).emit('payment_success', {
  appointmentNumber: appointmentData.appointmentNumber,
  amount: paymentData.amount,
  customerId: userData._id,
  paymentMethod: 'vnpay',
});

io.to(`service_center_${appointmentData.serviceCenterId}`).emit('new_paid_appointment', {
  appointmentNumber: appointmentData.appointmentNumber,
  amount: paymentData.amount,
  customerId: userData._id,
});
```

---

### **Bước 3: Mobile App lắng nghe (Listen Events)**

Mobile app **tự động lắng nghe** các events từ backend:

#### **Cách 1: Lắng nghe trực tiếp trong SocketContext**

```typescript
// app/src/contexts/SocketContext.tsx (dòng 106-121)

socketInstance.on('appointment_status_updated', (data) => {
  console.log('📋 Appointment status updated:', data);

  // Phát custom event cho các screen lắng nghe
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('appointmentStatusUpdate', { detail: data })
    );
  }
});
```

#### **Cách 2: Màn hình lắng nghe custom event**

```typescript
// app/src/screens/AppointmentsScreen.tsx (dòng 48-52)

useCustomEvent('appointmentStatusUpdate', (data) => {
  console.log('📡 Real-time status update:', data);

  // 🔄 Tự động refresh danh sách appointments
  fetchAppointments();
});
```

**Log console sẽ thấy:**
```
📋 Appointment status updated: { appointmentId: '...', status: 'confirmed', ... }
📡 Real-time status update: { appointmentId: '...', status: 'confirmed', ... }
[Danh sách appointments được refresh tự động]
```

---

### **Bước 4: Hiển thị Notification cho User**

Có **2 loại notification**:

#### **A. Alert Notification** (Popup trên màn hình)

```typescript
// app/src/contexts/SocketContext.tsx (dòng 130-135)

socketInstance.on('invoice_generated', (data) => {
  if (user._id === data.customerId) {
    // 🔔 Hiển thị Alert popup
    Alert.alert('Hóa đơn mới', `Hóa đơn ${data.invoiceNumber} đã được tạo`);
  }
});
```

**User sẽ thấy:**
```
┌────────────────────────┐
│      Hóa đơn mới       │
│ Hóa đơn INV-20250115   │
│    đã được tạo         │
│                        │
│        [  OK  ]        │
└────────────────────────┘
```

#### **B. Silent Update** (Chỉ refresh data, không popup)

```typescript
// app/src/screens/AppointmentsScreen.tsx (dòng 48-52)

useCustomEvent('appointmentStatusUpdate', (data) => {
  // 🔄 Không hiển thị popup, chỉ refresh data
  fetchAppointments();
});
```

**User sẽ thấy:**
- Danh sách appointments **tự động cập nhật**
- Status badge thay đổi từ "Chờ xác nhận" → "Đã xác nhận"
- **KHÔNG CÓ POPUP**, smooth UX

---

## 📋 Danh sách Socket Events đã tích hợp

| Event Name | Khi nào phát | Mobile xử lý như thế nào | Notification Type |
|-----------|-------------|------------------------|-------------------|
| `appointment_status_updated` | Staff/Technician thay đổi status | Auto refresh appointments list | Silent |
| `new_appointment` | Customer tạo lịch hẹn mới | Refresh list (cho staff) | Silent |
| `technician_assigned` | Admin/Staff assign technician | Show Alert + refresh | **Alert** |
| `invoice_generated` | System tạo hóa đơn | Show Alert + refresh invoices | **Alert** |
| `payment_received` | Nhận thanh toán | Refresh invoices | Silent |
| `payment_success` | Thanh toán VNPay thành công | Show Alert + refresh | **Alert** |
| `new_paid_appointment` | Lịch hẹn mới đã thanh toán | Refresh (cho staff) | Silent |
| `parts_requested` | Technician yêu cầu phụ tùng | Log only | Silent |
| `parts_approved` | Staff duyệt phụ tùng | Log only | Silent |
| `new_message` | Chat message mới | Log only (chưa có chat UI) | Silent |
| `service_reception_created` | Tạo phiếu tiếp nhận | Log only | Silent |
| `service_reception_approved` | Duyệt phiếu tiếp nhận | Log only | Silent |

---

## 🎯 Ví dụ thực tế

### **Tình huống 1: Staff xác nhận lịch hẹn**

1. **Staff trên web** click "Xác nhận" lịch hẹn #APT-001
2. **Backend** cập nhật DB, status = "confirmed"
3. **Backend emit:**
   ```javascript
   io.emit('appointment_status_updated', {
     appointmentId: '123abc',
     status: 'confirmed',
     customerId: 'user456',
   });
   ```
4. **Mobile app (customer)** nhận event
5. **Auto refresh** danh sách appointments
6. **Customer thấy** status đổi từ "Chờ xác nhận" → "Đã xác nhận" **NGAY LẬP TỨC**

**Thời gian:** < 1 giây

---

### **Tình huống 2: Thanh toán VNPay thành công**

1. **Customer** thanh toán VNPay trên web/mobile
2. **VNPay IPN** gọi callback về backend
3. **Backend** xác nhận thanh toán thành công
4. **Backend emit:**
   ```javascript
   io.to(`user_${customerId}`).emit('payment_success', {
     amount: 1500000,
     appointmentNumber: 'APT-001',
   });
   ```
5. **Mobile app** nhận event
6. **Show Alert:**
   ```
   ┌────────────────────────────┐
   │   Thanh toán thành công    │
   │  Số tiền: 1,500,000 VND    │
   │                            │
   │         [  OK  ]           │
   └────────────────────────────┘
   ```
7. **Auto refresh** danh sách invoices

---

### **Tình huống 3: Phân công kỹ thuật viên**

1. **Manager** assign technician "Nguyễn Văn A" cho lịch hẹn #APT-002
2. **Backend emit:**
   ```javascript
   io.emit('technician_assigned', {
     appointmentNumber: 'APT-002',
     technicianId: 'tech789',
     technicianName: 'Nguyễn Văn A',
   });
   ```
3. **Mobile app (technician)** kiểm tra `user._id === data.technicianId`
4. **Nếu đúng → Show Alert:**
   ```
   ┌──────────────────────────────┐
   │       Phân công mới          │
   │ Bạn được phân công lịch hẹn: │
   │         APT-002              │
   │                              │
   │          [  OK  ]            │
   └──────────────────────────────┘
   ```

---

## 🔧 Cách thêm notification mới

### **Bước 1: Backend emit event**

```javascript
// server/controllers/yourController.js

const yourFunction = async (req, res) => {
  // ... business logic ...

  const io = req.app.get('io');
  io.emit('your_custom_event', {
    // Data bạn muốn gửi
    userId: user._id,
    message: 'Something happened',
  });
};
```

### **Bước 2: Mobile SocketContext lắng nghe**

```typescript
// app/src/contexts/SocketContext.tsx (thêm vào useEffect)

socketInstance.on('your_custom_event', (data) => {
  console.log('🆕 Custom event:', data);

  // Option A: Silent update
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('yourCustomEvent', { detail: data })
    );
  }

  // Option B: Show Alert
  if (user._id === data.userId) {
    Alert.alert('Tiêu đề', data.message);
  }
});
```

### **Bước 3: Screen lắng nghe và xử lý**

```typescript
// app/src/screens/YourScreen.tsx

import { useCustomEvent } from '../contexts/SocketContext';

const YourScreen = () => {
  useCustomEvent('yourCustomEvent', (data) => {
    console.log('📡 Received:', data);
    // Refresh data
    fetchYourData();
  });
};
```

---

## 🐛 Debugging

### **Kiểm tra kết nối**

```typescript
// app/src/contexts/SocketContext.tsx

const { isConnected } = useSocket();

console.log('Socket connected:', isConnected);
// true = đã kết nối
// false = chưa kết nối hoặc bị disconnect
```

### **Xem logs**

Khi mở app, check **Metro logs** hoặc **Expo logs**:

```
📡 Initializing Socket.io connection...
✅ Socket connected: Xy1ABc2DeF
✅ Socket authenticated successfully
📋 Appointment status updated: {...}
📡 Real-time status update: {...}
```

### **Test thủ công**

1. Mở **2 devices**: Web (staff) + Mobile (customer)
2. Web: Tạo/sửa appointment
3. Mobile: Xem có auto refresh không
4. Check logs có thấy events không

---

## ⚡ Performance & Best Practices

### **1. Chỉ refresh khi cần thiết**

✅ **TốT:**
```typescript
useCustomEvent('appointmentStatusUpdate', (data) => {
  // Chỉ refresh nếu là appointment của user
  if (data.customerId === user._id) {
    fetchAppointments();
  }
});
```

❌ **KHÔNG TỐT:**
```typescript
useCustomEvent('appointmentStatusUpdate', () => {
  // Refresh cho tất cả users → tốn băng thông
  fetchAppointments();
});
```

### **2. Debounce refresh**

Nếu nhận nhiều events liên tục:

```typescript
const debouncedRefresh = debounce(fetchAppointments, 1000);

useCustomEvent('appointmentStatusUpdate', () => {
  debouncedRefresh();
});
```

### **3. Cleanup listeners**

`useCustomEvent` hook đã tự động cleanup, không cần lo!

---

## 🔒 Security

### **1. Authentication**

Mọi socket connection đều **yêu cầu JWT token**:

```typescript
// app/src/contexts/SocketContext.tsx (dòng 41-44)

auth: {
  token,        // JWT token từ AsyncStorage
  userId: user._id,
  role: user.role,
}
```

Backend sẽ verify token trước khi chấp nhận kết nối.

### **2. Authorization**

Backend chỉ emit events cho **đúng người**:

```javascript
// Chỉ gửi cho customer cụ thể
io.to(`user_${customerId}`).emit('invoice_generated', {...});

// Chỉ gửi cho service center cụ thể
io.to(`service_center_${centerId}`).emit('new_appointment', {...});
```

### **3. Data Validation**

Mobile app luôn kiểm tra:

```typescript
socketInstance.on('invoice_generated', (data) => {
  // Chỉ hiện Alert nếu là hóa đơn của user này
  if (user._id === data.customerId) {
    Alert.alert('Hóa đơn mới', `...`);
  }
});
```

---

## 📱 So sánh: Web vs Mobile

| Tính năng | Web App | Mobile App |
|-----------|---------|-----------|
| Notification UI | `react-hot-toast` | `Alert.alert()` |
| Custom events | `window.dispatchEvent` | `window.dispatchEvent` |
| Auto refresh | ✅ | ✅ |
| Socket.io client | `socket.io-client` | `socket.io-client` |
| Authentication | JWT from context | JWT from AsyncStorage |

Cả **web và mobile đều dùng cùng 1 backend Socket.io server** → dễ maintain!

---

## 🎓 Tổng kết

1. **Backend emit events** khi có thay đổi dữ liệu
2. **Mobile SocketContext** lắng nghe events 24/7
3. **Custom events** dispatch cho các screens
4. **Screens** tự động refresh data hoặc hiển thị Alert
5. **User** thấy updates **real-time** không cần refresh thủ công

**Ưu điểm:**
- ⚡ Cập nhật **tức thì** (< 1 giây)
- 🔄 Tự động reconnect khi mất kết nối
- 📱 Hoạt động trên cả web và mobile
- 🔒 Bảo mật với JWT authentication
- 🎯 Chỉ gửi notification cho đúng người

**Nhược điểm:**
- ⚠️ Cần internet connection
- 📶 Tốn ít băng thông (nhưng rất nhỏ)
- 🔋 Tốn ít pin (WebSocket persistent connection)

---

**Tác giả:** Claude Code
**Ngày tạo:** 2025-01-15
**Phiên bản:** 1.0
