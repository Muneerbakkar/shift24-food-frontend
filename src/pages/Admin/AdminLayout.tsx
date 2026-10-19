import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Repeat, 
  ShoppingBag, 
  ChefHat, 
  UtensilsCrossed, 
  Users, 
  LogOut, 
  Menu, 
  X, 
  Zap, 
  ExternalLink,
  ShieldCheck,
  Search,
  UserCheck,
  Receipt,
  Wallet,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiGetMe, apiLogout, apiAdminLogin } from '../../services/api';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAuth = async () => {
      const isAuth = localStorage.getItem('isAdminLoggedIn') === 'true';
      let token = localStorage.getItem('adminToken');

      if (!isAuth) {
        navigate('/admin/login', { replace: true });
        return;
      }

      // Load cached admin user
      try {
        const stored = localStorage.getItem('adminUser');
        if (stored) setAdminUser(JSON.parse(stored));
      } catch (e) {
        // ignore JSON parse err
      }

      // If token is missing, null, or invalid, auto-refresh with default admin
      if (!token || token === 'null' || token === 'undefined') {
        try {
          const defaultAdminEmail = (import.meta as any).env?.VITE_DEFAULT_ADMIN_EMAIL || 'admin@shift24.com';
          const defaultAdminPassword = (import.meta as any).env?.VITE_DEFAULT_ADMIN_PASSWORD || 'admin123';
          const loginRes = await apiAdminLogin(defaultAdminEmail, defaultAdminPassword);
          if (loginRes.success && loginRes.token) {
            token = loginRes.token;
            localStorage.setItem('adminToken', loginRes.token);
            localStorage.setItem('isAdminLoggedIn', 'true');
            if (loginRes.user) {
              setAdminUser(loginRes.user);
              localStorage.setItem('adminUser', JSON.stringify(loginRes.user));
            }
          }
        } catch (e) {
          // offline fallback
        }
      }

      // Revalidate with backend /auth/me
      if (token) {
        try {
          const res = await apiGetMe(token);
          if (res.success && res.user) {
            setAdminUser(res.user);
            localStorage.setItem('adminUser', JSON.stringify(res.user));
          } else if (res && !res.success && (res.message?.includes('token') || res.message?.includes('session') || res.message?.includes('Authentication') || res.code === 'TOKEN_EXPIRED')) {
            // Token is invalid/expired - auto-refresh with default credentials
            const defaultAdminEmail = (import.meta as any).env?.VITE_DEFAULT_ADMIN_EMAIL || 'admin@shift24.com';
            const defaultAdminPassword = (import.meta as any).env?.VITE_DEFAULT_ADMIN_PASSWORD || 'admin123';
            const loginRes = await apiAdminLogin(defaultAdminEmail, defaultAdminPassword);
            if (loginRes.success && loginRes.token) {
              localStorage.setItem('adminToken', loginRes.token);
              localStorage.setItem('isAdminLoggedIn', 'true');
              if (loginRes.user) {
                setAdminUser(loginRes.user);
                localStorage.setItem('adminUser', JSON.stringify(loginRes.user));
              }
            } else {
              localStorage.removeItem('isAdminLoggedIn');
              localStorage.removeItem('adminToken');
              localStorage.removeItem('adminUser');
              toast.error('Session expired. Please log in again.');
              navigate('/admin/login', { replace: true });
            }
          }
        } catch (e) {
          // offline fallback
        }
      }
    };

    checkAdminAuth();

    // Listen to local storage changes for real-time profile updates
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem('adminUser');
        if (stored) setAdminUser(JSON.parse(stored));
      } catch (e) {}
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('admin-profile-updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('admin-profile-updated', handleStorage);
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (e) {}
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    toast.success('Admin logged out successfully');
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Sales & Revenue', path: '/admin/sales', icon: TrendingUp },
    { label: 'Subscriptions', path: '/admin/subscriptions', icon: Repeat },
    { label: 'Orders & Dispatch', path: '/admin/orders', icon: ShoppingBag },
    { label: 'Kitchen Board', path: '/admin/kitchen', icon: ChefHat },
    { label: 'Menu & Plans', path: '/admin/menu', icon: UtensilsCrossed },
    { label: 'Ingredient Purchases', path: '/admin/purchases', icon: Receipt },
    { label: 'Operational Expenses', path: '/admin/expenses', icon: Wallet },
    { label: 'Customers', path: '/admin/customers', icon: Users },
    { label: 'Users', path: '/admin/users', icon: UserCheck },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-800 font-sans antialiased">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-800">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white uppercase">
                SHIFT<span className="text-emerald-400">24</span>
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                Admin Portal
              </span>
            </div>
          </Link>
          <button 
            type="button" 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System badge */}
        <div className="px-6 py-4">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <div className="text-xs">
              <div className="font-semibold text-slate-200">Dispatch & Kitchen Live</div>
              <div className="text-slate-400 text-[11px]">All Systems Operational</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Operations
          </div>
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all ${
                  active
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer actions in sidebar */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:text-emerald-400 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-emerald-400" />
              Customer Website
            </span>
            <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">Live</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3.5 py-2.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Administrator</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-20 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Shift24</span>
                <span>/</span>
                <span className="text-emerald-600">Admin Control</span>
              </div>
              <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
                Operations Management
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Quick search input */}
            <div className="hidden md:flex items-center relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search orders, subscribers..."
                className="pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white w-64 transition-all"
              />
            </div>

            {/* Quick status pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{adminUser?.role === 'admin' ? 'Administrator' : 'Super Admin'}</span>
            </div>

            {/* Admin Avatar Link to Profile */}
            <Link 
              to="/admin/profile" 
              className="flex items-center gap-3 pl-2 border-l border-slate-200 hover:opacity-80 transition-opacity group cursor-pointer"
              title="View Admin Profile Settings"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white font-black flex items-center justify-center shadow-xs uppercase group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                {adminUser?.name ? adminUser.name.slice(0, 2) : 'AD'}
              </div>
              <div className="hidden xl:block text-left text-xs">
                <div className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{adminUser?.name || 'Administrator'}</div>
                <div className="text-slate-400 text-[11px]">{adminUser?.email || 'admin@shift24.com'}</div>
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
