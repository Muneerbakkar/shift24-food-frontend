import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Search, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  UserCheck, 
  Filter, 
  ExternalLink, 
  RefreshCw, 
  X, 
  ArrowUpRight, 
  Check, 
  Phone, 
  Mail, 
  AlertCircle,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchAdminReferrals, markReferralPaid, deleteReferral } from '../../services/api';
import { showConfirmToast } from '../../utils/confirmToast';

export function AdminReferrals() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalCount: 0,
    eligibleCount: 0,
    paidCount: 0,
    totalPaidAmount: 0,
    totalPendingAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal for marking payout
  const [payoutModalReferral, setPayoutModalReferral] = useState<any | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminReferrals(filterStatus, searchQuery);
      if (res && res.success) {
        setReferrals(res.data || []);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenPayout = (referral: any) => {
    setPayoutModalReferral(referral);
    setPaymentRef(`GPay/UPI-${Date.now().toString().slice(-6)}`);
    setAdminNotes(`Manual ₹500 referral transfer to ${referral.referrerName}`);
  };

  const handleConfirmPayout = async () => {
    if (!payoutModalReferral) return;
    setSubmittingPayout(true);
    try {
      const res = await markReferralPaid(payoutModalReferral.referralId || payoutModalReferral._id, {
        paymentReference: paymentRef.trim(),
        adminNotes: adminNotes.trim()
      });
      if (res && res.success) {
        toast.success(`Marked ₹${payoutModalReferral.rewardAmount || 500} paid for ${payoutModalReferral.referrerName}`);
        setPayoutModalReferral(null);
        loadData();
      } else {
        toast.error(res?.message || 'Failed to update payout status');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error processing payout');
    } finally {
      setSubmittingPayout(false);
    }
  };

  // Copy everything needed to make the GPay/UPI transfer from your phone.
  const handleCopyPayoutDetails = async () => {
    if (!payoutModalReferral) return;
    const r = payoutModalReferral;
    const lines = [
      `Referral: ${r.referralId || r._id}`,
      `Pay: ₹${r.rewardAmount || 500}`,
      `Name: ${r.referrerName}`,
      `GPay/UPI number: ${r.referrerPhone || 'not added'}`,
      `Email: ${r.referrerEmail || '—'}`,
      `Referred: ${r.refereeName}`,
      `Plan: ${r.planTitle} (${r.duration})`
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success('Payout details copied — paste them in GPay/UPI');
    } catch {
      toast.error('Could not copy — long-press the details to copy manually');
    }
  };

  const handleDeleteReferral = (referral: any) => {
    const label = referral.referralId || referral._id;
    showConfirmToast({
      title: `Delete referral ${label}?`,
      description:
        `${referral.referrerName} → ${referral.refereeName} (${referral.planTitle}, ${referral.duration}).` +
        (referral.payoutStatus === 'Paid' ? ' This referral is marked as PAID — the payout record will be lost.' : '') +
        ' This cannot be undone.',
      confirmText: 'Delete',
      confirmButtonClass: 'bg-rose-600 hover:bg-rose-700 text-white',
      onConfirm: async () => {
        try {
          const res = await deleteReferral(label);
          if (res?.success) {
            toast.success(`Referral ${label} deleted`);
            loadData();
          } else {
            toast.error(res?.message || 'Could not delete referral');
          }
        } catch (e: any) {
          toast.error(e?.message || 'Could not delete referral');
        }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            <Gift className="w-4 h-4" />
            <span>Growth & Loyalty Program</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            Referrals & ₹500 Monthly Rewards
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage customer referrals and approve manual ₹500 payouts for completed 30-Day Monthly Plans.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-emerald-600 hover:border-emerald-200 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Referrals</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Gift className="w-4 h-4" /></span>
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">{stats.totalCount || 0}</span>
          <span className="text-xs text-slate-500">All registered referrals</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Eligible for Payout</span>
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl"><AlertCircle className="w-4 h-4" /></span>
          </div>
          <span className="text-2xl font-black text-amber-700 mt-2 block">{stats.eligibleCount || 0}</span>
          <span className="text-xs text-amber-700 font-medium">Monthly plans completed (Action Needed)</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Paid Out</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 className="w-4 h-4" /></span>
          </div>
          <span className="text-2xl font-black text-emerald-600 mt-2 block">₹{stats.totalPaidAmount || 0}</span>
          <span className="text-xs text-slate-500">{stats.paidCount || 0} rewards distributed</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Payout Due</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Clock className="w-4 h-4" /></span>
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">₹{stats.totalPendingAmount || 0}</span>
          <span className="text-xs text-slate-500">Awaiting admin transfer</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Referrals' },
            { id: 'eligible', label: 'Eligible for ₹500 (Action Required)' },
            { id: 'pending', label: 'Active Monthly Plans' },
            { id: 'paid', label: 'Paid Out' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Referrals List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Referrer (Gets ₹500)</th>
                <th className="py-3.5 px-4">Friend Referred</th>
                <th className="py-3.5 px-4">Plan & Duration</th>
                <th className="py-3.5 px-4">Subscription Status</th>
                <th className="py-3.5 px-4">Reward Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {referrals.length > 0 ? (
                referrals.map((r: any) => (
                  <tr key={r.referralId || r._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Referrer Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{r.referrerName}</div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="font-mono">{r.referrerPhone || 'No Phone'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-mono mt-0.5">
                        <span className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">{r.referralCode}</span>
                      </div>
                    </td>

                    {/* Friend Referred Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{r.refereeName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{r.refereePhone || r.refereeEmail}</div>
                      <span className="text-[10px] text-slate-400">Order: {r.subId}</span>
                    </td>

                    {/* Plan & Duration */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{r.planTitle}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span>{r.duration}</span>
                        {r.isMonthlyPlan ? (
                          <span className="bg-teal-50 text-teal-700 font-bold px-1.5 py-0.5 rounded text-[10px] border border-teal-200">
                            Monthly Plan
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">
                            Short Duration
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Subscription Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        r.subscriptionStatus === 'Completed'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : r.subscriptionStatus === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {r.subscriptionStatus}
                      </span>
                    </td>

                    {/* Reward Status */}
                    <td className="py-3.5 px-4">
                      {r.payoutStatus === 'Paid' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                            <Check className="w-3 h-3" /> Paid ₹500
                          </span>
                          {r.paymentReference && (
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                              Ref: {r.paymentReference}
                            </div>
                          )}
                        </div>
                      ) : r.payoutStatus === 'Eligible' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold text-[11px] animate-pulse">
                            <AlertCircle className="w-3 h-3" /> Ready for ₹500
                          </span>
                          <div className="text-[10px] text-amber-700 font-medium">Plan completed</div>
                        </div>
                      ) : r.isMonthlyPlan ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium text-[11px]">
                            <Clock className="w-3 h-3" /> Active (Pending)
                          </span>
                          <div className="text-[10px] text-slate-400">₹500 on 30-day completion</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Ineligible (Non-monthly)</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.payoutStatus === 'Paid' ? (
                          <span className="text-[11px] font-semibold text-emerald-600">Settled</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenPayout(r)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                              r.payoutStatus === 'Eligible'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            Mark ₹500 Paid
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteReferral(r)}
                          title={`Delete referral ${r.referralId || r._id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Gift className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-sm text-slate-600">No Referrals Found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery ? 'Try clearing your search query' : 'Referral records will appear here as customers share their codes'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Payout Confirmation Modal */}
      {payoutModalReferral && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Record ₹{payoutModalReferral.rewardAmount || 500} Referral Payout</h3>
                  <p className="text-xs text-slate-500">Confirm you transferred ₹{payoutModalReferral.rewardAmount || 500} to the referrer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayoutModalReferral(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Referrer Details */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Referral ID:</span>
                <span className="font-bold text-slate-900 font-mono">{payoutModalReferral.referralId || payoutModalReferral._id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Referrer Name:</span>
                <span className="font-bold text-slate-900">{payoutModalReferral.referrerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Referrer Phone (GPay/UPI):</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">{payoutModalReferral.referrerPhone || 'Check profile'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Referrer Email:</span>
                <span className="font-semibold text-slate-800 break-all text-right ml-3">{payoutModalReferral.referrerEmail || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Friend Referred:</span>
                <span className="font-semibold text-slate-800">{payoutModalReferral.refereeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plan Duration:</span>
                <span className="font-semibold text-slate-800">{payoutModalReferral.duration}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-900">Reward Due:</span>
                <span className="font-black text-emerald-700">₹{payoutModalReferral.rewardAmount || 500}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyPayoutDetails}
              className="w-full py-2 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Copy payout details (name, UPI number, amount)
            </button>

            {/* Payment Details Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Reference (UPI ID / GPay Ref ID)
                </label>                <input
                  type="text"
                  placeholder="e.g. GPay-402910384 or UPI Transaction ID"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Internal Admin Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sent ₹500 via GPay to phone number"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPayoutModalReferral(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingPayout}
                onClick={handleConfirmPayout}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {submittingPayout ? 'Recording...' : `Confirm ₹${payoutModalReferral.rewardAmount || 500} Paid`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
