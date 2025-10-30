import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";
import { authAPI } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

WebBrowser.maybeCompleteAuthSession();
const APP_SCHEME_CALLBACK = "evservicecenter://oauth-callback";
interface GoogleLoginButtonProps {
  onSuccess?: (user: any, token: string) => void;
  disabled?: boolean;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  disabled = false,
}) => {
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Deep link handler
    const sub = Linking.addEventListener("url", async ({ url }) => {
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get("code");
        if (!code) return;
        const backendResponse = await authAPI.exchangeMobileAuthCode(code);
        const { user, token } = backendResponse.data.data || {};
        if (!user || !token) throw new Error("Invalid response from server");
        await googleLogin(user, token);
        Alert.alert("Thành công", "Đăng nhập Google thành công!");
        if (onSuccess) onSuccess(user, token);
      } catch (error: any) {
        console.error("Exchange code error:", error);
        Alert.alert("Lỗi", error.message || "Không thể hoàn tất đăng nhập");
      } finally {
        setLoading(false);
      }
    });
    return () => sub.remove();
  }, []);

  const handlePress = async () => {
    if (disabled || loading) return;

    setLoading(true);
    try {
      // Use proxy in Expo Go to comply with Google OAuth policy
      // Start mobile web-flow
      const sessionRes = await authAPI.startMobileSession(APP_SCHEME_CALLBACK);
      const { sessionId } = sessionRes.data.data as any;
      const authUrl = `${"http://192.168.1.10:3000"}/api/auth/google/mobile?sessionId=${sessionId}&redirectUri=${encodeURIComponent(
        APP_SCHEME_CALLBACK
      )}`;
      await WebBrowser.openBrowserAsync(authUrl);
      // Fallback polling if deep link missed
      const startedAt = Date.now();
      const poll = async () => {
        if (Date.now() - startedAt > 60000) return; // stop after 60s
        try {
          const statusRes = await authAPI.getMobileAuthStatus(sessionId);
          if (statusRes.data.data?.status === "success") {
            // If browser couldn't deep link, user can switch back; exchange will be triggered by deep link normally
            return;
          }
        } finally {
          setTimeout(poll, 1000);
        }
      };
      setTimeout(poll, 1000);
    } catch (error) {
      console.error("Error prompting Google sign-in:", error);
      Alert.alert("Lỗi", "Không thể mở cửa sổ đăng nhập Google");
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, (disabled || loading) && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          <View style={styles.iconContainer}>
            <Text style={styles.googleIcon}>G</Text>
          </View>
          <Text style={styles.buttonText}>Đăng nhập với Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dadce0",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285f4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3c4043",
  },
});

export default GoogleLoginButton;
