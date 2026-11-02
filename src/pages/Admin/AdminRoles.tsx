import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users as UsersIcon,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiGetRoles, apiCreateRole, apiUpdateRole, apiDeleteRole } from '../../services/api';
import { ADMIN_PERMISSIONS, ALL_PERMISSION_KEYS } from './permissions';
import { showConfirmToast } from '../../utils/confirmToast';

interface RoleRecord {
  _id: string;
  roleId: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
  userCount?: number;
}

export function AdminRoles() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGetRoles();
      if (res?.success) setRoles(res.data || []);
      else toast.error(res?.message || 'Could not load roles');
    } catch (e: any) {
      toast.error(e?.message || 'Could not load roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const openCreate = () => {
    setModalMode('create');
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setFormPermissions([]);
    setIsModalOpen(true);
  };

  const openEdit = (role: RoleRecord) => {
    setModalMode('edit');
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormPermissions([...(role.permissions || [])]);
    setIsModalOpen(true);
  };

  const togglePermission = (key: string) => {
    setFormPermissions(prev => (prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Role name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        permissions: formPermissions
      };
      const res = modalMode === 'create'
        ? await apiCreateRole(payload)
        : await apiUpdateRole(editingRole!.roleId, payload);

      if (res?.success) {
        toast.success(res.message || 'Role saved');
        setIsModalOpen(false);
        loadRoles();
      } else {
        toast.error(res?.message || 'Could not save role');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not save role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (role: RoleRecord) => {
    showConfirmToast({
      title: `Delete role "${role.name}"?`,
      description: role.userCount
        ? `${role.userCount} user(s) still have this role — reassign them first.`
        : 'This role will no longer be available when assigning users. This cannot be undone.',
      confirmText: 'Delete',
      confirmButtonClass: 'bg-rose-600 hover:bg-rose-700 text-white',
      onConfirm: async () => {
        const res = await apiDeleteRole(role.roleId);
        if (res?.success) {
          toast.success(res.message || 'Role deleted');
          loadRoles();
        } else {
          toast.error(res?.message || 'Could not delete role');
        }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Access control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Roles & Permissions</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create a role once, choose which admin sections it can open, then assign it to your team in Users.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadRoles}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-emerald-600 hover:border-emerald-200 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Role</span>
          </button>
        </div>
      </div>

      {/* Roles */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin opacity-50" />
          Loading roles…
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-slate-500 font-semibold">No roles yet</p>
          <p className="text-slate-400 text-xs mt-1">Create your first role to start assigning access.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map(role => (
            <div key={role._id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-sm truncate">{role.name}</h3>
                    {role.isSystem && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                        <Lock className="w-2.5 h-2.5" /> Built-in
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{role.roleId}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(role)}
                    title="Edit role"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {!role.isSystem && (
                    <button
                      type="button"
                      onClick={() => handleDelete(role)}
                      title="Delete role"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {role.description && (
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{role.description}</p>
              )}

              <div className="flex flex-wrap gap-1 mt-3">
                {(role.permissions || []).length === 0 ? (
                  <span className="text-[10px] font-semibold text-slate-400">No section access</span>
                ) : (role.permissions || []).length === ALL_PERMISSION_KEYS.length ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                    All sections
                  </span>
                ) : (
                  (role.permissions || []).map(p => (
                    <span key={p} className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md capitalize">
                      {p}
                    </span>
                  ))
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                {role.userCount || 0} user{ (role.userCount || 0) === 1 ? '' : 's' } on this role
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[calc(100vh-1.5rem)] flex flex-col p-5 sm:p-7 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 shrink-0 pr-9">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>{modalMode === 'create' ? 'New role' : 'Edit role'}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {modalMode === 'create' ? 'Create a role' : 'Edit role permissions'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Pick the admin sections this role can open. Users assigned to it inherit these.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto flex-1 pr-1 -mr-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Delivery Coordinator"
                  required
                  disabled={modalMode === 'edit' && !!editingRole?.isSystem}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="What is this role responsible for?"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Sections ({formPermissions.length}/{ADMIN_PERMISSIONS.length})
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormPermissions(ALL_PERMISSION_KEYS)}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors cursor-pointer"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormPermissions([])}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:border-rose-300 hover:text-rose-700 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {ADMIN_PERMISSIONS.map(perm => {
                    const checked = formPermissions.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                          checked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(perm.key)}
                          className="w-3.5 h-3.5 accent-emerald-600"
                        />
                        <span className="truncate">{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="sticky bottom-0 bg-white pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{submitting ? 'Saving…' : modalMode === 'create' ? 'Create Role' : 'Save Role'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
