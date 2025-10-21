# Quick Start Guide - EV Service Center Mobile App

## Prerequisites
- Node.js 18+ installed
- Expo CLI installed globally: `npm install -g expo-cli`
- Expo Go app installed on your mobile device (iOS/Android)
- Backend server running on your network

## Setup in 5 Minutes

### 1. Install Dependencies
```bash
cd app
npm install
```

### 2. Configure API URL
Open `app/src/services/api.ts` and update the API URL:

```typescript
// For local testing on same network:
const API_URL = 'http://192.168.1.XXX:3000'; // Replace with your computer's IP

// For emulator:
// Android: 'http://10.0.2.2:3000'
// iOS: 'http://localhost:3000'
```

### 3. Start Development Server
```bash
npm start
```

### 4. Run on Device
- Scan the QR code with Expo Go app
- Or press `a` for Android emulator
- Or press `i` for iOS simulator

## Test Accounts

### Customer Account
```
Email: customer@test.com
Password: password123
```

### Staff Account
```
Email: staff@test.com  
Password: password123
```

### Admin Account
```
Email: admin@test.com
Password: password123
```

## Quick Feature Tour

### 1. Login (5 seconds)
- Open app → Login screen appears
- Enter test credentials
- Tap "Đăng nhập"

### 2. Add a Vehicle (30 seconds)
- Navigate to "Xe của tôi" tab
- Tap "+ Thêm xe mới"
- Fill required fields:
  - VIN: VF1234567890ABC
  - Make: VinFast
  - Model: VF 8
  - Year: 2024
- Tap "Đăng ký"

### 3. Book an Appointment (45 seconds)
- Navigate to "Lịch hẹn" tab
- Tap "+ Đặt lịch mới"
- Select your vehicle
- Choose services (tap to select multiple)
- Pick date (format: 2024-10-25)
- Choose time slot
- Add optional notes
- Tap "Đặt lịch"

### 4. View Invoices (10 seconds)
- Navigate to "Hóa đơn" tab
- View all invoices
- Tap "Thanh toán ngay" for pending invoices

### 5. Chat with AI (20 seconds)
- From home screen, tap floating 💬 button
- Ask questions like:
  - "Dịch vụ nào phổ biến nhất?"
  - "Khi nào tôi nên bảo dưỡng xe?"
  - "Chi phí bảo dưỡng là bao nhiêu?"
- Get instant AI-powered responses

### 6. View Profile (5 seconds)
- Navigate to "Tài khoản" tab
- View account information
- Tap "Đăng xuất" to logout

## Common Commands

### Start Development
```bash
npm start
```

### Clear Cache
```bash
npm start -- --clear
```

### Run on Android
```bash
npm run android
```

### Run on iOS
```bash
npm run ios
```

### Type Check
```bash
npx tsc --noEmit
```

## Troubleshooting Quick Fixes

### Can't connect to API
1. Check server is running: `http://YOUR_IP:3000/api/health`
2. Verify IP address in `api.ts`
3. Ensure device is on same Wi-Fi network
4. Check firewall settings

### App won't start
```bash
# Clear Metro bundler cache
npm start -- --reset-cache

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Login not working
1. Check console for errors
2. Verify API URL is correct
3. Ensure backend is running
4. Check network tab in Expo Dev Tools

### Blank screen after login
1. Check navigation configuration
2. Verify all screens are imported
3. Check for TypeScript errors
4. Restart Metro bundler

## Development Tips

### Hot Reload
- Shake device or press `r` in terminal to reload
- Changes apply automatically in most cases

### Debug Menu
- Shake device to open developer menu
- Enable remote debugging
- Use React Native Debugger

### Logging
```typescript
// Add console.log for debugging
console.log('Debug:', data);

// Check Expo Dev Tools for logs
```

## File Structure Quick Reference

```
app/src/
├── screens/          # Main screens
│   ├── auth/        # Login, Register
│   ├── HomeScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── VehiclesScreen.tsx
│   ├── AppointmentsScreen.tsx
│   ├── InvoicesScreen.tsx
│   └── ProfileScreen.tsx
├── components/       # Reusable components
│   ├── Chat/
│   └── Vehicle/
├── services/
│   └── api.ts       # API configuration
├── contexts/
│   └── AuthContext.tsx
└── navigation/
    └── RootNavigator.tsx
```

## Next Steps

1. ✅ Test all features
2. ✅ Report any bugs
3. ✅ Suggest improvements
4. ✅ Try on different devices
5. ✅ Check on both iOS and Android

## Getting Help

- Check `README.md` for detailed documentation
- Review `CONVERSION_SUMMARY.md` for technical details
- Consult React Native docs: https://reactnative.dev/
- Expo documentation: https://docs.expo.dev/

## Quick Stats

- **Screens**: 10+ screens implemented
- **Features**: 8 major features working
- **API Endpoints**: 15+ integrated
- **Components**: 15+ reusable components
- **Languages**: Vietnamese (primary), English (fallback)

---

**Ready to go!** 🚀

Start the server and begin testing. The app is fully functional for core features. Have fun exploring!
