# 🔐 Railway Variables Configuration Guide

Hướng dẫn chi tiết cách thêm Environment Variables vào Railway Dashboard.

---

## 📍 Cách Vào Tab Variables

### Sau khi deploy service:

1. Railway Dashboard → Chọn service của bạn (Backend hoặc Frontend)
2. Click tab **"Variables"** ở menu trên
3. Sẽ thấy giao diện thêm variables

---

## 🚀 BACKEND VARIABLES (server/.env)

### Required Variables (BẮT BUỘC) ⚠️

Copy-paste từng dòng này vào Railway Variables tab:

#### 1. Node Environment
```
NODE_ENV=production
```

#### 2. MongoDB Database
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```
> ⚠️ **QUAN TRỌNG: Thay bằng connection string của bạn từ MongoDB Atlas!**
>
> **Cách lấy:**
> 1. MongoDB Atlas → Clusters → Connect
> 2. Choose "Connect your application"
> 3. Copy connection string
> 4. Thay `<password>` bằng password thật của bạn

#### 3. JWT Security
```
JWT_SECRET=your_super_secret_random_string_at_least_64_characters_long
JWT_EXPIRE=7d
```
> 💡 **QUAN TRỌNG:** Generate secure secret với:
> ```bash
> openssl rand -base64 64
> ```
> Copy kết quả vào `JWT_SECRET`

#### 4. CORS Configuration (Cập nhật sau khi deploy frontend)
```
FRONTEND_URL=https://your-frontend-url.railway.app
CLIENT_URL=https://your-frontend-url.railway.app
```
> ⚠️ **Bước đầu để tạm:** `https://will-update-later.railway.app`
>
> **Sau khi deploy frontend xong, quay lại update 2 variables này!**

---

### Optional Variables (Tùy chọn) 🔧

Các variables này không bắt buộc nhưng cần cho full features:

#### 5. Email Service (cho notifications)
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
```
> ⚠️ **QUAN TRỌNG: Thay bằng email của bạn!**
>
> 💡 **Gmail:** Cần tạo "App Password" không phải password thường
> - Vào Google Account → Security → 2-Step Verification → App passwords
> - Generate password cho "Mail"
> - Copy password đó vào `EMAIL_PASS`

#### 6. Google OAuth (cho login with Google)
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```
> ⚠️ **QUAN TRỌNG: Thay bằng credentials của bạn!**
>
> 💡 **Lấy ở đâu:**
> - [Google Cloud Console](https://console.cloud.google.com)
> - APIs & Services → Credentials
> - Create OAuth 2.0 Client ID
> - **Sau khi deploy:** Nhớ thêm Authorized redirect URIs:
>   - `https://your-backend.railway.app/api/auth/google/callback`
>   - `https://your-frontend.railway.app`

#### 7. Cloudinary (cho upload ảnh)
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```
> ⚠️ **QUAN TRỌNG: Thay bằng Cloudinary account của bạn!**
>
> 💡 **Lấy ở đâu:**
> - [Cloudinary Dashboard](https://cloudinary.com/console)
> - Account Details → API Keys

#### 8. VNPay Payment (cho thanh toán)
```
VNP_TMNCODE=your-vnpay-merchant-code
VNP_HASH_SECRET=your-vnpay-hash-secret
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```
> ⚠️ **Dùng sandbox VNPay credentials của bạn cho testing**
>
> Production cần merchant account thật từ VNPay
>
> 💡 **VNPay Test Cards:**
> - Card: `9704198526191432198`
> - Name: `NGUYEN VAN A`
> - Expire: `07/15`
> - OTP: `123456`

#### 9. Public Base URL (cho webhooks)
```
PUBLIC_BASE_URL=https://your-backend-url.railway.app
```
> ⚠️ **Thay bằng backend URL sau khi deploy!**

#### 10. Google Gemini AI (cho chatbot)
```
GEMINI_API_KEY=your_gemini_api_key_here
```
> 💡 **Lấy ở đâu:**
> - [Google AI Studio](https://makersuite.google.com/app/apikey)
> - Create API key

#### 11. Socket.io Configuration (Optional, có default)
```
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000
```
> 💡 **Không bắt buộc - code đã có default values**

---

## 🎨 FRONTEND VARIABLES

### Chỉ cần 1 variable:

```
VITE_API_URL=https://your-backend-url.railway.app
```

> ⚠️ **QUAN TRỌNG:** Phải là backend URL từ bước deploy backend!
>
> ✅ **Đúng:** `https://ev-service-backend-production-xxxx.up.railway.app`
>
> ❌ **Sai:**
> - `http://...` (phải dùng https)
> - Có trailing slash: `https://.../` (không có `/` cuối)
> - Localhost: `http://localhost:3000`

---

## 📝 Cách Thêm Variables Trong Railway

### Method 1: Raw Editor (Nhanh nhất) ⚡

1. Railway Dashboard → Service → Tab "Variables"
2. Click **"RAW Editor"** button (góc phải)
3. Copy-paste toàn bộ variables (từng KEY=VALUE một dòng)
4. Click **"Save"** hoặc Deploy

**Example:**
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=your_secret_here
FRONTEND_URL=https://frontend.railway.app
CLIENT_URL=https://frontend.railway.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

### Method 2: Add One by One (Từng cái một)

1. Railway Dashboard → Service → Tab "Variables"
2. Click **"New Variable"** button
3. Nhập:
   - **Variable Name:** `NODE_ENV`
   - **Value:** `production`
4. Click **"Add"**
5. Lặp lại cho mỗi variable

---

## 🔄 Update Variables Sau Deploy

### Khi nào cần update?

1. **Sau khi deploy frontend:**
   - Backend variables: Update `FRONTEND_URL` và `CLIENT_URL`

2. **Sau khi setup Google OAuth:**
   - Thêm redirect URIs vào Google Console

3. **Sau khi có Cloudinary account:**
   - Update Cloudinary credentials

### Cách update:

1. Railway → Service → Variables tab
2. Click vào variable cần sửa
3. Edit value
4. Service tự động redeploy

---

## ✅ Verification Checklist

Sau khi thêm variables, check:

- [ ] All required variables added (ít nhất 4 cái đầu)
- [ ] No typos in variable names
- [ ] MongoDB URI có chứa password encoded (%40 thay vì @)
- [ ] FRONTEND_URL và CLIENT_URL giống nhau
- [ ] VITE_API_URL (frontend) trỏ đúng backend
- [ ] Không có trailing slashes trong URLs
- [ ] JWT_SECRET đủ dài và random

---

## 🎯 Minimum Setup (Deploy Nhanh)

Nếu chỉ muốn test nhanh, chỉ cần 4 variables này:

```
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_random_secret_at_least_32_chars
FRONTEND_URL=https://will-update-after-frontend
CLIENT_URL=https://will-update-after-frontend
```

**Các features sẽ không hoạt động:**
- ❌ Email notifications
- ❌ Google OAuth login
- ❌ Image uploads
- ❌ VNPay payments
- ❌ AI Chatbot

**Nhưng vẫn có:**
- ✅ Login/Register thường
- ✅ Create appointments
- ✅ Socket.io real-time
- ✅ Basic CRUD operations

---

## 🔐 Security Best Practices

### DO ✅
- Use environment variables for all secrets
- Generate strong, random JWT_SECRET (64+ characters)
- Use MongoDB Atlas IP whitelist (0.0.0.0/0 for Railway)
- Enable MongoDB authentication
- Use HTTPS URLs (Railway provides free SSL)

### DON'T ❌
- Never commit .env files to Git
- Don't share JWT_SECRET publicly
- Don't use weak secrets like "secret123"
- Don't use HTTP URLs in production
- Don't store credentials in code

---

## 🆘 Troubleshooting

### Problem: Variables không được load

**Check:**
1. Railway Dashboard → Variables tab
2. Verify variable names chính xác (case-sensitive!)
3. Restart service: Settings → Restart

### Problem: MongoDB connection failed

**Check:**
1. Connection string có đúng format không
2. Password có special characters? → Encode với URL encoding
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`
3. MongoDB Atlas Network Access → Whitelist `0.0.0.0/0`

### Problem: CORS errors

**Check:**
1. `FRONTEND_URL` matches chính xác frontend Railway URL
2. Không có trailing slash (`/`)
3. Dùng `https://` không phải `http://`
4. Backend đã redeploy sau khi update variables

---

## 📋 Copy-Paste Template

### Backend (Minimum Config)

```env
# Essential (Required)
NODE_ENV=production
MONGODB_URI=mongodb+srv://[username]:[password]@[cluster].mongodb.net/[database]?retryWrites=true&w=majority
JWT_SECRET=[generate-random-64-chars-here]
JWT_EXPIRE=7d
FRONTEND_URL=https://[will-update-later].railway.app
CLIENT_URL=https://[will-update-later].railway.app

# Optional (Add if you have these services)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=[your-email]@gmail.com
EMAIL_PASS=[your-app-password]

GOOGLE_CLIENT_ID=[your-client-id].apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=[your-client-secret]

CLOUDINARY_CLOUD_NAME=[your-cloud-name]
CLOUDINARY_API_KEY=[your-api-key]
CLOUDINARY_API_SECRET=[your-api-secret]

VNP_TMNCODE=[your-vnpay-code]
VNP_HASH_SECRET=[your-vnpay-secret]
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

PUBLIC_BASE_URL=https://[your-backend].railway.app

GEMINI_API_KEY=[your-gemini-key]
```

### Frontend

```env
VITE_API_URL=https://[your-backend-url].railway.app
```

---

## 💡 Pro Tips

1. **Generate Secure JWT_SECRET:**
   ```bash
   openssl rand -base64 64
   ```

2. **Test MongoDB Connection Locally First:**
   ```bash
   cd server
   npm run dev
   # Should connect successfully
   ```

3. **Use Railway Logs to Debug:**
   - Service → Logs tab
   - Look for connection errors
   - Check if variables are loaded: `console.log("🌐 Allowed CORS Origins:", ...)`

4. **Deploy Order:**
   - Deploy Backend first
   - Get Backend URL
   - Deploy Frontend with `VITE_API_URL`
   - Update Backend `FRONTEND_URL`

---

**Need Help?** Check [DEPLOYMENT.md](DEPLOYMENT.md) for full guide!

**Ready to Deploy?** Follow [QUICK-DEPLOY.md](QUICK-DEPLOY.md)!

🚀 **Current Branch:** `khoatq`
