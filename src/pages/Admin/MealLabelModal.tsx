import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  X, 
  Receipt
} from 'lucide-react';
import { AdminOrder } from './adminData';
import toast from 'react-hot-toast';

export interface MealLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: AdminOrder[];
  initialSelectedOrderId?: string | null;
}

// Crisp Vector Barcode Generator
export function BarcodeSvg({ value, height = 26 }: { value: string; height?: number }) {
  const bars: { width: number; isSpace: boolean }[] = [];
  
  // Guard start
  bars.push({ width: 2, isSpace: false });
  bars.push({ width: 1, isSpace: true });
  bars.push({ width: 1, isSpace: false });
  bars.push({ width: 2, isSpace: true });

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    bars.push({ width: (code % 3) + 1, isSpace: false });
    bars.push({ width: ((code >> 1) % 2) + 1, isSpace: true });
    bars.push({ width: ((code >> 2) % 3) + 1, isSpace: false });
    bars.push({ width: ((code >> 3) % 2) + 1, isSpace: true });
  }

  // Guard stop
  bars.push({ width: 2, isSpace: false });
  bars.push({ width: 1, isSpace: true });
  bars.push({ width: 3, isSpace: false });

  let totalWidth = 0;
  bars.forEach(b => { totalWidth += b.width + 1; });

  let currentX = 2;
  return (
    <div className="flex flex-col items-center select-none">
      <svg
        width={totalWidth + 6}
        height={height}
        viewBox={`0 0 ${totalWidth + 6} ${height}`}
        className="max-w-full"
      >
        {bars.map((bar, idx) => {
          const x = currentX;
          currentX += bar.width + 1;
          if (bar.isSpace) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={0}
              width={bar.width}
              height={height}
              fill="#0f172a"
            />
          );
        })}
      </svg>
      <span className="text-[10px] font-mono font-bold tracking-wider text-slate-800 mt-0.5">
        *{value}*
      </span>
    </div>
  );
}

export interface MealLabelCardProps {
  order: AdminOrder;
  format?: 'thermal' | 'sheet';
  isPrintVersion?: boolean;
  onPrintSingle?: (order: AdminOrder) => void;
  key?: React.Key;
}

