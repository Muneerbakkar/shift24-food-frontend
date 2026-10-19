import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  User, 
  Mail, 
  Phone, 
  KeyRound, 
  CheckCircle2, 
  Lock, 
  Save, 
  Eye, 
  EyeOff, 
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiGetMe, apiUpdateProfile, apiChangePassword } from '../../services/api';

export function AdminProfile() {
  const [, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('admin');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Load User Data
  const loadProfileData = async () => {
    setLoading(true);
    // 1. First check local cache
    try {
      const stored = localStorage.getItem('adminUser');
      if (stored) {
        const u = JSON.parse(stored);
        setName(u.name || '');
        setEmail(u.email || '');
        setPhone(u.phone || '');
        setRole(u.role || 'admin');
      }
    } catch (e) {}

    // 2. Fetch fresh user data from API
    try {
      const token = localStorage.getItem('adminToken') || undefined;
      const res = await apiGetMe(token);
      if (res.success && res.user) {
        setName(res.user.name || '');
        setEmail(res.user.email || '');
        setPhone(res.user.phone || '');
        setRole(res.user.role || 'admin');
        localStorage.setItem('adminUser', JSON.stringify(res.user));
      }
    } catch (e) {
      console.warn('Could not fetch fresh user details from backend:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await apiUpdateProfile({ name: name.trim(), phone: phone.trim() });
      if (res.success) {
        toast.success(res.message || 'Profile details updated successfully!');
        const stored = localStorage.getItem('adminUser');
        const currentUser = stored ? JSON.parse(stored) : {};
        const updated = { ...currentUser, name: name.trim(), phone: phone.trim() };
        localStorage.setItem('adminUser', JSON.stringify(updated));
        window.dispatchEvent(new Event('admin-profile-updated'));
      } else {
        toast.error(res.message || 'Failed to update profile');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while saving profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await apiChangePassword({ currentPassword, newPassword });
      if (res.success) {
        toast.success(res.message || 'Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(res.message || 'Password update failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while updating password');
    } finally {
      setChangingPassword(false);
    }
  };

  const adminInitials = (name ? name.slice(0, 2) : email ? email.slice(0, 2) : 'AD').toUpperCase();

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* Page Title Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Account Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Admin Profile
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your personal details, contact information, and account password.
        </p>
      </div>

      {/* Profile Overview Banner Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar Circle */}
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 text-slate-950 font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg border-2 border-white/20 uppercase tracking-wide">
              {adminInitials}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-slate-900 shadow-sm" title="Active Account">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          {/* Name & Badges */}
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">{name || 'Administrator'}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Award className="w-3 h-3" />
                {role === 'admin' ? 'Super Administrator' : 'Staff Admin'}
              </span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm font-medium">{email || 'admin@shift24.com'}</p>
            {phone && (
              <p className="text-slate-400 text-xs font-medium">{phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Forms Grid: Personal Information + Password Change */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Personal Information Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Personal Information</h3>
                <p className="text-xs text-slate-500">Update your administrator profile contact details</p>
              </div>
            </div>

            <form id="profile-form" onSubmit={handleUpdateProfile} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Administrator Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Administrator"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Official Login Email
                  </label>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Fixed
                  </span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input 
                    type="email"
                    value={email}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl cursor-not-allowed text-slate-500 font-medium select-none"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98451 00000"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Account Role
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 capitalize">
                        {role === 'admin' ? 'Super Administrator' : role}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Full administrative access to manage meals, orders, and subscriptions.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Changes reflect immediately across sessions.
            </span>
            <button 
              type="submit"
              form="profile-form"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Saving Details...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Security & Password Update (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Security & Password</h3>
                <p className="text-xs text-slate-500">Update your login password</p>
              </div>
            </div>

            <form id="password-form" onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input 
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium text-slate-900"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input 
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium text-slate-900"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-type new password"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium text-slate-900"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Password must be at least 6 characters in length.
              </p>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
            <button 
              type="submit"
              form="password-form"
              disabled={changingPassword}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>{changingPassword ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminProfile;
