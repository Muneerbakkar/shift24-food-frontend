import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  Download, 
  RefreshCw, 
  Clock, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  Building2, 
  Eye, 
  Printer, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Percent,
  Wallet,
  ShoppingBag,
  Users,
  Coins,
  Settings,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  fetchSales, 
  createSaleRecord, 
  updateSaleRecord, 
  deleteSaleRecord 
} from '../../services/api';
import { 
  getAdminSubscriptions, 
  getAdminSales, 
  saveAdminSales, 
  getAdminCommissionRate,
  saveAdminCommissionRate,
  isDummyCustomer,
  AdminSubscription 
} from './adminData';

export interface SaleItem {
  _id?: string;
  id?: string;
  saleId: string;
  source: 'Subscription' | 'Direct Order' | 'Corporate Catering' | 'Trial Pack' | 'Custom / Walk-in';
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  description: string;
  category: 'Weight Loss' | 'Balanced Health' | 'Muscle Gain' | 'Corporate Catering' | 'Trial Pack' | 'Single Meal' | 'Other';
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  dailyCommissionRate?: number;
  durationDays?: number;
  commissionAmount?: number;
  vendorPayout?: number;
  paymentMethod: 'UPI' | 'Credit/Debit Card' | 'Net Banking' | 'Cash' | 'Cheque / Bank Transfer';
  paymentStatus: 'Completed' | 'Pending' | 'Refunded';
  paymentReference?: string;
  saleDate: string;
  linkedId?: string;
  invoiceNotes?: string;
  createdAt?: string;
}

export interface FinancialPL {
  totalRevenue: number;
  totalPurchases: number;
  totalExpenses: number;
  totalCost: number;
  netProfit: number;
  profitMarginPercent: number;
}

export interface SalesMetrics {
  totalRevenue: number;
  totalCommission: number;
  totalVendorPayout: number;
  completedCount: number;
  pendingAmount: number;
  pendingCount: number;
  refundedAmount: number;
  refundedCount?: number;
  aov: number;
  categoryBreakdown?: Record<string, number>;
  methodBreakdown?: Record<string, number>;
  financialPL: FinancialPL;
}

const CATEGORIES = [
  'All',
  'Weight Loss',
  'Balanced Health',
  'Muscle Gain',
  'Corporate Catering',
  'Trial Pack',
  'Single Meal',
  'Other'
] as const;

const PAYMENT_STATUSES = ['All', 'Completed', 'Pending', 'Refunded'] as const;
const SOURCES = ['Subscription', 'Direct Order', 'Corporate Catering', 'Trial Pack', 'Custom / Walk-in'] as const;
const PAYMENT_METHODS = ['UPI', 'Credit/Debit Card', 'Net Banking', 'Cash', 'Cheque / Bank Transfer'] as const;

const deriveSalesFromSubscriptions = (subs: AdminSubscription[], rate?: number): SaleItem[] => {
  const activeRate = typeof rate === 'number' ? rate : getAdminCommissionRate();
  return subs
    .filter(sub => !isDummyCustomer(sub))
    .map(sub => {
      let category: SaleItem['category'] = 'Balanced Health';
      const pId = (sub.planId || '').toLowerCase();
      const pTitle = (sub.planTitle || '').toLowerCase();
      if (pId.includes('loss') || pTitle.includes('loss')) category = 'Weight Loss';
      else if (pId.includes('gain') || pTitle.includes('gain')) category = 'Muscle Gain';

      const cleanId = (sub.id || '').replace(/^SUB-/, '') || 'SUB';
      const saleDate = sub.startDate ? sub.startDate.split('T')[0] : new Date().toISOString().split('T')[0];

      let days = sub.durationDays;
      if (!days) {
        const match = (sub.duration || '').match(/\d+/);
        days = match ? parseInt(match[0], 10) : 30;
      }
      if (days <= 0) days = 30;

      const commissionAmount = days * activeRate;
      const vendorPayout = Math.max(0, sub.totalPrice - commissionAmount);

      return {
        id: `INV-${cleanId}`,
        saleId: `INV-${cleanId}`,
        source: 'Subscription',
        customerName: sub.customerName,
        customerEmail: sub.customerEmail,
        customerPhone: sub.customerPhone,
        description: `${sub.planTitle} (${sub.duration || `${days} Days`} - ${sub.mealsPerDay || 3} Meals/Day)`,
        category,
        quantity: 1,
        unitPrice: sub.totalPrice,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: sub.totalPrice,
        dailyCommissionRate: activeRate,
        durationDays: days,
        commissionAmount,
        vendorPayout,
        paymentMethod: 'UPI',
        paymentStatus: sub.status === 'Cancelled' ? 'Refunded' : 'Completed',
        paymentReference: sub.id,
        saleDate,
        linkedId: sub.id,
        invoiceNotes: `Automated subscription booking from plan ${sub.planTitle}. Platform Commission: ₹${commissionAmount.toLocaleString()} (${days} days @ ₹${activeRate}/day). Kitchen Payout: ₹${vendorPayout.toLocaleString()}.`
      };
    });
};

