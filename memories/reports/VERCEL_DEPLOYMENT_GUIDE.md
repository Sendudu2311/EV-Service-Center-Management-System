# Hướng Dẫn Deploy Lên Vercel 🚀

## 📋 Tổng Quan

Project này là một mono repo với:
- **Frontend**: React + TypeScript + Vite (thư mục gốc)
- **Backend**: Node.js + Express (thư mục `server/`)

## 🔧 Chuẩn Bị

### 1. Tài Khoản Vercel
- Đăng ký tài khoản tại [vercel.com](https://vercel.com)
- Kết nối với GitHub account của bạn

### 2. Chuẩn Bị MongoDB
- Sử dụng MongoDB Atlas cho production
- Lấy connection string từ MongoDB Atlas

### 3. Environment Variables Cần Thiết

#### Backend Environment Variables (server/.env):
```env
# MongoDB
MONGODB_URI=your_mongodb_atlas_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key

# Node Environment
NODE_ENV=production

# Email (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Cloudinary (nếu dùng)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe (nếu dùng)
STRIPE_SECRET_KEY=your_stripe_secret

# VNPay (nếu dùng)
VNPAY_TMN_CODE=your_vnpay_code
VNPAY_HASH_SECRET=your_vnpay_secret
VNPAY_URL=vnpay_url

# Google AI (nếu dùng chatbot)
GEMINI_API_KEY=your_gemini_api_key

# CORS
CLIENT_URL=your_vercel_frontend_url
```

## 🚀 Các Bước Deploy

### Bước 1: Push Code Lên GitHub

```bash
# Khởi tạo git repository (nếu chưa có)
git init

# Add tất cả files
git add .

# Commit
git commit -m "Prepare for Vercel deployment"

# Thêm remote repository
git remote add origin https://github.com/your-username/your-repo.git

# Push lên GitHub
git push -u origin main
```

### Bước 2: Import Project Vào Vercel

1. Truy cập [vercel.com/new](https://vercel.com/new)
2. Chọn "Import Git Repository"
3. Chọn repository của bạn từ GitHub
4. Click "Import"

### Bước 3: Cấu Hình Project Settings

#### Framework Preset:
- Chọn: **Vite**

#### Root Directory:
- Để trống (sử dụng root của repository)

#### Build Settings:
- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### Environment Variables:
Thêm tất cả các biến môi trường từ danh sách trên:

1. Click vào tab "Environment Variables"
2. Thêm từng biến một:
   - Key: `MONGODB_URI`
   - Value: `your_mongodb_connection_string`
   - Environment: **Production**, **Preview**, **Development** (chọn tất cả)
3. Lặp lại cho tất cả các biến

**LƯU Ý QUAN TRỌNG**:
- `CLIENT_URL` phải là URL của frontend Vercel (ví dụ: `https://your-app.vercel.app`)
- Bạn sẽ cần cập nhật lại sau khi deploy lần đầu

### Bước 4: Deploy

1. Click "Deploy"
2. Đợi build hoàn thành (khoảng 2-5 phút)
3. Khi deploy thành công, bạn sẽ nhận được URL

### Bước 5: Cập Nhật CLIENT_URL

1. Copy URL frontend vừa deploy (ví dụ: `https://your-app.vercel.app`)
2. Quay lại Vercel Dashboard
3. Vào Settings → Environment Variables
4. Cập nhật `CLIENT_URL` với URL frontend
5. Redeploy project:
   - Vào tab "Deployments"
   - Click vào deployment mới nhất
   - Click "..." → "Redeploy"

## 🔍 Kiểm Tra Deployment

### Frontend:
- Truy cập: `https://your-app.vercel.app`
- Kiểm tra login, register
- Kiểm tra các trang chính

### Backend API:
- Test endpoint: `https://your-app.vercel.app/api/auth/me`
- Kiểm tra kết nối database

### WebSocket (Socket.io):
**LƯU Ý**: Vercel có giới hạn với WebSocket. Nếu Socket.io không hoạt động:
- Cân nhắc deploy backend riêng trên Railway, Render, hoặc DigitalOcean
- Hoặc sử dụng Vercel Edge Functions cho real-time features

## ⚠️ Lưu Ý Quan Trọng

### 1. Serverless Functions Limitations
Vercel sử dụng Serverless Functions cho backend:
- **Timeout**: 10 giây (Hobby plan), 60 giây (Pro plan)
- **Cold start**: API có thể chậm khi lần đầu gọi
- **WebSocket**: Không hoàn toàn hỗ trợ WebSocket trên Serverless

### 2. File Uploads
- Vercel Serverless có giới hạn 4.5MB cho request body
- Nên sử dụng Cloudinary hoặc AWS S3 cho upload files

### 3. Database Connection
- MongoDB Atlas recommended
- Sử dụng connection pooling để tránh quá nhiều connections

### 4. Environment-specific Issues
Nếu gặp lỗi:
```bash
# Check logs trong Vercel Dashboard
# Functions → View Function Logs
```

## 🔄 Deploy Updates

Sau khi setup xong, mỗi khi push code lên GitHub:
```bash
git add .
git commit -m "Your update message"
git push
```

Vercel sẽ tự động build và deploy!

## 🎯 Giải Pháp Thay Thế

### Nếu Socket.io Không Hoạt Động:

#### Option 1: Deploy Backend Riêng
**Railway.app** (Recommended cho Socket.io):
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project (trong thư mục server/)
cd server
railway init

# 4. Add environment variables
railway variables set MONGODB_URI=your_uri

# 5. Deploy
railway up
```

Sau đó cập nhật `VITE_API_URL` trong Vercel environment variables.

#### Option 2: Render.com
- Free tier hỗ trợ WebSocket
- Deploy backend lên Render
- Frontend vẫn trên Vercel

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra Vercel Function Logs
2. Kiểm tra MongoDB Atlas network access
3. Verify tất cả environment variables đã được set đúng
4. Test API endpoints riêng lẻ

## ✅ Checklist

- [ ] Code đã push lên GitHub
- [ ] MongoDB Atlas database đã setup
- [ ] Tất cả environment variables đã được set trong Vercel
- [ ] Project đã import vào Vercel
- [ ] Build settings đã cấu hình đúng
- [ ] Deploy thành công
- [ ] CLIENT_URL đã được cập nhật
- [ ] Frontend hoạt động bình thường
- [ ] Backend API hoạt động
- [ ] Database connection OK
- [ ] Authentication flow hoạt động
- [ ] File upload hoạt động (nếu có)
- [ ] Socket.io hoạt động (hoặc đã có giải pháp thay thế)

---

**Chúc bạn deploy thành công! 🎉**