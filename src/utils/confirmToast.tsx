import React from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmToastOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  iconBgClass?: string;
  icon?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  toastId?: string;
  duration?: number;
}

export const showConfirmToast = ({
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700 text-white',
  iconBgClass = 'bg-red-50 text-red-600 border border-red-100',
  icon,
  onConfirm,
  onCancel,
  toastId,
  duration = 10000
}: ConfirmToastOptions) => {
  const id = toastId || `confirm-toast-${Date.now()}`;
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'
        } transition-all duration-200 ease-out max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto p-4 border border-slate-200 ring-1 ring-black/5 flex flex-col gap-3 z-50`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl shrink-0 ${iconBgClass}`}>
            {icon || <AlertTriangle className="w-5 h-5 text-red-600" />}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-900 leading-snug">
              {title}
            </h4>
            {description && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              toast.dismiss(t.id);
              if (onCancel) onCancel();
            }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={async () => {
              toast.dismiss(t.id);
              await onConfirm();
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    ),
    { id, duration }
  );
};
