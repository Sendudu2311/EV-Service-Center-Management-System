# EV Service Center Management System - Mobile App (React Native)

## Overview

This is the React Native mobile application for the EV Service Center Management System. It provides customers and staff with a mobile interface to manage electric vehicle services, appointments, and maintenance.

## Technology Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation (Stack & Bottom Tabs)
- **State Management**: React Context API
- **Storage**: AsyncStorage
- **HTTP Client**: Axios
- **AI Integration**: Gemini AI Chatbot
- **UI Components**: React Native built-in components + @react-native-picker/picker

## Project Structure

```
app/
├── App.tsx                          # Root application component
├── src/
│   ├── components/                  # Reusable components
│   │   ├── Chat/
│   │   │   └── Chatbot.tsx         # AI chatbot component
│   │   └── Vehicle/
│   │       └── VehicleForm.tsx     # Vehicle registration/edit form
│   ├── contexts/
│   │   └── AuthContext.tsx         # Authentication state management
│   ├── navigation/
│   │   └── RootNavigator.tsx       # Navigation configuration
│   ├── screens/                    # Application screens
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx    # User login
│   │   │   └── RegisterScreen.tsx # User registration
│   │   ├── HomeScreen.tsx         # Landing page with services info
│   │   ├── DashboardScreen.tsx    # User dashboard
│   │   ├── VehiclesScreen.tsx     # Vehicle management
│   │   ├── AppointmentsScreen.tsx # Appointments list
│   │   ├── AppointmentBookingScreen.tsx # New appointment booking
│   │   ├── InvoicesScreen.tsx     # Invoices and payments
│   │   └── ProfileScreen.tsx      # User profile
│   ├── services/
│   │   └── api.ts                 # API client and endpoints
│   └── types/                     # TypeScript type definitions
├── package.json
└── tsconfig.json
```

## Key Features Implemented

### 1. Authentication

- ✅ User login with email/password
- ✅ Google Sign-In OAuth authentication
- ✅ New user registration (email or Google)
- ✅ Auto-login on app start (token persistence)
- ✅ Secure token storage with AsyncStorage
- ✅ Role-based navigation (customer/staff/admin)
- ✅ Account linking (Google with existing email accounts)

### 2. Vehicle Management

- ✅ View all registered vehicles
- ✅ Add new vehicle with detailed specifications
  - VIN, make, model, year, color
  - Battery type, capacity, charging power
  - Range, mileage, maintenance intervals
- ✅ Edit vehicle information
- ✅ Delete vehicle
- ✅ Maintenance status indicators
- ✅ Pull-to-refresh

### 3. Appointment Booking

- ✅ View all appointments with status
- ✅ Create new appointment
  - Select vehicle
  - Choose multiple services
  - Pick date and time slot (4 fixed slots/day)
  - Add customer notes
  - View total cost calculation
- ✅ Cancel pending/confirmed appointments
- ✅ Status badges (pending, confirmed, in-progress, completed, cancelled)
- ✅ Service history per appointment

### 4. Invoices & Payments

- ✅ View all invoices
- ✅ Invoice details with itemized breakdown
- ✅ Payment status tracking
- ✅ Payment method selection (cash/VNPay)
- ✅ Invoice filtering by status

### 5. AI Chatbot

- ✅ Floating chat button on home screen
- ✅ Full-screen chat modal
- ✅ Integration with Gemini AI
- ✅ Vietnamese language support
- ✅ Chat history context
- ✅ Auto-scroll to new messages
- ✅ Loading indicators

### 6. User Profile

- ✅ View user information
- ✅ Account details (role, email, phone)
- ✅ Logout functionality
- ✅ Settings menu (placeholders for future features)

### 7. Dashboard

- ✅ Personalized greeting
- ✅ User info cards
- ✅ Quick access to key features

## API Integration

All API endpoints maintain the same logic as the original web application:

### Authentication API

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user profile

### Vehicles API

- `GET /api/vehicles` - List all user vehicles
- `POST /api/vehicles` - Create new vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Remove vehicle

### Appointments API

- `GET /api/appointments` - List all appointments
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment

### Services API

- `GET /api/services` - List all available services
- `GET /api/services/:id` - Get service details

### Invoices API

- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get invoice details
- `POST /api/invoices/:id/pay` - Pay invoice

### Chatbot API

- `POST /api/chatbot/message` - Send message to AI
- `GET /api/chatbot/status` - Check chatbot availability

## Installation

1. Navigate to the app directory:

```bash
cd app
```

2. Install dependencies:

```bash
npm install
```

3. Update API URL in `src/services/api.ts`:

```typescript
const API_URL = "http://your-server-url:3000";
```

4. Start the development server:

```bash
npm start
```

5. Run on your device:

