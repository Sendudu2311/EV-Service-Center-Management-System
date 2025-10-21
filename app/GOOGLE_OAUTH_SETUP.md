# Google OAuth Setup Guide

This guide explains how to configure Google Sign-In authentication for the EV Service Center mobile app.

## Overview

The app uses Google OAuth 2.0 for authentication via:
- **Frontend**: `expo-auth-session` - Expo's official OAuth library
- **Backend**: `google-auth-library` - Verifies ID tokens from Google

## Current Setup (Development)

### Web Client ID (Already Configured)
```
996746380802-c7hh05j9jqtr2jpbidajq4g8hel30p0f.apps.googleusercontent.com
```

This client ID is currently used for all platforms during development with Expo Go. It works for testing, but **must be updated for production**.

## Production Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API** (or Google People API)

### Step 2: Create OAuth Credentials

#### For iOS:

1. In Google Cloud Console, go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client ID**
3. Select **iOS** as application type
4. Enter your **Bundle Identifier** (e.g., `com.yourcompany.evservicecenter`)
   - This must match the `ios.bundleIdentifier` in your `app.json`
5. Click **Create**
6. Copy the **Client ID**

#### For Android:

1. Get your SHA-1 certificate fingerprint:
   ```bash
   # For debug builds
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   
   # For production builds (replace with your keystore path)
   keytool -list -v -keystore /path/to/your/keystore.jks
   ```

2. In Google Cloud Console, go to **APIs & Services > Credentials**
3. Click **Create Credentials > OAuth 2.0 Client ID**
4. Select **Android** as application type
5. Enter:
   - **Package name**: Your Android package (e.g., `com.yourcompany.evservicecenter`)
     - Must match `android.package` in `app.json`
   - **SHA-1 certificate fingerprint**: Paste from step 1
6. Click **Create**
7. Copy the **Client ID**

#### For Web (Expo Go Development):

1. In Google Cloud Console, go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client ID**
3. Select **Web application** as application type
4. Add **Authorized JavaScript origins**:
   - `https://auth.expo.io`
5. Add **Authorized redirect URIs**:
   - `https://auth.expo.io/@your-expo-username/your-app-slug`
6. Click **Create**
7. Copy the **Client ID**

### Step 3: Update App Configuration

#### Update `app.json`:

```json
{
  "expo": {
    "name": "EV Service Center",
    "slug": "ev-service-center",
    "scheme": "evservicecenter",
    "ios": {
      "bundleIdentifier": "com.yourcompany.evservicecenter",
      "buildNumber": "1.0.0"
    },
    "android": {
      "package": "com.yourcompany.evservicecenter",
      "versionCode": 1
    }
  }
}
```

#### Update `GoogleLoginButton.tsx`:

Replace the client IDs in `src/components/Auth/GoogleLoginButton.tsx`:

```typescript
const [request, response, promptAsync] = useIdTokenAuthRequest({
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // For Expo Go
});
```

### Step 4: Update Backend

Ensure `server/controllers/authController.js` has the correct web client ID for token verification:

```javascript
const client = new OAuth2Client(
  'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com'
);
```

**Important**: The backend must use the **web client ID** to verify tokens from all platforms.

### Step 5: Test Authentication Flow

1. **Login Screen**:
   - User taps "Google Sign-In" button
   - Opens browser for Google OAuth
   - User selects Google account
   - Browser redirects back to app

2. **Backend Verification**:
   - App sends ID token to `/api/auth/google-auth`
   - Backend verifies token with `google-auth-library`
   - Creates new user or links existing account
   - Returns JWT token

3. **Auto Login**:
   - JWT token stored in AsyncStorage
   - User stays logged in across app restarts

## Authentication Flow Diagram

```
┌─────────────┐
│ Login Screen│
└──────┬──────┘
       │ User taps Google button
       ▼
┌──────────────────┐
│ expo-auth-session│
│  Opens Browser   │
└──────┬───────────┘
       │ User authenticates with Google
       ▼
┌───────────────┐
│ Google OAuth  │
│   Returns     │
│  ID Token     │
└──────┬────────┘
       │ App receives ID token
       ▼
┌────────────────┐
│ Send to Backend│
│ /api/auth/     │
│ google-auth    │
└──────┬─────────┘
       │ Backend verifies token
       ▼
┌────────────────┐
│ google-auth-   │
│    library     │
│  Verification  │
└──────┬─────────┘
       │ Token valid
       ▼
┌────────────────┐
│ Create/Find    │
│   User in DB   │
└──────┬─────────┘
       │ Generate JWT
       ▼
┌────────────────┐
│ Return JWT to  │
│   Mobile App   │
└──────┬─────────┘
       │ Store in AsyncStorage
       ▼
┌────────────────┐
│ Navigate to    │
│    Dashboard   │
└────────────────┘
```

## Account Linking

The backend automatically handles account linking:

1. **New Google User**: Creates new account with `role: 'customer'`
2. **Existing Email**: Links Google ID to existing local account
3. **Already Linked**: Returns existing user data

Users are notified via alerts:
- "Chào mừng! Tài khoản Google của bạn đã được tạo thành công."
- "Tài khoản Google đã được liên kết với tài khoản hiện tại."
- "Đăng nhập thành công!"

## Troubleshooting

### Error: "Invalid client ID"
- Verify client IDs match those in Google Cloud Console
- Ensure you're using the correct client ID for each platform
- Check that bundle identifier/package name matches

### Error: "Redirect URI mismatch"
- For Expo Go, ensure redirect URI includes your Expo username and slug
- For production builds, verify scheme is configured correctly

### Browser doesn't open
- Check that `expo-web-browser` is installed
- Ensure `WebBrowser.maybeCompleteAuthSession()` is called at component mount

### Token verification fails on backend
- Confirm backend uses the **web client ID**
- Check Google+ API is enabled
- Verify token hasn't expired (tokens expire after 1 hour)

### User data not returned
- Check that Google account has email permission
- Verify backend is extracting email from token payload
- Ensure `google-auth-library` version is up to date

## Environment Variables (Optional)

For better security in production, store client IDs as environment variables:

```bash
# .env
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
```

Then use in code:
```typescript
const [request, response, promptAsync] = useIdTokenAuthRequest({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});
```

## Security Best Practices

1. **Never commit client secrets** to version control
2. **Use different credentials** for development and production
3. **Restrict API access** in Google Cloud Console to your app's package/bundle ID
4. **Rotate credentials** if compromised
5. **Monitor usage** in Google Cloud Console
6. **Enable 2FA** for your Google Cloud account

## Additional Resources

- [Expo Auth Session Docs](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google OAuth 2.0 Docs](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for Mobile](https://developers.google.com/identity/sign-in/ios/start-integrating)
- [google-auth-library NPM](https://www.npmjs.com/package/google-auth-library)

## Testing Checklist

- [ ] Google Sign-In button appears on Login screen
- [ ] Google Sign-In button appears on Register screen
- [ ] Browser opens when button is tapped
- [ ] User can select Google account
- [ ] Browser redirects back to app
- [ ] ID token is sent to backend
- [ ] Backend verifies token successfully
- [ ] JWT token is returned and stored
- [ ] User is navigated to Dashboard
- [ ] User stays logged in after app restart
- [ ] Error messages display for invalid credentials
- [ ] Loading states show during authentication
- [ ] Account linking works for existing email
- [ ] New accounts are created with correct role
