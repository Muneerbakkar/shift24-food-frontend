import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, CreditCard, Lock, Plus, Smartphone, Banknote, Calendar, Clock, ShieldCheck, Check } from 'lucide-react';
import { createRazorpayOrder, verifyRazorpayPayment } from '../../services/api';
import { openRazorpayCheckout } from '../../utils/razorpay';

export function CartCheckout() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  // Profile data state
  const [contactInfo, setContactInfo] = useState({ email: '', phone: '' });
  const [savedAddresses, setSavedAddresses] = useState<Array<{ id: string; type: string; name: string; street: string; city: string; state: string; zip: string }>>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(true);
  const [newAddress, setNewAddress] = useState({ name: '', street: '', city: '', state: '', zip: '' });
  
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'cod'>('card');
  
  // Delivery Schedule State
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [deliverySlot, setDeliverySlot] = useState<'Breakfast' | 'Lunch' | 'Dinner' | null>(null);

  // Generate next 3 dates
  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);

  // Initialize delivery date to tomorrow if today's slots are all passed
  useEffect(() => {
    const today = new Date();
    if (today.getHours() >= 17) {
      setDeliveryDate(availableDates[1]);
    } else {
      setDeliveryDate(availableDates[0]);
    }
  }, [availableDates]);

  // Determine slot availability
  const getSlotAvailability = (slot: 'Breakfast' | 'Lunch' | 'Dinner') => {
    if (!deliveryDate) return { available: false, message: '' };
    
    const today = new Date();
    const isToday = deliveryDate.getDate() === today.getDate() && 
                    deliveryDate.getMonth() === today.getMonth() && 
                    deliveryDate.getFullYear() === today.getFullYear();
    
    const currentHour = today.getHours();
    
    if (slot === 'Breakfast') {
      if (isToday) return { available: false, message: 'Order day before' };
      return { available: true, message: '' };
    }
    
    if (slot === 'Lunch') {
      if (isToday && currentHour >= 11) return { available: false, message: 'Cutoff at 11 AM' };
      return { available: true, message: '' };
    }
    
    if (slot === 'Dinner') {
      if (isToday && currentHour >= 17) return { available: false, message: 'Cutoff at 5 PM' };
      return { available: true, message: '' };
    }
    
    return { available: true, message: '' };
  };

  // Reset slot if it becomes unavailable upon date change
  useEffect(() => {
    if (deliverySlot) {
      const { available } = getSlotAvailability(deliverySlot);
      if (!available) setDeliverySlot(null);
    }
  }, [deliveryDate, deliverySlot]);

  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Fetch user profile and real saved addresses from storage
  useEffect(() => {
    const profileEmail = localStorage.getItem('userEmail');
    if (profileEmail) {
      setContactInfo(prev => ({ ...prev, email: profileEmail }));
    }
    const storedUserRaw = localStorage.getItem('user');
    if (storedUserRaw) {
      try {
        const u = JSON.parse(storedUserRaw);
        if (u.email) setContactInfo(prev => ({ ...prev, email: u.email }));
        if (u.phone) setContactInfo(prev => ({ ...prev, phone: u.phone }));
        if (Array.isArray(u.addresses)) {
          const valid = u.addresses.filter(
            (a: any) => a?.address && !a.address.includes('123 Health Street') && !a.address.includes('123 Main St')
          );
          if (valid.length > 0) {
            const mapped = valid.map((a: any, idx: number) => ({
              id: a.id || String(idx + 1),
              type: a.title || 'Home',
              name: u.name || 'Delivery Address',
              street: a.address,
              city: 'Kochi',
              state: 'Kerala',
              zip: ''
            }));
            setSavedAddresses(mapped);
            setSelectedAddressId(mapped[0].id);
            setIsAddingNewAddress(false);
          }
        }
      } catch (e) {}
    }
  }, []);

  const handleSaveAddress = () => {
    if (newAddress.name && newAddress.street && newAddress.city) {
      const newId = Date.now().toString();
      setSavedAddresses([...savedAddresses, { id: newId, type: 'Other', ...newAddress }]);
      setSelectedAddressId(newId);
      setIsAddingNewAddress(false);
      setNewAddress({ name: '', street: '', city: '', state: '', zip: '' });
    }
  };

  // Mock data mirroring CartPage
  const cartItems = [
    {
      id: '1',
      name: 'Buttercraft Beef with Spinach',
      price: 350,
      quantity: 2,
      imageUrl: 'https://images.unsplash.com/photo-1542826438-bd32f43d626f?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: '5',
      name: 'Grilled Lemon Herb Chicken',
      price: 320,
      quantity: 1,
      imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&q=80&w=800'
    }
  ];

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const delivery = subtotal > 0 ? 50 : 0;
  const taxes = Math.round(subtotal * 0.05); // 5% GST estimate
  const total = subtotal + delivery + taxes;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverySlot) {
      toast.error("Please select a delivery schedule (Date and Time Slot).");
      return;
    }

    if (paymentMethod === 'cod') {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        toast.success("Order placed successfully with Cash on Delivery! Thank you for shopping with Shift24.");
        localStorage.removeItem('cart');
        navigate('/');
      }, 1000);
      return;
    }

    // Razorpay Online Gateway (Card or UPI)
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const isJwt = Boolean(token && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token.trim()));
      if (!token || !isJwt) {
        setIsProcessing(false);
        toast.error('Authentication required. Please log in or create an account to complete checkout.');
        navigate('/login', { state: { from: { pathname: window.location.pathname } } });
        return;
      }

      const amountInPaise = Math.round(total * 100);
      const orderRes = await createRazorpayOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `cart_${Date.now()}`.slice(0, 40),
        notes: {
          itemsCount: cartItems.length,
          contactEmail: contactInfo.email,
          contactPhone: contactInfo.phone,
          deliverySlot: `${deliveryDate?.toDateString()} - ${deliverySlot}`
        }
      });

      if (!orderRes.success && !orderRes.order_id && !orderRes.orderId) {
        throw new Error(orderRes.message || 'Unable to initiate payment');
      }

      const activeOrderId = orderRes.order_id || orderRes.orderId;
      const razorpayKey = orderRes.key_id || orderRes.keyId || (import.meta as any).env?.VITE_RAZORPAY_KEY_ID;

      await openRazorpayCheckout({
        key: razorpayKey,
        amount: orderRes.amount || amountInPaise,
        currency: orderRes.currency || 'INR',
        orderId: activeOrderId,
        name: 'SHIFT24',
        description: `Order (${cartItems.length} items)`,
        image: '/icons/icon-192.png',
        customerName: contactInfo.email.split('@')[0] || 'Customer',
        customerEmail: contactInfo.email,
        customerPhone: contactInfo.phone,
        preferredMethod: paymentMethod === 'card' ? 'card' : 'upi',
        isMock: orderRes.isMock,
        onSuccess: async (rzpRes) => {
          try {
            const verifyRes = await verifyRazorpayPayment({
              razorpay_order_id: rzpRes.razorpay_order_id,
              razorpay_payment_id: rzpRes.razorpay_payment_id,
              razorpay_signature: rzpRes.razorpay_signature
            });
            if (!verifyRes.success || !verifyRes.verified) {
              throw new Error(verifyRes.message || 'Payment verification failed');
            }
            setIsProcessing(false);
            toast.success("Payment verified! Order placed successfully. Thank you for shopping with Shift24.");
            localStorage.removeItem('cart');
            navigate('/');
          } catch (err: any) {
            setIsProcessing(false);
            toast.error(err.message || 'Payment verification failed');
          }
        },
        onFailure: (err) => {
          setIsProcessing(false);
          toast.error(err?.error?.description || 'Payment was declined or cancelled.');
        },
        onDismiss: () => {
          setIsProcessing(false);
          toast('Payment window closed. Your items are still in cart.', { icon: 'ℹ️' });
        }
      });
    } catch (err: any) {
      setIsProcessing(false);
      const msg = err?.message || '';
      if (
        msg.includes('Authentication required') ||
        msg.includes('Session expired') ||
        msg.includes('Please log in') ||
        msg.includes('401')
      ) {
        toast.error('Session expired or login required. Please sign in to complete checkout.');
        navigate('/login', { state: { from: { pathname: window.location.pathname } } });
        return;
      }
      toast.error(err.message || 'Failed to initialize payment gateway.');
    }
  };

  return (
    <div className="pt-8 md:pt-16 lg:pt-24 pb-12 lg:pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 md:mb-8">
          {/* Desktop Breadcrumb */}
          <div className="hidden md:block mb-4">
            <p className="text-slate-500 text-sm font-medium">
              <Link to="/cart" className="hover:text-emerald-600 transition-colors">Cart</Link> <span className="mx-2">/</span> 
              <span className="text-slate-900">Checkout</span>
            </p>
          </div>
          
          <div className="flex items-center gap-2 md:gap-0">
            {/* Mobile Back Button */}
            <Link to="/cart" className="md:hidden p-2 -ml-2 rounded-full hover:bg-slate-200/50 text-slate-600 transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 leading-none">Secure Checkout</h1>
          </div>
        </div>

        <form onSubmit={handlePlaceOrder} className="flex flex-col lg:flex-row gap-10">
          {/* Left Column: Forms */}
          <div className="flex-1 space-y-8">
            {/* Contact Info */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <input type="email" value={contactInfo.email} onChange={e => setContactInfo({...contactInfo, email: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm" placeholder="your@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input type="tel" value={contactInfo.phone} onChange={e => setContactInfo({...contactInfo, phone: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm" placeholder="+91 98765 43210" />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Shipping Address</h2>
                {!isAddingNewAddress && savedAddresses.length > 0 && (
                  <button type="button" onClick={() => setIsAddingNewAddress(true)} className="text-emerald-600 font-semibold text-sm hover:underline flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add New
                  </button>
                )}
              </div>

              {!isAddingNewAddress && savedAddresses.length > 0 ? (
                <div className="space-y-4">
                  {savedAddresses.map(addr => (
                    <label key={addr.id} className={`flex items-start p-5 border-2 rounded-2xl cursor-pointer transition-colors ${selectedAddressId === addr.id ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 hover:border-emerald-200'}`}>
                      <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} className="mt-1 mr-4 w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-slate-300" />
                      <div>
                        <p className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                          {addr.name} 
                          <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">{addr.type}</span>
                        </p>
                        <p className="text-slate-600 text-sm leading-relaxed">{addr.street}</p>
                        <p className="text-slate-600 text-sm">{addr.city}, {addr.state} {addr.zip}</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                    <input type="text" value={newAddress.name} onChange={e => setNewAddress({...newAddress, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm" placeholder="Full Name" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Street Address</label>
                    <input type="text" value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm" placeholder="Flat/Building, Street, Landmark" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">City</label>
                      <input type="text" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm" placeholder="Kochi" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">State</label>
                      <input type="text" value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm" placeholder="Kerala" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">ZIP Code</label>
                      <input type="text" value={newAddress.zip} onChange={e => setNewAddress({...newAddress, zip: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm" placeholder="682030" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    {savedAddresses.length > 0 && (
                      <button type="button" onClick={() => setIsAddingNewAddress(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                    )}
                    <button type="button" onClick={handleSaveAddress} className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors">Save Address</button>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Schedule */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-emerald-600" />
                Delivery Schedule
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Select Date</label>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {availableDates.map((date, idx) => {
                      const isSelected = deliveryDate?.toDateString() === date.toDateString();
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setDeliveryDate(date)}
                          className={`flex-shrink-0 min-w-[100px] px-4 py-3 rounded-xl border-2 transition-colors ${
                            isSelected 
                              ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700' 
                              : 'border-slate-100 bg-white text-slate-600 hover:border-emerald-200'
                          }`}
                        >
                          <p className={`font-bold ${isSelected ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {formatDateLabel(date)}
                          </p>
                          <p className="text-xs mt-0.5">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Select Time Slot</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(['Breakfast', 'Lunch', 'Dinner'] as const).map(slot => {
                      const { available, message } = getSlotAvailability(slot);
                      const isSelected = deliverySlot === slot;
                      
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={!available}
                          onClick={() => setDeliverySlot(slot)}
                          className={`relative p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                            !available 
                              ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                              : isSelected
                                ? 'border-emerald-500 bg-emerald-50/50'
                                : 'border-slate-100 bg-white hover:border-emerald-200 cursor-pointer'
                          }`}
                        >
                          <Clock className={`w-6 h-6 mb-2 ${isSelected ? 'text-emerald-600' : (available ? 'text-slate-400' : 'text-slate-300')}`} />
                          <span className={`font-bold text-sm ${isSelected ? 'text-emerald-700' : (available ? 'text-slate-700' : 'text-slate-400')}`}>
                            {slot}
                          </span>
                          {!available && message && (
                            <span className="absolute -bottom-2 text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {message}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Payment Method</h2>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Razorpay Secured
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <label className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-colors ${paymentMethod === 'card' ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 hover:border-emerald-200'}`}>
                  <input type="radio" name="paymentMethod" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="sr-only" />
                  <CreditCard className={`w-6 h-6 mb-1 ${paymentMethod === 'card' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-bold ${paymentMethod === 'card' ? 'text-emerald-700' : 'text-slate-600'}`}>Card</span>
                  <span className="text-[10px] text-slate-400 font-medium">via Razorpay</span>
                </label>
                <label className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-colors ${paymentMethod === 'upi' ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 hover:border-emerald-200'}`}>
                  <input type="radio" name="paymentMethod" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} className="sr-only" />
                  <Smartphone className={`w-6 h-6 mb-1 ${paymentMethod === 'upi' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-bold ${paymentMethod === 'upi' ? 'text-emerald-700' : 'text-slate-600'}`}>UPI</span>
                  <span className="text-[10px] text-slate-400 font-medium">via Razorpay</span>
                </label>
                <label className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 hover:border-emerald-200'}`}>
                  <input type="radio" name="paymentMethod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="sr-only" />
                  <Banknote className={`w-6 h-6 mb-1 ${paymentMethod === 'cod' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-bold ${paymentMethod === 'cod' ? 'text-emerald-700' : 'text-slate-600'}`}>Cash</span>
                  <span className="text-[10px] text-slate-400 font-medium">on delivery</span>
                </label>
              </div>

              {paymentMethod === 'card' && (
                <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      Credit & Debit Card Checkout
                    </p>
                    <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                      Razorpay
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['Visa', 'Mastercard', 'RuPay', 'Amex', 'Maestro'].map((b) => (
                      <span key={b} className="px-2 py-0.5 bg-white/10 text-slate-300 rounded text-xs font-semibold border border-white/10">
                        {b}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-300 flex items-center gap-2 pt-2 border-t border-white/10">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Bank-grade 3D Secure OTP verification. Opens securely upon clicking Pay.</span>
                  </p>
                </div>
              )}

              {paymentMethod === 'upi' && (
                <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      Instant UPI & QR Code
                    </p>
                    <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                      Razorpay
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Scan QR'].map((a) => (
                      <span key={a} className="px-2 py-0.5 bg-white/10 text-slate-300 rounded text-xs font-semibold border border-white/10">
                        {a}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-300 flex items-center gap-2 pt-2 border-t border-white/10">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Instant zero-fee transfer via any UPI app or QR code scan.</span>
                  </p>
                  {Boolean((import.meta as any).env?.VITE_RAZORPAY_KEY_ID?.startsWith('rzp_test_')) && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-[11px] leading-relaxed">
                      <span className="font-bold text-amber-300">💡 Test Mode Note:</span> Real GPay / PhonePe will show "Invalid UPI ID" for test QR codes. To test UPI, choose <strong>UPI ID</strong> in the modal and enter <code className="bg-amber-400/20 px-1 py-0.5 rounded text-amber-100 font-mono">success@razorpay</code>.
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'cod' && (
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 space-y-2 text-center">
                  <p className="text-emerald-800 font-bold">Pay with Cash on Delivery</p>
                  <p className="text-emerald-700 text-sm">Please keep the exact change ready for a seamless delivery experience.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:w-[450px]">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 sticky top-32">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Order Summary</h3>
              
              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                {cartItems.map(item => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-100 relative">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      <div className="absolute -top-2 -right-2 bg-slate-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-white">
                        {item.quantity}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{item.name}</h4>
                      <p className="text-slate-500 text-sm">Qty: {item.quantity}</p>
                    </div>
                    <div className="font-bold text-emerald-700">
                      ₹{item.price * item.quantity}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-6 pt-6 border-t border-slate-100">
                <div className="flex justify-between text-slate-600 text-sm">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-900">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-sm">
                  <span>Delivery Fee</span>
                  <span className="font-medium text-slate-900">₹{delivery}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-sm">
                  <span>Taxes (5%)</span>
                  <span className="font-medium text-slate-900">₹{taxes}</span>
                </div>
              </div>
              
              <div className="border-t border-slate-100 pt-6 mb-8">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-slate-900">Total</span>
                  <span className="text-xl md:text-2xl font-bold text-emerald-700">₹{total}</span>
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={isProcessing}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-base hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isProcessing 
                  ? (paymentMethod === 'cod' ? 'Confirming Order...' : 'Connecting to Razorpay...') 
                  : (paymentMethod === 'cod' ? `Complete Order (COD) • ₹${total}` : `Pay with Razorpay • ₹${total}`)}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
