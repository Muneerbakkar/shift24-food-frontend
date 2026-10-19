import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserCheck, 
  UserPlus, 
  Search, 
  Filter, 
  ShieldCheck, 
  Shield, 
  ChefHat, 
  Phone, 
  Mail, 
  Calendar, 
  Edit2, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Users,
  Check,
  RefreshCw,
  User as UserIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  apiGetAdminUsers, 
  apiCreateAdminUser, 
  apiUpdateAdminUser, 
  apiDeleteAdminUser 
} from '../../services/api';

interface UserRecord {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'staff' | 'kitchen' | 'customer';
  adminTitle?: string;
  status?: 'active' | 'inactive';
  totalSpent?: number;
  totalOrders?: number;
  createdAt?: string;
  updatedAt?: string;
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'staff' | 'kitchen' | 'customer'>('staff');
  const [formAdminTitle, setFormAdminTitle] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Current session admin
  const currentAdminEmail = useMemo(() => {
    try {
      const stored = localStorage.getItem('adminUser');
      if (stored) {
        return JSON.parse(stored).email?.toLowerCase() || '';
      }
    } catch (e) {}
    return 'admin@shift24.com';
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await apiGetAdminUsers();
      if (res.success && Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        toast.error(res.message || 'Failed to load users');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('staff');
    setFormAdminTitle('Staff Administrator');
    setFormStatus('active');
    setFormPassword('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UserRecord) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone || '');
    setFormRole(user.role || 'customer');
    setFormAdminTitle(
      user.adminTitle || 
      (user.role === 'admin' ? 'Super Administrator' : 
       user.role === 'kitchen' ? 'Kitchen Manager' : 
       user.role === 'staff' ? 'Staff Administrator' : 'Customer')
    );
    setFormStatus(user.status || 'active');
    setFormPassword('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setSubmitting(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Please enter a full name');
      return;
    }

    if (modalMode === 'create') {
      if (!formEmail.trim()) {
        toast.error('Please enter an official email address');
        return;
      }
      if (!formPassword || formPassword.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }

      setSubmitting(true);
      try {
        const res = await apiCreateAdminUser({
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword,
          phone: formPhone.trim(),
          role: formRole,
          adminTitle: formAdminTitle.trim() || undefined
        });

        if (res.success) {
          toast.success('User account created successfully!');
          handleCloseModal();
          loadUsers();
        } else {
          toast.error(res.message || 'Failed to create user');
        }
      } catch (err: any) {
        toast.error(err.message || 'An error occurred');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Edit mode
      if (!selectedUser) return;
      if (formPassword && formPassword.length < 6) {
        toast.error('New password must be at least 6 characters');
        return;
      }

      setSubmitting(true);
      try {
        const updateData: any = {
          name: formName.trim(),
          phone: formPhone.trim(),
          role: formRole,
          adminTitle: formAdminTitle.trim(),
          status: formStatus
        };
        if (formPassword.trim()) {
          updateData.password = formPassword.trim();
        }

        const res = await apiUpdateAdminUser(selectedUser._id, updateData);
        if (res.success) {
          toast.success('User details updated successfully!');
          handleCloseModal();
          loadUsers();
        } else {
          toast.error(res.message || 'Failed to update user');
        }
      } catch (err: any) {
        toast.error(err.message || 'An error occurred');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;

    setDeleting(true);
    try {
      const res = await apiDeleteAdminUser(deleteConfirmUser._id);
      if (res.success) {
        toast.success('User account removed successfully');
        setDeleteConfirmUser(null);
        loadUsers();
      } else {
        toast.error(res.message || 'Failed to delete user');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while deleting user');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        user.name.toLowerCase().includes(q) || 
        user.email.toLowerCase().includes(q) || 
        (user.phone && user.phone.toLowerCase().includes(q)) ||
        (user.adminTitle && user.adminTitle.toLowerCase().includes(q));

      const matchRole = roleFilter === 'all' || user.role === roleFilter;
      const matchStatus = statusFilter === 'all' || (user.status || 'active') === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Metric counts
  const totalUsers = users.length;
  const customerCount = users.filter(u => u.role === 'customer').length;
  const superAdmins = users.filter(u => u.role === 'admin').length;
  const staffAdmins = users.filter(u => u.role === 'staff' || u.role === 'kitchen').length;

  const getRoleBadge = (role: string, title?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {title || 'Super Administrator'}
          </span>
        );
      case 'kitchen':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <ChefHat className="w-3.5 h-3.5 text-amber-600" />
            {title || 'Kitchen Manager'}
          </span>
        );
      case 'staff':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            {title || 'Staff Administrator'}
          </span>
        );
      case 'customer':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <UserIcon className="w-3.5 h-3.5 text-purple-600" />
            {title || 'Customer'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>User Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Users
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage user accounts, assigned roles, and access credentials.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalUsers}</div>
            <div className="text-xs font-medium text-slate-500">Total Users</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-purple-700">{customerCount}</div>
            <div className="text-xs font-medium text-slate-500">Customer Accounts</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">{superAdmins}</div>
            <div className="text-xs font-medium text-slate-500">Super Admins</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-blue-700">{staffAdmins}</div>
            <div className="text-xs font-medium text-slate-500">Staff & Managers</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone, or title..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-900"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="customer">Customers</option>
              <option value="admin">Super Administrator</option>
              <option value="staff">Staff Administrator</option>
              <option value="kitchen">Kitchen Manager</option>
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-4 px-6">User</th>
                <th className="py-4 px-6">Role & Designation</th>
                <th className="py-4 px-6">Contact Phone</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Registered Date</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading database users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const initials = (u.name ? u.name.slice(0, 2) : u.email.slice(0, 2)).toUpperCase();
                  const isMasterAdmin = u.email.toLowerCase() === 'admin@shift24.com';
                  const isCurrentSessionUser = u.email.toLowerCase() === currentAdminEmail;

                  return (
                    <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                      {/* User Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                            u.role === 'admin' 
                              ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-white' 
                              : u.role === 'kitchen' 
                              ? 'bg-amber-100 text-amber-800' 
                              : u.role === 'staff'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrentSessionUser && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded-md">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Title */}
                      <td className="py-4 px-6">
                        {getRoleBadge(u.role, u.adminTitle)}
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-6 text-xs text-slate-600 font-medium">
                        {u.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {u.phone}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        {(u.status || 'active') === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-slate-300" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Added Date */}
                      <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                        {u.createdAt ? (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(u.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        ) : (
                          <span>Permanent</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit user details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {!isMasterAdmin && !isCurrentSessionUser && (
                            <button
                              onClick={() => setDeleteConfirmUser(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
                <UserCheck className="w-4 h-4" />
                <span>{modalMode === 'create' ? 'Create User' : 'Edit User'}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {modalMode === 'create' ? 'Add New User' : 'Edit User Profile'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {modalMode === 'create' 
                  ? 'Add a new user account with role privileges and login credentials.' 
                  : 'Update role privileges, designation, contact info, or set a new password.'}
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  disabled={modalMode === 'edit'}
                  required
                  placeholder="user@example.com"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl font-medium ${
                    modalMode === 'edit'
                      ? 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900'
                  }`}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+91 98451 00000"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                />
              </div>

              {/* Role & Designation Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Role *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => {
                      const r = e.target.value as any;
                      setFormRole(r);
                      if (modalMode === 'create' || !formAdminTitle) {
                        setFormAdminTitle(
                          r === 'admin' ? 'Super Administrator' : 
                          r === 'kitchen' ? 'Kitchen Manager' : 
                          r === 'staff' ? 'Staff Administrator' : 'Customer'
                        );
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900 cursor-pointer"
                  >
                    <option value="customer">Customer</option>
                    <option value="staff">Staff Administrator</option>
                    <option value="kitchen">Kitchen Manager</option>
                    <option value="admin">Super Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={formAdminTitle}
                    onChange={(e) => setFormAdminTitle(e.target.value)}
                    placeholder="e.g. Operations Lead"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {modalMode === 'create' ? 'Login Password *' : 'Change Password (Leave blank to keep current)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required={modalMode === 'create'}
                    minLength={6}
                    placeholder={modalMode === 'create' ? 'Minimum 6 characters' : 'Enter new password only if changing'}
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Status Selector (Only in Edit mode) */}
              {modalMode === 'edit' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormStatus('active')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        formStatus === 'active'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Active</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus('inactive')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        formStatus === 'inactive'
                          ? 'bg-rose-50 border-rose-500 text-rose-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>Inactive</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Submit / Cancel Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{submitting ? 'Saving...' : modalMode === 'create' ? 'Create User' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 font-bold">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-1">
              Remove User Account?
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Are you sure you want to delete <strong>{deleteConfirmUser.name}</strong> ({deleteConfirmUser.email})? This action cannot be undone.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
              >
                {deleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{deleting ? 'Removing...' : 'Yes, Remove User'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
