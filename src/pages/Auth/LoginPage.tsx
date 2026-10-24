import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, ArrowRight, ShieldCheck, CheckCircle2, Eye, EyeOff, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiLogin, apiRegister } from '../../services/api';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';

export function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isSignUp && !name) {
      toast.error('Please enter your full name');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      if (isSignUp) {
        const res = await apiRegister({ name, email, password, phone });
        if (!res.success) {
          toast.error(res.message || 'Registration failed');
          return;
        }

        // Clear stale activeSubscription from prior sessions
        localStorage.removeItem('activeSubscription');

        // Store JWT token & session user
        localStorage.setItem('token', res.token);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.setItem('userName', res.user?.name || name);

        toast.success(`Welcome to SHIFT24, ${res.user?.name || name}! Account created.`);
      } else {
        const res = await apiLogin(email, password);
        if (!res.success) {
          toast.error(res.message || 'Login failed. Check your email/password.');
          return;
        }

        // Clear stale activeSubscription from prior sessions
        localStorage.removeItem('activeSubscription');

        // Store JWT token & session user
        localStorage.setItem('token', res.token);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.setItem('userName', res.user?.name || 'Customer');

        toast.success(`Welcome back, ${res.user?.name || 'Customer'}!`);
      }

      window.dispatchEvent(new Event('auth-change'));
      const from = location.state?.from?.pathname || '/profile';
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setIsSignUp(false);
    setEmail('rahul.s@example.com');
    setPassword('demo123');
    toast('Filled demo subscriber credentials', { icon: '🔑' });
  };

  return (
    <div className="pt-8 md:pt-16 lg:pt-20 pb-16 bg-slate-50 min-h-screen flex items-center justify-center px-4">
      <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-200/80 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100 shadow-xs">
            <User className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {isSignUp ? 'Create Your Account' : 'Welcome Back'}
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {isSignUp 
              ? 'Join Shift24 for customized nutrition & daily meal plans' 
              : 'Log in to manage your active subscriptions & meal delivery'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              !isSignUp 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              isSignUp 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Quick Demo Subscriber Helper */}
        {!isSignUp && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-between">
            <div className="text-xs">
              <span className="font-bold text-emerald-900">Demo Member:</span>
              <span className="text-emerald-700 block text-[11px]">rahul.s@example.com / demo123</span>
            </div>
            <button
              type="button"
              onClick={handleDemoFill}
              className="text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg transition-colors"
            >
              Fill Demo
            </button>
          </div>
        )}

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
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

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
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
                  placeholder="+91 98451 00000" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>
          )}

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
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isSignUp && (
              <p className="text-[11px] text-slate-400 mt-1">Must be at least 6 characters long.</p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all mt-2 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>{isSignUp ? 'Create My Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-slate-500 text-xs sm:text-sm mt-6">
          {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          <span 
            className="text-emerald-600 font-bold cursor-pointer hover:underline" 
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Sign In' : 'Create an Account'}
          </span>
        </p>

        {/* Links to Driver & Admin */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs">
          <Link 
            to="/driver/login" 
            className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
          >
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Delivery Partner Login →</span>
          </Link>
          <Link 
            to="/admin/login" 
            className="inline-flex items-center gap-1.5 font-semibold text-slate-400 hover:text-slate-700 transition-colors px-2 py-1"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Admin Portal</span>
          </Link>
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
