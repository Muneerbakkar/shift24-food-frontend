import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Calendar, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  Download, 
  Layers, 
  ArrowUpDown,
  ShoppingBag,
  Building2,
  RefreshCw,
  Clock,
  PieChart as PieChartIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  fetchPurchases, 
  createPurchaseRecord, 
  updatePurchaseRecord, 
  deletePurchaseRecord 
} from '../../services/api';

export interface PurchaseItem {
  _id?: string;
  id?: string;
  itemName: string;
  category: 'Vegetables' | 'Meat & Poultry' | 'Seafood' | 'Dairy & Eggs' | 'Grains & Pulses' | 'Spices & Oils' | 'Packaging' | 'Other';
  quantity: number;
  unit: 'kg' | 'g' | 'liters' | 'ml' | 'packets' | 'pieces' | 'boxes';
  unitCost: number;
  totalCost: number;
  supplier: string;
  invoiceNumber?: string;
  purchaseDate: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'UPI' | 'Credit Card' | 'Cheque';
  status: 'Paid' | 'Pending' | 'Credit';
  notes?: string;
}

const CATEGORIES = [
  'All',
  'Vegetables',
  'Meat & Poultry',
  'Seafood',
  'Dairy & Eggs',
  'Grains & Pulses',
  'Spices & Oils',
  'Packaging',
  'Other'
] as const;

const UNITS = ['kg', 'g', 'liters', 'ml', 'packets', 'pieces', 'boxes'] as const;
const PAYMENT_METHODS = ['UPI', 'Cash', 'Bank Transfer', 'Credit Card', 'Cheque'] as const;
const STATUSES = ['Paid', 'Pending', 'Credit'] as const;

const LOCAL_STORAGE_KEY = 'shift24_admin_purchases';

function getLocalPurchases(): PurchaseItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

function saveLocalPurchases(items: PurchaseItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error(e);
  }
}

