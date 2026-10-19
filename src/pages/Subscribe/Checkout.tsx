import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { commonIngredients } from '../../data/mockData';
import { getAdminPlans, getAdminCustomers, saveAdminCustomers } from '../Admin/adminData';
import { 
  CheckCircle2, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  TrendingDown, 
  Scale, 
  TrendingUp,
  CreditCard,
  Smartphone,
  Banknote,
  Lock,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  MapPin,
  Plus,
  Check,
  Crosshair,
  Compass,
  Building,
  Home,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Navigation
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiGetMe, apiUpdateAddresses, createBackendSubscription } from '../../services/api';
import { LocationMapPicker, GeocodedAddress } from '../../components/ui/LocationMapPicker';

const iconMap = {
  TrendingDown: TrendingDown,
  Scale: Scale,
  TrendingUp: TrendingUp,
};

const MEAL_MULTIPLIERS: Record<string, number> = {
  '1': 0.40,
  '2': 0.72,
  '3': 1.00
};

export function CheckoutDetails() {
  const { planId: routePlanId, durationId: routeDurationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryPlanId = searchParams.get('plan');
  const queryDuration = searchParams.get('duration');

  const [currentPlanId, setCurrentPlanId] = useState<string>(
    routePlanId || queryPlanId || 'balance'
  );
  const [durationDays, setDurationDays] = useState<number>(
    parseInt(routeDurationId || queryDuration || '7')
  );

  const [adminPlans, setAdminPlans] = useState(() => getAdminPlans());
  const plans = adminPlans;

  useEffect(() => {
    const sync = () => setAdminPlans(getAdminPlans());
    window.addEventListener('shift24-plans-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('shift24-plans-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const adminPlan = adminPlans.find(p => p.id === currentPlanId || (p as any).planId === currentPlanId);
  const plan = adminPlan || adminPlans[0] || ({ id: currentPlanId, title: 'Custom Meal Plan', pricePerWeek: 2800, calories: '1800 - 2000 kcal/day', benefits: [] } as any);
  const Icon = iconMap[plan.icon as keyof typeof iconMap] || Scale;

  const initialMeals = (searchParams.get('meals') as '1' | '2' | '3') || '3';
  const initialSlotParam = searchParams.get('slot');
  const initialSlot = initialSlotParam || (initialMeals === '2' ? 'breakfast-lunch' : 'lunch');

  const [mealsPerDay, setMealsPerDay] = useState<'1' | '2' | '3'>(initialMeals);
  const [selectedSlot, setSelectedSlot] = useState<string>(initialSlot);

  const twoMealLabels: Record<string, string> = {
    'breakfast-lunch': 'Breakfast & Lunch',
    'lunch-dinner': 'Lunch & Dinner',
    'breakfast-dinner': 'Breakfast & Dinner',
  };

  const getMealSlotSummary = () => {
    if (mealsPerDay === '1') {
      return `1 Daily Meal (${selectedSlot.charAt(0).toUpperCase() + selectedSlot.slice(1)})`;
    }
    if (mealsPerDay === '2') {
      return `2 Daily Meals (${twoMealLabels[selectedSlot] || 'Breakfast & Lunch'})`;
    }
    return `${mealsPerDay} Meals Daily`;
  };

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'cod'>('card');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [upiId, setUpiId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Dynamic duration option matching from admin config
  const matchedDurationOption = adminPlan?.durationOptions?.find(
    d => d.days === durationDays || d.id === routeDurationId || d.id === queryDuration
  );

  const discountPercent = matchedDurationOption !== undefined 
    ? matchedDurationOption.discount 
    : (durationDays === 30 ? 10 : durationDays === 15 ? 5 : 0);

  const multiplier = adminPlan?.mealOptions?.find(m => m.id === mealsPerDay)?.multiplier ?? (MEAL_MULTIPLIERS[mealsPerDay] || 1);
  const customPriceOverride = matchedDurationOption?.customPrice;

  const dailyBase = (plan.pricePerWeek / 7) * multiplier;
  const subtotal = customPriceOverride && customPriceOverride > 0
    ? customPriceOverride
    : Math.round(dailyBase * durationDays);
  const discountAmount = customPriceOverride && customPriceOverride > 0
    ? 0
    : Math.round(subtotal * (discountPercent / 100));
  const finalTotal = subtotal - discountAmount;

  interface SavedAddress {
    id?: string;
    title: string;
    address: string;
    isDefault: boolean;
  }

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number | null>(null);
  const [isCustomAddress, setIsCustomAddress] = useState<boolean>(false);
  const [setAsDefault, setSetAsDefault] = useState<boolean>(false);
  const [newAddressTitle, setNewAddressTitle] = useState<string>('Home');

  const [addressFields, setAddressFields] = useState({
    flatNo: '',
    street: '',
    area: '',
    landmark: '',
    city: 'Kochi',
    state: 'Kerala',
    pincode: '',
    tag: 'Home'
  });

  const [showMapPicker, setShowMapPicker] = useState<boolean>(false);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number }>({
    lat: 9.9312,
    lng: 76.2673
  });
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);

  const formatFullAddress = (fields: typeof addressFields) => {
    return [
      fields.flatNo,
      fields.street,
      fields.area,
      fields.landmark ? `(Near ${fields.landmark})` : null,
      fields.city,
      fields.state,
      fields.pincode
    ].filter(Boolean).join(', ');
  };

  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    address: string;
    preferences: string[];
    allergies: string[];
  }>({
    name: '',
    phone: '',
    address: '',
    preferences: [],
    allergies: []
  });

  // Load user data and saved addresses
  useEffect(() => {
    const loadUserAndAddresses = async () => {
      // 1. Check local storage first for immediate fill
      const storedUserRaw = localStorage.getItem('user');
      let localUser: any = null;
      if (storedUserRaw) {
        try {
          localUser = JSON.parse(storedUserRaw);
        } catch (e) {
          localUser = null;
        }
      }

      if (localUser) {
        setCurrentUser(localUser);
        setFormData(prev => ({
          ...prev,
          name: prev.name || localUser.name || '',
          phone: prev.phone || localUser.phone || '',
        }));

        const rawAddresses = Array.isArray(localUser.addresses) ? localUser.addresses : [];
        let validAddresses = rawAddresses.filter(
          (a: any) => a?.address && !a.address.includes('123 Health Street') && !a.address.includes('123 Main St')
        );

        // If no saved addresses in user profile, check if there is an address from activeSubscription!
        if (validAddresses.length === 0) {
          const storedSubRaw = localStorage.getItem('activeSubscription');
          if (storedSubRaw) {
            try {
              const sub = JSON.parse(storedSubRaw);
              if (sub.address && !sub.address.includes('123 Health Street') && !sub.address.includes('123 Main St')) {
                validAddresses = [{
                  title: 'Home',
                  address: sub.address,
                  isDefault: true
                }];
                localUser.addresses = validAddresses;
                localStorage.setItem('user', JSON.stringify(localUser));
              }
            } catch (e) {}
          }
        } else if (validAddresses.length !== rawAddresses.length) {
          // Update localStorage if dummy addresses were pruned
          localUser.addresses = validAddresses;
          localStorage.setItem('user', JSON.stringify(localUser));
        }

        if (validAddresses.length > 0) {
          setSavedAddresses(validAddresses);
          const defIdx = validAddresses.findIndex((a: any) => a.isDefault);
          const initialIdx = defIdx >= 0 ? defIdx : 0;
          setSelectedAddressIndex(initialIdx);
          setIsCustomAddress(false);
          setFormData(prev => ({
            ...prev,
            address: validAddresses[initialIdx].address || ''
          }));
          setSetAsDefault(Boolean(validAddresses[initialIdx].isDefault));
        } else {
          setSavedAddresses([]);
          setIsCustomAddress(true);
          setSetAsDefault(true);
        }
      } else {
        // Even if localUser is null, check if there is an activeSubscription in localStorage
        const storedSubRaw = localStorage.getItem('activeSubscription');
        let foundSubAddr = '';
        if (storedSubRaw) {
          try {
            const sub = JSON.parse(storedSubRaw);
            if (sub.address && !sub.address.includes('123 Health Street') && !sub.address.includes('123 Main St')) {
              foundSubAddr = sub.address;
            }
          } catch (e) {}
        }

        if (foundSubAddr) {
          const subAddresses: SavedAddress[] = [{
            title: 'Home',
            address: foundSubAddr,
            isDefault: true
          }];
          setSavedAddresses(subAddresses);
          setSelectedAddressIndex(0);
          setIsCustomAddress(false);
          setFormData(prev => ({ ...prev, address: foundSubAddr }));
          setSetAsDefault(true);
        } else {
          setIsCustomAddress(true);
          setSetAsDefault(true);
        }
      }

      // 2. Refresh from backend /api/auth/me if logged in
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await apiGetMe();
          if (res.success && res.user) {
            const freshUser = res.user;
            const freshRaw = Array.isArray(freshUser.addresses) ? freshUser.addresses : [];
            let freshValid = freshRaw.filter(
              (a: any) => a?.address && !a.address.includes('123 Health Street') && !a.address.includes('123 Main St')
            );

            // If fresh user has no addresses, fetch user's subscriptions from backend to pull subscription address
            if (freshValid.length === 0 && freshUser.email) {
              try {
                const { fetchSubscriptions } = await import('../../services/api');
                const subRes = await fetchSubscriptions({ email: freshUser.email });
                if (subRes.success && Array.isArray(subRes.data) && subRes.data.length > 0) {
                  for (const s of subRes.data) {
                    if (s.address && !s.address.includes('123 Health Street') && !s.address.includes('123 Main St')) {
                      const alreadyIn = freshValid.some((a: any) => a.address.trim().toLowerCase() === s.address.trim().toLowerCase());
                      if (!alreadyIn) {
                        freshValid.push({
                          title: 'Home',
                          address: s.address,
                          isDefault: freshValid.length === 0
                        });
                      }
                    }
                  }
                }
              } catch (subErr) {}
            }

            freshUser.addresses = freshValid;
            setCurrentUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
            setFormData(prev => ({
              ...prev,
              name: prev.name || freshUser.name || '',
              phone: prev.phone || freshUser.phone || '',
            }));

            if (freshValid.length > 0) {
              setSavedAddresses(freshValid);
              const defIdx = freshValid.findIndex((a: any) => a.isDefault);
              const initialIdx = defIdx >= 0 ? defIdx : 0;
              setSelectedAddressIndex(initialIdx);
              setIsCustomAddress(false);
              setFormData(prev => ({
                ...prev,
                address: freshValid[initialIdx].address || ''
              }));
              setSetAsDefault(Boolean(freshValid[initialIdx].isDefault));
            } else {
              setSavedAddresses([]);
              setIsCustomAddress(true);
              setSetAsDefault(true);
            }
          }
        } catch (err) {
          console.warn('Failed to fetch latest user profile:', err);
        }
      }
    };

    loadUserAndAddresses();

    // Auto-detect user's real GPS position on mount so map and search start from user's physical location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setMapCoords({ lat: latitude, lng: longitude });
        },
        (err) => {
          console.log('Auto GPS background lookup status:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  const updateAddressFields = (fields: Partial<typeof addressFields>) => {
    setAddressFields(prev => {
      const next = { ...prev, ...fields };
      const formatted = formatFullAddress(next);
      setFormData(f => ({ ...f, address: formatted }));
      return next;
    });
  };

  const handleLocationPicked = (geo: GeocodedAddress, isSilent: boolean = false) => {
    setMapCoords({ lat: geo.lat, lng: geo.lng });
    updateAddressFields({
      street: geo.street || geo.displayName.split(',')[0] || addressFields.street,
      area: geo.area || addressFields.area,
      city: geo.city || addressFields.city || 'Kochi',
      state: geo.state || addressFields.state || 'Kerala',
      pincode: geo.pincode || addressFields.pincode
    });
    if (!isSilent) {
      toast.success('Location set & address auto-filled from map!', { id: 'location-picked-toast' });
    }
  };

  const handleQuickCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCoords({ lat: latitude, lng: longitude });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            updateAddressFields({
              street: addr.road || addr.street || addr.pedestrian || addressFields.street,
              area: addr.suburb || addr.neighbourhood || addr.residential || addr.subdistrict || addressFields.area,
              city: addr.city || addr.town || addr.village || addressFields.city || 'Kochi',
              state: addr.state || addressFields.state || 'Kerala',
              pincode: addr.postcode || addressFields.pincode
            });
            toast.success('GPS current location detected and filled!');
          } else {
            toast.success('Current GPS coordinates detected!');
          }
        } catch (err) {
          toast.success('Current GPS coordinates detected!');
        } finally {
          setIsLocatingGPS(false);
        }
      },
      (err) => {
        setIsLocatingGPS(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location permission was denied. Please pick your location on the map.');
        } else {
          toast.error('Could not detect your current location. Please use the map.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSelectAddress = (index: number) => {
    setSelectedAddressIndex(index);
    setIsCustomAddress(false);
    const target = savedAddresses[index];
    if (target) {
      setFormData(prev => ({ ...prev, address: target.address }));
      setSetAsDefault(Boolean(target.isDefault));
    }
  };

  const handleSelectNewAddress = () => {
    setIsCustomAddress(true);
    setSelectedAddressIndex(null);
    const currentFull = formatFullAddress(addressFields);
    setFormData(prev => ({ ...prev, address: currentFull }));
    setSetAsDefault(savedAddresses.length === 0);
  };

  const toggleSelection = (field: 'allergies' | 'preferences', item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item) 
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const [skippedDates, setSkippedDates] = useState<string[]>([]);
  
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const [currentMonth, setCurrentMonth] = useState(new Date(startDate.getFullYear(), startDate.getMonth(), 1));

  // Calculate covered dates dynamically based on duration and skipped dates
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
    if (clickedDate < startDate) return; // Cannot skip past dates

    const dateStr = `${year}-${month}-${day}`;
    setSkippedDates(prev => 
      prev.includes(dateStr) 
        ? prev.filter(d => d !== dateStr) 
        : [...prev, dateStr]
    );
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const handleCompleteOrder = async () => {
    const effectiveAddress = (formData.address || formatFullAddress(addressFields)).trim();

    if (!formData.name.trim() || !formData.phone.trim() || !effectiveAddress) {
      toast.error('Please fill in your full name, phone number, and delivery address.');
      return;
    }

    if (paymentMethod === 'card' && !cardDetails.number.trim()) {
      toast.error('Please enter your card number.');
      return;
    }

    if (paymentMethod === 'upi' && !upiId.trim()) {
      toast.error('Please enter your UPI ID.');
      return;
    }

    setIsProcessing(true);

    const paymentLabel = paymentMethod === 'card' 
      ? `Card ending in ${cardDetails.number.replace(/\s+/g, '').slice(-4) || '4242'}`
      : paymentMethod === 'upi' 
        ? `UPI (${upiId || 'Direct UPI'})` 
        : 'Cash on Delivery';

    // 1. Sync Address and Default Preferences
    try {
      const storedUserRaw = localStorage.getItem('user');
      const user = currentUser || (storedUserRaw ? JSON.parse(storedUserRaw) : null);
      let updatedAddresses: SavedAddress[] = [...savedAddresses];

      // Ensure the effectiveAddress from this subscription is in updatedAddresses
      const existingAddrIdx = updatedAddresses.findIndex(
        a => a.address.trim().toLowerCase() === effectiveAddress.toLowerCase()
      );

      if (existingAddrIdx === -1) {
        const titleToUse = addressFields.tag || newAddressTitle.trim() || (updatedAddresses.length === 0 ? 'Home' : `Address ${updatedAddresses.length + 1}`);
        const newAddr: SavedAddress = {
          title: titleToUse,
          address: effectiveAddress,
          isDefault: setAsDefault || updatedAddresses.length === 0
        };

        if (newAddr.isDefault) {
          updatedAddresses = updatedAddresses.map(a => ({ ...a, isDefault: false }));
        }
        updatedAddresses.push(newAddr);
      } else if (setAsDefault) {
        updatedAddresses = updatedAddresses.map((a, idx) => ({
          ...a,
          isDefault: idx === existingAddrIdx
        }));
      }

      setSavedAddresses(updatedAddresses);

      // Update local storage user profile
      const updatedUser = {
        ...(user || {}),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        addresses: updatedAddresses
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);

      // Update backend if authenticated
      if (localStorage.getItem('token')) {
        await apiUpdateAddresses(updatedAddresses);
      }
    } catch (addrErr) {
      console.warn('Address sync error:', addrErr);
    }

    // 2. Persist subscription in backend if possible
    try {
      const userEmail = currentUser?.email || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).email : '');
      const subPayload = {
        id: `SUB-${Math.floor(100 + Math.random() * 900)}`,
        customerName: formData.name.trim(),
        customerEmail: userEmail || 'user@shift24.food',
        customerPhone: formData.phone.trim(),
        planId: plan.id,
        planTitle: plan.title,
        duration: durationDays === 1 ? '1-Day Trial' : `${durationDays} Days`,
        durationDays,
        mealsPerDay,
        slot: selectedSlot,
        slotLabel: getMealSlotSummary(),
        totalPrice: finalTotal,
        paymentMethod: paymentLabel,
        status: 'Active' as const,
        startDate: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        endDate: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        nextDelivery: 'Tomorrow, 08:00 AM - 09:00 AM',
        address: effectiveAddress,
        coordinates: mapCoords,
        allergies: formData.allergies,
        preferences: formData.preferences,
      };
      await createBackendSubscription(subPayload);

      try {
        const existingAdminSubs = JSON.parse(localStorage.getItem('shift24_admin_subscriptions') || '[]');
        const dummyIds = new Set(['SUB-801', 'SUB-802', 'SUB-803', 'SUB-804', 'SUB-805']);
        const cleanedExisting = existingAdminSubs.filter((s: any) => !dummyIds.has(s.id) && !dummyIds.has(s.subId));
        localStorage.setItem('shift24_admin_subscriptions', JSON.stringify([subPayload, ...cleanedExisting]));
      } catch {}

      // Automatically sync customer in local admin store
      try {
        const existingCusts = getAdminCustomers();
        const cleanEmail = (userEmail || 'user@shift24.food').toLowerCase().trim();
        const existingIdx = existingCusts.findIndex(c => 
          (c.email && c.email.toLowerCase() === cleanEmail) || 
          (c.phone && c.phone === formData.phone.trim())
        );
        const deliveries = durationDays * (parseInt(mealsPerDay) || 1);
        if (existingIdx >= 0) {
          existingCusts[existingIdx].name = formData.name.trim() || existingCusts[existingIdx].name;
          existingCusts[existingIdx].phone = formData.phone.trim() || existingCusts[existingIdx].phone;
          existingCusts[existingIdx].activePlan = `${plan.title} Plan`;
          existingCusts[existingIdx].totalSpent = (existingCusts[existingIdx].totalSpent || 0) + finalTotal;
          existingCusts[existingIdx].totalOrders = (existingCusts[existingIdx].totalOrders || 0) + deliveries;
          existingCusts[existingIdx].address = effectiveAddress;
          existingCusts[existingIdx].coordinates = mapCoords;
          existingCusts[existingIdx].allergies = Array.from(new Set([...(existingCusts[existingIdx].allergies || []), ...formData.allergies]));
          existingCusts[existingIdx].status = 'Active';
        } else {
          existingCusts.unshift({
            id: `CUST-${Math.floor(100 + Math.random() * 900)}`,
            name: formData.name.trim(),
            email: cleanEmail,
            phone: formData.phone.trim(),
            totalOrders: deliveries,
            totalSpent: finalTotal,
            joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            activePlan: `${plan.title} Plan`,
            allergies: formData.allergies,
            address: effectiveAddress,
            coordinates: mapCoords,
            status: 'Active'
          });
        }
        saveAdminCustomers(existingCusts);
        window.dispatchEvent(new Event('shift24-customers-updated'));
        window.dispatchEvent(new Event('shift24-subscriptions-updated'));
      } catch (custErr) {
        console.warn('Admin customer sync error:', custErr);
      }
    } catch (subErr) {
      console.warn('Backend subscription save error:', subErr);
    }

    // 3. Save local active subscription state
    const subDetails = {
      planName: `${plan.title} Plan`,
      duration: durationDays === 1 ? '1-Day Trial' : `${durationDays} Days`,
      meals: getMealSlotSummary(),
      totalPrice: `₹${finalTotal}`,
      paymentMethod: paymentLabel,
      status: 'Active',
      nextDelivery: 'Tomorrow, 08:00 AM - 09:00 AM',
      startDate: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      endDate: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      address: effectiveAddress,
    };
    localStorage.setItem('activeSubscription', JSON.stringify(subDetails));
    localStorage.setItem('isLoggedIn', 'true');
    if (formData.name) {
      localStorage.setItem('userName', formData.name.trim());
    }
    window.dispatchEvent(new Event('auth-change'));

    setTimeout(() => {
      setIsProcessing(false);
      toast.success('Subscription confirmed! Welcome to SHIFT24.');
      navigate('/profile');
    }, 600);
  };

  return (
    <div className="py-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-6xl mx-auto mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </button>
        </div>

        <div className="text-center mb-14">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4">Complete Your Subscription</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">Review your meal routine, enter delivery details, and pay securely.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Form Column */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[32px] shadow-sm border border-slate-200">
              
              {/* Plan & Duration Selector (Convenient for direct /checkout visitors) */}
              <div className="mb-8 pb-8 border-b border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Choose Diet Goal</label>
                  <span className="text-xs text-emerald-600 font-semibold">{plan.title} Selected</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 mb-5">
                  {adminPlans.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCurrentPlanId(p.id)}
                      className={`p-3 rounded-xl border text-center transition-all text-xs font-bold ${
                        currentPlanId === p.id 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs' 
                          : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200'
                      }`}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plan Duration</label>
                  <span className="text-xs text-slate-400 font-medium">Choose your commitment</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { days: 1, label: '1-Day Trial' },
                    { days: 7, label: '7 Days' },
                    { days: 15, label: '15 Days (5% off)' },
                    { days: 30, label: '30 Days (10% off)' },
                  ].map(d => (
                    <button
                      key={d.days}
                      type="button"
                      onClick={() => setDurationDays(d.days)}
                      className={`p-2.5 rounded-xl border text-center transition-all text-xs font-bold ${
                        durationDays === d.days
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs' 
                          : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Delivery Details</h2>
                  {currentUser && (
                    <p className="text-xs text-emerald-600 font-medium mt-0.5">
                      Auto-filled from your profile ({currentUser.email || currentUser.name})
                    </p>
                  )}
                </div>
              </div>

              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleCompleteOrder(); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                    <input 
                      type="text" 
                      className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-colors text-sm font-medium" 
                      placeholder="John Doe" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                    <input 
                      type="tel" 
                      className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-colors text-sm font-medium" 
                      placeholder="+91 98765 43210" 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                      required 
                    />
                  </div>
                </div>
                
                {/* Delivery Address Section */}
                {savedAddresses.length > 0 ? (
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold text-slate-700">
                        Delivery Address
                      </label>
                      <button
                        type="button"
                        onClick={isCustomAddress ? () => handleSelectAddress(0) : handleSelectNewAddress}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        {isCustomAddress ? (
                          <>Use Saved Address ({savedAddresses.length})</>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" /> + Enter New Address
                          </>
                        )}
                      </button>
                    </div>

                    {!isCustomAddress ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {savedAddresses.map((addr, idx) => {
                            const isSelected = selectedAddressIndex === idx;
                            return (
                              <div
                                key={addr.id || `addr-${idx}`}
                                onClick={() => handleSelectAddress(idx)}
                                className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all relative ${
                                  isSelected
                                    ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-500/20'
                                    : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50/50'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                      isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                                    }`}>
                                      {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                    </div>
                                    <span className="font-bold text-sm text-slate-900">{addr.title || 'Address'}</span>
                                  </div>
                                  {addr.isDefault && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed pl-6">
                                  {addr.address}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Option to set selected address as default */}
                        {selectedAddressIndex !== null && savedAddresses[selectedAddressIndex] && (
                          <div className="pt-1">
                            {savedAddresses[selectedAddressIndex].isDefault ? (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                This is your default delivery address
                              </div>
                            ) : (
                              <div
                                onClick={() => setSetAsDefault(!setAsDefault)}
                                className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border cursor-pointer select-none transition-all ${
                                  setAsDefault
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-500/20 shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-200 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={setAsDefault}
                                  onChange={(e) => setSetAsDefault(e.target.checked)}
                                  className="sr-only"
                                />
                                <div
                                  className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                                    setAsDefault
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'border-2 border-slate-300 bg-white'
                                  }`}
                                >
                                  {setAsDefault && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="text-xs font-semibold">
                                  Set this address as my default delivery address
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50/80 p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-5 animate-in fade-in duration-300">
                        {/* Google Maps & GPS Section */}
                        {!showMapPicker ? (
                          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                <MapPin className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-emerald-950">Delivery Location & GPS</p>
                                <p className="text-[11px] text-emerald-700">Search place, use GPS or pinpoint your exact delivery entrance</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowMapPicker(true)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all"
                            >
                              <Compass className="w-4 h-4" />
                              Choose on Map
                            </button>
                          </div>
                        ) : (
                          <div className="animate-in fade-in zoom-in-95 duration-200">
                            <LocationMapPicker
                              initialLat={mapCoords.lat}
                              initialLng={mapCoords.lng}
                              onLocationSelect={handleLocationPicked}
                              onClose={() => setShowMapPicker(false)}
                            />
                          </div>
                        )}

                        {/* Structured Address Fields */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Flat / House / Door No. <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Flat 402, 4th Floor"
                                value={addressFields.flatNo}
                                onChange={(e) => updateAddressFields({ flatNo: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Building / Street / Society <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Green Meadows, 12th Main"
                                value={addressFields.street}
                                onChange={(e) => updateAddressFields({ street: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Area / Locality / Neighborhood <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Panampilly Nagar"
                                value={addressFields.area}
                                onChange={(e) => updateAddressFields({ area: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Landmark <span className="text-slate-400 font-normal lowercase">(optional)</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Near Metro Station / Park"
                                value={addressFields.landmark}
                                onChange={(e) => updateAddressFields({ landmark: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                City / Town <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Kochi"
                                value={addressFields.city}
                                onChange={(e) => updateAddressFields({ city: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                State <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Kerala"
                                value={addressFields.state}
                                onChange={(e) => updateAddressFields({ state: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Pincode / Postal Code <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 682036"
                                value={addressFields.pincode}
                                onChange={(e) => updateAddressFields({ pincode: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                                required
                              />
                            </div>
                          </div>

                          {/* Address Tag */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                              Save Address Label As
                            </label>
                            <div className="flex gap-2.5">
                              {[
                                { id: 'Home', icon: Home, label: 'Home' },
                                { id: 'Work', icon: Briefcase, label: 'Work' },
                                { id: 'Other', icon: Building, label: 'Other' },
                              ].map((t) => {
                                const IconComp = t.icon;
                                const isSel = addressFields.tag === t.id;
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => updateAddressFields({ tag: t.id })}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                      isSel
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    <IconComp className="w-3.5 h-3.5" />
                                    {t.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Full Formatted Address Preview */}
                          {formData.address && (
                            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600">
                              <span className="font-bold text-slate-900 block mb-0.5">Delivery Address Summary:</span>
                              <p className="text-slate-600 leading-relaxed">{formData.address}</p>
                            </div>
                          )}

                          <div
                            onClick={() => setSetAsDefault(!setAsDefault)}
                            className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                              setAsDefault
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-500/20 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={setAsDefault}
                              onChange={(e) => setSetAsDefault(e.target.checked)}
                              className="sr-only"
                            />
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                                setAsDefault
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'border-2 border-slate-300 bg-white'
                              }`}
                            >
                              {setAsDefault && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-semibold">
                              Set this address as my default delivery address
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 pt-1">
                    {!showMapPicker ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-emerald-950">Delivery Location & GPS</p>
                            <p className="text-[11px] text-emerald-700">Search place, use GPS or pinpoint your exact delivery entrance</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowMapPicker(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all"
                        >
                          <Compass className="w-4 h-4" />
                          Choose on Map
                        </button>
                      </div>
                    ) : (
                      <div className="animate-in fade-in zoom-in-95 duration-200">
                        <LocationMapPicker
                          initialLat={mapCoords.lat}
                          initialLng={mapCoords.lng}
                          onLocationSelect={handleLocationPicked}
                          onClose={() => setShowMapPicker(false)}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Flat / House / Door No. <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Flat 402, 4th Floor"
                          value={addressFields.flatNo}
                          onChange={(e) => updateAddressFields({ flatNo: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Building / Street / Society <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Green Meadows, 12th Main"
                          value={addressFields.street}
                          onChange={(e) => updateAddressFields({ street: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Area / Locality / Neighborhood <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Panampilly Nagar"
                          value={addressFields.area}
                          onChange={(e) => updateAddressFields({ area: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Landmark <span className="text-slate-400 font-normal lowercase">(optional)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Near Metro Station / Park"
                          value={addressFields.landmark}
                          onChange={(e) => updateAddressFields({ landmark: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          City / Town <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Kochi"
                          value={addressFields.city}
                          onChange={(e) => updateAddressFields({ city: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          State <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Kerala"
                          value={addressFields.state}
                          onChange={(e) => updateAddressFields({ state: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Pincode / Postal Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 682036"
                          value={addressFields.pincode}
                          onChange={(e) => updateAddressFields({ pincode: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Save Address Label As
                      </label>
                      <div className="flex gap-2.5">
                        {[
                          { id: 'Home', icon: Home, label: 'Home' },
                          { id: 'Work', icon: Briefcase, label: 'Work' },
                          { id: 'Other', icon: Building, label: 'Other' },
                        ].map((t) => {
                          const IconComp = t.icon;
                          const isSel = addressFields.tag === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => updateAddressFields({ tag: t.id })}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                isSel
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <IconComp className="w-3.5 h-3.5" />
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {formData.address && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600">
                        <span className="font-bold text-slate-900 block mb-0.5">Delivery Address Summary:</span>
                        <p className="text-slate-600 leading-relaxed">{formData.address}</p>
                      </div>
                    )}

                    <div
                      onClick={() => setSetAsDefault(!setAsDefault)}
                      className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 mt-3 rounded-xl border cursor-pointer select-none transition-all ${
                        setAsDefault
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-500/20 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={setAsDefault}
                        onChange={(e) => setSetAsDefault(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                          setAsDefault
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'border-2 border-slate-300 bg-white'
                        }`}
                      >
                        {setAsDefault && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-semibold">
                        Set as default address for future orders
                      </span>
                    </div>
                  </div>
                )}

                <hr className="border-slate-100 my-8" />

                {/* Daily Meal Options */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-slate-900">Daily Meals</h2>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                    {mealsPerDay === '1' ? '1 Meal Daily' : `${mealsPerDay} Meals Daily`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { id: '1', label: '1 Meal / Day', sub: 'Breakfast, Lunch or Dinner' },
                    { id: '2', label: '2 Meals / Day', sub: 'Breakfast & Lunch / Dinner' },
                    { id: '3', label: '3 Meals / Day', sub: 'All 3 Meals' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        const newMeals = m.id as '1' | '2' | '3';
                        setMealsPerDay(newMeals);
                        if (newMeals === '1' && (selectedSlot === 'breakfast-lunch' || selectedSlot === 'lunch-dinner' || selectedSlot === 'breakfast-dinner')) {
                          setSelectedSlot('lunch');
                        } else if (newMeals === '2' && (selectedSlot === 'breakfast' || selectedSlot === 'lunch' || selectedSlot === 'dinner')) {
                          setSelectedSlot('breakfast-lunch');
                        }
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        mealsPerDay === m.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-sm font-bold">{m.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{m.sub}</div>
                    </button>
                  ))}
                </div>

                {mealsPerDay === '1' && (
                  <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 animate-in fade-in duration-300 mb-6">
                    <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">Selected Meal Slot</label>
                    <div className="flex gap-2.5">
                      {(['breakfast', 'lunch', 'dinner'] as const).map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                            selectedSlot === slot
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50/50'
                          }`}
                        >
                          {slot} {slot === 'lunch' ? '★ (Popular)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {mealsPerDay === '2' && (
                  <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 animate-in fade-in duration-300 mb-6">
                    <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">Selected Meal Slots</label>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        { id: 'breakfast-lunch', label: 'Breakfast & Lunch' },
                        { id: 'lunch-dinner', label: 'Lunch & Dinner', popular: true },
                        { id: 'breakfast-dinner', label: 'Breakfast & Dinner' },
                      ].map((combo) => (
                        <button
                          key={combo.id}
                          type="button"
                          onClick={() => setSelectedSlot(combo.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            selectedSlot === combo.id
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50/50'
                          }`}
                        >
                          {combo.label} {combo.popular ? '★ (Popular)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <hr className="border-slate-100 my-8" />

                <h2 className="text-2xl font-bold text-slate-900 mb-8">Dietary Requirements</h2>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-4">Food Allergies (Optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {commonIngredients.map(item => {
                      const isSelected = formData.allergies.includes(item);
                      return (
                        <button
                          key={`allergy-${item}`}
                          type="button"
                          onClick={() => toggleSelection('allergies', item)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${isSelected ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="pt-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-4">Special Preferences / Dislikes (Optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {commonIngredients.map(item => {
                      const isSelected = formData.preferences.includes(item);
                      return (
                        <button
                          key={`pref-${item}`}
                          type="button"
                          onClick={() => toggleSelection('preferences', item)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${isSelected ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <hr className="border-slate-100 my-8" />

                {/* Payment Methods Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900">Payment Method</h2>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" /> 256-bit Encrypted
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <label className={`flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                      paymentMethod === 'card' ? 'border-emerald-500 bg-emerald-50/60 shadow-sm ring-2 ring-emerald-500/20' : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50'
                    }`}>
                      <input type="radio" name="paymentMethod" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="sr-only" />
                      <CreditCard className={`w-6 h-6 mb-2 ${paymentMethod === 'card' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className={`text-sm font-bold ${paymentMethod === 'card' ? 'text-emerald-700' : 'text-slate-700'}`}>Card</span>
                    </label>

                    <label className={`flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                      paymentMethod === 'upi' ? 'border-emerald-500 bg-emerald-50/60 shadow-sm ring-2 ring-emerald-500/20' : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50'
                    }`}>
                      <input type="radio" name="paymentMethod" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} className="sr-only" />
                      <Smartphone className={`w-6 h-6 mb-2 ${paymentMethod === 'upi' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className={`text-sm font-bold ${paymentMethod === 'upi' ? 'text-emerald-700' : 'text-slate-700'}`}>UPI / QR</span>
                    </label>

                    <label className={`flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                      paymentMethod === 'cod' ? 'border-emerald-500 bg-emerald-50/60 shadow-sm ring-2 ring-emerald-500/20' : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50'
                    }`}>
                      <input type="radio" name="paymentMethod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="sr-only" />
                      <Banknote className={`w-6 h-6 mb-2 ${paymentMethod === 'cod' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className={`text-sm font-bold text-center ${paymentMethod === 'cod' ? 'text-emerald-700' : 'text-slate-700'}`}>Cash on Delivery</span>
                    </label>
                  </div>

                  {paymentMethod === 'card' && (
                    <div className="bg-slate-50/90 p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in duration-300">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Card Number</label>
                        <input 
                          type="text" 
                          placeholder="4532 •••• •••• 8921"
                          value={cardDetails.number}
                          onChange={e => setCardDetails({...cardDetails, number: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Expiry Date</label>
                          <input 
                            type="text" 
                            placeholder="MM/YY"
                            value={cardDetails.expiry}
                            onChange={e => setCardDetails({...cardDetails, expiry: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">CVV / CVC</label>
                          <input 
                            type="password" 
                            maxLength={4}
                            placeholder="•••"
                            value={cardDetails.cvc}
                            onChange={e => setCardDetails({...cardDetails, cvc: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                          />
                        </div>
                      </div>
                      <div className="pt-2 flex items-center gap-2 text-xs text-slate-500">
                        <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Card information is securely processed via 256-bit encryption.</span>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'upi' && (
                    <div className="bg-slate-50/90 p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in duration-300">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fast UPI Transfer</p>
                      <div className="flex flex-wrap gap-2">
                        {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI'].map((app) => (
                          <span key={app} className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-xs">
                            {app}
                          </span>
                        ))}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Enter Virtual Payment Address (VPA)</label>
                        <input 
                          type="text" 
                          placeholder="yourname@okaxis"
                          value={upiId}
                          onChange={e => setUpiId(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'cod' && (
                    <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 space-y-1.5 text-center animate-in fade-in duration-300">
                      <p className="text-emerald-900 font-bold text-sm">Pay on First Meal Delivery</p>
                      <p className="text-emerald-700 text-xs leading-relaxed">
                        Pay ₹{finalTotal} cash or via UPI QR code when our delivery courier hands over your initial meal box.
                      </p>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-emerald-50 p-6 md:p-10 rounded-2xl md:rounded-[32px] border border-emerald-100">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Order Summary</h3>
              
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-emerald-200">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                  {Icon && <Icon className="w-8 h-8" />}
                </div>
                <div>
                  <div className="font-bold text-lg text-slate-900">{plan.title} Plan</div>
                  <div className="text-emerald-700 font-medium">
                    {durationDays === 1 ? '1-Day Trial Subscription' : `${durationDays} Days Subscription`}
                  </div>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-slate-700 font-medium">
                    {mealsPerDay === '1' 
                      ? `1 Chef-prepared meal daily (${selectedSlot.toUpperCase()})` 
                      : mealsPerDay === '2'
                      ? `2 Chef-prepared meals daily (${(twoMealLabels[selectedSlot] || 'BREAKFAST & LUNCH').toUpperCase()})`
                      : `${mealsPerDay} Chef-prepared meals daily`}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-slate-700">Free door-to-door delivery</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-slate-700">Cancel or pause anytime</span>
                </li>
              </ul>

              {/* Price Breakdown */}
              <div className="pt-6 border-t border-emerald-200/80 space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Daily Rate</span>
                  <span className="font-semibold text-slate-800">₹{Math.round(dailyBase)}/day</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Duration</span>
                  <span className="font-semibold text-slate-800">{durationDays} Day{durationDays > 1 ? 's' : ''}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Duration Discount ({discountPercent}%)</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-3 border-t border-emerald-200 text-slate-900">
                  <span className="font-bold text-base">Total Due</span>
                  <span className="text-2xl font-black text-emerald-700">₹{finalTotal}</span>
                </div>
              </div>
            </div>

            {/* Delivery Calendar (Skip Days) */}
            <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[32px] shadow-sm border border-slate-200">
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                    <CalendarIcon className="w-5 h-5" />
                 </div>
                 <div>
                   <h3 className="text-lg font-bold text-slate-900">Manage Deliveries</h3>
                   <p className="text-sm text-slate-500">Tap days you want to skip</p>
                 </div>
               </div>

               <div className="mb-4 flex items-center justify-between">
                 <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                   <ChevronLeft className="w-5 h-5 text-slate-600" />
                 </button>
                 <span className="font-bold text-slate-800">{monthName}</span>
                 <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                   <ChevronRight className="w-5 h-5 text-slate-600" />
                 </button>
               </div>

               <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400">
                 {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
               </div>
               
               <div className="grid grid-cols-7 gap-2">
                 {Array.from({ length: firstDay }).map((_, i) => (
                   <div key={`empty-${i}`} className="h-10"></div>
                 ))}
                 {Array.from({ length: daysInMonth }).map((_, i) => {
                   const day = i + 1;
                   const year = currentMonth.getFullYear();
                   const month = currentMonth.getMonth();
                   const dateStr = `${year}-${month}-${day}`;
                   const clickedDate = new Date(year, month, day);
                   
                   const isPast = clickedDate < startDate;
                   const isSkipped = skippedDates.includes(dateStr);
                   const isActive = activeDates.has(dateStr);
                   
                   let dayClass = 'bg-slate-50 text-slate-400';
                   if (isSkipped) {
                     dayClass = 'bg-red-50 text-red-600 border border-red-200 font-bold';
                   } else if (isActive) {
                     dayClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold hover:bg-emerald-100 cursor-pointer shadow-sm';
                   } else if (!isPast) {
                     dayClass = 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-50 cursor-pointer';
                   }

                   return (
                     <button 
                       key={day}
                       disabled={isPast && !isSkipped && !isActive}
                       onClick={() => handleDayClick(year, month, day)}
                       className={`h-10 rounded-xl flex items-center justify-center text-sm transition-all ${dayClass}`}
                     >
                       {day}
                     </button>
                   )
                 })}
               </div>
               
               <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
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
                     <p className="text-xs text-slate-600 font-medium">
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

            <button 
              type="button"
              disabled={isProcessing}
              onClick={handleCompleteOrder}
              className={`w-full py-5 rounded-2xl font-bold shadow-xl text-lg flex items-center justify-center gap-2 transition-all ${
                isProcessing 
                  ? 'bg-slate-400 text-white cursor-not-allowed' 
                  : 'bg-slate-900 text-white hover:bg-emerald-600 hover:shadow-emerald-900/20'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Processing Secure Payment...
                </>
              ) : (
                <>
                  Complete Subscription • ₹{finalTotal}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
