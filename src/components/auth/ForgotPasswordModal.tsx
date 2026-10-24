import React, { useState, useEffect } from 'react';
import { Mail, Lock, KeyRound, Eye, EyeOff, X, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiForgotPassword, apiResetPassword } from '../../services/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  onSuccess?: () => void;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  defaultEmail = '',
  onSuccess,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(defaultEmail);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Delivery status feedback
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Sync defaultEmail when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultEmail) {
        setEmail(defaultEmail);
      }
      setStep('email');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
      setLoading(false);
      setEmailSent(null);
      setPreviewUrl(null);
      setGeneratedCode(null);
    }
  }, [isOpen, defaultEmail]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Step 1: Request Reset Code via Email
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      const res = await apiForgotPassword(cleanEmail);
      if (!res || res.success === false) {
        toast.error(res?.message || 'Failed to send reset code. Please check your email.');
        return;
      }

      setEmailSent(res.emailSent === true);
      setPreviewUrl(res.previewUrl || null);
      setGeneratedCode(res.resetCode || null);

      if (res.emailSent === true) {
        toast.success(`Verification email sent to ${cleanEmail}! Please check inbox and spam.`, { duration: 6000 });
      } else {
        toast.success(`Reset code generated for ${cleanEmail}!`, { duration: 5000 });
      }

      setStep('code');
      setResendCooldown(60);
    } catch (err: any) {
      toast.error(err.message || 'Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password with Code
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = resetCode.trim();

    if (!cleanCode) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const res = await apiResetPassword({
        email: email.trim(),
        resetCode: cleanCode,
        newPassword,
      });

      if (!res || res.success === false) {
        toast.error(res?.message || 'Failed to reset password. Please verify the code.');
        return;
      }

      toast.success('Password reset successfully! Your new password is now active.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error resetting password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {step === 'email' ? 'Forgot Password' : 'Reset Your Password'}
              </h3>
              <p className="text-xs text-slate-500">
                {step === 'email' ? 'Reset password via email verification' : 'Enter the code sent to your email'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="grid grid-cols-2 px-6 pt-4 gap-2 text-xs font-semibold">
          <div className={`h-1.5 rounded-full transition-all ${step === 'email' ? 'bg-emerald-500' : 'bg-emerald-500/40'}`} />
          <div className={`h-1.5 rounded-full transition-all ${step === 'code' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
        </div>

        <div className="p-6">
          {step === 'email' ? (
            /* STEP 1: Email Form */
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  Enter your registered account email. We will send a secure <strong>6-digit verification code</strong> to reset your password.
                </p>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-xs text-xs cursor-pointer flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      Send Reset Code
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: Verification Code & New Password */
            <form onSubmit={handleResetPassword} className="space-y-4">
              {emailSent === true ? (
                <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-slate-700 truncate">
                      Email dispatched to <strong className="text-emerald-900">{email}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-emerald-700 hover:underline font-bold text-[11px] shrink-0 ml-2"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>SMTP Email Setup Notice</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="text-amber-800 hover:underline font-bold text-[11px]"
                    >
                      Change Email
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Live SMTP email service is not configured in <code className="bg-amber-100/90 px-1 py-0.5 rounded font-mono text-[10px]">backend/.env</code> yet.
                  </p>
                  {generatedCode && (
                    <div className="bg-white/90 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold text-slate-800">
                        Code: <strong className="font-mono text-sm tracking-widest text-emerald-700 ml-1">{generatedCode}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => setResetCode(generatedCode)}
                        className="text-[11px] font-extrabold bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Auto-fill Code
                      </button>
                    </div>
                  )}
                  {previewUrl && (
                    <div className="pt-0.5">
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-amber-700 hover:text-amber-900 underline font-semibold inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> View Generated Email Preview
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* 6-Digit Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  6-Digit Verification Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  autoFocus
                  className="w-full text-center tracking-[0.4em] font-mono font-bold text-lg px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Resend Code Option */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Didn't receive the email?</span>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={() => handleSendCode()}
                  className="font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed hover:underline"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !resetCode.trim() || !newPassword}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-xs text-xs cursor-pointer flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Reset Password
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
