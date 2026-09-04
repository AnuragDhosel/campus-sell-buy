import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";

/**
 * ForgotPassword — 2-step page:
 *   Step 1: Enter email → POST /api/auth/forgot-password → OTP sent
 *   Step 2: Enter OTP  → POST /api/auth/verify-otp       → get resetToken
 *           → navigate to /reset-password with resetToken in location.state
 */
const ForgotPassword = () => {
  const navigate = useNavigate();

  // Track which step we are on: 1 (email) or 2 (OTP)
  const [step, setStep] = useState(1);

  // Step 1 state
  const [email, setEmail]         = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);

  // Step 2 state
  const [otp, setOtp]             = useState("");
  const [loadingOtp, setLoadingOtp]   = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resending OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Please enter your email address.");

    try {
      setLoadingEmail(true);
      await api.post("/api/auth/forgot-password", { email: email.trim() });
      toast.success("OTP sent! Please check your email inbox.");
      setResendCooldown(30);
      setStep(2);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoadingEmail(false);
    }
  };

  // ── Direct Resend OTP ───────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (loadingEmail || resendCooldown > 0) return;
    try {
      setLoadingEmail(true);
      setOtp("");
      await api.post("/api/auth/forgot-password", { email: email.trim() });
      toast.success("New OTP sent! Please check the latest email in your inbox.");
      setResendCooldown(30);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to resend OTP. Please try again."
      );
    } finally {
      setLoadingEmail(false);
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.replace(/\D/g, "").trim();
    if (!cleanOtp) return toast.error("Please enter the OTP.");
    if (cleanOtp.length !== 6) return toast.error("OTP must be exactly 6 digits.");

    try {
      setLoadingOtp(true);
      const res = await api.post("/api/auth/verify-otp", {
        email: email.trim(),
        otp: cleanOtp,
      });

      const { resetToken } = res.data;
      toast.success("OTP verified! Set your new password.");

      // Pass the reset token via navigation state — not in the URL
      navigate("/reset-password", { state: { resetToken }, replace: true });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "OTP verification failed. Please check your latest email."
      );
    } finally {
      setLoadingOtp(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#F8FAFC]">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 bg-[#2F6B4F] rounded-xl flex items-center justify-center mb-4 shadow-sm">
          {step === 1 ? (
            <KeyRound className="w-6 h-6 text-white" />
          ) : (
            <ShieldCheck className="w-6 h-6 text-white" />
          )}
        </div>
        <h2 className="text-3xl font-extrabold text-[#1E293B]">
          {step === 1 ? "Forgot Password?" : "Enter OTP"}
        </h2>
        <p className="mt-2 text-sm text-[#64748B]">
          {step === 1
            ? "Enter your email and we will send you a 6-digit OTP."
            : `We sent a 6-digit OTP to ${email}. If multiple emails arrive, please use the newest one.`}
        </p>
      </div>

      {/* Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="saas-card py-8 px-4 sm:px-10 bg-white border border-[#E2E8F0] shadow-sm rounded-xl">

          {/* ── Step 1: Email Form ────────────────────────────────────────────── */}
          {step === 1 && (
            <form className="space-y-6" onSubmit={handleSendOtp}>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Your registered email
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Mail className="h-5 w-5 text-[#64748B]" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="saas-input saas-input-with-icon w-full pl-11 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#2F6B4F]"
                    placeholder="student@college.edu"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingEmail}
                className="saas-button-primary w-full py-2.5 bg-[#2F6B4F] text-white font-semibold rounded-lg hover:bg-[#265740] transition"
              >
                {loadingEmail ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  "Send OTP"
                )}
              </button>
            </form>
          )}

          {/* ── Step 2: OTP Form ──────────────────────────────────────────────── */}
          {step === 2 && (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-center text-2xl font-mono font-bold tracking-[0.5em] text-[#1E293B] focus:outline-none focus:border-[#2F6B4F]"
                  placeholder="••••••"
                  required
                />
                <p className="mt-2 text-xs text-[#94A3B8] text-center">
                  Enter the latest 6-digit code from your email inbox.
                </p>
              </div>

              <button
                type="submit"
                disabled={loadingOtp}
                className="saas-button-primary w-full py-2.5 bg-[#2F6B4F] text-white font-semibold rounded-lg hover:bg-[#265740] transition"
              >
                {loadingOtp ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  "Verify OTP"
                )}
              </button>

              {/* Resend OTP */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loadingEmail || resendCooldown > 0}
                  className={`font-semibold transition ${
                    resendCooldown > 0 || loadingEmail
                      ? "text-[#94A3B8] cursor-not-allowed"
                      : "text-[#2F6B4F] hover:underline"
                  }`}
                >
                  {loadingEmail
                    ? "Sending..."
                    : resendCooldown > 0
                    ? `Resend OTP in ${resendCooldown}s`
                    : "Resend new OTP"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOtp("");
                    setStep(1);
                  }}
                  className="text-[#64748B] hover:text-[#1E293B] hover:underline"
                >
                  Change email
                </button>
              </div>
            </form>
          )}

          {/* Back to Login */}
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

export default ForgotPassword;
