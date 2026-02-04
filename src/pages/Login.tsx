import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { userManagementAPI } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Icon from "@/components/AppIcon";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate input
      if (!email || !password) {
        throw new Error("Please enter both email and password");
      }

      if (!email.includes("@")) {
        throw new Error("Please enter a valid email address");
      }

      // Attempt to authenticate user
      const user = await userManagementAPI.authenticateUser(email, password);

      if (user) {
        // Store user data in localStorage for session management
        const userData = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roleId: user.roleId,
          permissions: user.permissions,
          department: user.department,
          status: user.status,
          lastLogin: new Date().toISOString(),
        };

        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("isAuthenticated", "true");

        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
        }

        // Update last login time
        await userManagementAPI.updateLastLogin(user.id);

        // Redirect based on role
        const from =
          location.state?.from?.pathname || getDefaultRoute(user.role);
        navigate(from, { replace: true });
      } else {
        throw new Error("Invalid email or password");
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultRoute = (role: string) => {
    switch (role) {
      case "super_admin":
      case "admin":
        return "/admin";
      case "manager":
        return "/manager";
      case "user":
        return "/profile";
      default:
        return "/";
    }
  };

  const handleDemoLogin = async (role: string) => {
    setLoading(true);
    setError("");

    try {
      // Demo credentials based on role
      const demoCredentials = {
        super_admin: { email: "admin@tawaaq.com", password: "admin123" },
        admin: { email: "manager@tawaaq.com", password: "manager123" },
        manager: { email: "supervisor@tawaaq.com", password: "supervisor123" },
        user: { email: "driver@tawaaq.com", password: "driver123" },
      };

      const credentials = demoCredentials[role as keyof typeof demoCredentials];
      if (!credentials) {
        throw new Error("Invalid demo role");
      }

      setEmail(credentials.email);
      setPassword(credentials.password);

      // Simulate login
      const user = await userManagementAPI.authenticateUser(
        credentials.email,
        credentials.password
      );

      if (user) {
        const userData = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roleId: user.roleId,
          permissions: user.permissions,
          department: user.department,
          status: user.status,
          lastLogin: new Date().toISOString(),
        };

        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("isAuthenticated", "true");

        const from =
          location.state?.from?.pathname || getDefaultRoute(user.role);
        navigate(from, { replace: true });
      } else {
        throw new Error("Demo login failed");
      }
    } catch (err: any) {
      setError(err.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <Icon name="Shield" size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-gray-600">
            Sign in to your Tawaaq Fleet Management account
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
                iconName="Mail"
              />
            </div>

            {/* Password Field */}
            <div>
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
                iconName="Lock"
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Icon name={showPassword ? "EyeOff" : "Eye"} size={20} />
                  </button>
                }
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-primary hover:text-primary/80"
              >
                Forgot password?
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center">
                  <Icon
                    name="AlertCircle"
                    size={20}
                    className="text-red-500 mr-2"
                  />
                  <span className="text-sm text-red-600">{error}</span>
                </div>
              </div>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Demo Login Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center mb-4">
              Quick demo access:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin("super_admin")}
                disabled={loading}
              >
                Super Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin("admin")}
                disabled={loading}
              >
                Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin("manager")}
                disabled={loading}
              >
                Manager
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin("user")}
                disabled={loading}
              >
                User
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>© 2024 Tawaaq Fleet Management. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
