/**
 * Admin panel sections that can be granted to a staff member.
 * Keys match the sidebar entries and are stored on User.permissions.
 */
export interface AdminPermissionDef {
  key: string;
  label: string;
}

export const ADMIN_PERMISSIONS: AdminPermissionDef[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'sales', label: 'Sales & Revenue' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'orders', label: 'Orders & Dispatch' },
  { key: 'drivers', label: 'Drivers' },
  { key: 'kitchen', label: 'Kitchen Board' },
  { key: 'menu', label: 'Menu & Plans' },
  { key: 'purchases', label: 'Ingredient Purchases' },
  { key: 'expenses', label: 'Operational Expenses' },
  { key: 'customers', label: 'Customers' },
  { key: 'referrals', label: 'Referrals & Rewards' },
  { key: 'users', label: 'Users' },
  { key: 'activity', label: 'Activity Log' },
  { key: 'settings', label: 'Settings' }
];

export const ALL_PERMISSION_KEYS = ADMIN_PERMISSIONS.map(p => p.key);

export const permissionLabel = (key: string): string =>
  ADMIN_PERMISSIONS.find(p => p.key === key)?.label || key;

/**
 * Admins always have full access. A staff account with no permissions
 * configured keeps the default (full) view so nobody gets locked out by
 * accident; once permissions are set, they apply.
 */
export const hasPermission = (user: any, key: string): boolean => {
  if (!user) return true;
  if (user.role === 'admin') return true;
  const perms: string[] = Array.isArray(user.permissions) ? user.permissions : [];
  if (perms.length === 0) return true;
  return perms.includes(key);
};
