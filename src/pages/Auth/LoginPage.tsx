import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  Smartphone,
  KeyRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  apiLogin, 
  apiRegister, 
  apiAdminLogin, 
  apiDriverLogin,
  apiRequestOtpLogin,
  apiVerifyOtpLogin
} from '../../services/api';
import { getAdminDrivers } from '../Admin/adminData';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';

export type UserRole = 'customer' | 'driver' | 'admin';

/**
 * Phone OTP sign-in is hidden until Fast2SMS DLT is approved.
 * Quick SMS (no DLT) costs ₹7 per message; the DLT template route costs ₹0.25.
 * Flip this to true once FAST2SMS_OTP_TEMPLATE_ID is set on the server.
 */
const OTP_LOGIN_ENABLED = false;

export interface LoginPageProps {
  initialRole?: UserRole;
  initialMode?: 'signin' | 'signup';
}

export function LoginPage({ initialMode }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isSignUpFromQuery = searchParams.get('mode') === 'signup';
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup' || isSignUpFromQuery);

  // Common form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign up specific fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  // Phone OTP sign-in (customers)
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);

  const resetOtpState = () => {
    setOtpSent(false);
    setOtpCode('');
    setOtpDevCode(null);
    setOtpCooldown(0);
  };

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => setOtpCooldown(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Shared customer-session setup (used by password login, signup and OTP login)
  const startCustomerSession = (res: any, fallbackEmail = '') => {
    localStorage.removeItem('activeSubscription');
    localStorage.setItem('token', res.token);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify(res.user));
    localStorage.setItem('userName', res.user?.name || 'Customer');
    localStorage.setItem('userEmail', res.user?.email || fallbackEmail);
    window.dispatchEvent(new Event('auth-change'));
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const digits = otpPhone.replace(/\D/g, '');
    if (digits.length < 10) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }

    try {
      setOtpSending(true);
      const res = await apiRequestOtpLogin(otpPhone);
      if (!res?.success) {
        toast.error(res?.message || 'Could not send the code');
        return;
      }
      // No SMS went out and there is no development code to show — stay on the phone step.
      if (!res.sent && !res.devCode) {
        toast.error(res.message || 'SMS could not be sent. Please try again later.');
        return;
      }

      setOtpSent(true);
      setOtpDevCode(res.devCode || null);
      setOtpCooldown(Number(res.retryAfter) || 60);
      if (res.sent) {
        toast.success(`Verification code sent to ${res.phone || otpPhone}`);
      } else {
        toast.success('Verification code generated — see the note below');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to reach the server. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!/^\d{6}$/.test(otpCode.trim())) {
      toast.error('Enter the 6-digit code from the SMS');
      return;
    }

    try {
      setOtpVerifying(true);
      const res = await apiVerifyOtpLogin(otpPhone, otpCode.trim());
      if (!res?.success || !res.token) {
        toast.error(res?.message || 'Incorrect or expired code');
        return;
      }

      startCustomerSession(res);
      toast.success(
        res.isNewUser ? 'Welcome to SHIFT24! Your account is ready.' : `Welcome back, ${res.user?.name || 'Customer'}!`
      );
      const from = location.state?.from?.pathname || '/profile';
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err?.message || 'Verification failed. Please try again.');
    } finally {
      setOtpVerifying(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setIsSignUp(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Customer OTP flow: step 1 sends the code, step 2 verifies it.
    if (!isSignUp && loginMode === 'otp') {
      if (otpSent) await handleVerifyOtp();
      else await handleSendOtp();
      return;
    }

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      toast.error('Please enter your email and password');
      return;
    }

    if (isSignUp && !name.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    if (cleanPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // Phone number is compulsory on sign-up — used for delivery and OTP sign-in.
    let signupPhone = '';
    if (isSignUp) {
      const digits = phone.replace(/\D/g, '');
      const national =
        digits.length === 12 && digits.startsWith('91') ? digits.slice(2)
          : digits.length === 11 && digits.startsWith('0') ? digits.slice(1)
            : digits;
      if (!/^[6-9]\d{9}$/.test(national)) {
        toast.error('Enter a valid 10-digit mobile number');
        return;
      }
      signupPhone = `+91${national}`;
    }

    try {
      setLoading(true);

      // ============================================
      // 1. REGISTRATION (Customer Sign Up)
      // ============================================
      if (isSignUp) {
        const res = await apiRegister({
          name: name.trim(),
          email: cleanEmail,
          password: cleanPassword,
          phone: signupPhone
        });

        if (!res.success) {
          toast.error(res.message || 'Registration failed');
          return;
        }

        localStorage.removeItem('activeSubscription');
        localStorage.setItem('token', res.token);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.setItem('userName', res.user?.name || name.trim());
        localStorage.setItem('userEmail', res.user?.email || cleanEmail.toLowerCase());

        window.dispatchEvent(new Event('auth-change'));
        toast.success(`Welcome to SHIFT24, ${res.user?.name || name}! Account created.`);
        navigate('/profile', { replace: true });
        return;
      }

      // ============================================
      // 2. COMMON UNIFIED SIGN IN
      // ============================================
      let res: any = null;
      try {
        res = await apiLogin(cleanEmail, cleanPassword);
      } catch {
        // Fallbacks will be attempted if primary API call throws
      }

      // If unified login returns success:
      if (res && res.success && res.user) {
        const role = res.user.role;

        // Any role that is not a customer or driver belongs to the admin portal
        // (built-in admin/staff/kitchen and any custom role created in Roles & Permissions).
        if (role && role !== 'customer' && role !== 'driver') {
          // Admin Session
          localStorage.setItem('adminToken', res.token);
          localStorage.setItem('isAdminLoggedIn', 'true');
          localStorage.setItem('adminUser', JSON.stringify(res.user));
          localStorage.setItem('token', res.token);
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('user', JSON.stringify(res.user));
          window.dispatchEvent(new Event('auth-change'));

          toast.success(`Welcome to Operations, ${res.user.name || 'Admin'}!`);
          navigate('/admin', { replace: true });
          return;
        }

        if (role === 'driver') {
          // Driver Session
          localStorage.setItem('driverToken', res.token);
          localStorage.setItem('isDriverLoggedIn', 'true');
          localStorage.setItem('driverUser', JSON.stringify(res.driver || res.user));
          window.dispatchEvent(new Event('auth-change'));

          toast.success(`Welcome to Driver Portal, ${res.user.name || 'Driver'}!`);
          navigate('/driver', { replace: true });
          return;
        }

        // Customer Session (default)
        localStorage.removeItem('activeSubscription');
        localStorage.setItem('token', res.token);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.setItem('userName', res.user.name || 'Customer');
        localStorage.setItem('userEmail', res.user.email || cleanEmail.toLowerCase());
        window.dispatchEvent(new Event('auth-change'));

        toast.success(`Welcome back, ${res.user.name || 'Customer'}!`);
        const from = location.state?.from?.pathname || '/profile';
        navigate(from, { replace: true });
        return;
      }

      // ============================================
      // Fallback 1: Direct Admin Login Endpoint
      // ============================================
      try {
        const adminRes = await apiAdminLogin(cleanEmail, cleanPassword);
        if (adminRes && adminRes.success && adminRes.user) {
          localStorage.setItem('adminToken', adminRes.token);
          localStorage.setItem('isAdminLoggedIn', 'true');
          localStorage.setItem('adminUser', JSON.stringify(adminRes.user));
          localStorage.setItem('token', adminRes.token);
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('user', JSON.stringify(adminRes.user));
          window.dispatchEvent(new Event('auth-change'));

          toast.success(`Welcome to Operations, ${adminRes.user.name || 'Admin'}!`);
          navigate('/admin', { replace: true });
          return;
        }
      } catch {
        // Continue to driver fallback
      }

      // ============================================
      // Fallback 2: Direct Driver Login Endpoint
      // ============================================
      try {
        const driverRes = await apiDriverLogin(cleanEmail, cleanPassword);
        if (driverRes && driverRes.success && driverRes.driver) {
          localStorage.setItem('isDriverLoggedIn', 'true');
          localStorage.setItem('driverUser', JSON.stringify(driverRes.driver));
          if (driverRes.token) {
            localStorage.setItem('driverToken', driverRes.token);
          }
          window.dispatchEvent(new Event('auth-change'));

          toast.success(`Welcome to Driver Portal, ${driverRes.driver.name}!`);
          navigate('/driver', { replace: true });
          return;
        }
      } catch {
        // Continue to local mock check
      }

      // ============================================
      // Fallback 3: Local mock drivers (for offline demo)
      // ============================================
      const cleanDigits = cleanEmail.replace(/\D/g, '');
      const localDrivers = getAdminDrivers();
      const matched = localDrivers.find(d => 
        (d.driverId && d.driverId.toLowerCase() === cleanEmail.toLowerCase()) ||
        (d.id && d.id.toLowerCase() === cleanEmail.toLowerCase()) ||
        (d.email && d.email.toLowerCase() === cleanEmail.toLowerCase()) ||
        (d.phone && cleanDigits.length >= 7 && d.phone.replace(/\D/g, '').includes(cleanDigits.slice(-10)))
      );

      if (matched) {
        const driverPass = matched.password || 'driver123';
        if (cleanPassword === driverPass) {
          localStorage.setItem('isDriverLoggedIn', 'true');
          localStorage.setItem('driverUser', JSON.stringify(matched));
          window.dispatchEvent(new Event('auth-change'));

          toast.success(`Logged in as ${matched.name} (Driver Portal)`);
          navigate('/driver', { replace: true });
          return;
        }
      }

      // If all attempts failed:
      toast.error(res?.message || 'Invalid email or password. Please check your credentials.');
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-8 md:pt-14 pb-16 bg-slate-50 min-h-screen flex items-center justify-center px-4 sm:px-6">
      <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-200/80 max-w-md w-full">

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100 shadow-2xs">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>

          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
            {isSignUp 
              ? 'Join Shift24 for daily healthy meal plans in Kakkanad' 
              : loginMode === 'otp'
                ? "Enter your mobile number and we'll text you a one-time code"
                : 'Enter your email and password to access your account'}
          </p>
        </div>

        {/* Sign In / Sign Up Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl mb-6 shadow-inner">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
              !isSignUp 
                ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-900/5' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setLoginMode('password'); resetOtpState(); }}
            className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
              isSignUp 
                ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-900/5' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Sign-in method: password or phone OTP (customers only) */}
        {!isSignUp && OTP_LOGIN_ENABLED && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl mb-4 shadow-inner">
            <button
              type="button"
              onClick={() => { setLoginMode('password'); resetOtpState(); }}
              className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                loginMode === 'password'
                  ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-900/5'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Password
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('otp'); resetOtpState(); }}
              className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                loginMode === 'otp'
                  ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-900/5'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Phone OTP
            </button>
          </div>
        )}

        {/* Common Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>

          {loginMode === 'password' || isSignUp ? (
            <>

          {/* Full Name (Sign Up Only) */}
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all" 
                  placeholder="Rahul Sharma" 
                  required={isSignUp} 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input 
                type="email" 
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all" 
                placeholder="you@example.com" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Phone Number (Sign Up Only) */}
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input 
                  type="tel" 
                  inputMode="numeric"
                  autoComplete="tel"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all" 
                  placeholder="+91 98451 22345" 
                  required={isSignUp}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password <span className="text-red-500">*</span>
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-[11px] text-emerald-600 font-semibold cursor-pointer hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all" 
                placeholder="••••••••" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

            </>
          ) : (
            <>
              {/* Mobile number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all disabled:opacity-70"
                    placeholder="+91 98765 43210"
                    value={otpPhone}
                    onChange={e => setOtpPhone(e.target.value)}
                    disabled={otpSent}
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  We&apos;ll text a 6-digit code. Standard SMS rates may apply.
                </p>
              </div>

              {/* Code step */}
              {otpSent && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        6-Digit Code
                      </label>
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={otpCooldown > 0 || otpSending}
                        className="text-[11px] text-emerald-600 font-semibold cursor-pointer hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend code'}
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-mono font-bold tracking-[0.4em] bg-slate-50 focus:bg-white transition-all"
                        placeholder="123456"
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpCode(''); setOtpDevCode(null); }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Use a different number
                  </button>

                  {otpDevCode && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
                      SMS provider not configured on the server — your code is{' '}
                      <strong className="font-mono tracking-widest text-emerald-700">{otpDevCode}</strong>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading || otpSending || otpVerifying}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all mt-3 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSignUp ? (
              loading ? <span>Creating Account...</span> : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )
            ) : loginMode === 'otp' ? (
              otpSending ? <span>Sending code...</span>
              : otpVerifying ? <span>Verifying...</span>
              : (
                <>
                  <span>{otpSent ? 'Verify & Sign In' : 'Send Code'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )
            ) : (
              loading ? <span>Signing in...</span> : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )
            )}
          </button>
        </form>

        {/* Footer switch prompt */}
        <div className="mt-6 text-center text-xs text-slate-500">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer ml-1"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setLoginMode('password'); resetOtpState(); }}
                className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer ml-1"
              >
                Create Account
              </button>
            </p>
          )}
        </div>

      </div>

      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        defaultEmail={email}
      />
    </div>
  );
}
