import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, Repeat, MapPin, Shield, FileText, RefreshCcw, HelpCircle, Trash2, LogOut, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Settings, Edit2, Check } from 'lucide-react';
import { commonIngredients } from '../../data/mockData';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

export function ProfilePage() {
  const navigate = useNavigate();
  const storedUserRaw = localStorage.getItem('user');
  let loggedInUser: any = null;
  try {
    if (storedUserRaw) loggedInUser = JSON.parse(storedUserRaw);
  } catch (e) {
    // ignore
  }
  const userName = loggedInUser?.name || localStorage.getItem('userName') || 'Alex Doe';
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [showMobileContent, setShowMobileContent] = useState(false);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<string | null>(null);

  const [addresses, setAddresses] = useState(() => {
    let initialList: any[] = [];
    if (loggedInUser?.addresses && Array.isArray(loggedInUser.addresses)) {
      initialList = loggedInUser.addresses
        .filter((a: any) => a?.address && !a.address.includes('123 Health Street') && !a.address.includes('123 Main St'))
        .map((a: any, idx: number) => ({
          id: a.id || String(idx + 1),
          title: a.title || 'Address',
          address: a.address,
          isDefault: Boolean(a.isDefault)
        }));
    }

    // If no address in user profile, check activeSubscription in localStorage
    if (initialList.length === 0) {
      const storedSubRaw = localStorage.getItem('activeSubscription');
      if (storedSubRaw) {
        try {
          const sub = JSON.parse(storedSubRaw);
          if (sub.address && !sub.address.includes('123 Health Street') && !sub.address.includes('123 Main St')) {
            initialList = [{
              id: 'sub-addr-1',
              title: 'Home',
              address: sub.address,
              isDefault: true
            }];
          }
        } catch (e) {}
      }
    }

    return initialList;
  });
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({ title: '', address: '', isDefault: false });

  const handleEditAddress = (id: string) => {
    const target = addresses.find(a => a.id === id);
    if (target) {
      setAddressForm({ title: target.title, address: target.address, isDefault: target.isDefault });
      setEditingAddressId(id);
      setIsAddingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const updated = addresses.filter(a => a.id !== id);
    setAddresses(updated);
    if (loggedInUser && localStorage.getItem('token')) {
      try {
        const { apiUpdateAddresses } = await import('../../services/api');
        await apiUpdateAddresses(updated.map(a => ({ title: a.title, address: a.address, isDefault: a.isDefault })));
        const updatedUser = { ...loggedInUser, addresses: updated };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (e) {
        console.warn('Failed to sync address deletion', e);
      }
    }
  };

  const handleSaveAddress = async () => {
    if (!addressForm.title || !addressForm.address) return;
    let nextList: any[] = [];
    if (editingAddressId) {
      nextList = addresses.map(a => {
        if (a.id === editingAddressId) return { ...a, ...addressForm };
        if (addressForm.isDefault && a.id !== editingAddressId) return { ...a, isDefault: false };
        return a;
      });
      setAddresses(nextList);
      setEditingAddressId(null);
    } else {
      const newId = Date.now().toString();
      const updated = addressForm.isDefault ? addresses.map(a => ({...a, isDefault: false})) : addresses;
      nextList = [...updated, { id: newId, ...addressForm }];
      setAddresses(nextList);
      setIsAddingAddress(false);
    }
    setAddressForm({ title: '', address: '', isDefault: false });

    if (loggedInUser && localStorage.getItem('token')) {
      try {
        const { apiUpdateAddresses } = await import('../../services/api');
        await apiUpdateAddresses(nextList.map(a => ({ title: a.title, address: a.address, isDefault: a.isDefault })));
        const updatedUser = { ...loggedInUser, addresses: nextList };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (e) {
        console.warn('Failed to sync address save', e);
      }
    }
  };

  const mockOrders: any[] = [];

  const handleDownloadInvoice = async (orderId: string) => {
    const receiptElement = document.getElementById('invoice-receipt');
    if (!receiptElement) return;

    try {
      const dataUrl = await toPng(receiptElement, { pixelRatio: 2, backgroundColor: '#fcfcfc' });
      const rect = receiptElement.getBoundingClientRect();
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [rect.width, rect.height]
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, rect.width, rect.height);
      pdf.save(`Shift24-Receipt-${orderId}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    }
  };

  const [skippedDates, setSkippedDates] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [isEditingDiet, setIsEditingDiet] = useState(false);

  const toggleProfileSelection = (field: 'allergies' | 'preferences', item: string) => {
    if (field === 'allergies') {
      setAllergies(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    } else {
      setPreferences(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    }
  };

  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const [currentMonth, setCurrentMonth] = useState(new Date(startDate.getFullYear(), startDate.getMonth(), 1));

  const durationDays = 26;
  const activeDates = new Set<string>();
  let tempDate = new Date(startDate);
  let daysCounted = 0;
  let endDate = new Date(startDate);

  while (daysCounted < durationDays) {
    const dateStr = `${tempDate.getFullYear()}-${tempDate.getMonth()}-${tempDate.getDate()}`;
    if (!skippedDates.includes(dateStr)) {
      activeDates.add(dateStr);
      daysCounted++;
      endDate = new Date(tempDate);
    }
    tempDate.setDate(tempDate.getDate() + 1);
  }

  const handleDayClick = (year: number, month: number, day: number) => {
    const clickedDate = new Date(year, month, day);
    // Remove the time portion for accurate 'today' comparison
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (clickedDate < todayDateOnly) return; 

    const dateStr = `${year}-${month}-${day}`;
    setSkippedDates(prev => 
      prev.includes(dateStr) 
        ? prev.filter(d => d !== dateStr) 
        : [...prev, dateStr]
    );
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });


  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);

  // Load subscriptions for logged-in user
  useEffect(() => {
    const loadUserSubscriptions = async () => {
      setLoadingSubs(true);
      const userEmail = loggedInUser?.email;

      // 1. If user has activeSubscription in localStorage, check if it belongs to current session
      const storedSubRaw = localStorage.getItem('activeSubscription');
      let localSub: any = null;
      try {
        if (storedSubRaw) localSub = JSON.parse(storedSubRaw);
      } catch (e) {
        localSub = null;
      }

      // 2. Fetch from backend subscriptions API for this user's email if logged in
      if (userEmail) {
        try {
          const { fetchSubscriptions } = await import('../../services/api');
          const res = await fetchSubscriptions({ email: userEmail });
          if (res.success && Array.isArray(res.data)) {
            if (res.data.length > 0) {
              const mapped = res.data.map((s: any) => ({
                id: s.subId || s._id,
                planName: s.planTitle || 'Healthy Meal Plan',
                status: s.status || 'Active',
                nextDelivery: s.nextDelivery || 'Tomorrow, 08:00 AM - 09:00 AM',
                startDate: s.startDate || 'Recent',
                endDate: s.endDate || 'Ongoing',
                duration: s.duration || `${s.durationDays || 30} Days`,
                meals: s.slotLabel ? `${s.mealsPerDay || 1} Meal (${s.slotLabel})` : 'Daily Meals',
                address: s.address || 'Delivery Address'
              }));
              setSubscriptionsList(mapped);

              // Sync subscription addresses into addresses list
              setAddresses(prev => {
                const currentAddrs = [...prev];
                let updated = false;
                for (const s of res.data) {
                  if (s.address && !s.address.includes('123 Health Street') && !s.address.includes('123 Main St')) {
                    const exists = currentAddrs.some(a => a.address.trim().toLowerCase() === s.address.trim().toLowerCase());
                    if (!exists) {
                      currentAddrs.push({
                        id: s.subId || Date.now().toString(),
                        title: 'Home',
                        address: s.address,
                        isDefault: currentAddrs.length === 0
                      });
                      updated = true;
                    }
                  }
                }
                if (updated && loggedInUser) {
                  localStorage.setItem('user', JSON.stringify({ ...loggedInUser, addresses: currentAddrs }));
                }
                return currentAddrs;
              });

              setLoadingSubs(false);
              return;
            } else {
              setSubscriptionsList([]);
              localStorage.removeItem('activeSubscription');
              setLoadingSubs(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Could not fetch backend subscriptions:', err);
        }
      }

      // 3. If there is a local subscription explicitly purchased in this session
      if (localSub) {
        const subAddress = localSub.address || 'Delivery Address';
        setSubscriptionsList([{
          id: 'sub_active',
          planName: localSub.planName || 'Custom Plan',
          status: localSub.status || 'Active',
          nextDelivery: localSub.nextDelivery || 'Tomorrow, 08:00 AM - 09:00 AM',
          startDate: localSub.startDate || 'Recent',
          endDate: localSub.endDate || 'Ongoing',
          duration: localSub.duration || '7 Days',
          meals: localSub.meals || '1 Meal Daily',
          address: subAddress
        }]);

        if (localSub.address && !localSub.address.includes('123 Health Street') && !localSub.address.includes('123 Main St')) {
          setAddresses(prev => {
            const exists = prev.some(a => a.address.trim().toLowerCase() === localSub.address.trim().toLowerCase());
            if (!exists) {
              const next = [...prev, {
                id: 'sub-addr-1',
                title: 'Home',
                address: localSub.address,
                isDefault: prev.length === 0
              }];
              if (loggedInUser) {
                localStorage.setItem('user', JSON.stringify({ ...loggedInUser, addresses: next }));
              }
              return next;
            }
            return prev;
          });
        }
      } else {
        // Brand new user with no subscriptions
        setSubscriptionsList([]);
      }
      setLoadingSubs(false);
    };

    loadUserSubscriptions();
  }, []);

  const handleLogout = async () => {
    try {
      const { apiLogout } = await import('../../services/api');
      await apiLogout();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userName');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/');
  };

  // Set to true to re-enable Order History
  const SHOW_ORDER_HISTORY = false;

  const tabs = [
    { id: 'subscriptions', label: 'Subscriptions', icon: Repeat },
    { id: 'orders', label: 'Order History', icon: Package },
    { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
    { id: 'support', label: 'Help & Support', icon: HelpCircle },
    { id: 'legal', label: 'Legal & Policies', icon: Shield },
    { id: 'settings', label: 'Account Settings', icon: Settings },
  ];

  return (
    <div className="pt-8 md:pt-16 lg:pt-24 pb-12 lg:pb-24 bg-slate-50 min-h-screen">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className={`text-3xl md:text-4xl font-bold text-slate-900 mb-8 ${showMobileContent ? 'hidden lg:block' : 'block'}`}>My Account</h1>
        
        <div className="flex flex-col lg:flex-row gap-8">
           {/* Sidebar Navigation */}
           <div className={`w-full lg:w-1/3 xl:w-1/4 space-y-6 ${showMobileContent ? 'hidden lg:block' : 'block'}`}>
             {/* User Info Card */}
             <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
               <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-2xl text-emerald-600 font-bold uppercase shrink-0">
                 {userName.charAt(0)}
               </div>
               <div className="overflow-hidden">
                 <h2 className="text-lg font-bold text-slate-900 truncate">{userName}</h2>
                 <p className="text-slate-500 text-sm truncate">Subscribed Member</p>
               </div>
             </div>

             {/* Navigation Menu */}
             <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
               {tabs.map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => { setActiveTab(tab.id); setShowMobileContent(true); }}
                   className={`w-full flex items-center gap-3 px-6 py-4 text-left transition-colors border-b border-slate-100 last:border-0 ${tab.id === 'orders' && !SHOW_ORDER_HISTORY ? 'hidden' : ''} ${activeTab === tab.id ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
                 >
                   <tab.icon className={`w-5 h-5 shrink-0 ${activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                   <span className="truncate">{tab.label}</span>
                   <ChevronRight className={`w-4 h-4 ml-auto shrink-0 ${activeTab === tab.id ? 'text-emerald-600' : 'text-slate-300'}`} />
                 </button>
               ))}
               <button
                 onClick={handleLogout}
                 className="w-full flex items-center gap-3 px-6 py-4 text-left text-red-600 hover:bg-red-50 transition-colors"
               >
                 <LogOut className="w-5 h-5 text-red-500 shrink-0" />
                 Log Out
               </button>
             </div>
           </div>

           {/* Main Content Area */}
           <div className={`w-full lg:w-2/3 xl:w-3/4 ${showMobileContent ? 'block' : 'hidden lg:block'}`}>
             <div className="lg:bg-white lg:rounded-3xl lg:shadow-sm lg:border lg:border-slate-200 lg:p-8 min-h-[500px]">
               
               <div className="lg:hidden flex items-center gap-3 mb-6 pb-4 border-b border-slate-100"><button onClick={() => setShowMobileContent(false)} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft className="w-6 h-6" /></button><h2 className="text-xl font-bold text-slate-900">{tabs.find(t => t.id === activeTab)?.label}</h2></div>
                
                {activeTab === 'subscriptions' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-slate-900 hidden lg:block">Your Subscriptions</h2>
                      <Link 
                        to="/subscribe" 
                        className="text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-colors shadow-xs"
                      >
                        + Browse Meal Plans
                      </Link>
                    </div>

                    {loadingSubs ? (
                      <div className="py-12 text-center text-slate-500 text-sm">
                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        Checking your subscription records...
                      </div>
                    ) : subscriptionsList.length === 0 ? (
                      <div className="text-center py-16 px-6 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Repeat className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">No Active Subscriptions Yet</h3>
                        <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                          You haven't subscribed to any meal routine yet. Choose from Weight Loss, Balance Weight, or Weight Gain plans to get fresh chef-cooked meals delivered daily.
                        </p>
                        <Link 
                          to="/subscribe" 
                          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-emerald-600/20"
                        >
                          <span>Explore Subscription Plans</span>
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {subscriptionsList.map((sub) => {
                          const isExpanded = expandedSub === sub.id;
                          return (
                            <div key={sub.id} className={`rounded-2xl border transition-all overflow-hidden ${isExpanded ? 'border-emerald-200 bg-white shadow-md' : 'border-slate-200 bg-slate-50 hover:border-emerald-200'}`}>
                              <div 
                                onClick={() => setExpandedSub(isExpanded ? null : sub.id)}
                                className="p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4 cursor-pointer"
                              >
                                <div>
                                  <p className="text-lg font-bold text-slate-900">{sub.planName}</p>
                                  <p className="text-slate-600 text-sm mt-1">Next delivery: {sub.nextDelivery}</p>
                                </div>
                                <div className="flex items-center gap-4 self-start md:self-auto">
                                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${sub.status === 'Returned' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {sub.status}
                                  </span>
                                  <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                              </div>
                              
                              {isExpanded && (
                                <div className="px-6 pb-6 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                                    <div>
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Duration</p>
                                      <p className="text-slate-800 font-medium">{sub.startDate} - {sub.endDate}</p>
                                      <p className="text-slate-500 text-sm">{sub.duration}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Meals Included</p>
                                      <p className="text-slate-800 font-medium">{sub.meals}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Delivery Address</p>
                                      <p className="text-slate-800 font-medium">{sub.address}</p>
                                    </div>
                                  </div>

                                  <div className="mt-8 pt-6 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                      <h3 className="text-sm font-bold text-slate-800">Dietary Requirements</h3>
                                      <button 
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setIsEditingDiet(!isEditingDiet); 
                                        }}
                                        className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 p-2 rounded-md transition-colors shadow-sm"
                                      >
                                        {isEditingDiet ? <Check className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                                      </button>
                                    </div>

                                    {isEditingDiet ? (
                                      <div className="space-y-6 animate-in fade-in">
                                        <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Food Allergies</label>
                                          <div className="flex flex-wrap gap-2">
                                            {commonIngredients.map(item => {
                                              const isSelected = allergies.includes(item);
                                              return (
                                                <button
                                                  key={`allergy-${item}`}
                                                  type="button"
                                                  onClick={(e) => { e.stopPropagation(); toggleProfileSelection('allergies', item); }}
                                                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${isSelected ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                                >
                                                  {item}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Special Preferences</label>
                                          <div className="flex flex-wrap gap-2">
                                            {commonIngredients.map(item => {
                                              const isSelected = preferences.includes(item);
                                              return (
                                                <button
                                                  key={`pref-${item}`}
                                                  type="button"
                                                  onClick={(e) => { e.stopPropagation(); toggleProfileSelection('preferences', item); }}
                                                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${isSelected ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                                >
                                                  {item}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-5 animate-in fade-in">
                                        <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Food Allergies</label>
                                          {allergies.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                              {allergies.map(item => (
                                                <span key={`readonly-allergy-${item}`} className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200 shadow-sm">
                                                  {item}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-sm text-slate-500 font-medium">None selected</p>
                                          )}
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Special Preferences</label>
                                          {preferences.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                              {preferences.map(item => (
                                                <span key={`readonly-pref-${item}`} className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                                                  {item}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-sm text-slate-500 font-medium">None selected</p>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-8 pt-6 border-t border-slate-100">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                                           <CalendarIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <h3 className="text-sm font-bold text-slate-800">Manage Deliveries</h3>
                                          <p className="text-xs text-emerald-600 font-medium mt-1">Tap any future date to skip or unskip delivery.</p>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-slate-50/50 rounded-2xl p-4 md:p-6 border border-slate-200">
                                      <div className="flex items-center justify-between mb-6 px-2">
                                        <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors" onClick={(e) => { e.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}}>
                                          <ChevronLeft className="w-5 h-5 text-slate-600" />
                                        </button>
                                        <span className="font-bold text-slate-800 text-lg">{monthName}</span>
                                        <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors" onClick={(e) => { e.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}}>
                                          <ChevronRight className="w-5 h-5 text-slate-600" />
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-7 gap-2 md:gap-3 text-center mb-2">
                                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                          <div key={d} className="text-xs font-bold text-slate-400 py-1">{d}</div>
                                        ))}
                                      </div>
                                      <div className="grid grid-cols-7 gap-2 md:gap-3 text-center">
                                        {Array.from({ length: firstDay }).map((_, i) => (
                                          <div key={`empty-${i}`} className="p-2 md:p-3"></div>
                                        ))}
                                        {Array.from({ length: daysInMonth }).map((_, i) => {
                                          const day = i + 1;
                                          const year = currentMonth.getFullYear();
                                          const month = currentMonth.getMonth();
                                          const dateStr = `${year}-${month}-${day}`;
                                          const clickedDate = new Date(year, month, day);
                                          const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                          
                                          const isPast = clickedDate < todayDateOnly;
                                          const isSkipped = skippedDates.includes(dateStr);
                                          const isActive = activeDates.has(dateStr);
                                          const isEditable = !isPast && (isActive || isSkipped);
                                          
                                          let dayClass = 'bg-white text-slate-400 border-slate-100 opacity-50';
                                          if (isSkipped) {
                                            dayClass = 'bg-red-50 text-red-600 border border-red-200 font-bold';
                                          } else if (isActive) {
                                            if (isPast) {
                                              dayClass = 'bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold';
                                            } else {
                                              dayClass = 'bg-emerald-500 text-white border border-emerald-600 font-bold shadow-sm';
                                            }
                                          } else if (!isPast) {
                                            dayClass = 'bg-white text-slate-500 border border-slate-200';
                                          }

                                          return (
                                            <div 
                                              key={day}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (isEditable) handleDayClick(year, month, day);
                                              }}
                                              className={`p-2 md:p-3 rounded-xl border text-sm flex items-center justify-center transition-all duration-300 ${dayClass} ${isEditable ? 'cursor-pointer hover:scale-105 hover:shadow-md' : ''}`}
                                            >
                                              {day}
                                            </div>
                                          )
                                        })}
                                      </div>

                                      <div className="mt-8 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                          <span className="text-slate-600 text-sm font-medium">Start Date:</span>
                                          <span className="text-slate-900 font-bold text-sm">{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-slate-600 text-sm font-medium">End Date:</span>
                                          <span className="text-emerald-700 font-bold text-sm">{endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                        {skippedDates.length > 0 && (
                                          <div className="mt-4 pt-4 border-t border-slate-200">
                                            <p className="text-xs text-red-600 font-medium mb-2">
                                              Plan extended by {skippedDates.length} skipped day{skippedDates.length > 1 ? 's' : ''}.
                                            </p>
                                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                              Extended dates: <span className="text-emerald-700 font-bold">{
                                                Array.from(activeDates).slice(-skippedDates.length).map(d => {
                                                  const [y, m, date] = d.split('-');
                                                  return new Date(Number(y), Number(m), Number(date)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                }).join(', ')
                                              }</span>
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-3 mt-8">
                                    <button className="px-5 py-2.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-colors">Manage Plan</button>
                                    <button className="px-5 py-2.5 bg-slate-50 text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">Pause Delivery</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Order History tab content hidden for now */}
                {SHOW_ORDER_HISTORY && activeTab === 'orders' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 hidden lg:block">Order History</h2>
                   <div className="space-y-4">
                     {mockOrders.map((order) => {
                       const isExpanded = expandedOrder === order.id;
                       return (
                         <div key={order.id} className={`rounded-2xl border transition-all overflow-hidden ${isExpanded ? 'border-emerald-200 bg-white shadow-md' : 'border-slate-200 bg-slate-50 hover:border-emerald-200'}`}>
                           <div 
                             onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                             className="p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4 cursor-pointer"
                           >
                             <div>
                               <p className="text-lg font-bold text-slate-900">{order.id}</p>
                               <p className="text-slate-600 text-sm mt-1">{order.date} • {order.total}</p>
                             </div>
                             <div className="flex items-center gap-4 self-start md:self-auto">
                               <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${order.status === 'Returned' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                 {order.status}
                               </span>
                               <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                             </div>
                           </div>
                           
                           {isExpanded && (
                             <div className="px-6 pb-6 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                               <div className="mt-4">
                                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Order Items</h4>
                                 <div className="space-y-3">
                                   {order.items.map((item, idx) => (
                                     <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                       <div className="flex items-center gap-4">
                                         {item.imageUrl && (
                                           <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover bg-slate-100" />
                                         )}
                                         <div>
                                           <p className="font-bold text-slate-800">{item.name}</p>
                                           <p className="text-sm text-slate-500 mt-0.5">Qty: {item.qty}</p>
                                         </div>
                                       </div>
                                       <p className="font-bold text-slate-900">{item.price}</p>
                                     </div>
                                   ))}
                                 </div>
                               </div>

                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-slate-100">
                                 <div>
                                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Delivery Address</p>
                                   <p className="text-slate-800 font-medium text-sm">{order.address}</p>
                                 </div>
                                 <div>
                                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Method</p>
                                   <p className="text-slate-800 font-medium text-sm">{order.paymentMethod}</p>
                                 </div>
                               </div>
                               
                               <div className="mt-8 flex justify-end">
                                 <button 
                                   onClick={() => setViewingInvoice(order.id)}
                                   className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors text-sm"
                                 >
                                   View Invoice
                                 </button>
                               </div>
                             </div>
                           )}
                         </div>
                       );
                     })}
                   </div>
                 </div>
               )}

               {activeTab === 'addresses' && (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="flex justify-between items-center mb-6">
                     <h2 className="text-2xl font-bold text-slate-900 hidden lg:block">Saved Addresses</h2>
                     {!isAddingAddress && !editingAddressId && (
                       <button 
                         onClick={() => { setIsAddingAddress(true); setAddressForm({ title: '', address: '', isDefault: false }); }}
                         className="text-emerald-600 font-semibold hover:text-emerald-700 text-sm bg-emerald-50 px-4 py-2 rounded-full"
                       >
                         + Add New
                       </button>
                     )}
                   </div>

                   {(isAddingAddress || editingAddressId) ? (
                     <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm mb-6">
                       <h3 className="font-bold text-slate-900 mb-4">{editingAddressId ? 'Edit Address' : 'Add New Address'}</h3>
                       <div className="space-y-4">
                         <div>
                           <label className="block text-sm font-semibold text-slate-700 mb-2">Address Title (e.g., Home, Work)</label>
                           <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-colors" value={addressForm.title} onChange={e => setAddressForm({...addressForm, title: e.target.value})} />
                         </div>
                         <div>
                           <label className="block text-sm font-semibold text-slate-700 mb-2">Full Address</label>
                           <textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-colors min-h-[100px]" value={addressForm.address} onChange={e => setAddressForm({...addressForm, address: e.target.value})}></textarea>
                         </div>
                          <div
                            onClick={() => setAddressForm({ ...addressForm, isDefault: !addressForm.isDefault })}
                            className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                              addressForm.isDefault
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-500/20 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={addressForm.isDefault}
                              onChange={(e) => setAddressForm({...addressForm, isDefault: e.target.checked})}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                              addressForm.isDefault ? 'bg-emerald-600 text-white shadow-xs' : 'border-2 border-slate-300 bg-white'
                            }`}>
                              {addressForm.isDefault && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="text-sm font-semibold">Set as default address</span>
                          </div>
                         <div className="flex gap-3 pt-2">
                           <button onClick={handleSaveAddress} className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors">
                             Save Address
                           </button>
                           <button onClick={() => { setIsAddingAddress(false); setEditingAddressId(null); }} className="px-5 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                             Cancel
                           </button>
                         </div>
                       </div>
                     </div>
                   ) : (
                     <div className="space-y-4">
                       {addresses.length === 0 ? (
                         <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200">
                           <p className="text-slate-500">No addresses saved yet.</p>
                         </div>
                       ) : (
                         addresses.map(addr => (
                           <div key={addr.id} className={`border ${addr.isDefault ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50'} rounded-2xl p-6 relative group transition-all hover:shadow-md hover:border-emerald-200`}>
                             <div className="flex justify-between items-start mb-2">
                               <h3 className="font-bold text-slate-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> {addr.title}</h3>
                               {addr.isDefault && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold uppercase tracking-wider">Default</span>}
                             </div>
                             <p className="text-slate-600 text-sm ml-6 whitespace-pre-wrap mb-4">{addr.address}</p>
                             
                             <div className="ml-6 flex gap-2 pt-4 border-t border-slate-200/60">
                               <button onClick={() => handleEditAddress(addr.id)} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 p-2 rounded-lg transition-colors" title="Edit Address"><Edit2 className="w-4 h-4" /></button>
                               <button onClick={() => handleDeleteAddress(addr.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete Address"><Trash2 className="w-4 h-4" /></button>
                             </div>
                           </div>
                         ))
                       )}
                     </div>
                   )}
                 </div>
               )}

               {activeTab === 'support' && (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <h2 className="text-2xl font-bold text-slate-900 mb-6 hidden lg:block">Help & Support</h2>
                   <div className="bg-blue-50 border border-blue-100 p-8 rounded-2xl text-center">
                     <HelpCircle className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                     <h3 className="text-xl font-bold text-slate-900 mb-2">Need assistance?</h3>
                     <p className="text-slate-600 mb-6 max-w-md mx-auto">Our nutrition experts and support team are here to help you with your meal plan.</p>
                     <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm">Contact Support</button>
                   </div>
                 </div>
               )}

               {activeTab === 'legal' && (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <h2 className="text-2xl font-bold text-slate-900 mb-6 hidden lg:block">Legal & Policies</h2>
                   <div className="space-y-4">
                     <Link to="/privacy-policy" className="w-full flex items-center justify-between p-5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-left group">
                       <span className="font-medium text-slate-600 text-[15px] flex items-center gap-3"><FileText className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" /> Privacy Policy</span>
                       <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                     </Link>
                     <Link to="/terms-and-conditions" className="w-full flex items-center justify-between p-5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-left group">
                       <span className="font-medium text-slate-600 text-[15px] flex items-center gap-3"><FileText className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" /> Terms and Conditions</span>
                       <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                     </Link>
                     <Link to="/refund-policy" className="w-full flex items-center justify-between p-5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-left group">
                       <span className="font-medium text-slate-600 text-[15px] flex items-center gap-3"><RefreshCcw className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" /> Return and Refund Policy</span>
                       <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                     </Link>
                   </div>
                 </div>
               )}

               {activeTab === 'settings' && (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <h2 className="text-2xl font-bold text-slate-900 mb-6 hidden lg:block">Account Settings</h2>
                   
                   <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm mb-6">
                     <h3 className="font-bold text-slate-900 mb-4 text-lg">Profile Information</h3>
                     <form className="space-y-4 max-w-lg">
                       <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                         <input type="text" defaultValue="Alex Doe" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm bg-slate-50 focus:bg-white" />
                       </div>
                       <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                         <input type="email" defaultValue="alex@example.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm bg-slate-50 focus:bg-white" />
                       </div>
                       <button type="button" onClick={(e) => {
                         e.preventDefault();
                         import('react-hot-toast').then(m => m.toast.success('Profile updated successfully!'));
                       }} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm text-sm">
                         Save Changes
                       </button>
                     </form>
                   </div>

                   <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm mb-8">
                     <h3 className="font-bold text-slate-900 mb-4 text-lg">Change Password</h3>
                     <form className="space-y-4 max-w-lg">
                       <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Current Password</label>
                         <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm bg-slate-50 focus:bg-white" />
                       </div>
                       <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
                         <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm bg-slate-50 focus:bg-white" />
                       </div>
                       <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm New Password</label>
                         <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow text-sm bg-slate-50 focus:bg-white" />
                       </div>
                       <button type="button" onClick={(e) => {
                         e.preventDefault();
                         import('react-hot-toast').then(m => m.toast.success('Password changed successfully!'));
                       }} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-sm text-sm">
                         Update Password
                       </button>
                     </form>
                   </div>

                   <div className="p-6 border border-red-200 bg-red-50 rounded-2xl">
                     <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2"><Trash2 className="w-5 h-5" /> Danger Zone</h3>
                     <p className="text-red-700 text-sm mb-6 max-w-lg">Once you delete your account, there is no going back. All your subscriptions, history, and preferences will be permanently wiped.</p>
                     <button className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm">
                       Delete Account
                     </button>
                   </div>
                 </div>
               )}

             </div>
           </div>
        </div>
      </div>
      
      {viewingInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 z-[999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" style={{ borderRadius: '6px', borderTop: '16px solid #10b981' }}>
            <div id="invoice-receipt" className="bg-[#fcfcfc] p-8 border-b border-dashed border-slate-300" style={{ fontFamily: '"Courier New", Courier, monospace' }}>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-slate-800 tracking-widest uppercase mb-1">Shift24</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Receipt / Tax Invoice</p>
                <div className="mt-6 text-xs font-bold text-slate-600 text-left space-y-1">
                  <p>Order ID: {viewingInvoice}</p>
                  <p>Date: {mockOrders.find(o => o.id === viewingInvoice)?.date}</p>
                  <p>Status: {mockOrders.find(o => o.id === viewingInvoice)?.status}</p>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-slate-300 py-4 my-4 space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>ITEM</span>
                  <span>AMT</span>
                </div>
                {mockOrders.find(o => o.id === viewingInvoice)?.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm text-slate-800 font-bold">
                    <div className="flex-1 pr-4">
                      <span>{item.qty}x {item.name}</span>
                    </div>
                    <span className="whitespace-nowrap">{item.price}</span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-dashed border-slate-300 pt-4 space-y-2 text-sm font-bold">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{mockOrders.find(o => o.id === viewingInvoice)?.total}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between text-lg font-black text-slate-900 mt-4 pt-4 border-t border-slate-200">
                  <span>TOTAL</span>
                  <span>{mockOrders.find(o => o.id === viewingInvoice)?.total}</span>
                </div>
              </div>
              
              <div className="mt-8 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                <p>Thank you for choosing Shift24!</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button onClick={() => setViewingInvoice(null)} className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-300 transition-colors">Close</button>
              <button onClick={() => viewingInvoice && handleDownloadInvoice(viewingInvoice)} className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors">Download Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
