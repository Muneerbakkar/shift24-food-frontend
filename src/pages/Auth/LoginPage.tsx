import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ArrowRight, 
  ArrowLeft,
  Eye, 
  EyeOff, 
  Truck, 
  ShieldCheck, 
  Key,
  BadgeCheck,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  apiLogin, 
  apiRegister, 
  apiAdminLogin, 
  apiAdminRegister, 
  apiDriverLogin 
} from '../../services/api';
import { getAdminDrivers } from '../Admin/adminData';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';

export type UserRole = 'customer' | 'driver' | 'admin';

export interface LoginPageProps {
  initialRole?: UserRole;
}

export function LoginPage({ initialRole }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine initial role: prop -> URL query param -> URL pathname -> default to customer
  const roleFromUrl = searchParams.get('role') as UserRole | null;
  const pathRole: UserRole = location.pathname.includes('/admin') 
    ? 'admin' 
    : location.pathname.includes('/driver') 
      ? 'driver' 
      : 'customer';

  const [activeRole, setActiveRole] = useState<UserRole>(
    initialRole || (roleFromUrl && ['customer', 'driver', 'admin'].includes(roleFromUrl) ? roleFromUrl : pathRole)
  );

  // Customer state
  const [isCustomerSignUp, setIsCustomerSignUp] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [showCustomerPassword, setShowCustomerPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  // Driver state
  const [driverIdentifier, setDriverIdentifier] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  const [showDriverPassword, setShowDriverPassword] = useState(false);

  // Admin state
  const [isAdminSignUp, setIsAdminSignUp] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminSecretCode, setAdminSecretCode] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showAdminSecret, setShowAdminSecret] = useState(false);

  const [loading, setLoading] = useState(false);

  // Sync role if prop or URL query changes
  useEffect(() => {
    if (initialRole) {
      setActiveRole(initialRole);
    } else if (roleFromUrl && ['customer', 'driver', 'admin'].includes(roleFromUrl)) {
      setActiveRole(roleFromUrl);
    }
  }, [initialRole, roleFromUrl]);

  const handleRoleChange = (newRole: UserRole) => {
    setActiveRole(newRole);
    setSearchParams({ role: newRole }, { replace: true });
  };

  // 1. Handle Customer Submit
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail || !customerPassword) {
      toast.error('Please enter your email and password');
      return;
    }

    if (isCustomerSignUp && !customerName) {
      toast.error('Please enter your full name');
      return;
    }

    if (customerPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      if (isCustomerSignUp) {
        const res = await apiRegister({ 
          name: customerName, 
          email: customerEmail, 
          password: customerPassword, 
          phone: customerPhone 
        });

        if (!res.success) {
          toast.error(res.message || 'Registration failed');
          return;
        }

        localStorage.removeItem('activeSubscription');
        localStorage.setItem('token', res.token);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.setItem('userName', res.user?.name || customerName);
        localStorage.setItem('userEmail', res.user?.email || customerEmail.trim().toLowerCase());

        toast.success(`Welcome to SHIFT24, ${res.user?.name || customerName}! Account created.`);
      } else {
        const res = await apiLogin(customerEmail, customerPassword);
        if (!res.success) {
          // Helpful auto-hint if someone typed admin email on customer tab
          if (customerEmail.toLowerCase().trim() === 'admin@shift24.com') {
            toast.error('Looks like an Administrator account. Switching to Admin tab...');
            handleRoleChange('admin');
            setAdminEmail(customerEmail);
            return;
          }
          toast.error(res.message || 'Login failed. Check your email/password.');
          return;
        }

        localStorage.removeItem('activeSubscription');
        localStorage.setItem('token', res.token);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.setItem('userName', res.user?.name || 'Customer');
        localStorage.setItem('userEmail', res.user?.email || customerEmail.trim().toLowerCase());

        toast.success(`Welcome back, ${res.user?.name || 'Customer'}!`);
      }

      window.dispatchEvent(new Event('auth-change'));
      const from = location.state?.from?.pathname || '/profile';
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Customer authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Driver Submit
  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const idToUse = driverIdentifier.trim();
    const pwToUse = driverPassword.trim();

    if (!idToUse) {
      toast.error('Please enter your Driver ID, Phone, or Email');
      return;
    }

    if (!pwToUse) {
      toast.error('Please enter your driver password');
      return;
    }

    setLoading(true);

    try {
      // 1. Try Backend API
      const res = await apiDriverLogin(idToUse, pwToUse);

      if (res && res.success && res.driver) {
        localStorage.setItem('isDriverLoggedIn', 'true');
        localStorage.setItem('driverUser', JSON.stringify(res.driver));
        if (res.token) {
          localStorage.setItem('driverToken', res.token);
        }
        window.dispatchEvent(new Event('auth-change'));
        toast.success(res.message || `Welcome back, ${res.driver.name}!`);
        navigate('/driver', { replace: true });
        return;
      }

      if (res && !res.success && res.message && !res.message.includes('failed')) {
        toast.error(res.message);
        setLoading(false);
        return;
      }
    } catch {
      // Network failure, fallback to local
    }

    // 2. Local fallback verification for demo drivers
    const cleanDigits = idToUse.replace(/\D/g, '');
    const localDrivers = getAdminDrivers();
    const matched = localDrivers.find(d => 
      (d.driverId && d.driverId.toLowerCase() === idToUse.toLowerCase()) ||
      (d.id && d.id.toLowerCase() === idToUse.toLowerCase()) ||
      (d.email && d.email.toLowerCase() === idToUse.toLowerCase()) ||
      (d.phone && cleanDigits.length >= 7 && d.phone.replace(/\D/g, '').includes(cleanDigits.slice(-10)))
    );

    if (matched) {
      const driverPass = matched.password || 'driver123';
      if (pwToUse !== driverPass) {
        toast.error('Invalid password for driver. Default is driver123');
        setLoading(false);
        return;
      }

      localStorage.setItem('isDriverLoggedIn', 'true');
      localStorage.setItem('driverUser', JSON.stringify(matched));
      window.dispatchEvent(new Event('auth-change'));
      toast.success(`Logged in as ${matched.name} (Driver Portal)`);
      navigate('/driver', { replace: true });
    } else {
      toast.error('Driver not found. Please check Driver ID or phone number.');
    }

    setLoading(false);
  };

  // 3. Handle Admin Submit
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) {
      toast.error('Please enter administrator email and password');
      return;
    }

    try {
      setLoading(true);

      if (isAdminSignUp) {
        if (!adminName) {
          toast.error('Please enter administrator full name');
          return;
        }

        const res = await apiAdminRegister({
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          adminSecretCode
        });

        if (!res.success) {
          toast.error(res.message || 'Admin registration failed');
          return;
        }

        localStorage.setItem('adminToken', res.token);
        localStorage.setItem('isAdminLoggedIn', 'true');
        localStorage.setItem('adminUser', JSON.stringify(res.user));
        window.dispatchEvent(new Event('auth-change'));

        toast.success(`Admin registered! Welcome, ${res.user?.name || adminName}`);
        navigate('/admin', { replace: true });
      } else {
        const res = await apiAdminLogin(adminEmail, adminPassword);
        if (!res.success) {
          toast.error(res.message || 'Invalid administrator credentials');
          return;
        }

        localStorage.setItem('adminToken', res.token);
        localStorage.setItem('isAdminLoggedIn', 'true');
        localStorage.setItem('adminUser', JSON.stringify(res.user));
        window.dispatchEvent(new Event('auth-change'));

        toast.success(`Welcome back, ${res.user?.name || 'Admin'}!`);
        navigate('/admin', { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || 'Admin authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-8 md:pt-14 pb-16 bg-slate-50 min-h-screen flex items-center justify-center px-4 sm:px-6">
      <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-200/80 max-w-lg w-full">
        
        {/* Navigation back to storefront */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            <span>Back to Storefront</span>
          </Link>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            SHIFT24 Single Sign-On
          </span>
        </div>

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100 shadow-2xs">
            {activeRole === 'customer' ? (
              <User className="w-7 h-7 text-emerald-600" />
            ) : activeRole === 'driver' ? (
              <Truck className="w-7 h-7 text-emerald-600" />
            ) : (
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
            )}
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {activeRole === 'customer' 
              ? (isCustomerSignUp ? 'Create Customer Account' : 'Customer Sign In')
              : activeRole === 'driver'
                ? 'Driver Delivery Portal'
                : (isAdminSignUp ? 'Register Administrator' : 'Shift24 Operations Login')}
          </h2>

          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
            {activeRole === 'customer'
              ? (isCustomerSignUp 
                  ? 'Join Shift24 for daily healthy meal plans in Kakkanad' 
                  : 'Log in to track orders, manage subscriptions & pause deliveries')
              : activeRole === 'driver'
                ? 'Sign in to access assigned delivery stops, kitchen dispatch & routes'
                : (isAdminSignUp 
                    ? 'Authorized admin registration with verified secret key' 
                    : 'Manage meal subscribers, driver routes, kitchen board & finances')}
          </p>
        </div>

        {/* 3-Role Segmented Switcher */}
        <div className="p-1 bg-slate-100/90 rounded-2xl mb-6 grid grid-cols-3 gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => handleRoleChange('customer')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeRole === 'customer'
                ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-900/5'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Customer</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('driver')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeRole === 'driver'
                ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-900/5'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Driver</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('admin')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeRole === 'admin'
                ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-900/5'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* ROLE 1: CUSTOMER FORM                                    */}
        {/* ======================================================== */}
        {activeRole === 'customer' && (
          <div>
            {/* Customer Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => setIsCustomerSignUp(false)}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !isCustomerSignUp ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsCustomerSignUp(true)}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isCustomerSignUp ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleCustomerSubmit}>
              {isCustomerSignUp && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input 
                      type="text" 
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all" 
                      placeholder="Muneer Bakkar" 
                      required={isCustomerSignUp} 
                      value={customerName} 
                      onChange={e => setCustomerName(e.target.value)} 
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
                    placeholder="muneerbakkar735@gmail.com" 
                    required 
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                  />
                </div>
              </div>

              {isCustomerSignUp && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input 
                      type="tel" 
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all" 
                      placeholder="+91 73568 90059" 
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  {!isCustomerSignUp && (
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
                    type={showCustomerPassword ? 'text' : 'password'} 
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all" 
                    placeholder="••••••••" 
                    required 
                    value={customerPassword}
                    onChange={e => setCustomerPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomerPassword(!showCustomerPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                    title={showCustomerPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCustomerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all mt-2 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>{isCustomerSignUp ? 'Create Customer Account' : 'Sign In as Customer'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* ROLE 2: DRIVER FLEET FORM                                */}
        {/* ======================================================== */}
        {activeRole === 'driver' && (
          <div>
            <form className="space-y-4" onSubmit={handleDriverSubmit}>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Driver ID, Phone, or Email
                </label>
                <div className="relative">
                  <Truck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input 
                    type="text" 
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all" 
                    placeholder="e.g. DRV-01 or 9845100000" 
                    required 
                    value={driverIdentifier}
                    onChange={e => setDriverIdentifier(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Driver Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input 
                    type={showDriverPassword ? 'text' : 'password'} 
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all" 
                    placeholder="••••••••" 
                    required 
                    value={driverPassword}
                    onChange={e => setDriverPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDriverPassword(!showDriverPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                    title={showDriverPassword ? 'Hide password' : 'Show password'}
                  >
                    {showDriverPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Demo quick fill helper */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-emerald-900">Demo Driver:</span>{' '}
                  <span className="text-emerald-700">DRV-01 / driver123</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDriverIdentifier('DRV-01');
                    setDriverPassword('driver123');
                  }}
                  className="text-xs font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-md hover:bg-emerald-50 transition cursor-pointer"
                >
                  Quick Fill
                </button>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all mt-2 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Accessing Driver Portal...</span>
                ) : (
                  <>
                    <span>Enter Driver Delivery Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* ROLE 3: ADMINISTRATOR OPERATIONS FORM                    */}
        {/* ======================================================== */}
        {activeRole === 'admin' && (
          <div>
            {/* Admin Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => setIsAdminSignUp(false)}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !isAdminSignUp ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Admin Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsAdminSignUp(true)}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isAdminSignUp ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Register Admin
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleAdminSubmit}>
              {isAdminSignUp && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Administrator Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input 
                      type="text" 
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all" 
                      placeholder="Super Administrator" 
                      required={isAdminSignUp} 
                      value={adminName} 
                      onChange={e => setAdminName(e.target.value)} 
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input 
                    type="email" 
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all" 
                    placeholder="admin@shift24.com" 
                    required 
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input 
                    type={showAdminPassword ? 'text' : 'password'} 
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all" 
                    placeholder="••••••••" 
                    required 
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                    title={showAdminPassword ? 'Hide password' : 'Show password'}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isAdminSignUp && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Admin Secret Key</span>
                    <span className="text-[10px] text-emerald-600 font-normal">Required for security</span>
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input 
                      type={showAdminSecret ? 'text' : 'password'} 
                      className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-all" 
                      placeholder="shift24admin" 
                      required={isAdminSignUp} 
                      value={adminSecretCode}
                      onChange={e => setAdminSecretCode(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminSecret(!showAdminSecret)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                    >
                      {showAdminSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Demo quick fill helper */}
              {!isAdminSignUp && (
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-emerald-900">Default Admin:</span>{' '}
                    <span className="text-emerald-700">admin@shift24.com / admin123</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminEmail('admin@shift24.com');
                      setAdminPassword('admin123');
                    }}
                    className="text-xs font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-md hover:bg-emerald-50 transition cursor-pointer"
                  >
                    Quick Fill
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all mt-2 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Verifying Operations Access...</span>
                ) : (
                  <>
                    <span>{isAdminSignUp ? 'Create Admin Account' : 'Access Admin Dashboard'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Security badge footer */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <BadgeCheck className="w-4 h-4 text-emerald-500" />
          <span>Shift24 256-Bit SSL Encrypted Authentication</span>
        </div>

      </div>

      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        defaultEmail={customerEmail}
      />
    </div>
  );
}
