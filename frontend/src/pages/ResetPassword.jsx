import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";

/**
 * ResetPassword — Step 3 of the OTP-based password reset flow.
 *
 * Receives `resetToken` from React Router location.state (set by ForgotPassword page
 * after OTP verification). Token is NOT stored in the URL for security.
 *
 * Calls POST /api/auth/reset-password with { resetToken, newPassword }.
 */
const ResetPassword = () => {
  const navigate  = useNavigate();
  const location  = useLocation();

  const resetToken = location.state?.resetToken || null;

  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading]             = useState(false);
  const [isSuccess, setIsSuccess]             = useState(false);

  // Guard: if no reset token in state, redirect to forgot-password
  useEffect(() => {
    if (!resetToken) {
      toast.error("Session expired or invalid. Please start over.");
      navigate("/forgot-password", { replace: true });
    }
  }, [resetToken, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      return toast.error("Please fill in all fields.");
    }
    if (newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters.");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match.");
    }

    try {
      setIsLoading(true);
      const res = await api.post("/api/auth/reset-password", {
        resetToken,
        newPassword,
      });
      setIsSuccess(true);
      toast.success(res.data?.message || "Password reset successfully!");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Reset failed. The token may have expired. Please start over."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!resetToken) return null; // avoid flash before redirect

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#F8FAFC]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 bg-[#2F6B4F] rounded-xl flex items-center justify-center mb-4 shadow-sm">
          <Lock className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-[#1E293B]">Set New Password</h2>
        <p className="mt-2 text-sm text-[#64748B]">
          Your new password must be at least 6 characters.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="saas-card py-8 px-4 sm:px-10 bg-white border border-[#E2E8F0] shadow-sm rounded-xl">
          {!isSuccess ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Lock className="h-5 w-5 text-[#64748B]" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="saas-input saas-input-with-icon w-full pl-11 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#2F6B4F]"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Lock className="h-5 w-5 text-[#64748B]" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="saas-input saas-input-with-icon w-full pl-11 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#2F6B4F]"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="saas-button-primary w-full py-2.5 bg-[#2F6B4F] text-white font-semibold rounded-lg hover:bg-[#265740] transition"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-[#2F6B4F]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-[#1E293B]">Password Updated!</h3>
              <p className="text-sm text-[#64748B]">
                Your password has been reset successfully. Sign in with your new password.
              </p>
              <button
                onClick={() => navigate("/login", { replace: true })}
                className="saas-button-primary w-full py-2.5 bg-[#2F6B4F] text-white font-semibold rounded-lg hover:bg-[#265740] transition mt-4"
              >
                Go to Sign in
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#1E293B]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
