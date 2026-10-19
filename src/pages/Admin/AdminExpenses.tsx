import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  Download, 
  Clock,
  RefreshCw,
  PieChart as PieChartIcon,
  Tag,
  Building,
  CreditCard,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  fetchExpenses, 
  createExpenseRecord, 
  updateExpenseRecord, 
  deleteExpenseRecord 
} from '../../services/api';

export interface ExpenseItem {
  _id?: string;
  id?: string;
  title: string;
  category: 
    | 'Kitchen Equipment & Utensils'
    | 'Utilities (Gas, Electricity, Water)'
    | 'Rent & Facilities'
    | 'Staff & Wages'
    | 'Packaging & Disposables'
    | 'Delivery & Logistics'
    | 'Marketing & Ads'
    | 'Maintenance & Repairs'
    | 'Software & Subscriptions'
    | 'Miscellaneous';
  amount: number;
  expenseDate: string;
  paymentMethod: 'UPI' | 'Bank Transfer' | 'Cash' | 'Credit Card' | 'Cheque';
  paidTo: string;
  referenceNumber?: string;
  status: 'Paid' | 'Pending' | 'Due';
  notes?: string;
}

const EXPENSE_CATEGORIES = [
  'All',
  'Kitchen Equipment & Utensils',
  'Utilities (Gas, Electricity, Water)',
  'Rent & Facilities',
  'Staff & Wages',
  'Packaging & Disposables',
  'Delivery & Logistics',
  'Marketing & Ads',
  'Maintenance & Repairs',
  'Software & Subscriptions',
  'Miscellaneous'
] as const;

const PAYMENT_METHODS = ['UPI', 'Bank Transfer', 'Cash', 'Credit Card', 'Cheque'] as const;
const EXPENSE_STATUSES = ['Paid', 'Pending', 'Due'] as const;

const LOCAL_STORAGE_EXPENSES_KEY = 'shift24_admin_expenses';

function getLocalExpenses(): ExpenseItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EXPENSES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

function saveLocalExpenses(items: ExpenseItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_EXPENSES_KEY, JSON.stringify(items));
  } catch (e) {
    console.error(e);
  }
}

