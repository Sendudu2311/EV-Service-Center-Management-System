# Deploy Socket.io Server lên Render.com 🚀

## Bước 1: Chuẩn Bị

### 1.1 Tạo tài khoản Render
- Truy cập [render.com](https://render.com)
- Đăng ký bằng GitHub account

### 1.2 Push code lên GitHub
Đảm bảo thư mục `socket-server/` đã được commit và push lên GitHub repository.

## Bước 2: Tạo Web Service trên Render

### 2.1 Tạo New Web Service
1. Click **"New +"** → **"Web Service"**
2. Chọn repository: `EV-Service-Center-Management-System`
3. Click **"Connect"**

### 2.2 Cấu hình Service

**Basic Settings:**
- **Name**: `ev-socket-server` (hoặc tên bạn thích)
- **Region**: `Singapore` (gần VN nhất)
- **Branch**: `main`
- **Root Directory**: `socket-server`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Instance Type:**
- Chọn **"Free"** (đủ cho demo/học thuật)

### 2.3 Environment Variables

Thêm các biến sau trong phần **"Environment Variables"**:

```
JWT_SECRET=<same-as-main-backend>
CLIENT_URL=https://ev-service-center-wdp301.vercel.app
PORT=10000
```

**LƯU Ý**:
- `JWT_SECRET` phải **giống hệt** với backend chính
- Render tự động set PORT, nhưng bạn có thể để `10000`

### 2.4 Advanced Settings (Tùy chọn)

- **Auto-Deploy**: `Yes` (tự động deploy khi push code)
- **Health Check Path**: `/health`

## Bước 3: Deploy

1. Click **"Create Web Service"**
2. Đợi build hoàn thành (2-3 phút)
3. Khi deploy xong, bạn sẽ nhận được URL:
   ```
   https://ev-socket-server.onrender.com
   ```

## Bước 4: Cấu Hình Frontend

### 4.1 Cập nhật Environment Variables trên Vercel

Vào Vercel Dashboard → Environment Variables, thêm:

```
VITE_SOCKET_URL=https://ev-socket-server.onrender.com
```

**Environment**: Chọn **Production**, **Preview**, **Development** (cả 3)

### 4.2 Redeploy Frontend

Sau khi thêm env var, redeploy frontend trên Vercel.

## Bước 5: Test

### 5.1 Kiểm tra Socket.io Server
Truy cập: `https://ev-socket-server.onrender.com/health`

Kết quả mong đợi:
```json
{
  "success": true,
  "message": "Socket.io server is running",
  "timestamp": "2025-11-11T...",
  "connections": 0
}
```

### 5.2 Kiểm tra Connection từ Frontend
1. Đăng nhập vào app
2. Mở DevTools Console
3. Tìm log: `"Socket connected: ..."` ✅

## ⚠️ Lưu Ý Quan Trọng

### Free Tier Limitations
- **Spin down**: Server sẽ tắt sau 15 phút không hoạt động
- **Spin up time**: Mất ~30 giây để khởi động lại
- **Auto-sleep**: Không có requests nào thì server ngủ

### Giải pháp
1. **Ping định kỳ**: Frontend gửi ping mỗi 10 phút
2. **Upgrade**: $7/tháng cho instance không ngủ
3. **Alternative**: Dùng Railway/Fly.io nếu cần

## 🔧 Troubleshooting

### Lỗi: "Cannot connect to Socket.io"
- Kiểm tra `VITE_SOCKET_URL` đã set đúng chưa
- Verify JWT_SECRET giống nhau
- Check CORS origin trong `socket-server/index.js`

### Lỗi: "Authentication failed"
- JWT_SECRET phải giống backend chính
- Token phải còn hạn

### Lỗi: "Server không khởi động"
- Check logs trong Render Dashboard
- Verify `package.json` có đúng dependencies

## 📊 Monitoring

### View Logs
Render Dashboard → Your Service → Logs

### Metrics
Render Dashboard → Your Service → Metrics
- CPU usage
- Memory usage
- Request count
- Response time

## 🎯 Production Tips

1. **Environment Variables**: Luôn dùng env vars, không hardcode
2. **Error Handling**: Monitor logs thường xuyên
3. **CORS**: Chỉ allow domains cần thiết
4. **Rate Limiting**: Consider thêm rate limiting cho production
5. **Scaling**: Nếu traffic cao, upgrade instance type

---

**Chúc bạn deploy thành công! 🎉**

Nếu gặp vấn đề, check logs hoặc liên hệ support.