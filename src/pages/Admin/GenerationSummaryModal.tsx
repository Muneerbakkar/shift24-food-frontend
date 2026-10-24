import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Pause, 
  CalendarX, 
  CheckCircle2, 
  AlertTriangle, 
  Phone, 
  ShieldCheck, 
  Clock, 
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';

export interface GenerationSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot?: 'Breakfast' | 'Lunch' | 'Dinner' | string | null;
  targetDate: string;
  generatedOrdersCount?: number;
  skippedSubscriptions: Array<{
    subId: string;
    customerName: string;
    customerPhone?: string;
    planTitle?: string;
    skippedDate?: string;
    reason: string;
  }>;
  pausedSubscriptions: Array<{
    subId: string;
    customerName: string;
    customerPhone?: string;
    planTitle?: string;
    pauseStartDate?: string;
    pauseEndDate?: string;
    reason: string;
  }>;
}

export const GenerationSummaryModal: React.FC<GenerationSummaryModalProps> = ({
  isOpen,
  onClose,
  slot,
  targetDate,
  generatedOrdersCount = 0,
  skippedSubscriptions = [],
  pausedSubscriptions = []
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'paused' | 'skipped'>('all');

  if (!isOpen) return null;

  const totalNotices = pausedSubscriptions.length + skippedSubscriptions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg tracking-tight">Order Generation Summary</h3>
                {slot && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wide">
                    {slot}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Target Date: <strong className="text-slate-200">{targetDate || 'Today'}</strong></span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close summary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Overview Stat Badges */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/70">
          {/* Generated Count */}
          <div className="p-4 flex flex-col items-center text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Generated
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1">
              {generatedOrdersCount}
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              Ready for dispatch
            </span>
          </div>

          {/* Paused Count */}
          <div className="p-4 flex flex-col items-center text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Pause className="w-3.5 h-3.5 text-indigo-600" />
              Paused
            </span>
            <span className="text-2xl font-black text-indigo-900 mt-1">
              {pausedSubscriptions.length}
            </span>
            <span className="text-[11px] text-indigo-700 font-semibold mt-0.5">
              Deliveries on hold
            </span>
          </div>

          {/* Skipped Count */}
          <div className="p-4 flex flex-col items-center text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <CalendarX className="w-3.5 h-3.5 text-amber-600" />
              Skipped
            </span>
            <span className="text-2xl font-black text-amber-900 mt-1">
              {skippedSubscriptions.length}
            </span>
            <span className="text-[11px] text-amber-700 font-semibold mt-0.5">
              Customer opted out
            </span>
          </div>
        </div>

        {/* Informational Policy Banner */}
        <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-200/60 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Zero-Waste Dispatch Policy:</span> Meals are strictly not prepared or scheduled for subscriptions that are paused or date-skipped, saving kitchen resources and preventing misplaced runs.
          </div>
        </div>

        {/* Tab Filters */}
        <div className="px-5 pt-3 pb-1 border-b border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Excluded Subscriptions ({totalNotices})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paused')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'paused'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <Pause className="w-3 h-3" />
            <span>Paused ({pausedSubscriptions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('skipped')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'skipped'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <CalendarX className="w-3 h-3" />
            <span>Skipped ({skippedSubscriptions.length})</span>
          </button>
        </div>

        {/* Body List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {totalNotices === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-slate-800 text-sm">All Active Subscriptions Dispatched!</p>
              <p className="text-xs text-slate-500 mt-1">
                There are no subscriptions currently on pause or skipped for this delivery date.
              </p>
            </div>
          ) : (
            <>
              {/* Paused Section */}
              {(activeTab === 'all' || activeTab === 'paused') && pausedSubscriptions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-950 uppercase tracking-wider px-1">
                    <span className="flex items-center gap-1.5">
                      <Pause className="w-3.5 h-3.5 text-indigo-600" />
                      Paused Subscriptions ({pausedSubscriptions.length})
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold normal-case">No orders generated</span>
                  </div>

                  <div className="space-y-2">
                    {pausedSubscriptions.map((sub, idx) => (
                      <div 
                        key={`paused-${sub.subId}-${idx}`}
                        className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 hover:border-indigo-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black flex-shrink-0 mt-0.5">
                            {sub.customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-sm">{sub.customerName}</span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-indigo-800 border border-indigo-200">
                                {sub.subId}
                              </span>
                            </div>
                            <p className="text-slate-500 text-[11px] mt-0.5 font-medium">
                              {sub.planTitle || 'Meal Plan'}
                            </p>
                            <p className="text-indigo-900 font-semibold text-xs mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-indigo-600" />
                              <span>{sub.reason}</span>
                            </p>
                          </div>
                        </div>

                        {sub.customerPhone && (
                          <div className="sm:text-right flex-shrink-0">
                            <a 
                              href={`tel:${sub.customerPhone}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-slate-700 font-bold hover:text-indigo-600 hover:border-indigo-300 transition-colors text-[11px]"
                            >
                              <Phone className="w-3 h-3 text-indigo-500" />
                              <span>{sub.customerPhone}</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped Section */}
              {(activeTab === 'all' || activeTab === 'skipped') && skippedSubscriptions.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-950 uppercase tracking-wider px-1">
                    <span className="flex items-center gap-1.5">
                      <CalendarX className="w-3.5 h-3.5 text-amber-600" />
                      Date-Skipped Subscriptions ({skippedSubscriptions.length})
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold normal-case">Customer requested skip</span>
                  </div>

                  <div className="space-y-2">
                    {skippedSubscriptions.map((sub, idx) => (
                      <div 
                        key={`skipped-${sub.subId}-${idx}`}
                        className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 hover:border-amber-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black flex-shrink-0 mt-0.5">
                            {sub.customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-sm">{sub.customerName}</span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-amber-900 border border-amber-300">
                                {sub.subId}
                              </span>
                            </div>
                            <p className="text-slate-500 text-[11px] mt-0.5 font-medium">
                              {sub.planTitle || 'Meal Plan'}
                            </p>
                            <p className="text-amber-900 font-semibold text-xs mt-1 flex items-center gap-1">
                              <CalendarX className="w-3 h-3 text-amber-700" />
                              <span>{sub.reason}</span>
                            </p>
                          </div>
                        </div>

                        {sub.customerPhone && (
                          <div className="sm:text-right flex-shrink-0">
                            <a 
                              href={`tel:${sub.customerPhone}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-slate-700 font-bold hover:text-amber-700 hover:border-amber-300 transition-colors text-[11px]"
                            >
                              <Phone className="w-3 h-3 text-amber-600" />
                              <span>{sub.customerPhone}</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Active Orders and Run Sheet updated successfully.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>Got it, View Orders</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default GenerationSummaryModal;