- Scan QR code with Expo Go app (iOS/Android)
- Or press `a` for Android emulator
- Or press `i` for iOS simulator

## Configuration

### API Configuration

Edit `src/services/api.ts` to update:

- Base API URL
- Timeout settings
- Request/response interceptors
- Error handling

### Google OAuth Configuration

The app supports Google Sign-In authentication. To configure for production:

1. **Get Google OAuth Credentials**:

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create or select your project
   - Enable Google+ API
   - Go to "Credentials" and create OAuth 2.0 Client IDs for:
     - **iOS**: Use your iOS bundle identifier
     - **Android**: Use your Android package name + SHA-1 certificate
     - **Web**: For Expo Go development

2. **Update Client IDs**:
   Edit `src/components/Auth/GoogleLoginButton.tsx`:

   ```typescript
   const [request, response, promptAsync] = useIdTokenAuthRequest({
     iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
     androidClientId: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
     webClientId:
       "996746380802-c7hh05j9jqtr2jpbidajq4g8hel30p0f.apps.googleusercontent.com",
   });
   ```

3. **Configure App Scheme** (for production):
   Add to `app.json`:

   ```json
   {
     "expo": {
       "scheme": "evservicecenter",
       "ios": {
         "bundleIdentifier": "com.yourcompany.evservicecenter"
       },
       "android": {
         "package": "com.yourcompany.evservicecenter"
       }
     }
   }
   ```

4. **Backend Configuration**:
   The backend already supports Google OAuth at `/api/auth/google-auth`. Ensure the Google client ID in `server/controllers/authController.js` matches your web client ID.

**Note**: For Expo Go development, you can use the existing web client ID. For production builds (EAS Build or standalone), you must configure platform-specific client IDs.

### Navigation Configuration

Edit `src/navigation/RootNavigator.tsx` to:

- Add/remove tabs
- Configure role-based navigation
- Customize tab bar appearance

## UI/UX Design

### Color Scheme (Light Theme)

- **Primary Blue**: #3b82f6 - Headers, buttons, accents
- **Success Green**: #10b981 - Success states, confirmations
- **Warning Orange**: #f59e0b - Chatbot, warnings
- **Error Red**: #ef4444 - Errors, delete actions
- **Background**: #f9fafb - App background
- **Cards**: #ffffff - Card components
- **Text Primary**: #111827
- **Text Secondary**: #6b7280

### Typography

- **Headers**: 24px, bold
- **Subheaders**: 18px, semi-bold
- **Body**: 14-16px, regular
- **Small**: 12px, regular

### Components

- **Cards**: White background, rounded corners (12px), subtle shadow
- **Buttons**: Rounded (8px), 16px padding, bold text
- **Inputs**: Border (1px), rounded (8px), 12px padding
- **Badges**: Small rounded pills for status indicators

## Development Notes

### Differences from Web Version

1. **Storage**: Uses AsyncStorage instead of localStorage
2. **Notifications**: Uses Alert.alert instead of react-hot-toast
3. **Styling**: Uses StyleSheet API instead of Tailwind CSS
4. **Navigation**: React Navigation instead of React Router
5. **Forms**: Native components instead of HTML forms
6. **Image Uploads**: Not yet implemented (requires additional libraries)

### Pending Features

- [ ] Image upload for vehicles
- [ ] Real-time notifications (Socket.io integration)
- [ ] VNPay payment integration (web view)
- [ ] Biometric authentication
- [ ] Push notifications
- [ ] Offline mode
- [ ] Service history details
- [ ] Technician selection
- [ ] Work queue for staff
- [ ] Parts management
- [ ] Admin panel

## Testing

Run the app on different devices to test:

- Screen sizes (phones, tablets)
- iOS vs Android differences
- Performance with large datasets
- Network error handling
- Offline behavior

## Deployment

### Building for Production

#### Android (APK/AAB)

```bash
eas build --platform android
```

#### iOS (IPA)

```bash
eas build --platform ios
```

### Publishing Updates

```bash
expo publish
```

## Troubleshooting

### Common Issues

**1. Metro bundler not starting**

```bash
npm start -- --reset-cache
```

**2. Module not found errors**

```bash
npm install
cd ios && pod install (for iOS only)
```

**3. API connection failures**

- Verify API_URL is correct
- Check network connectivity
- Ensure backend server is running
- Check CORS configuration

**4. Authentication not persisting**

- Clear AsyncStorage: `AsyncStorage.clear()`
- Check token expiration
- Verify interceptor configuration

## Contributing

Follow these guidelines:

1. Match existing code style
2. Use TypeScript for type safety
3. Follow React Native best practices
4. Test on both iOS and Android
5. Update this README for new features

## License

Same as main project

## Support

Contact the development team for assistance.