const calculateMetricsFromSales = (items: SaleItem[], defaultRate?: number): SalesMetrics => {
  const activeRate = typeof defaultRate === 'number' ? defaultRate : getAdminCommissionRate();
  let totalRevenue = 0;
  let totalCommission = 0;
  let totalVendorPayout = 0;
  let completedCount = 0;
  let pendingAmount = 0;
  let pendingCount = 0;
  let refundedAmount = 0;
  let refundedCount = 0;
  const categoryMap: Record<string, number> = {};
  const methodMap: Record<string, number> = {};

  items.forEach(s => {
    const days = s.durationDays || 30;
    const rate = s.dailyCommissionRate !== undefined ? s.dailyCommissionRate : activeRate;
    const itemCommission = s.commissionAmount !== undefined ? s.commissionAmount : (s.source === 'Subscription' ? days * rate : s.totalAmount);
    const itemVendor = s.vendorPayout !== undefined ? s.vendorPayout : Math.max(0, (s.totalAmount || 0) - itemCommission);

    if (s.paymentStatus === 'Completed') {
      totalRevenue += s.totalAmount || 0;
      totalCommission += itemCommission;
      totalVendorPayout += itemVendor;
      completedCount += 1;
      categoryMap[s.category] = (categoryMap[s.category] || 0) + (s.totalAmount || 0);
      methodMap[s.paymentMethod] = (methodMap[s.paymentMethod] || 0) + (s.totalAmount || 0);
    } else if (s.paymentStatus === 'Pending') {
      pendingAmount += s.totalAmount || 0;
      pendingCount += 1;
    } else if (s.paymentStatus === 'Refunded') {
      refundedAmount += s.totalAmount || 0;
      refundedCount += 1;
    }
  });

  const aov = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;
  const netProfit = totalCommission; // Platform net profit from management take-rate

  return {
    totalRevenue,
    totalCommission,
    totalVendorPayout,
    completedCount,
    pendingAmount,
    pendingCount,
    refundedAmount,
    refundedCount,
    aov,
    categoryBreakdown: categoryMap,
    methodBreakdown: methodMap,
    financialPL: {
      totalRevenue,
      totalPurchases: totalVendorPayout,
      totalExpenses: 0,
      totalCost: totalVendorPayout,
      netProfit,
      profitMarginPercent: totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0
    }
  };
};

