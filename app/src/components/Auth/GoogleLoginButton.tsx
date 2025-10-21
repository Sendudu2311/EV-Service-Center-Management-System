import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { authAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

WebBrowser.maybeCompleteAuthSession();

interface GoogleLoginButtonProps {
  onSuccess?: (user: any, token: string) => void;
  disabled?: boolean;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ onSuccess, disabled = false }) => {
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  // Configure Google Sign-In
  // Replace these with your actual Google OAuth credentials
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '996746380802-c7hh05j9jqtr2jpbidajq4g8hel30p0f.apps.googleusercontent.com',
    // For iOS, you need to add the iOS client ID
    iosClientId: '996746380802-c7hh05j9jqtr2jpbidajq4g8hel30p0f.apps.googleusercontent.com',
    // For Android, you need to add the Android client ID
    androidClientId: '996746380802-c7hh05j9jqtr2jpbidajq4g8hel30p0f.apps.googleusercontent.com',
    // For web
    webClientId: '996746380802-c7hh05j9jqtr2jpbidajq4g8hel30p0f.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleSignIn(response);
    } else if (response?.type === 'error') {
      console.error('Google sign-in error:', response.error);
      Alert.alert('Lỗi', 'Đăng nhập Google thất bại. Vui lòng thử lại.');
      setLoading(false);
    } else if (response?.type === 'cancel') {
      console.log('Google sign-in cancelled by user');
      setLoading(false);
    }
  }, [response]);

  const handleGoogleSignIn = async (googleResponse: any) => {
    setLoading(true);
    try {
      const { id_token } = googleResponse.params;
      
      if (!id_token) {
        throw new Error('No ID token received from Google');
      }

      console.log('🔵 Sending Google credential to backend...');
      
      // Send the ID token to your backend
      const backendResponse = await authAPI.googleAuth(id_token);
      
      const { user, token, isNewUser, isLinked } = backendResponse.data.data || {};

      if (!user || !token) {
        throw new Error('Invalid response from server');
      }

      // Use googleLogin from AuthContext to handle authentication
      await googleLogin(user, token);
      
      // Show appropriate message
      if (isNewUser) {
        Alert.alert('Chào mừng!', 'Tài khoản Google của bạn đã được tạo thành công.');
      } else if (isLinked) {
        Alert.alert('Thành công', 'Tài khoản Google đã được liên kết với tài khoản hiện có.');
      } else {
        Alert.alert('Thành công', 'Đăng nhập Google thành công!');
      }

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(user, token);
      }
    } catch (error: any) {
      console.error('Error during Google authentication:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Đăng nhập Google thất bại';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async () => {
    if (disabled || loading) return;
    
    setLoading(true);
    try {
      await promptAsync();
    } catch (error) {
      console.error('Error prompting Google sign-in:', error);
      Alert.alert('Lỗi', 'Không thể mở cửa sổ đăng nhập Google');
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
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
    backgroundColor: '#4285f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3c4043',
  },
});

export default GoogleLoginButton;