// Authentic 80mm POS / Kitchen Order Receipt Slip Component
export function OrderReceiptCard({ 
  order, 
  isPrintVersion = false,
  onPrintSingle
}: MealLabelCardProps) {
  const hasAllergies = order.allergies && order.allergies.length > 0;

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Today';
    const lower = dateStr.toLowerCase();
    const today = new Date();
    const formatOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    
    if (lower === 'today') {
      return `Today (${today.toLocaleDateString('en-GB', formatOpts)})`;
    }
    if (lower === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return `Tomorrow (${tomorrow.toLocaleDateString('en-GB', formatOpts)})`;
    }
    return dateStr;
  };

  return (
    <div 
      className={`bg-white text-slate-900 font-mono text-xs select-none transition-all ${
        isPrintVersion 
          ? 'thermal-receipt-page w-[74mm] max-w-[74mm] mx-auto p-2' 
          : 'w-[80mm] max-w-[80mm] mx-auto p-5 rounded-2xl shadow-xl border border-slate-300 relative bg-white'
      }`}
      style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace' }}
    >
      {/* Brand Header */}
      <div className="text-center pb-3 border-b border-dashed border-slate-400">
        <div className="text-base font-black tracking-wider uppercase text-slate-900">
          SHIFT24 FOOD CO.
        </div>
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-0.5">
          Fresh Meal Prep & Artisanal Kitchen
        </div>
        <div className="text-[10px] text-slate-500 mt-1">
          Kakkanad, Kochi, Kerala
        </div>
        <div className="text-[10px] text-slate-500">
          Tel: +91 98765 43210 • shift24food.com
        </div>
      </div>

      {/* Receipt Meta */}
      <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
        <div className="flex justify-between font-bold">
          <span className="text-slate-500">RECEIPT #:</span>
          <span className="font-black text-slate-900">{order.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">DATE:</span>
          <span className="font-bold">{formatDateDisplay(order.deliveryDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">MEAL SLOT:</span>
          <span className="font-extrabold uppercase text-slate-900">{order.mealType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">SLOT TIME:</span>
          <span className="font-bold">{order.deliveryTimeSlot}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">STATUS:</span>
          <span className="font-bold uppercase text-emerald-700">{order.status}</span>
        </div>
      </div>

      {/* Customer Delivery Info */}
      <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px]">
        <div className="font-bold uppercase text-slate-400 text-[9px] tracking-wider mb-1">
          DELIVERY TO:
        </div>
        <div className="font-black text-sm text-slate-900">{order.customerName}</div>
        <div className="font-bold text-slate-700 mt-0.5">Ph: {order.customerPhone}</div>
        <div className="text-slate-600 mt-1 leading-snug break-words text-[10px]">
          {order.address}
        </div>
      </div>

      {/* Allergen Warning Banner (If customer reported any) */}
      {hasAllergies && (
        <div className="my-2.5 p-2 bg-rose-50 border border-dashed border-rose-500 rounded text-center">
          <div className="text-[10px] font-black uppercase text-rose-900 tracking-wider">
            *** ALLERGY ALERT ***
          </div>
          <div className="text-xs font-black text-rose-700 uppercase mt-0.5">
            {order.allergies.join(', ')}
          </div>
        </div>
      )}

      {/* Order Item Table */}
      <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px]">
        <div className="flex justify-between font-bold text-slate-500 text-[10px] border-b border-slate-200 pb-1 mb-1.5 uppercase">
          <span>ITEM</span>
          <span className="text-right">QTY &nbsp; PRICE</span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <div className="font-black text-slate-900 leading-tight">
                {order.mealName}
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                Plan: {order.planTitle}
              </div>
            </div>
            <div className="text-right font-mono font-bold shrink-0">
              1 &nbsp; ₹{order.amount || 150}
            </div>
          </div>
        </div>
      </div>

      {/* Billing Summary */}
      <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-500">Subtotal:</span>
          <span>₹{order.amount || 150}.00</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Delivery:</span>
          <span className="text-emerald-700 font-bold">FREE</span>
        </div>
        <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-200">
          <span>TOTAL:</span>
          <span>₹{order.amount || 150}.00</span>
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
          <span>Payment Method:</span>
          <span className="font-bold uppercase text-slate-800">{order.paymentMethod || 'Online / Paid'}</span>
        </div>
      </div>

      {/* Meal Prep Notes & Storage Instructions */}
      <div className="pt-2.5 text-center text-[10px] text-slate-500 space-y-0.5">
        <div className="font-bold text-slate-700 uppercase">
          Fresh Meal Prep Instructions
        </div>
        <div>Keep refrigerated &lt;4°C • Consume in 24h</div>
        <div>Microwave: Remove lid, heat 90 seconds</div>
        <div className="font-bold text-slate-800 pt-1">
          Thank you for choosing Shift24!
        </div>
        <div className="text-[9px] text-slate-400 font-mono tracking-widest pt-0.5">
          *** HAVE A HEALTHY MEAL ***
        </div>
      </div>

      {/* Barcode at bottom of receipt */}
      <div className="pt-2.5 mt-2 border-t border-dashed border-slate-300 flex justify-center">
        <BarcodeSvg value={order.id} height={24} />
      </div>

      {/* Quick Print Single Button (Screen Only, if requested) */}
      {!isPrintVersion && onPrintSingle && (
        <div className="mt-3 pt-2.5 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={() => onPrintSingle(order)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Print this receipt"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Print receipts using isolated hidden iframe for 100% reliable print previews
export function printOrdersUsingIframe(
  orders: AdminOrder[],
  labelStyle?: string,
  format?: string
) {
  let iframe = document.getElementById('shift24-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'shift24-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Today';
    const lower = dateStr.toLowerCase();
    const today = new Date();
    const formatOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    if (lower === 'today') return `Today (${today.toLocaleDateString('en-GB', formatOpts)})`;
    if (lower === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return `Tomorrow (${tomorrow.toLocaleDateString('en-GB', formatOpts)})`;
    }
    return dateStr;
  };

  const getBarcodeSvgMarkup = (val: string, h = 24) => {
    const bars: { width: number; isSpace: boolean }[] = [];
    bars.push({ width: 2, isSpace: false }, { width: 1, isSpace: true }, { width: 1, isSpace: false }, { width: 2, isSpace: true });
    for (let i = 0; i < val.length; i++) {
      const code = val.charCodeAt(i);
      bars.push({ width: (code % 3) + 1, isSpace: false });
      bars.push({ width: ((code >> 1) % 2) + 1, isSpace: true });
      bars.push({ width: ((code >> 2) % 3) + 1, isSpace: false });
      bars.push({ width: ((code >> 3) % 2) + 1, isSpace: true });
    }
    bars.push({ width: 2, isSpace: false }, { width: 1, isSpace: true }, { width: 3, isSpace: false });
    let totalW = 0;
    bars.forEach(b => { totalW += b.width + 1; });
    let curX = 2;
    let rects = '';
    bars.forEach(b => {
      const x = curX;
      curX += b.width + 1;
      if (!b.isSpace) {
        rects += `<rect x="${x}" y="0" width="${b.width}" height="${h}" fill="#0f172a" />`;
      }
    });
    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <svg width="${totalW + 6}" height="${h}" viewBox="0 0 ${totalW + 6} ${h}" style="display:block;margin:0 auto;">
          ${rects}
        </svg>
        <span style="font-size:10px;font-family:monospace;font-weight:bold;letter-spacing:0.1em;color:#0f172a;margin-top:2px;">*${val}*</span>
      </div>
    `;
  };

  const renderSingleReceiptHtml = (order: AdminOrder) => {
    const hasAllergies = order.allergies && order.allergies.length > 0;

    return `
      <div class="receipt-slip">
        <!-- Brand Header -->
        <div style="text-align: center; border-bottom: 1px dashed #94a3b8; padding-bottom: 8px;">
          <div style="font-size: 16px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; color: #0f172a;">SHIFT24 FOOD CO.</div>
          <div style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #64748b; margin-top: 2px;">Fresh Meal Prep & Artisanal Kitchen</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Kakkanad, Kochi, Kerala</div>
          <div style="font-size: 10px; color: #64748b;">Tel: +91 98765 43210 • shift24food.com</div>
        </div>

        <!-- Metadata -->
        <div style="padding: 8px 0; border-bottom: 1px dashed #94a3b8; font-size: 11px; line-height: 1.5;">
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span style="color: #64748b;">RECEIPT #:</span>
            <span style="font-weight: 900; color: #0f172a;">${order.id}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">DATE:</span>
            <span style="font-weight: bold;">${formatDateDisplay(order.deliveryDate)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">MEAL SLOT:</span>
            <span style="font-weight: 900; text-transform: uppercase; color: #0f172a;">${order.mealType}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">SLOT TIME:</span>
            <span style="font-weight: bold;">${order.deliveryTimeSlot}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">STATUS:</span>
            <span style="font-weight: bold; color: #047857; text-transform: uppercase;">${order.status}</span>
          </div>
        </div>

        <!-- Customer Info -->
        <div style="padding: 8px 0; border-bottom: 1px dashed #94a3b8; font-size: 11px;">
          <div style="font-weight: bold; font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">DELIVERY TO:</div>
          <div style="font-size: 13px; font-weight: 900; color: #0f172a;">${order.customerName}</div>
          <div style="font-size: 11px; font-weight: bold; color: #334155; margin-top: 2px;">Ph: ${order.customerPhone}</div>
          <div style="font-size: 10px; color: #475569; margin-top: 3px; line-height: 1.35;">${order.address}</div>
        </div>

        <!-- Allergies Notice -->
        ${hasAllergies ? `
          <div style="margin: 8px 0; padding: 6px 8px; background: #fff1f2; border: 1px dashed #f43f5e; border-radius: 4px; text-align: center;">
            <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #9f1239;">*** ALLERGY ALERT ***</div>
            <div style="font-size: 11px; font-weight: 900; color: #be123c; text-transform: uppercase; margin-top: 2px;">${order.allergies.join(', ')}</div>
          </div>
        ` : ''}

        <!-- Items Table -->
        <div style="padding: 8px 0; border-bottom: 1px dashed #94a3b8; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
            <span>ITEM</span>
            <span>QTY &nbsp; PRICE</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="padding-right: 8px;">
              <div style="font-weight: 900; color: #0f172a; line-height: 1.25;">${order.mealName}</div>
              <div style="font-size: 10px; color: #047857; font-weight: bold; margin-top: 2px;">Plan: ${order.planTitle}</div>
            </div>
            <div style="font-weight: bold; white-space: nowrap; font-family: monospace;">1 &nbsp; ₹${order.amount || 150}</div>
          </div>
        </div>

        <!-- Billing Summary -->
        <div style="padding: 8px 0; border-bottom: 1px dashed #94a3b8; font-size: 11px; line-height: 1.5;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Subtotal:</span>
            <span>₹${order.amount || 150}.00</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Delivery Fee:</span>
            <span style="color: #047857; font-weight: bold;">FREE</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">
            <span>TOTAL:</span>
            <span>₹${order.amount || 150}.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-top: 2px;">
            <span>Payment:</span>
            <span style="font-weight: bold; text-transform: uppercase;">${order.paymentMethod || 'Online / Paid'}</span>
          </div>
        </div>

        <!-- Preparation & Reheating -->
        <div style="padding-top: 8px; text-align: center; font-size: 10px; color: #64748b; line-height: 1.4;">
          <div style="font-weight: bold; color: #334155; text-transform: uppercase;">Fresh Meal Prep Instructions</div>
          <div>Keep refrigerated &lt;4°C • Consume in 24h</div>
          <div>Microwave safe: Remove lid & heat 90s</div>
          <div style="font-weight: bold; color: #0f172a; margin-top: 4px;">Thank you for choosing Shift24!</div>
          <div style="font-size: 9px; color: #94a3b8; letter-spacing: 0.1em; margin-top: 2px;">*** HAVE A HEALTHY MEAL ***</div>
        </div>

        <!-- Barcode -->
        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; text-align: center;">
          ${getBarcodeSvgMarkup(order.id, 24)}
        </div>
      </div>
    `;
  };

  const bodyContent = orders.map(o => renderSingleReceiptHtml(o)).join('');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Order Receipt</title>
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
            padding: 3mm 2mm;
            background: #ffffff;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .receipt-slip:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }, 200);
}

// Order Receipt Preview Modal (Supports Single & Multiple Receipt Printing)
export function MealLabelModal({ 
  isOpen, 
  onClose, 
  orders, 
  initialSelectedOrderId = null 
}: MealLabelModalProps) {
  const isSingleMode = Boolean(initialSelectedOrderId);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Initialize selected order IDs when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialSelectedOrderId) {
        setSelectedOrderIds(new Set([initialSelectedOrderId]));
      } else {
        setSelectedOrderIds(new Set(orders.map(o => o.id)));
      }
    }
  }, [isOpen, initialSelectedOrderId, orders]);

  if (!isOpen) return null;

  const ordersToDisplay = isSingleMode
    ? orders.filter(o => o.id === initialSelectedOrderId)
    : orders;

  const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));

  const toggleOrderSelection = (id: string) => {
    const next = new Set(selectedOrderIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedOrderIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === orders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(orders.map(o => o.id)));
    }
  };

  const handlePrint = () => {
    const toPrint = isSingleMode ? ordersToDisplay : selectedOrders;
    if (toPrint.length === 0) {
      toast.error('Please select at least one receipt to print.');
      return;
    }
    printOrdersUsingIframe(toPrint);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">
                  {isSingleMode ? 'Order Receipt' : 'Print Multiple Receipts'}
                </h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                  {isSingleMode 
                    ? ordersToDisplay[0]?.id 
                    : `${selectedOrders.length} of ${orders.length}`
                  }
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                80mm POS Thermal Slip
              </p>
            </div>
          </div>

          {/* Close Button Only (NO Print Receipt button at top) */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If multiple receipts mode and more than 1 order, show quick Select All bar */}
        {!isSingleMode && orders.length > 1 && (
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-2 cursor-pointer"
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold ${
                selectedOrderIds.size === orders.length
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white border-slate-400 text-transparent'
              }`}>
                ✓
              </span>
              <span>
                {selectedOrderIds.size === orders.length ? 'Deselect All' : 'Select All'} ({orders.length})
              </span>
            </button>
            <span className="text-[11px] text-slate-500 font-medium">
              Scroll down to review receipts
            </span>
          </div>
        )}

        {/* Receipt Preview Area (Centered authentic 80mm receipt slips) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-100 space-y-5">
          {ordersToDisplay.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No orders selected.
            </div>
          ) : (
            ordersToDisplay.map((order) => {
              const isSelected = selectedOrderIds.has(order.id);
              return (
                <div key={order.id} className="relative max-w-[80mm] mx-auto">
                  {!isSingleMode && (
                    <div className="flex items-center justify-between pb-1.5 px-1">
                      <span className="text-[11px] font-mono font-bold text-slate-600">
                        {order.id} • {order.customerName}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleOrderSelection(order.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {isSelected ? '✓ Included' : '+ Excluded'}
                      </button>
                    </div>
                  )}
                  <div className={`transition-opacity duration-150 ${!isSelected && !isSingleMode ? 'opacity-40 grayscale-40' : ''}`}>
                    <OrderReceiptCard order={order} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-[11px] font-mono text-slate-500">
            Thermal Roll: 80mm
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isSingleMode ? ordersToDisplay.length === 0 : selectedOrders.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                {isSingleMode 
                  ? 'Print Receipt' 
                  : `Print ${selectedOrders.length} Receipt${selectedOrders.length === 1 ? '' : 's'}`
                }
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
