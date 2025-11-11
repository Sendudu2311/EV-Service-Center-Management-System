import React, { useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
}) => {
  const { login } = useAuth();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    console.log("🔵 GoogleLoginButton: Component mounting...");

    // Load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log("✅ Google GSI script loaded successfully");
      initializeGoogleSignIn();
    };

    script.onerror = () => {
      console.error("❌ Failed to load Google GSI script");
      onError?.("Failed to load Google Sign-In script");
    };

    document.head.appendChild(script);

    return () => {
      console.log("🔴 GoogleLoginButton: Cleaning up...");
      // Cleanup script
      const existingScript = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      );
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  const initializeGoogleSignIn = () => {
    console.log("🔵 Initializing Google Sign-In...");
    console.log("🔍 window.google available:", !!window.google);
    console.log("🔍 googleButtonRef.current:", !!googleButtonRef.current);

    if (window.google && googleButtonRef.current) {
      try {
        console.log(
          "📝 Initializing with client ID: 996746380802-c7hh05j9jqtr2jpbidajq4g8hel30p0f.apps.googleusercontent.com"
        );

        window.google.accounts.id.initialize({
          client_id:
            "996746380802-c7hh05j9jqtr2jpbidajq4g8hel30p0f.apps.googleusercontent.com",
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false,
        });

        console.log("✅ Google ID initialized successfully");

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rounded",
          type: "standard",
          width: "100%",
        });

        console.log("✅ Google button rendered successfully");
      } catch (error) {
        console.error("❌ Google Sign-In initialization error:", error);
        onError?.("Failed to initialize Google Sign-In");
      }
    } else {
      console.warn("⚠️ Google Sign-In not ready:", {
        google: !!window.google,
        buttonRef: !!googleButtonRef.current,
      });

      // Retry after 1 second
      setTimeout(() => {
        console.log("🔄 Retrying Google Sign-In initialization...");
        initializeGoogleSignIn();
      }, 1000);
    }
  };

  const handleGoogleResponse = async (response: any) => {
    console.log("🔵 Google response received:", response);

    if (!response.credential) {
      const errorMsg = "No credential received from Google";
      console.error("❌", errorMsg);
      onError?.(errorMsg);
      toast.error(errorMsg);
      return;
    }

    console.log(
      "✅ Google credential received, length:",
      response.credential.length
    );
    setIsLoading(true);

    try {
      console.log("📤 Sending credential to backend...");

      // Send credential to backend
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const res = await fetch(`${API_URL}/api/auth/google-auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: response.credential,
        }),
      });

      console.log("📥 Backend response status:", res.status);

      const data = await res.json();
      console.log("📥 Backend response data:", data);

      if (data.success) {
        console.log("✅ Google auth successful:", {
          user: data.data.user.email,
          isNewUser: data.data.isNewUser,
        });

        // Use the login function from AuthContext
        await login(data.data.user, data.data.token);

        if (data.data.isNewUser) {
          toast.success(
            "Welcome! Your Google account has been linked successfully."
          );
        } else {
          toast.success("Welcome back! Logged in with Google.");
        }

        onSuccess?.();
      } else {
        throw new Error(data.message || "Google authentication failed");
      }
    } catch (error: any) {
      console.error("❌ Google OAuth Error:", error);
      const errorMsg = error.message || "Google authentication failed";
      onError?.(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (disabled || isLoading) {
    return (
      <div className="w-full">
        <button
          disabled
          className="w-full flex justify-center items-center py-3 px-4 border border-dark-200 rounded-lg shadow-sm bg-dark-100 text-text-muted cursor-not-allowed"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {isLoading ? "Signing in..." : "Continue with Google"}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div ref={googleButtonRef} className="w-full" />
    </div>
  );
};

export default GoogleLoginButton;
