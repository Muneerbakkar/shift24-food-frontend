import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, 
  Phone, 
  Lock, 
  ArrowRight, 
  Eye, 
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiDriverLogin } from '../../services/api';
import { getAdminDrivers } from '../Admin/adminData';

export function DriverLoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (overrideIdentifier?: string, overridePassword?: string) => {
    const idToUse = (overrideIdentifier || identifier).trim();
    const pwToUse = (overridePassword !== undefined ? overridePassword : password).trim();

    if (!idToUse) {
      toast.error('Please enter your Driver ID, Phone, or Email');
      return;
    }

    if (!pwToUse) {
      toast.error('Please enter your password');
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
        toast.success(res.message || `Welcome back, ${res.driver.name}!`);
        navigate('/driver', { replace: true });
        return;
      }

      // If backend returned explicit error message
      if (res && !res.success && res.message && !res.message.includes('failed')) {
        toast.error(res.message);
        setLoading(false);
        return;
      }
    } catch {
      // Network failure, fallback to local
    }

    // 2. Offline / Local fallback authentication
    const cleanDigits = idToUse.replace(/\D/g, '');
    const localDrivers = getAdminDrivers();
    const matched = localDrivers.find(d => 
      (d.driverId && d.driverId.toLowerCase() === idToUse.toLowerCase()) ||
      (d.id && d.id.toLowerCase() === idToUse.toLowerCase()) ||
      (d.email && d.email.toLowerCase() === idToUse.toLowerCase()) ||
      (d.phone && cleanDigits.length >= 7 && d.phone.replace(/\D/g, '').includes(cleanDigits.slice(-10)))
    );

    if (matched) {
      const driverPassword = matched.password || 'driver123';
      if (pwToUse !== driverPassword) {
        toast.error('Invalid password. Please check your credentials.');
        setLoading(false);
        return;
      }

      localStorage.setItem('isDriverLoggedIn', 'true');
      localStorage.setItem('driverUser', JSON.stringify(matched));
      toast.success(`Logged in as ${matched.name} (Driver Mode)`);
      navigate('/driver', { replace: true });
    } else {
      toast.error('Driver not found. Please check your Driver ID or phone number.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 mb-4 ring-4 ring-emerald-500/20">
            <Truck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Shift24 Delivery Fleet
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Delivery Partner Portal • Access your assigned routes & meal dispatches
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-slate-900/90 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }} 
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Driver ID, Phone, or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. DRV-101 or 9847012345"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Logging In...' : 'Log In to Driver Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
