import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      return toast.error('Please enter your email address');
    }

    try {
      setIsLoading(true);
      const res = await api.post('/api/auth/forgot-password', { email });
      setIsSubmitted(true);
      toast.success(res.data?.message || 'Reset link request processed!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#F8FAFC]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 bg-[#2F6B4F] rounded-xl flex items-center justify-center mb-4 shadow-sm">
          <KeyRound className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-[#1E293B]">Forgot Password?</h2>
        <p className="mt-2 text-sm text-[#64748B]">
          No worries, we'll send you reset instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="saas-card py-8 px-4 sm:px-10 bg-white border border-[#E2E8F0] shadow-sm rounded-xl">
          {!isSubmitted ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
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
                disabled={isLoading}
                className="saas-button-primary w-full py-2.5 bg-[#2F6B4F] text-white font-semibold rounded-lg hover:bg-[#265740] transition"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="p-4 bg-[#2F6B4F]/10 rounded-lg border border-[#2F6B4F]/20 text-left">
                <p className="text-sm text-[#1E293B]">
                  If an account exists for <strong>{email}</strong>, a password reset link has been processed.
                </p>
              </div>
              <p className="text-xs text-[#64748B]">
                Check your email inbox (or VS Code console logs during local development) for the reset link.
              </p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-xs text-[#2F6B4F] font-medium hover:underline"
              >
                Did not receive email? Try another email
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

export default ForgotPassword;