export function AdminSales() {
  const [commissionRate, setCommissionRate] = useState<number>(getAdminCommissionRate);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [tempRate, setTempRate] = useState<number>(() => getAdminCommissionRate());

  const [sales, setSales] = useState<SaleItem[]>(() => {
    const saved = getAdminSales();
    const validSaved = saved.filter((s: any) => !isDummyCustomer(s));
    if (validSaved.length > 0) return validSaved;
    const subs = getAdminSubscriptions();
    return deriveSalesFromSubscriptions(subs, getAdminCommissionRate());
  });
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<SalesMetrics>(() => {
    const saved = getAdminSales();
    const validSaved = saved.filter((s: any) => !isDummyCustomer(s));
    const subs = getAdminSubscriptions();
    const rate = getAdminCommissionRate();
    const active = validSaved.length > 0 ? validSaved : deriveSalesFromSubscriptions(subs, rate);
    return calculateMetricsFromSales(active, rate);
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleItem | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<SaleItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    saleId: string;
    source: 'Subscription' | 'Direct Order' | 'Corporate Catering' | 'Trial Pack' | 'Custom / Walk-in';
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    description: string;
    category: 'Weight Loss' | 'Balanced Health' | 'Muscle Gain' | 'Corporate Catering' | 'Trial Pack' | 'Single Meal' | 'Other';
    quantity: number;
    unitPrice: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    paymentMethod: 'UPI' | 'Credit/Debit Card' | 'Net Banking' | 'Cash' | 'Cheque / Bank Transfer';
    paymentStatus: 'Completed' | 'Pending' | 'Refunded';
    paymentReference: string;
    saleDate: string;
    invoiceNotes: string;
  }>({
    saleId: '',
    source: 'Direct Order',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    description: '',
    category: 'Balanced Health',
    quantity: 1,
    unitPrice: 0,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
    paymentMethod: 'UPI',
    paymentStatus: 'Completed',
    paymentReference: '',
    saleDate: new Date().toISOString().split('T')[0],
    invoiceNotes: ''
  });

  const loadSalesData = async () => {
    setLoading(true);
    const activeRate = getAdminCommissionRate();
    try {
      const params: any = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await fetchSales(params);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const cleanSales = res.data.filter((s: any) => !isDummyCustomer(s));
        if (cleanSales.length > 0) {
          setSales(cleanSales);
          saveAdminSales(cleanSales);
          setMetrics(calculateMetricsFromSales(cleanSales, activeRate));
          return;
        }
      }
    } catch (err: any) {
      console.warn('Backend sales fetch notice, using active subscription ledger:', err);
    } finally {
      setLoading(false);
    }

    // Fallback: derive sales and metrics from subscription roster
    const currentSubs = getAdminSubscriptions();
    const currentDerived = deriveSalesFromSubscriptions(currentSubs, activeRate);
    const saved = getAdminSales();
    const validSaved = saved.filter((s: any) => !isDummyCustomer(s));
    const active = validSaved.length > 0 ? validSaved : currentDerived;
    setSales(active);
    setMetrics(calculateMetricsFromSales(active, activeRate));
  };

  const handleSaveCommissionRate = (e: React.FormEvent) => {
    e.preventDefault();
    const safeRate = Math.max(0, Number(tempRate) || 0);
    saveAdminCommissionRate(safeRate);
    setCommissionRate(safeRate);
    setShowCommissionModal(false);

    const subs = getAdminSubscriptions();
    const updated = deriveSalesFromSubscriptions(subs, safeRate);
    setSales(updated);
    setMetrics(calculateMetricsFromSales(updated, safeRate));
    saveAdminSales(updated);

    toast.success(`Platform commission updated to ₹${safeRate}/day per plan!`);
  };

  useEffect(() => {
    loadSalesData();

    const handleUpdate = () => {
      const activeRate = getAdminCommissionRate();
      setCommissionRate(activeRate);
      const subs = getAdminSubscriptions();
      const derived = deriveSalesFromSubscriptions(subs, activeRate);
      const saved = getAdminSales();
      const validSaved = saved.filter((s: any) => !isDummyCustomer(s));
      const active = validSaved.length > 0 ? validSaved : derived;
      setSales(active);
      setMetrics(calculateMetricsFromSales(active, activeRate));
    };

    window.addEventListener('shift24-subscriptions-updated', handleUpdate);
    window.addEventListener('shift24-commission-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('shift24-subscriptions-updated', handleUpdate);
      window.removeEventListener('shift24-commission-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [selectedCategory, selectedStatus]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadSalesData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtered by Time Filter in client
  const filteredSales = useMemo(() => {
    if (timeFilter === 'all') return sales;

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    return sales.filter(item => {
      const itemDate = new Date(item.saleDate);
      if (timeFilter === 'today') {
        return item.saleDate === todayStr;
      }
      if (timeFilter === '7days') {
        const diffTime = Math.abs(now.getTime() - itemDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      if (timeFilter === '30days') {
        const diffTime = Math.abs(now.getTime() - itemDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      }
      return true;
    });
  }, [sales, timeFilter]);

  // Handle Form Change with Auto Calculations
  const handleQuantityOrPriceChange = (qty: number, price: number, tax = formData.taxAmount, discount = formData.discountAmount) => {
    const subtotal = Math.max(0, qty * price);
    const calculatedTotal = Math.max(0, subtotal + Number(tax || 0) - Number(discount || 0));
    setFormData(prev => ({
      ...prev,
      quantity: qty,
      unitPrice: price,
      taxAmount: tax,
      discountAmount: discount,
      totalAmount: calculatedTotal
    }));
  };

  const openCreateModal = () => {
    const randomInv = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    setEditingSale(null);
    setFormData({
      saleId: randomInv,
      source: 'Direct Order',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      description: '',
      category: 'Balanced Health',
      quantity: 1,
      unitPrice: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 0,
      paymentMethod: 'UPI',
      paymentStatus: 'Completed',
      paymentReference: '',
      saleDate: new Date().toISOString().split('T')[0],
      invoiceNotes: ''
    });
    setShowAddModal(true);
  };

  const openEditModal = (sale: SaleItem) => {
    setEditingSale(sale);
    setFormData({
      saleId: sale.saleId,
      source: sale.source,
      customerName: sale.customerName,
      customerEmail: sale.customerEmail || '',
      customerPhone: sale.customerPhone,
      description: sale.description,
      category: sale.category,
      quantity: sale.quantity || 1,
      unitPrice: sale.unitPrice || sale.totalAmount,
      taxAmount: sale.taxAmount || 0,
      discountAmount: sale.discountAmount || 0,
      totalAmount: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
      paymentReference: sale.paymentReference || '',
      saleDate: sale.saleDate,
      invoiceNotes: sale.invoiceNotes || ''
    });
    setShowAddModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName.trim() || !formData.customerPhone.trim() || !formData.description.trim()) {
      toast.error('Please enter customer name, phone number, and description');
      return;
    }

    if (formData.totalAmount <= 0) {
      toast.error('Total sale amount must be greater than zero');
      return;
    }

    try {
      if (editingSale) {
        const idToUpdate = editingSale._id || editingSale.id || editingSale.saleId;
        try {
          await updateSaleRecord(idToUpdate, formData);
        } catch (_) {}
        const updated = sales.map(s => (s.saleId === editingSale.saleId || s.id === idToUpdate) ? { ...s, ...formData } : s);
        setSales(updated);
        saveAdminSales(updated);
        setMetrics(calculateMetricsFromSales(updated));
        toast.success('Sale record updated successfully');
        setShowAddModal(false);
      } else {
        try {
          await createSaleRecord(formData);
        } catch (_) {}
        const newSale: SaleItem = {
          ...formData,
          id: formData.saleId,
          saleId: formData.saleId
        };
        const updated = [newSale, ...sales];
        setSales(updated);
        saveAdminSales(updated);
        setMetrics(calculateMetricsFromSales(updated));
        toast.success('Sale & invoice recorded successfully');
        setShowAddModal(false);
      }
    } catch (err) {
      toast.error('Error submitting sale record');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      try {
        await deleteSaleRecord(id);
      } catch (_) {}
      const updated = sales.filter(s => s._id !== id && s.id !== id && s.saleId !== id);
      setSales(updated);
      saveAdminSales(updated);
      setMetrics(calculateMetricsFromSales(updated));
      toast.success('Sale record deleted successfully');
      setDeleteConfirmId(null);
    } catch (err) {
      toast.error('Error deleting sale record');
    }
  };

  const exportToCSV = () => {
    if (!filteredSales.length) {
      toast.error('No sales records to export');
      return;
    }

    const headers = [
      'Invoice ID',
      'Date',
      'Customer Name',
      'Phone',
      'Email',
      'Source',
      'Category',
      'Description',
      'Quantity',
      'Unit Price',
      'Tax Amount',
      'Discount',
      'Total Amount',
      'Payment Method',
      'Payment Status',
      'Reference No'
    ];

    const rows = filteredSales.map(s => [
      `"${s.saleId}"`,
      `"${s.saleDate}"`,
      `"${s.customerName}"`,
      `"${s.customerPhone}"`,
      `"${s.customerEmail || ''}"`,
      `"${s.source}"`,
      `"${s.category}"`,
      `"${s.description.replace(/"/g, '""')}"`,
      s.quantity || 1,
      s.unitPrice || s.totalAmount,
      s.taxAmount || 0,
      s.discountAmount || 0,
      s.totalAmount,
      `"${s.paymentMethod}"`,
      `"${s.paymentStatus}"`,
      `"${s.paymentReference || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `shift24-sales-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Sales ledger exported to CSV');
  };

  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Sales & Revenue</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Live Ledger
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Monitor meal subscription revenues, direct orders, corporate catering, and integrated business P&L
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs"
            title="Export filtered records to CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={loadSalesData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-50"
            title="Refresh sales ledger"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Sale / Invoice</span>
          </button>
        </div>
      </div>

      {/* Platform Commission Control Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white">Platform Commission Take-Rate</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-xs">
                ₹{commissionRate}/day per plan
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Your daily management fee cut from every subscriber. Automatically splits gross collections into Platform Profit vs Kitchen Vendor Payout.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-400 block font-medium">Earned Take-Rate</span>
            <span className="text-base font-black text-emerald-400 font-mono">₹{metrics.totalCommission.toLocaleString()}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setTempRate(commissionRate);
              setShowCommissionModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-900/50 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Set Commission Rate</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Gross Sales</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{metrics.totalRevenue.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{metrics.completedCount} Settled Orders</span>
            <span className="font-semibold text-emerald-600">Collections</span>
          </div>
        </div>

        {/* Platform Commission */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Commission</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">
              ₹{metrics.totalCommission.toLocaleString()}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              ₹{commissionRate}/day
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Daily Take-Rate</span>
            <span className="font-semibold text-emerald-600">Platform Profit</span>
          </div>
        </div>

        {/* Kitchen / Vendor Payout */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Kitchen Vendor Payout</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{metrics.totalVendorPayout.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Food & Fulfillment</span>
            <span className="font-semibold text-blue-600">Cost of Goods</span>
          </div>
        </div>

        {/* Net Operating Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-teal-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Net Operating Profit</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${metrics.financialPL.netProfit >= 0 ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-black tracking-tight ${metrics.financialPL.netProfit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              ₹{metrics.financialPL.netProfit.toLocaleString()}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${metrics.financialPL.profitMarginPercent >= 0 ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'}`}>
              {metrics.financialPL.profitMarginPercent}% Margin
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 truncate" title={`Commission: ₹${metrics.totalCommission} - Overheads: ₹${metrics.financialPL.totalExpenses}`}>
            Commission: ₹{metrics.totalCommission.toLocaleString()} • Overheads: ₹{metrics.financialPL.totalExpenses.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Analytics & Source Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category Breakdown */}
        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" /> Revenue by Plan & Category
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Distribution of gross booked revenue across fitness packages</p>
          
          <div className="mt-4 space-y-3">
            {metrics.categoryBreakdown && Object.keys(metrics.categoryBreakdown).length > 0 ? (
              Object.entries(metrics.categoryBreakdown).map(([cat, amount]) => {
                const amtNum = Number(amount) || 0;
                const pct = metrics.totalRevenue > 0 ? Math.round((amtNum / metrics.totalRevenue) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-700 font-semibold">{cat}</span>
                      <span className="text-slate-500 font-mono">₹{amtNum.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 italic py-2">No category revenue data recorded yet</p>
            )}
          </div>
        </div>

        {/* Payment Channels & Refund Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-500" /> Settlement Channels
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Customer payment gateways used</p>

            <div className="mt-4 space-y-2">
              {metrics.methodBreakdown && Object.keys(metrics.methodBreakdown).length > 0 ? (
                Object.entries(metrics.methodBreakdown).map(([method, amt]) => (
                  <div key={method} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 text-xs">
                    <span className="text-slate-600 font-medium">{method}</span>
                    <span className="font-bold text-slate-900 font-mono">₹{amt.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-2">No payment channels active yet</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-rose-500 font-medium">Total Refunds:</span>
            <span className="font-bold text-rose-600 font-mono">₹{metrics.refundedAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer, invoice #, phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Time Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            {(
              [
                { label: 'All Time', value: 'all' },
                { label: 'Today', value: 'today' },
                { label: 'Last 7 Days', value: '7days' },
                { label: 'This Month', value: '30days' }
              ] as const
            ).map(tab => (
              <button
                key={tab.value}
                onClick={() => setTimeFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  timeFilter === tab.value
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Filter:</span>
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            {PAYMENT_STATUSES.map(st => (
              <option key={st} value={st}>
                Status: {st}
              </option>
            ))}
          </select>

          {(selectedCategory !== 'All' || selectedStatus !== 'All' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSelectedStatus('All');
                setSearchQuery('');
                setTimeFilter('all');
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4">Invoice / ID</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Item / Description</th>
                <th className="py-3.5 px-4">Category & Source</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
                    Loading sales records...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No sales transactions found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Any customer subscriptions booked online or manual sales entered will appear here automatically.
                    </p>
                    <button
                      onClick={openCreateModal}
                      className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Record First Sale
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const id = sale._id || sale.id || sale.saleId;
                  return (
                    <tr key={id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Invoice ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <button
                          onClick={() => setViewingInvoice(sale)}
                          className="hover:text-emerald-600 hover:underline flex items-center gap-1"
                        >
                          <span>{sale.saleId}</span>
                        </button>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{sale.customerName}</div>
                        <div className="text-[11px] text-slate-400">{sale.customerPhone}</div>
                        {sale.customerEmail && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{sale.customerEmail}</div>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="font-medium text-slate-800 line-clamp-2" title={sale.description}>
                          {sale.description}
                        </div>
                        {sale.quantity > 1 && (
                          <span className="text-[10px] text-slate-400">Qty: {sale.quantity} × ₹{sale.unitPrice}</span>
                        )}
                      </td>

                      {/* Category & Source */}
                      <td className="py-3.5 px-4">
                        <div className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {sale.category}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {sale.source}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {sale.saleDate}
                      </td>

                      {/* Payment */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">{sale.paymentMethod}</span>
                        {sale.paymentReference && (
                          <span className="block text-[10px] text-slate-400 truncate max-w-[100px]">
                            Ref: {sale.paymentReference}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            sale.paymentStatus === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : sale.paymentStatus === 'Pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {sale.paymentStatus === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
                          {sale.paymentStatus === 'Pending' && <Clock className="w-3 h-3" />}
                          {sale.paymentStatus === 'Refunded' && <AlertCircle className="w-3 h-3" />}
                          {sale.paymentStatus}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          ₹{sale.totalAmount.toLocaleString()}
                        </div>
                        {sale.commissionAmount !== undefined && (
                          <div className="text-[10px] text-emerald-600 font-bold font-mono mt-0.5" title={`Platform Commission @ ₹${sale.dailyCommissionRate || commissionRate}/day`}>
                            ₹{sale.commissionAmount.toLocaleString()} Commission
                          </div>
                        )}
                        {sale.vendorPayout !== undefined && (
                          <div className="text-[10px] text-slate-400 font-mono" title="Kitchen Vendor Payout">
                            ₹{sale.vendorPayout.toLocaleString()} Kitchen
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingInvoice(sale)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                            title="View / Print Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(sale)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            title="Edit Record"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Modal: Record / Edit Sale */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingSale ? 'Edit Sale / Invoice' : 'Record New Sale'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record custom corporate catering, walk-in meal sales, or package bookings
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Invoice ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Invoice / Reference ID</label>
                  <input
                    type="text"
                    required
                    value={formData.saleId}
                    onChange={e => setFormData({ ...formData, saleId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Sale Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sale Date</label>
                  <input
                    type="date"
                    required
                    value={formData.saleDate}
                    onChange={e => setFormData({ ...formData, saleDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Customer Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Client Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar or TechCorp"
                      value={formData.customerName}
                      onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={formData.customerPhone}
                      onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. client@company.com"
                    value={formData.customerEmail}
                    onChange={e => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Source & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sale Source</label>
                  <select
                    value={formData.source}
                    onChange={e => setFormData({ ...formData, source: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    {SOURCES.map(src => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category / Plan</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Item / Plan Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High Protein Corporate Lunch (50 Boxes) or 1 Month Weight Loss"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Pricing Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={e => handleQuantityOrPriceChange(Number(e.target.value), formData.unitPrice)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.unitPrice}
                    onChange={e => handleQuantityOrPriceChange(formData.quantity, Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.totalAmount}
                    onChange={e => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-mono font-bold text-emerald-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Status</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={e => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">UTR / Ref Number</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI-998822"
                    value={formData.paymentReference}
                    onChange={e => setFormData({ ...formData, paymentReference: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Special instructions or billing terms..."
                  value={formData.invoiceNotes}
                  onChange={e => setFormData({ ...formData, invoiceNotes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all"
                >
                  {editingSale ? 'Save Changes' : 'Record Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View & Print Invoice */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Action Bar */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">Shift24 Tax Invoice Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={printInvoice}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setViewingInvoice(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="p-8 space-y-6 print:p-0">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Shift24 Food Co.</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Healthy Meal Plans & Artisanal Kitchen Services</p>
                  <p className="text-xs text-slate-400 mt-1">support@shift24food.com • +91 98765 43210</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">TAX INVOICE</span>
                  <span className="text-lg font-black font-mono text-slate-900 block mt-0.5">{viewingInvoice.saleId}</span>
                  <span className="text-xs text-slate-500 block mt-1">Date: {viewingInvoice.saleDate}</span>
                </div>
              </div>

              {/* Bill To Info */}
              <div className="grid grid-cols-2 gap-6 text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Billed To:</span>
                  <div className="font-bold text-slate-900 text-sm">{viewingInvoice.customerName}</div>
                  <div className="text-slate-600 mt-0.5">{viewingInvoice.customerPhone}</div>
                  {viewingInvoice.customerEmail && (
                    <div className="text-slate-500">{viewingInvoice.customerEmail}</div>
                  )}
                </div>

                <div className="text-right">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Payment Details:</span>
                  <div className="font-semibold text-slate-800">Method: {viewingInvoice.paymentMethod}</div>
                  {viewingInvoice.paymentReference && (
                    <div className="text-slate-500">Ref: {viewingInvoice.paymentReference}</div>
                  )}
                  <div className="mt-1">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        viewingInvoice.paymentStatus === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : viewingInvoice.paymentStatus === 'Pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {viewingInvoice.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4 text-center">Category</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Unit Price</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {viewingInvoice.description}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500">
                        {viewingInvoice.category}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {viewingInvoice.quantity || 1}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        ₹{(viewingInvoice.unitPrice || viewingInvoice.totalAmount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{viewingInvoice.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary Totals */}
              <div className="flex justify-end text-xs">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal / Order Price:</span>
                    <span className="font-mono font-semibold">₹{viewingInvoice.totalAmount.toLocaleString()}</span>
                  </div>
                  {viewingInvoice.commissionAmount !== undefined && (
                    <div className="flex justify-between text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/60">
                      <span>Platform Commission ({viewingInvoice.durationDays || 30}d @ ₹{viewingInvoice.dailyCommissionRate || commissionRate}/d):</span>
                      <span className="font-mono">₹{viewingInvoice.commissionAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {viewingInvoice.vendorPayout !== undefined && (
                    <div className="flex justify-between text-slate-600">
                      <span>Kitchen Fulfillment Payout:</span>
                      <span className="font-mono">₹{viewingInvoice.vendorPayout.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Tax / GST:</span>
                    <span className="font-mono">₹{(viewingInvoice.taxAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                    <span>Total Paid by Customer:</span>
                    <span className="font-mono text-emerald-600 font-black">
                      ₹{viewingInvoice.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewingInvoice.invoiceNotes && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                  <span className="font-bold block text-slate-700 mb-0.5">Notes / Terms:</span>
                  {viewingInvoice.invoiceNotes}
                </div>
              )}

              {/* Footer Stamp */}
              <div className="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
                Thank you for choosing Shift24! This is a computer-generated tax invoice.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-slate-100 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Sale Record?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove this record from the sales ledger? This will adjust your overall revenue metrics.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Set Commission Rate */}
      {showCommissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Set Platform Commission
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure your daily management fee taken per subscriber
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCommissionModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCommissionRate} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Daily Commission Rate (₹ / day)</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Currently: ₹{commissionRate}/day</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    required
                    value={tempRate}
                    onChange={(e) => setTempRate(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-9 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 text-lg focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    placeholder="100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">/ day / plan</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Quick Presets</span>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 75, 100, 150].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTempRate(preset)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        tempRate === preset
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ₹{preset}/day
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Projection Breakdown */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Projected Take-Rate Breakdown (@ ₹{tempRate}/day)
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">1-Day Trial:</span>
                    <span className="font-bold text-emerald-600 font-mono">₹{(1 * tempRate).toLocaleString()}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">7-Day Plan:</span>
                    <span className="font-bold text-emerald-600 font-mono">₹{(7 * tempRate).toLocaleString()}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">15-Day Plan:</span>
                    <span className="font-bold text-emerald-600 font-mono">₹{(15 * tempRate).toLocaleString()}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">30-Day Plan:</span>
                    <span className="font-bold text-emerald-600 font-mono">₹{(30 * tempRate).toLocaleString()}</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 pt-1">
                  💡 Kitchen payout = <span className="font-mono text-slate-600">Plan Total Price - Platform Commission</span>. Any changes will immediately update your sales revenue figures and persist across the system.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCommissionModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Save Commission Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
