export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailureResponse {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: {
      order_id: string;
      payment_id: string;
    };
  };
}

export interface RazorpayCheckoutOptions {
  key?: string;
  amount: number; // in paise
  currency?: string;
  orderId?: string;
  order_id?: string;
  name?: string;
  description?: string;
  image?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  preferredMethod?: 'card' | 'upi' | 'netbanking' | 'wallet';
  notes?: Record<string, any>;
  themeColor?: string;
  isMock?: boolean;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onFailure?: (response: RazorpayFailureResponse) => void;
  onDismiss?: () => void;
}

/**
 * Ensures the Razorpay checkout.js script is loaded in the DOM.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      return resolve(true);
    }
    const existingScript = document.getElementById('razorpay-checkout-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay Checkout script');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Opens Razorpay Standard Checkout modal.
 * If running with dev mock order, handles simulated completion.
 */
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  const activeOrderId = options.orderId || options.order_id || '';
  const rzpKey = options.key || (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || '';

  // If running with dev mock order, handles simulated completion.
  if (options.isMock || activeOrderId.startsWith('order_mock_')) {
    console.log('[Razorpay Dev Mode] Simulating test payment for order:', activeOrderId);
    
    // Simulate brief processing delay for realistic UX
    setTimeout(() => {
      options.onSuccess({
        razorpay_order_id: activeOrderId,
        razorpay_payment_id: `pay_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        razorpay_signature: `sig_mock_${Math.random().toString(36).substring(2)}`
      });
    }, 800);
    return;
  }

  const loaded = await loadRazorpayScript();
  if (!loaded || !(window as any).Razorpay) {
    throw new Error('Razorpay payment gateway failed to load. Please check your internet connection.');
  }

  const rzpOptions: any = {
    key: rzpKey,
    amount: options.amount,
    currency: options.currency || 'INR',
    name: options.name || 'SHIFT24 Meal Prep',
    description: options.description || 'Meal Subscription Plan',
    image: options.image || '/icons/icon-192.png',
    order_id: activeOrderId,
    handler: function (response: RazorpaySuccessResponse) {
      options.onSuccess(response);
    },
    prefill: {
      name: options.customerName || '',
      email: options.customerEmail || '',
      contact: options.customerPhone || ''
    },
    theme: {
      color: options.themeColor || '#059669', // Emerald Shift24 theme
      backdrop_color: 'rgba(15, 23, 42, 0.6)'
    },
    modal: {
      ondismiss: function () {
        if (options.onDismiss) {
          options.onDismiss();
        }
      }
    }
  };

  // If a preferred method is selected (card or upi)
  if (options.preferredMethod) {
    rzpOptions.prefill.method = options.preferredMethod;
  }

  if (options.notes) {
    rzpOptions.notes = options.notes;
  }

  const rzp = new (window as any).Razorpay(rzpOptions);

  rzp.on('payment.failed', function (response: RazorpayFailureResponse) {
    console.error('[Razorpay] Payment failed event:', response);
    if (options.onFailure) {
      options.onFailure(response);
    }
  });

  rzp.open();
}
