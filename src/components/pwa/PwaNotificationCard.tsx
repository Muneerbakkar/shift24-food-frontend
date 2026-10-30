import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Smartphone, 
  Download, 
  CheckCircle2, 
  Share, 
  Send, 
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  isPushSupported, 
  isIOS, 
  isStandalone, 
  getNotificationPermission, 
  getCurrentPushSubscription,
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications, 
  sendTestPushToPhone 
} from '../../services/pushNotificationService';

interface PwaNotificationCardProps {
  role?: 'customer' | 'admin' | 'driver';
  userEmail?: string;
  userName?: string;
  compact?: boolean;
}

export function PwaNotificationCard({
  role = 'customer',
  userEmail,
  userName,
  compact = false
}: PwaNotificationCardProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  const email = (userEmail || localStorage.getItem('userEmail') || '').toLowerCase().trim();
  const name = userName || localStorage.getItem('userName') || 'Customer';

  // Check support, standalone state, and permission
  useEffect(() => {
    setIsSupported(isPushSupported());
    setIsAppInstalled(isStandalone());
    setPermission(getNotificationPermission());

    const checkSubscription = async () => {
      const sub = await getCurrentPushSubscription();
      setIsSubscribed(!!sub);
    };
    checkSubscription();

    // Listen for beforeinstallprompt (Android / Chrome PWA install)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handlePushStatusChanged = () => {
      checkSubscription();
      setPermission(getNotificationPermission());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('shift24-push-status-changed', handlePushStatusChanged);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('shift24-push-status-changed', handlePushStatusChanged);
    };
  }, []);

  const handleEnablePush = async () => {
    setLoading(true);
    try {
      const res = await subscribeToPushNotifications(role, email, name);
      if (res.success) {
        setIsSubscribed(true);
        setPermission('granted');
        toast.success(res.message || 'Phone push notifications enabled!');
      } else {
        toast.error(res.message || 'Could not enable notifications');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error subscribing to notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDisablePush = async () => {
    setLoading(true);
    try {
      await unsubscribeFromPushNotifications(role);
      setIsSubscribed(false);
      toast.success('Push notifications turned off on this device.');
    } catch {
      toast.error('Failed to turn off notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestPush = async () => {
    setTesting(true);
    try {
      const res = await sendTestPushToPhone(role, email);
      if (res.success) {
        toast.success(res.message || 'Test notification sent to your phone!');
      } else {
        toast.error(res.message || 'Failed to send test notification');
      }
    } catch {
      toast.error('Could not deliver test notification');
    } finally {
      setTesting(false);
    }
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsAppInstalled(true);
        toast.success('Shift24 App installed to Home Screen!');
      }
      setDeferredPrompt(null);
    } else if (isIOS()) {
      setShowIosGuide(true);
    }
  };

  const roleTitle = role === 'admin' ? 'Admin Portal' : role === 'driver' ? 'Driver Dispatch' : 'Meal Orders';
  const roleDescription = role === 'admin'
    ? 'Receive instant phone alerts for new subscriptions, payments, and fleet dispatches.'
    : role === 'driver'
    ? 'Receive phone alerts when kitchen assigns orders and routes are updated.'
    : 'Receive phone notifications when your meal is cooking, out for delivery, or arrived at your door in Kakkanad.';

  if (!isSupported) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg border border-emerald-500/20 mb-8 overflow-hidden relative">
      {/* Background glow decoration */}
      <div className="absolute -right-16 -top-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        
        {/* Left Info */}
        <div className="flex items-start gap-4 max-w-xl">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-400">
            <Smartphone className="w-6 h-6" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                Mobile Phone Notifications (Android & iOS PWA)
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {roleTitle}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-2">
              {roleDescription}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <span className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-emerald-400 ring-2 ring-emerald-400/30 animate-pulse' : 'bg-slate-500'}`}></span>
                <span>{isSubscribed ? 'Phone Push Active' : 'Push Inactive on this Device'}</span>
              </span>

              {isAppInstalled && (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Installed as App</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end shrink-0">
          
          {/* PWA Install Button (Android / iOS) */}
          {!isAppInstalled && (deferredPrompt || isIOS()) && (
            <button
              onClick={handleInstallApp}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isIOS() ? 'Add to Home Screen' : 'Install App'}</span>
            </button>
          )}

          {/* Subscribe / Test Buttons */}
          {isSubscribed ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSendTestPush}
                disabled={testing}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Test on Phone</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDisablePush}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-full bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-rose-400 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                Disable
              </button>
            </div>
          ) : (
            <button
              onClick={handleEnablePush}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enabling...</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>Enable Push Notifications</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>

      {/* iOS Safari Home Screen Guide Modal / Dropdown */}
      {showIosGuide && (
        <div className="mt-4 p-4 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-200 text-xs animate-in fade-in duration-200">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Share className="w-4 h-4 text-emerald-400" />
              <span>How to Install on iPhone / iPad (iOS Safari):</span>
            </h4>
            <button 
              onClick={() => setShowIosGuide(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-300 ml-1">
            <li>In Safari, tap the <strong className="text-white">Share</strong> button at the bottom of the screen (the square with an arrow pointing up).</li>
            <li>Scroll down and tap <strong className="text-white">'Add to Home Screen'</strong> (Plus icon).</li>
            <li>Tap <strong className="text-white">Add</strong> in the top right corner.</li>
            <li>Open the <strong className="text-white">Shift24</strong> app icon on your home screen to receive push notifications on iOS!</li>
          </ol>
        </div>
      )}
    </div>
  );
}
