import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, ArrowLeft, Key, UserCheck, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiAdminLogin, apiAdminRegister } from '../../services/api';

export function AdminLoginPage() {
  const defaultAdminEmail = (import.meta as any).env?.VITE_DEFAULT_ADMIN_EMAIL || 'admin@shift24.com';
  const defaultAdminPassword = (import.meta as any).env?.VITE_DEFAULT_ADMIN_PASSWORD || 'admin123';

  const [isAdminSignUp, setIsAdminSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(defaultAdminEmail);
  const [password, setPassword] = useState(defaultAdminPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [adminSecretCode, setAdminSecretCode] = useState('');
  const [showSecretCode, setShowSecretCode] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter admin email and password');
      return;
    }

    try {
      setLoading(true);

      if (isAdminSignUp) {
        if (!name) {
          toast.error('Please enter administrator name');
          return;
        }

        const res = await apiAdminRegister({
          name,
          email,
          password,
          adminSecretCode
        });

        if (!res.success) {
          toast.error(res.message || 'Admin registration failed');
          return;
        }

        // Save admin JWT and session state
        localStorage.setItem('adminToken', res.token);
        localStorage.setItem('isAdminLoggedIn', 'true');
        localStorage.setItem('adminUser', JSON.stringify(res.user));

        toast.success(`Admin registered! Welcome, ${res.user?.name || name}`);
        navigate('/admin');
      } else {
        const res = await apiAdminLogin(email, password);
        if (!res.success) {
          toast.error(res.message || 'Invalid admin credentials');
          return;
        }

        // Save admin JWT and session state
        localStorage.setItem('adminToken', res.token);
        localStorage.setItem('isAdminLoggedIn', 'true');
        localStorage.setItem('adminUser', JSON.stringify(res.user));

        toast.success(`Welcome back, ${res.user?.name || 'Admin'}!`);
        navigate('/admin');
      }
    } catch (err: any) {
      toast.error(err.message || 'Admin authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail(defaultAdminEmail);
    setPassword(defaultAdminPassword);
    setIsAdminSignUp(false);

    try {
      setLoading(true);
      const res = await apiAdminLogin(defaultAdminEmail, defaultAdminPassword);
      if (res.success) {
        localStorage.setItem('adminToken', res.token);
        localStorage.setItem('isAdminLoggedIn', 'true');
        localStorage.setItem('adminUser', JSON.stringify(res.user));
        toast.success('Logged in with Super Admin credentials');
        navigate('/admin');
      } else {
        toast.error(res.message || 'Could not log in with demo admin');
      }
    } catch (e: any) {
      // Fallback
      localStorage.setItem('isAdminLoggedIn', 'true');
      localStorage.setItem('adminUser', JSON.stringify({ email: defaultAdminEmail, role: 'admin', name: 'Shift24 Super Admin' }));
      toast.success('Logged in with Demo Admin credentials');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-800">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <div className="mb-6">
          <Link 
            to="/"
            className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Storefront
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 border border-slate-800/10">
          {/* Brand header */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100 shadow-xs">
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">SHIFT24 Operations</h1>
            <p className="text-slate-500 text-xs mt-1">
              Sign in to manage subscribers, kitchen dispatch & deliveries
            </p>
          </div>

          {/* Quick Demo Login Banner */}
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Demo Access</span>
              <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full">Ready</span>
            </div>
            <p className="text-xs text-emerald-800 mb-3">
              One-click instant access pre-configured with full administrative permissions:
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={handleDemoLogin}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50"
            >
              <span>Instant Demo Admin Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Switcher for Admin Sign In vs Admin Sign Up */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setIsAdminSignUp(false)}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                !isAdminSignUp 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Admin Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsAdminSignUp(true)}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                isAdminSignUp 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Register Admin
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {isAdminSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Administrator Name
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Operations Lead"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white"
                    required={isAdminSignUp}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@shift24.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white"
                  required
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white"
                  required
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
            </div>

            {isAdminSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Security Secret Code (Optional)
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showSecretCode ? 'text' : 'password'}
                    value={adminSecretCode}
                    onChange={(e) => setAdminSecretCode(e.target.value)}
                    placeholder="Enter security key if required"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretCode(!showSecretCode)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                    title={showSecretCode ? 'Hide secret key' : 'Show secret key'}
                  >
                    {showSecretCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Default system passkey: shift24admin</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all mt-2 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : isAdminSignUp ? 'Register Administrator' : 'Sign In to Dashboard'}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-4 border-t border-slate-100 text-center text-slate-400 text-xs">
            Shift24 Operations Portal &bull; Secure Administrator Access
          </div>
        </div>
      </div>
    </div>
  );
}
