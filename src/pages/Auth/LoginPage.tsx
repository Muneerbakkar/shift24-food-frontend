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
  ShieldCheck 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  apiLogin, 
  apiRegister, 
  apiAdminLogin, 
  apiDriverLogin 
} from '../../services/api';
import { getAdminDrivers } from '../Admin/adminData';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';

export type UserRole = 'customer' | 'driver' | 'admin';

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

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setIsSignUp(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          phone: phone.trim()
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

        if (role === 'admin' || role === 'staff' || role === 'kitchen') {
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
            onClick={() => setIsSignUp(true)}
            className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
              isSignUp 
                ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-900/5' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Common Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          
          {/* Full Name (Sign Up Only) */}
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
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
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input 
                type="text" 
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
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input 
                  type="tel" 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all" 
                  placeholder="+91 98451 22345" 
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
                Password
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

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all mt-3 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>{isSignUp ? 'Creating Account...' : 'Signing in...'}</span>
            ) : (
              <>
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
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
                onClick={() => setIsSignUp(true)}
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