export function AdminExpenses() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => getLocalExpenses());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseItem['category']>('Utilities (Gas, Electricity, Water)');
  const [amount, setAmount] = useState<number | ''>('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<ExpenseItem['paymentMethod']>('UPI');
  const [paidTo, setPaidTo] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [status, setStatus] = useState<ExpenseItem['status']>('Paid');
  const [notes, setNotes] = useState('');

  // Delete Confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadExpenses = async (filterOverrides?: {
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
      const res = await fetchExpenses({
        category: cat && cat !== 'All' ? cat : undefined,
        status: stat && stat !== 'All' ? stat : undefined,
        search: sTerm ? sTerm : undefined,
        startDate: sDate || undefined,
        endDate: eDate || undefined
      });

      if (res && res.success && Array.isArray(res.data)) {
        setExpenses(res.data);
        saveLocalExpenses(res.data);
      } else {
        const local = getLocalExpenses();
        setExpenses(local);
      }
    } catch (e) {
      console.warn('Could not load expenses from backend, using local cache:', e);
      const local = getLocalExpenses();
      setExpenses(local);
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
    await loadExpenses({ category: 'All', status: 'All', search: '', startDate: '', endDate: '' });
    toast.success('Filters reset to default & expenses refreshed');
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedCategory, selectedStatus, startDate, endDate]);

  const openAddModal = () => {
    setEditingId(null);
    setTitle('');
    setCategory('Utilities (Gas, Electricity, Water)');
    setAmount('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('UPI');
    setPaidTo('');
    setReferenceNumber('');
    setStatus('Paid');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: ExpenseItem) => {
    setEditingId(item._id || item.id || null);
    setTitle(item.title);
    setCategory(item.category);
    setAmount(item.amount);
    setExpenseDate(item.expenseDate || new Date().toISOString().split('T')[0]);
    setPaymentMethod(item.paymentMethod || 'UPI');
    setPaidTo(item.paidTo || '');
    setReferenceNumber(item.referenceNumber || '');
    setStatus(item.status || 'Paid');
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount === '' || !paidTo.trim()) {
      toast.error('Please enter Expense Title, Amount, and Paid To');
      return;
    }

    setSubmitting(true);
    const payload = {
      title: title.trim(),
      category,
      amount: Number(amount),
      expenseDate,
      paymentMethod,
      paidTo: paidTo.trim(),
      referenceNumber: referenceNumber.trim() || undefined,
      status,
      notes: notes.trim() || undefined
    };

    try {
      if (editingId) {
        const res = await updateExpenseRecord(editingId, payload);
        const updatedRecord: ExpenseItem = (res && res.data) ? res.data : { ...payload, _id: editingId };
        const updatedList = expenses.map(e => (e._id === editingId || e.id === editingId) ? updatedRecord : e);
        setExpenses(updatedList);
        saveLocalExpenses(updatedList);
        toast.success('Expense record updated successfully');
        setIsModalOpen(false);
        loadExpenses();
      } else {
        const res = await createExpenseRecord(payload);
        const newRecord: ExpenseItem = (res && res.data) ? res.data : { ...payload, _id: 'local_exp_' + Date.now() };
        const updatedList = [newRecord, ...expenses.filter(e => e._id !== newRecord._id)];
        setExpenses(updatedList);
        saveLocalExpenses(updatedList);
        toast.success('Operational expense recorded successfully');
        setIsModalOpen(false);
        loadExpenses();
      }
    } catch (err: any) {
      if (editingId) {
        const fallbackRecord: ExpenseItem = { ...payload, _id: editingId };
        const updatedList = expenses.map(e => (e._id === editingId || e.id === editingId) ? fallbackRecord : e);
        setExpenses(updatedList);
        saveLocalExpenses(updatedList);
        toast.success('Expense record updated locally');
      } else {
        const fallbackRecord: ExpenseItem = { ...payload, _id: 'local_exp_' + Date.now() };
        const updatedList = [fallbackRecord, ...expenses];
        setExpenses(updatedList);
        saveLocalExpenses(updatedList);
        toast.success('Operational expense recorded locally');
      }
      setIsModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpenseRecord(id);
    } catch (err: any) {
      console.warn('Backend delete notice:', err);
    }
    const updatedList = expenses.filter(e => e._id !== id && e.id !== id);
    setExpenses(updatedList);
    saveLocalExpenses(updatedList);
    toast.success('Expense record removed');
    setDeletingId(null);
  };

  // Metrics
  const totalAmount = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const paidAmount = expenses.filter(e => e.status === 'Paid').reduce((acc, e) => acc + (e.amount || 0), 0);
  const pendingAmount = expenses.filter(e => e.status !== 'Paid').reduce((acc, e) => acc + (e.amount || 0), 0);

  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  const filteredExpenses = expenses.filter(e => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.title.toLowerCase().includes(term) ||
      e.paidTo.toLowerCase().includes(term) ||
      (e.referenceNumber && e.referenceNumber.toLowerCase().includes(term))
    );
  });

  const exportToCSV = () => {
    const listToExport = filteredExpenses.length > 0 ? filteredExpenses : expenses;
    if (listToExport.length === 0) {
      toast.error('No expenses to export');
      return;
    }
    const headers = [
      'S.No',
      'Date', 
      'Expense Title', 
      'Category', 
      'Amount (INR)', 
      'Paid To', 
      'Reference / Bill Number', 
      'Payment Mode', 
      'Status', 
      'Notes'
    ];
    const rows = listToExport.map((e, index) => [
      `="${index + 1}"`,
      `="${e.expenseDate || ''}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${(e.category || '').replace(/"/g, '""')}"`,
      `="${e.amount ?? 0}"`,
      `"${(e.paidTo || '').replace(/"/g, '""')}"`,
      `"${(e.referenceNumber || '').replace(/"/g, '""')}"`,
      `"${e.paymentMethod || ''}"`,
      `"${e.status || ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Shift24_Operational_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Expenses CSV exported successfully');
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            <Wallet className="w-4 h-4" />
            <span>Financial Operations & Accounting</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Operational Expenses & Overheads
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Track non-ingredient kitchen overheads, rent, utilities, staff payouts, delivery logistics, and maintenance.
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
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Expenses */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Overheads</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              ₹{totalAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{expenses.length} expense vouchers logged</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Paid / Cleared */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Disbursed / Paid</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
              ₹{paidAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">Settled Payments</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Check className="w-6 h-6" />
          </div>
        </div>

        {/* Due / Pending */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Payable / Due</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
              ₹{pendingAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-amber-600 font-semibold mt-1">Pending Invoices</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Top Expense Head */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Largest Expense Head</div>
            <div className="text-sm sm:text-base font-black text-slate-900 mt-1 truncate max-w-[150px]">
              {Object.keys(categoryTotals).length > 0 
                ? (Object.entries(categoryTotals) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0]
                : 'None'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {Object.keys(categoryTotals).length > 0 
                ? `₹${Number((Object.entries(categoryTotals) as [string, number][]).sort((a, b) => b[1] - a[1])[0][1]).toLocaleString('en-IN')} allocated`
                : 'No overhead recorded'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <PieChartIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by title, paid to, ref #..."
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
            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Category:</span>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[200px] truncate"
            >
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Due">Due</option>
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-xl border border-slate-200 transition-colors shadow-xs"
              title="Refresh Expenses & Reset Filters"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Expense Title</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Paid To</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Payment Method</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-emerald-600" />
                    Loading expenses data...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                    <Wallet className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                    <div className="text-sm font-bold text-slate-700">No expenses recorded yet</div>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "Record Expense" above to record kitchen gas, electricity, rent, or staff salaries.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(item => (
                  <tr key={item._id || item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Date */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{item.expenseDate}</div>
                      <div className="text-[10px] text-slate-400">
                        {item.referenceNumber ? `#${item.referenceNumber}` : 'Voucher'}
                      </div>
                    </td>

                    {/* Title */}
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-slate-900 text-sm">{item.title}</div>
                      {item.notes && (
                        <div className="text-[11px] text-slate-400 italic truncate max-w-xs">{item.notes}</div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 inline-block max-w-[180px] truncate">
                        {item.category}
                      </span>
                    </td>

                    {/* Paid To */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{item.paidTo}</div>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-sm font-black text-slate-900">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* Payment Method */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-700">{item.paymentMethod}</span>
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
                          title="Edit Expense"
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

      {/* Add/Edit Modal */}
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
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 font-extrabold flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {editingId ? 'Edit Overhead Expense' : 'Record Operational Expense'}
                </h3>
                <p className="text-xs text-slate-500">
                  Log operational utility, rent, maintenance, or logistics payments.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Expense Description / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial Gas Cylinder Refill, Kitchen Exhaust Service"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                />
              </div>

              {/* Category & Date */}
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
                    {EXPENSE_CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Amount & Paid To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 3500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Paid To / Vendor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bharat Petroleum, Building Owner, Technician"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Payment Mode & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                  >
                    {EXPENSE_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Bill / Voucher #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EXP-1029"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Internal Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly recurring bill; approved by operations head"
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
                  {submitting ? 'Saving Record...' : editingId ? 'Update Expense' : 'Save Expense'}
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
            <h4 className="text-base font-black text-slate-900">Delete Expense Entry?</h4>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              This will remove this overhead record from the database. This action cannot be undone.
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

export default AdminExpenses;
