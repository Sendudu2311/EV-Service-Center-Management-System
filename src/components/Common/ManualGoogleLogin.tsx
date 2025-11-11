import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

interface ManualGoogleLoginProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

const ManualGoogleLogin: React.FC<ManualGoogleLoginProps> = ({
  onSuccess,
  onError,
  disabled = false,
}) => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);

    // Create popup window for Google OAuth
    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      new URLSearchParams({
        client_id:
          "996746380802-c7hh05j9jqtr2jpbidajq4g8hel30p0f.apps.googleusercontent.com",
        redirect_uri: "http://localhost:5173/auth/google/callback",
        response_type: "code",
        scope: "email profile openid",
        access_type: "offline",
        prompt: "consent",
      });

    const popup = window.open(
      googleAuthUrl,
      "google-auth",
      "width=500,height=600,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no"
    );

    // Listen for the popup to close or send message
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setIsLoading(false);
      }
    }, 1000);

    // Listen for message from popup
    window.addEventListener("message", async (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "GOOGLE_AUTH_SUCCESS") {
        clearInterval(checkClosed);
        popup?.close();

        try {
          // Process the auth code
          const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

          const response = await fetch(
            `${apiUrl}/api/auth/google-auth`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                code: event.data.code,
              }),
            }
          );

          const data = await response.json();

          if (data.success) {
            await login(data.data.user, data.data.token);
            toast.success("Logged in with Google successfully!");
            onSuccess?.();
          } else {
            throw new Error(data.message || "Google authentication failed");
          }
        } catch (error: any) {
          console.error("Google OAuth Error:", error);
          const errorMsg = error.message || "Google authentication failed";
          onError?.(errorMsg);
          toast.error(errorMsg);
        } finally {
          setIsLoading(false);
        }
      }

      if (event.data.type === "GOOGLE_AUTH_ERROR") {
        clearInterval(checkClosed);
        popup?.close();
        setIsLoading(false);
        const errorMsg = event.data.error || "Google authentication failed";
        onError?.(errorMsg);
        toast.error(errorMsg);
      }
    });
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={disabled || isLoading}
      className="w-full flex justify-center items-center py-3 px-4 border border-dark-200 bg-dark-300 text-white rounded-lg shadow-sm bg-dark-300 text-text-secondary hover:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
    >
      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {isLoading ? "Signing in..." : "Continue with Google"}
    </button>
  );
};

export default ManualGoogleLogin;
