import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  X, 
  ChefHat, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Receipt,
  AlertTriangle
} from 'lucide-react';
import { AdminOrder } from './adminData';

export interface KitchenTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayName: 'Today' | 'Tomorrow';
  dateISO: string;
  dateFormatted: string;
  activeSlot: 'All' | 'Breakfast' | 'Lunch' | 'Dinner';
  onSlotChange?: (slot: 'All' | 'Breakfast' | 'Lunch' | 'Dinner') => void;
  allDayOrders?: AdminOrder[];
  totalPortions?: number;
  dishCounts?: Record<string, number>;
  allergyAlerts?: AdminOrder[];
  orders?: AdminOrder[];
}

export function printKitchenTicketSlip(params: {
  dayName: 'Today' | 'Tomorrow';
  dateISO: string;
  dateFormatted: string;
  activeSlot: string;
  totalPortions: number;
  dishCounts: Record<string, number>;
  allergyAlerts: AdminOrder[];
  orders: AdminOrder[];
}) {
  let printFrame = document.getElementById('kitchen-ticket-iframe') as HTMLIFrameElement;
  if (!printFrame) {
    printFrame = document.createElement('iframe');
    printFrame.id = 'kitchen-ticket-iframe';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);
  }

  const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
  if (!frameDoc) {
    window.print();
    return;
  }

  const printedAt = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Filter allergy alerts strictly according to the active slot (All, Breakfast, Lunch, Dinner)
  const relevantAllergyAlerts = params.activeSlot === 'All'
    ? params.allergyAlerts
    : params.allergyAlerts.filter(a => a.mealType?.toLowerCase() === params.activeSlot.toLowerCase());

  const allergyCount = relevantAllergyAlerts.length;

  const dishesListHtml = Object.entries(params.dishCounts).map(([dish, count]) => `
    <tr>
      <td style="padding: 5px 0; font-weight: bold; border-bottom: 1px dotted #cbd5e1; font-size: 11px; color: #0f172a; word-break: break-word;">${dish}</td>
      <td style="padding: 5px 0; font-weight: 900; text-align: right; border-bottom: 1px dotted #cbd5e1; font-size: 13px; font-family: monospace; color: #047857; white-space: nowrap;">${count}x</td>
    </tr>
  `).join('');

  const allergyListHtml = allergyCount > 0
    ? relevantAllergyAlerts.map(alert => `
      <div style="padding: 6px 0; border-bottom: 1px dashed #fca5a5;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 900; font-size: 11px;">
          <span style="color: #0f172a;">${alert.customerName}</span>
          <span style="font-size: 9px; background: #fee2e2; color: #991b1b; padding: 1px 4px; border-radius: 3px; font-weight: 900; text-transform: uppercase;">${alert.mealType}</span>
        </div>
        <div style="font-size: 10px; color: #475569; margin-top: 1px; word-break: break-word;">Item: <strong>${alert.mealName}</strong></div>
        <div style="font-size: 10.5px; font-weight: 900; color: #b91c1c; margin-top: 2px; word-break: break-word;">
          ⚠️ ALLERGIES: ${alert.allergies.join(', ').toUpperCase()}
        </div>
      </div>
    `).join('')
    : `<div style="padding: 8px 0; font-size: 10px; color: #15803d; font-weight: bold; text-align: center;">✓ No allergen restrictions recorded for ${params.activeSlot === 'All' ? 'this batch' : params.activeSlot.toLowerCase()}.</div>`;

  const ordersChecklistHtml = params.orders.map(order => `
    <div style="display: flex; align-items: flex-start; padding: 4px 0; font-size: 10px; border-bottom: 1px dotted #e2e8f0;">
      <span style="display: inline-block; width: 11px; height: 11px; border: 1.5px solid #0f172a; margin-right: 6px; margin-top: 1px; flex-shrink: 0; border-radius: 1px;"></span>
      <div style="flex: 1; min-width: 0;">
        <span style="font-weight: 800; color: #0f172a;">#${order.id.slice(-4)}</span> • <strong>${order.mealName}</strong>
        <span style="font-size: 8.5px; background: #f1f5f9; color: #475569; padding: 0 4px; border-radius: 2px; font-weight: bold; text-transform: uppercase;">${order.mealType}</span>
        <div style="color: #64748b; font-size: 9px;">For ${order.customerName} • ${order.deliveryTimeSlot}</div>
      </div>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Kitchen Prep Ticket - Shift24 Food</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 2mm 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #0f172a;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
          }
          .receipt-slip {
            width: 74mm;
            max-width: 74mm;
            margin: 0 auto;
            padding: 4mm 2mm;
            background: #ffffff;
          }
        </style>
      </head>
      <body>
        <div class="receipt-slip">
          <!-- Top Border Dashed -->
          <div style="border-top: 1.5px dashed #0f172a; margin-bottom: 8px;"></div>

          <!-- Metadata Header -->
          <div style="padding-bottom: 6px; border-bottom: 1px dashed #94a3b8; font-size: 10px; line-height: 1.5;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">PREPARATION FOR:</span>
              <span style="font-weight: 900; color: #0f172a; text-transform: uppercase;">${params.dayName} (${params.dateISO})</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">DATE:</span>
              <span style="font-weight: bold; color: #0f172a;">${params.dateFormatted}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">MEAL SLOT:</span>
              <span style="font-weight: 900; color: #0f172a; text-transform: uppercase;">${params.activeSlot === 'All' ? 'ALL MEALS' : params.activeSlot}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">TOTAL PORTIONS:</span>
              <span style="font-weight: 900; font-size: 11px; color: #047857;">${params.totalPortions} PORTION${params.totalPortions === 1 ? '' : 'S'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #64748b;">
              <span>PRINTED:</span>
              <span style="font-weight: bold; color: #334155;">${printedAt}</span>
            </div>
          </div>

          <!-- SECTION 1: BATCH QUANTITY BREAKDOWN -->
          <div style="margin-top: 10px;">
            <div style="background: #0f172a; color: #ffffff; text-align: center; font-size: 10px; font-weight: 900; letter-spacing: 0.05em; padding: 4px 0; border-radius: 4px; text-transform: uppercase;">
              BATCH QUANTITY BREAKDOWN
            </div>
            <div style="font-size: 9px; color: #64748b; text-align: center; margin: 3px 0 6px 0;">Total portion count to cook and package</div>
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                ${dishesListHtml}
              </tbody>
            </table>
            <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 11px; padding: 5px 0; border-top: 2px solid #0f172a; margin-top: 4px;">
              <span>TOTAL PORTIONS:</span>
              <span style="font-size: 13px; font-family: monospace; color: #047857;">${params.totalPortions}</span>
            </div>
          </div>

          <!-- SECTION 2: CRITICAL ALLERGEN NOTICES -->
          <div style="margin-top: 12px; border: 2px solid ${allergyCount > 0 ? '#f43f5e' : '#10b981'}; padding: 7px; border-radius: 8px; background: ${allergyCount > 0 ? '#fff1f2' : '#f0fdf4'};">
            <div style="font-size: 10px; font-weight: 900; color: ${allergyCount > 0 ? '#be123c' : '#047857'}; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; border-bottom: 1px dashed ${allergyCount > 0 ? '#fecdd3' : '#a7f3d0'}; padding-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 4px;">
              ${allergyCount > 0 ? '⚠️ CRITICAL ALLERGEN NOTICES' : '✓ ALLERGEN STATUS'}
            </div>
            <div style="font-size: 9px; color: ${allergyCount > 0 ? '#9f1239' : '#065f46'}; margin-top: 3px; text-align: center;">
              ${allergyCount > 0 
                ? `${allergyCount} Order${allergyCount === 1 ? '' : 's'} require${allergyCount === 1 ? 's' : ''} sanitized utensils & separate cooking surfaces` 
                : `No allergen restrictions for ${params.activeSlot === 'All' ? 'this batch' : params.activeSlot.toLowerCase()}`
              }
            </div>
            <div style="margin-top: 6px;">
              ${allergyListHtml}
            </div>
          </div>

          <!-- SECTION 3: BOX PACKAGING CHECKLIST -->
          <div style="margin-top: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #0f172a; border-bottom: 1.5px solid #0f172a; padding-bottom: 2px; margin-bottom: 4px;">
              <span>PACKAGING CHECKLIST</span>
              <span>(${params.orders.length} BOX${params.orders.length === 1 ? '' : 'ES'})</span>
            </div>
            <div>
              ${ordersChecklistHtml}
            </div>
          </div>

          <!-- SECTION 4: CHEF SIGN-OFF -->
          <div style="margin-top: 14px; padding-top: 8px; border-top: 1px dashed #94a3b8; font-size: 9px; line-height: 1.5;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
              <div>
                <div>Station QC: [  ] PASS</div>
                <div>Temp Logged: [  ] YES</div>
              </div>
              <div style="text-align: right;">
                <div>Chef Sign: _______________</div>
              </div>
            </div>
            <div style="text-align: center; color: #94a3b8; font-size: 8px; margin-top: 6px;">
              SHIFT24 FOOD CO. • KITCHEN PREPARATION RUN TICKET
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  setTimeout(() => {
    try {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print failed:', e);
      window.print();
    }
  }, 250);
}

export function KitchenTicketModal({
  isOpen,
  onClose,
  dayName,
  dateISO,
  dateFormatted,
  activeSlot,
  onSlotChange,
  allDayOrders = [],
  totalPortions: initialPortions,
  dishCounts: initialDishCounts,
  allergyAlerts: initialAllergyAlerts,
  orders: initialOrders = []
}: KitchenTicketModalProps) {
  if (!isOpen) return null;

  // Local state for slot filtering within modal
  const [currentSlot, setCurrentSlot] = useState<'All' | 'Breakfast' | 'Lunch' | 'Dinner'>(activeSlot);

  // Sync when parent activeSlot prop changes
  useEffect(() => {
    setCurrentSlot(activeSlot);
  }, [activeSlot]);

  const handleSlotChange = (slot: 'All' | 'Breakfast' | 'Lunch' | 'Dinner') => {
    setCurrentSlot(slot);
    if (onSlotChange) {
      onSlotChange(slot);
    }
  };

  // Base pool of orders for this day (allDayOrders if provided, otherwise initialOrders)
  const baseOrders = allDayOrders && allDayOrders.length > 0 ? allDayOrders : initialOrders;

  // Filter orders according to currentSlot
  const currentOrders = currentSlot === 'All'
    ? baseOrders
    : baseOrders.filter(o => o.mealType?.toLowerCase() === currentSlot.toLowerCase());

  // Filter allergen notices strictly according to currentSlot
  const currentAllergyAlerts = currentOrders.filter(o => o.allergies && o.allergies.length > 0);
  const allergyCount = currentAllergyAlerts.length;

  // Compute dish breakdown counts strictly for currentSlot
  const currentDishCounts = currentOrders.reduce((acc, order) => {
    acc[order.mealName] = (acc[order.mealName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const currentTotalPortions = currentOrders.length;

  const handlePrint = () => {
    printKitchenTicketSlip({
      dayName,
      dateISO,
      dateFormatted,
      activeSlot: currentSlot,
      totalPortions: currentTotalPortions,
      dishCounts: currentDishCounts,
      allergyAlerts: currentAllergyAlerts,
      orders: currentOrders
    });
  };

  const printedAt = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Receipt className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Kitchen Prep Ticket Receipt
              </h3>
              <p className="text-[11px] text-slate-500">
                Formatted for POS 80mm thermal slip & kitchen run sheet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meal Slot Filter Tabs directly inside Modal */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600">Select Meal:</span>
            <div className="flex items-center gap-1 bg-slate-200/90 p-1 rounded-xl">
              {(['All', 'Breakfast', 'Lunch', 'Dinner'] as const).map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => handleSlotChange(slot)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentSlot === slot
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
            {currentTotalPortions} {currentTotalPortions === 1 ? 'Portion' : 'Portions'}
          </span>
        </div>

        {/* Modal Body / Ticket Slip Preview - BLOCK CONTAINER WITH AUTO EXPANDING HEIGHT (NO FLEX OVERFLOW BUGS) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
          {/* Authentic POS Paper Ticket Preview matching the screenshot */}
          <div className="w-full max-w-[380px] mx-auto bg-white rounded-2xl shadow-xl border border-slate-300 p-5 sm:p-6 font-mono text-[11px] text-slate-800 space-y-4 box-border">
            {/* Top Border Dashed */}
            <div className="border-t-2 border-dashed border-slate-300 w-full"></div>

            {/* Metadata Box */}
            <div className="border-b border-dashed border-slate-300 pb-3 text-[10px] space-y-1.5 w-full">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">PREPARATION FOR:</span>
                <span className="font-bold text-slate-900 uppercase">{dayName} ({dateISO})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">DATE:</span>
                <span className="font-bold text-slate-800">{dateFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">MEAL SLOT:</span>
                <span className="font-extrabold text-slate-900 uppercase">
                  {currentSlot === 'All' ? 'ALL MEALS' : currentSlot}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">TOTAL PORTIONS:</span>
                <span className="font-black text-emerald-700 text-xs">
                  {currentTotalPortions} PORTION{currentTotalPortions === 1 ? '' : 'S'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[9.5px] pt-1">
                <span>PRINTED:</span>
                <span className="font-medium text-slate-600">{printedAt}</span>
              </div>
            </div>

            {/* SECTION 1: Batch Quantity Breakdown */}
            <div className="space-y-2 w-full">
              <div className="bg-slate-900 text-white text-center text-[10px] font-bold py-1.5 px-2 rounded-lg uppercase tracking-wider">
                BATCH QUANTITY BREAKDOWN
              </div>
              <p className="text-[9px] text-slate-500 text-center">
                Total portion count to cook and package
              </p>

              <div className="divide-y divide-dotted divide-slate-200">
                {Object.entries(currentDishCounts).map(([dish, count]) => (
                  <div key={dish} className="py-2 flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 leading-snug break-words flex-1">{dish}</span>
                    <span className="font-black text-emerald-700 text-xs bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 shrink-0">
                      {count}x
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-center font-black text-xs">
                <span>TOTAL PORTIONS:</span>
                <span className="text-emerald-700 text-sm font-bold">{currentTotalPortions}</span>
              </div>
            </div>

            {/* SECTION 2: Critical Allergen Notices - STRICTLY FILTERED BY SELECTED MEAL SLOT */}
            <div className={`w-full box-border p-3.5 rounded-xl border-2 ${allergyCount > 0 ? 'bg-rose-50/90 border-rose-300' : 'bg-emerald-50/90 border-emerald-300'}`}>
              <div className="flex items-center justify-center gap-1.5 font-black text-[11px] uppercase tracking-wider text-rose-800 pb-1.5 border-b border-rose-200 text-center">
                {allergyCount > 0 ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>⚠️ CRITICAL ALLERGEN NOTICES</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-emerald-800">✓ ALLERGEN STATUS</span>
                  </>
                )}
              </div>
              
              <div className="text-[9.5px] text-slate-600 text-center mt-1.5">
                {allergyCount > 0
                  ? `${allergyCount} Order${allergyCount === 1 ? '' : 's'} require${allergyCount === 1 ? 's' : ''} sanitized utensils & separate cooking surfaces`
                  : `No critical allergen restrictions for ${currentSlot === 'All' ? 'this batch' : currentSlot.toLowerCase()}`
                }
              </div>

              {allergyCount > 0 && (
                <div className="mt-2.5 space-y-2.5 divide-y divide-dashed divide-rose-200">
                  {currentAllergyAlerts.map(alert => (
                    <div key={alert.id} className="pt-2.5 first:pt-0">
                      <div className="flex justify-between items-center gap-2 font-bold text-slate-900 text-[10.5px]">
                        <span className="truncate">{alert.customerName}</span>
                        <span className="bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0">
                          {alert.mealType}
                        </span>
                      </div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5 break-words">
                        Item: <strong>{alert.mealName}</strong>
                      </div>
                      <div className="font-black text-rose-700 text-[10px] mt-0.5 break-words">
                        ⚠️ ALLERGIES: {alert.allergies.join(', ').toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 3: Packaged Boxes Checklist */}
            <div className="space-y-1.5 pt-1 w-full">
              <div className="font-bold text-[10px] text-slate-900 uppercase border-b-2 border-slate-900 pb-1 flex justify-between items-center">
                <span>PACKAGING CHECKLIST</span>
                <span>({currentOrders.length} BOX{currentOrders.length === 1 ? '' : 'ES'})</span>
              </div>
              <div className="space-y-1.5 text-[9px]">
                {currentOrders.map(order => (
                  <div key={order.id} className="flex items-start gap-1.5 border-b border-dotted border-slate-200 pb-1.5">
                    <span className="w-3 h-3 border border-slate-800 rounded-2xs shrink-0 mt-0.5 inline-block" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        #{order.id.slice(-4)} &bull; {order.mealName}
                      </div>
                      <div className="text-slate-500 text-[8.5px] truncate">
                        For {order.customerName} &bull; {order.mealType} ({order.deliveryTimeSlot})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sign-Off Footer */}
            <div className="pt-3 border-t border-dashed border-slate-300 text-[9px] text-slate-600 space-y-1 w-full">
              <div className="flex justify-between items-end">
                <div>
                  <div>Station QC: [  ] PASS</div>
                  <div>Temp Logged: [  ] YES</div>
                </div>
                <div className="text-right">
                  <div>Chef Sign: ____________</div>
                </div>
              </div>
              <div className="text-center text-slate-400 text-[8px] pt-2">
                SHIFT24 FOOD CO. &bull; KITCHEN RUN TICKET
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Print Kitchen Ticket Slip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
