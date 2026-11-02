import React, { useState, useEffect } from 'react';
import { X, Download, Share, PlusSquare } from 'lucide-react';
import {
  isIOSDevice,
  isAppInstalled,
  canPromptInstall,
  subscribeInstallPrompt,
  promptInstall,
} from '../../services/installPrompt';

export function InstallAppModal() {
  const [open, setOpen] = useState(false);
  const [deferredAvailable, setDeferredAvailable] = useState(canPromptInstall());

  useEffect(() => {
    if (isAppInstalled()) return;

    const show = () => {
      if (isAppInstalled()) return;
      setOpen(true);
    };

    // Show immediately for iOS (no beforeinstallprompt event)
    if (isIOSDevice()) {
      const t = setTimeout(show, 800);
      return () => clearTimeout(t);
    }

    // Android/Chrome: show when prompt becomes available
    const unsub = subscribeInstallPrompt((available) => {
      setDeferredAvailable(available);
      if (available) show();
    });

    // Fallback: if prompt already captured before mount
    if (canPromptInstall()) show();

    return () => unsub();
  }, []);

  const close = () => {
    setOpen(false);
  };

  const install = async () => {
    if (isIOSDevice()) {
      // iOS has no programmatic prompt; keep guide visible
      return;
    }
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      setOpen(false);
    }
  };

  if (!open || isAppInstalled()) return null;

  const ios = isIOSDevice();

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Download className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Install Shift24</h3>
              <p className="text-xs text-slate-500">Add to your home screen</p>
            </div>
          </div>
          <button onClick={close} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {ios ? (
            <div className="space-y-3 text-sm text-slate-700">
              <p className="font-semibold">How to install on iPhone / iPad:</p>
              <ol className="list-decimal list-inside space-y-2 text-slate-600">
                <li className="flex items-start gap-2">
                  <Share className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                  <span>Tap the <strong>Share</strong> button at the bottom of Safari.</span>
                </li>
                <li className="flex items-start gap-2">
                  <PlusSquare className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                  <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                </li>
                <li>Tap <strong>Add</strong> in the top right corner.</li>
              </ol>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Install Shift24 on your device for a faster, app-like experience with quick access from your home screen.
              </p>
              {deferredAvailable ? (
                <button
                  onClick={install}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Install App
                </button>
              ) : (
                <p className="text-xs text-slate-400 text-center">
                  Install prompt not available on this browser. Try Chrome on Android.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={close}
            className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium py-2"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