export function AdminPurchases() {
  const [purchases, setPurchases] = useState<PurchaseItem[]>(() => getLocalPurchases());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<PurchaseItem['category']>('Vegetables');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState<PurchaseItem['unit']>('kg');
  const [unitCost, setUnitCost] = useState<number | ''>('');
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PurchaseItem['paymentMethod']>('UPI');
  const [status, setStatus] = useState<PurchaseItem['status']>('Paid');
  const [notes, setNotes] = useState('');

  // Delete Confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async (filterOverrides?: {
    category?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setLoading(true);
    const cat = filterOverrides && 'category' in filterOverrides ? filterOverrides.category : selectedCategory;
    const stat = filterOverrides && 'status' in filterOverrides ? filterOverrides.status : selectedStatus;
    const sTerm = filterOverrides && 'search' in filterOverrides ? filterOverrides.search : searchTerm;
    const sDate = filterOverrides && 'startDate' in filterOverrides ? filterOverrides.startDate : startDate;
    const eDate = filterOverrides && 'endDate' in filterOverrides ? filterOverrides.endDate : endDate;

    try {
      const res = await fetchPurchases({
        category: cat && cat !== 'All' ? cat : undefined,
        status: stat && stat !== 'All' ? stat : undefined,
        search: sTerm ? sTerm : undefined,
        startDate: sDate || undefined,
        endDate: eDate || undefined,
      });

      if (res && res.success && Array.isArray(res.data)) {
        setPurchases(res.data);
        saveLocalPurchases(res.data);
      } else {
        const local = getLocalPurchases();
        setPurchases(local);
      }
    } catch (err) {
      console.warn('Could not load purchases from backend, using local cache:', err);
      const local = getLocalPurchases();
      setPurchases(local);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedStatus('All');
    setStartDate('');
    setEndDate('');
    await loadData({ category: 'All', status: 'All', search: '', startDate: '', endDate: '' });
    toast.success('Filters reset to default & purchases refreshed');
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedStatus, startDate, endDate]);

  const openAddModal = () => {
    setEditingId(null);
    setItemName('');
    setCategory('Vegetables');
    setQuantity('');
    setUnit('kg');
    setUnitCost('');
    setSupplier('');
    setInvoiceNumber('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('UPI');
    setStatus('Paid');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: PurchaseItem) => {
    setEditingId(item._id || item.id || null);
    setItemName(item.itemName);
    setCategory(item.category);
    setQuantity(item.quantity);
    setUnit(item.unit);
    setUnitCost(item.unitCost);
    setSupplier(item.supplier || '');
    setInvoiceNumber(item.invoiceNumber || '');
    setPurchaseDate(item.purchaseDate || new Date().toISOString().split('T')[0]);
    setPaymentMethod(item.paymentMethod || 'UPI');
    setStatus(item.status || 'Paid');
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || quantity === '' || unitCost === '') {
      toast.error('Please fill in Item Name, Quantity, and Unit Cost');
      return;
    }

    setSubmitting(true);
    const totalCost = Number(quantity) * Number(unitCost);
    const payload = {
      itemName: itemName.trim(),
      category,
      quantity: Number(quantity),
      unit,
      unitCost: Number(unitCost),
      totalCost,
      supplier: supplier.trim() || 'Wholesale Vendor',
      invoiceNumber: invoiceNumber.trim() || undefined,
      purchaseDate,
      paymentMethod,
      status,
      notes: notes.trim() || undefined
    };

    try {
      if (editingId) {
        const res = await updatePurchaseRecord(editingId, payload);
        const updatedRecord: PurchaseItem = (res && res.data) ? res.data : { ...payload, _id: editingId };
        const updatedList = purchases.map(p => (p._id === editingId || p.id === editingId) ? updatedRecord : p);
        setPurchases(updatedList);
        saveLocalPurchases(updatedList);
        toast.success('Purchase record updated successfully');
        setIsModalOpen(false);
        loadData();
      } else {
        const res = await createPurchaseRecord(payload);
        const newRecord: PurchaseItem = (res && res.data) ? res.data : { ...payload, _id: 'local_purch_' + Date.now() };
        const updatedList = [newRecord, ...purchases.filter(p => p._id !== newRecord._id)];
        setPurchases(updatedList);
        saveLocalPurchases(updatedList);
        toast.success('Ingredient expense recorded successfully');
        setIsModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      if (editingId) {
        const fallbackRecord: PurchaseItem = { ...payload, _id: editingId };
        const updatedList = purchases.map(p => (p._id === editingId || p.id === editingId) ? fallbackRecord : p);
        setPurchases(updatedList);
        saveLocalPurchases(updatedList);
        toast.success('Purchase record updated locally');
      } else {
        const fallbackRecord: PurchaseItem = { ...payload, _id: 'local_purch_' + Date.now() };
        const updatedList = [fallbackRecord, ...purchases];
        setPurchases(updatedList);
        saveLocalPurchases(updatedList);
        toast.success('Ingredient expense recorded locally');
      }
      setIsModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePurchaseRecord(id);
    } catch (err: any) {
      console.warn('Backend delete notice:', err);
    }
    const updatedList = purchases.filter(p => p._id !== id && p.id !== id);
    setPurchases(updatedList);
    saveLocalPurchases(updatedList);
    toast.success('Purchase entry deleted');
    setDeletingId(null);
  };

  // Metrics
  const totalSpend = purchases.reduce((acc, p) => acc + (p.totalCost || 0), 0);
  const paidSpend = purchases.filter(p => p.status === 'Paid').reduce((acc, p) => acc + (p.totalCost || 0), 0);
  const pendingSpend = purchases.filter(p => p.status !== 'Paid').reduce((acc, p) => acc + (p.totalCost || 0), 0);
  
  // Category Breakdown
  const categoryTotals = purchases.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + (p.totalCost || 0);
    return acc;
  }, {} as Record<string, number>);

  const filteredPurchases = purchases.filter(p => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.itemName.toLowerCase().includes(term) ||
      (p.supplier && p.supplier.toLowerCase().includes(term)) ||
      (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(term))
    );
  });

  // Export CSV
  const exportToCSV = () => {
    const listToExport = filteredPurchases.length > 0 ? filteredPurchases : purchases;
    if (listToExport.length === 0) {
      toast.error('No purchase records to export');
      return;
    }
    const headers = [
      'S.No',
      'Date',
      'Item Name', 
      'Category', 
      'Quantity', 
      'Unit', 
      'Unit Cost (INR)', 
      'Total Cost (INR)', 
      'Supplier', 
      'Invoice Number', 
      'Payment Method', 
      'Status', 
      'Notes'
    ];
    const rows = listToExport.map((p, index) => [
      `="${index + 1}"`,
      `="${p.purchaseDate || ''}"`,
      `"${(p.itemName || '').replace(/"/g, '""')}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      `="${p.quantity ?? 0}"`,
      `"${p.unit || ''}"`,
      `="${p.unitCost ?? 0}"`,
      `="${p.totalCost ?? 0}"`,
      `"${(p.supplier || '').replace(/"/g, '""')}"`,
      `"${(p.invoiceNumber || '').replace(/"/g, '""')}"`,
      `"${p.paymentMethod || ''}"`,
      `"${p.status || ''}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Shift24_Ingredient_Purchases_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Purchases CSV exported successfully');
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Kitchen Inventory & Financials</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Ingredient Purchases & Expense Tracker
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Log raw ingredient procurements, track grocery and wholesale vendor expenses, and monitor meal costs.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Purchase</span>
          </button>
        </div>
      </div>

      {/* Analytics & Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Spend */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Ingredient Spend</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              ₹{totalSpend.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{purchases.length} total procurement items</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* Paid Expenses */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Settled / Paid</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
              ₹{paidSpend.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">Directly Cleared</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Check className="w-6 h-6" />
          </div>
        </div>

        {/* Pending / Credit */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Payable / Vendor Credit</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
              ₹{pendingSpend.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-amber-600 font-semibold mt-1">Pending Invoices</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Top Category */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Primary Category</div>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-1 truncate max-w-[150px]">
              {Object.keys(categoryTotals).length > 0 
                ? (Object.entries(categoryTotals) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0]
                : 'None'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {Object.keys(categoryTotals).length > 0 
                ? `₹${Number((Object.entries(categoryTotals) as [string, number][]).sort((a, b) => b[1] - a[1])[0][1]).toLocaleString()} spent`
                : 'No expense recorded'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <PieChartIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search ingredient, vendor, invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-800"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Category:</span>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Credit">Credit</option>
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-xl border border-slate-200 transition-colors shadow-xs"
              title="Refresh Purchases & Reset Filters"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Purchases Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Ingredient / Item</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Quantity & Rate</th>
                <th className="px-5 py-4">Total Cost</th>
                <th className="px-5 py-4">Vendor / Invoice</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-emerald-600" />
                    Loading ingredient purchase records...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                    <div className="text-sm font-bold text-slate-700">No ingredient purchases recorded yet</div>
                    <p className="text-xs text-slate-400 mt-1">
                      Click the "Record Purchase" button above to log your first ingredient or grocery spend.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(item => (
                  <tr key={item._id || item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Date */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{item.purchaseDate}</div>
                      <div className="text-[10px] text-slate-400">{item.paymentMethod}</div>
                    </td>

                    {/* Item Name */}
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-slate-900 text-sm">{item.itemName}</div>
                      {item.notes && (
                        <div className="text-[11px] text-slate-400 italic truncate max-w-xs">{item.notes}</div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.category}
                      </span>
                    </td>

                    {/* Quantity & Rate */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800">
                        {item.quantity} {item.unit}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        ₹{item.unitCost} / {item.unit}
                      </div>
                    </td>

                    {/* Total Cost */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-sm font-black text-slate-900">
                        ₹{Number(item.totalCost || 0).toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* Vendor & Invoice */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800">{item.supplier || 'Wholesale Vendor'}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.invoiceNumber ? `#${item.invoiceNumber}` : 'Direct Slip'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        item.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : item.status === 'Pending'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                          title="Edit Purchase"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(item._id || item.id || null)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200 my-8">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {editingId ? 'Edit Ingredient Purchase' : 'Record New Ingredient Spend'}
                </h3>
                <p className="text-xs text-slate-500">
                  Enter supplier, quantities, and cost metrics for kitchen accounting.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ingredient / Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chicken Breast, Broccoli, Olive Oil, Brown Rice"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                />
              </div>

              {/* Category & Purchase Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Quantity, Unit, Unit Cost */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 10"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Unit *
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                  >
                    {UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Unit Cost (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 240"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Computed Total Preview */}
              {quantity !== '' && unitCost !== '' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">Total Purchase Amount:</span>
                  <span className="text-base font-black text-emerald-700">
                    ₹{(Number(quantity) * Number(unitCost)).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {/* Supplier & Invoice Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Supplier / Vendor Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kochi Wholesale Fish Mart"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Invoice / Receipt #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-881"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Payment Method & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Internal Notes / Batch Info
                </label>
                <input
                  type="text"
                  placeholder="e.g. Quality checked; stored in deep freezer unit 2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Saving Record...' : editingId ? 'Update Purchase' : 'Save Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-slate-900">Delete Purchase Entry?</h4>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              This will remove this procurement record from the database. This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPurchases;
