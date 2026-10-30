import { isDateSkipped, isMealSkipped, getAdminSubscriptions, saveAdminSubscriptions } from '../Admin/adminData';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, Repeat, MapPin, Shield, FileText, RefreshCcw, HelpCircle, Trash2, LogOut, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Settings, Edit2, Check, Pause, Play, Clock, X, AlertTriangle, Compass, Plus, Home, Briefcase, Building, CheckCircle2, Mail, KeyRound, Coffee, Sun, Moon, Utensils, CalendarX, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { showConfirmToast } from '../../utils/confirmToast';
import { commonIngredients } from '../../data/mockData';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { LocationMapPicker, GeocodedAddress } from '../../components/ui/LocationMapPicker';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';

export function ProfilePage() {
  const navigate = useNavigate();
  const storedUserRaw = localStorage.getItem('user');
  let loggedInUser: any = null;
  try {
    if (storedUserRaw) loggedInUser = JSON.parse(storedUserRaw);
  } catch (e) {
    // ignore
  }

  // Check activeSubscription for name/phone from subscription collection
  let localActiveSub: any = null;
  try {
    const rawSub = localStorage.getItem('activeSubscription');
    if (rawSub) localActiveSub = JSON.parse(rawSub);
  } catch {}

  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    phone: string;
  }>(() => {
    return {
      name: loggedInUser?.name || localActiveSub?.customerName || localStorage.getItem('userName') || '',
      email: loggedInUser?.email || localActiveSub?.customerEmail || localStorage.getItem('userEmail') || '',
      phone: loggedInUser?.phone || localActiveSub?.customerPhone || localStorage.getItem('userPhone') || '',
    };
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const displayName = userProfile.name || loggedInUser?.name || localActiveSub?.customerName || localStorage.getItem('userName') || 'Alex Doe';

  useEffect(() => {
    const fetchFreshUser = async () => {
      try {
        const { apiGetMe, fetchSubscriptions } = await import('../../services/api');
        const res = await apiGetMe();
        const fresh = res?.user || res?.data;
        if (res && res.success && fresh) {
          setUserProfile(prev => ({
            name: fresh.name || prev.name || '',
            email: fresh.email || prev.email || '',
            phone: fresh.phone || prev.phone || '',
          }));
          const updatedLocalUser = { ...loggedInUser, ...fresh };
          localStorage.setItem('user', JSON.stringify(updatedLocalUser));
          if (fresh.name) localStorage.setItem('userName', fresh.name);
          if (fresh.email) localStorage.setItem('userEmail', fresh.email);
          if (fresh.phone) localStorage.setItem('userPhone', fresh.phone);
          window.dispatchEvent(new Event('auth-change'));
        }

        // Direct fetch from MongoDB subscriptions to guarantee customerName and customerPhone
        const userEmail = fresh?.email || loggedInUser?.email || localStorage.getItem('userEmail');
        if (userEmail) {
          const subRes = await fetchSubscriptions({ email: userEmail });
          if (subRes && subRes.success && Array.isArray(subRes.data) && subRes.data.length > 0) {
            const latestSub = subRes.data[0];
            if (latestSub.customerName || latestSub.customerPhone) {
              setUserProfile(prev => ({
                ...prev,
                name: latestSub.customerName || prev.name,
                phone: latestSub.customerPhone || prev.phone
              }));
              if (latestSub.customerName) localStorage.setItem('userName', latestSub.customerName);
              if (latestSub.customerPhone) localStorage.setItem('userPhone', latestSub.customerPhone);
              try {
                const cur = localStorage.getItem('user');
                if (cur) {
                  const parsed = JSON.parse(cur);
                  if (latestSub.customerName) parsed.name = latestSub.customerName;
                  if (latestSub.customerPhone) parsed.phone = latestSub.customerPhone;
                  localStorage.setItem('user', JSON.stringify(parsed));
                }
              } catch {}
              window.dispatchEvent(new Event('auth-change'));
            }
          }
        }
      } catch (err) {
        // use local
      }
    };
    if (localStorage.getItem('token') || loggedInUser?.email || localStorage.getItem('userEmail')) {
      fetchFreshUser();
    }
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.name.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    try {
      setIsUpdatingProfile(true);
      const { apiUpdateProfile } = await import('../../services/api');
      const res = await apiUpdateProfile({
        name: userProfile.name.trim(),
        phone: userProfile.phone.trim(),
      });

      if (res && res.success === false) {
        toast.error(res.message || 'Failed to update profile');
        return;
      }

      const updatedUser = {
        ...loggedInUser,
        name: userProfile.name.trim(),
        phone: userProfile.phone.trim(),
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('userName', userProfile.name.trim());
      if (userProfile.phone) {
        localStorage.setItem('userPhone', userProfile.phone.trim());
      }
      try {
        const stored = localStorage.getItem('activeSubscription');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.customerName = userProfile.name.trim();
          parsed.customerPhone = userProfile.phone.trim();
          localStorage.setItem('activeSubscription', JSON.stringify(parsed));
        }
      } catch {}

      window.dispatchEvent(new Event('auth-change'));
      toast.success('Profile information updated successfully!');
    } catch (err: any) {
      console.warn('Profile update error:', err);
      const updatedUser = {
        ...loggedInUser,
        name: userProfile.name.trim(),
        phone: userProfile.phone.trim(),
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('userName', userProfile.name.trim());
      if (userProfile.phone) {
        localStorage.setItem('userPhone', userProfile.phone.trim());
      }
      try {
        const stored = localStorage.getItem('activeSubscription');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.customerName = userProfile.name.trim();
          parsed.customerPhone = userProfile.phone.trim();
          localStorage.setItem('activeSubscription', JSON.stringify(parsed));
        }
      } catch {}
      window.dispatchEvent(new Event('auth-change'));
      toast.success('Profile information saved locally!');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (!passwordForm.newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const { apiChangePassword } = await import('../../services/api');
      const res = await apiChangePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (res && res.success === false) {
        toast.error(res.message || 'Failed to change password');
        return;
      }

      toast.success('Password updated successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      console.warn('Change password error:', err);
      toast.error('Failed to update password. Please check your current password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

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
  const [savedTabAddressFields, setSavedTabAddressFields] = useState({
    tag: 'Home',
    flatNo: '',
    street: '',
    area: '',
    landmark: '',
    city: 'Kochi',
    state: 'Kerala',
    pincode: '',
    isDefault: false,
  });
  const [showSavedTabMapPicker, setShowSavedTabMapPicker] = useState(false);
  const [savedTabMapCoords, setSavedTabMapCoords] = useState<{ lat: number; lng: number }>({
    lat: 9.9816,
    lng: 76.2673
  });

  const formatSavedTabAddress = (fields: typeof savedTabAddressFields) => {
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

  const handleStartAddNewAddress = () => {
    setEditingAddressId(null);
    setIsAddingAddress(true);
    setShowSavedTabMapPicker(false);
    setSavedTabAddressFields({
      tag: 'Home',
      flatNo: '',
      street: '',
      area: '',
      landmark: '',
      city: 'Kochi',
      state: 'Kerala',
      pincode: '',
      isDefault: addresses.length === 0,
    });
  };

  const handleSavedTabLocationPicked = (geo: GeocodedAddress, isSilent: boolean = false) => {
    setSavedTabMapCoords({ lat: geo.lat, lng: geo.lng });
    setSavedTabAddressFields(prev => ({
      ...prev,
      street: geo.street || geo.displayName.split(',')[0] || prev.street,
      area: geo.area || prev.area,
      city: geo.city || prev.city || 'Kochi',
      state: geo.state || prev.state || 'Kerala',
      pincode: geo.pincode || prev.pincode
    }));
    if (!isSilent) {
      toast.success('Location updated & address filled from map!', { id: 'saved-tab-location-toast' });
    }
  };

  const handleEditAddress = (id: string) => {
    const target = addresses.find(a => a.id === id);
    if (!target) return;

    setEditingAddressId(id);
    setIsAddingAddress(false);
    setShowSavedTabMapPicker(false);

    let rawAddr = target.address;
    let landmarkVal = '';
    const landmarkMatch = rawAddr.match(/\(Near\s+([^)]+)\)/i);
    if (landmarkMatch) {
      landmarkVal = landmarkMatch[1].trim();
      rawAddr = rawAddr.replace(/\(Near\s+[^)]+\)/i, '').replace(/,\s*,/g, ',');
    }

    const parts = rawAddr.split(',').map(s => s.trim()).filter(Boolean);
    
    let pincodeVal = '';
    if (parts.length > 0 && /^\d{6}$/.test(parts[parts.length - 1])) {
      pincodeVal = parts.pop()!;
    }
    let stateVal = 'Kerala';
    if (parts.length > 0 && ['kerala', 'tamil nadu', 'karnataka'].includes(parts[parts.length - 1].toLowerCase())) {
      stateVal = parts.pop()!;
    }
    let cityVal = 'Kochi';
    if (parts.length > 0) {
      cityVal = parts.pop()!;
    }

    let flatVal = '';
    let streetVal = '';
    let areaVal = '';

    if (parts.length === 1) {
      streetVal = parts[0];
    } else if (parts.length === 2) {
      streetVal = parts[0];
      areaVal = parts[1];
    } else if (parts.length >= 3) {
      flatVal = parts[0];
      streetVal = parts[1];
      areaVal = parts.slice(2).join(', ');
    } else {
      streetVal = target.address;
    }

    setSavedTabAddressFields({
      tag: target.title || 'Home',
      flatNo: flatVal,
      street: streetVal,
      area: areaVal,
      landmark: landmarkVal,
      city: cityVal || 'Kochi',
      state: stateVal || 'Kerala',
      pincode: pincodeVal,
      isDefault: target.isDefault || false,
    });
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
    const formatted = formatSavedTabAddress(savedTabAddressFields);
    if (!formatted.trim()) {
      toast.error('Please enter address details');
      return;
    }

    if (!savedTabAddressFields.street.trim() && !savedTabAddressFields.flatNo.trim()) {
      toast.error('Please enter street or flat / house details');
      return;
    }

    const title = savedTabAddressFields.tag || 'Home';
    const isDefault = savedTabAddressFields.isDefault;

    let nextList: any[] = [];
    if (editingAddressId) {
      nextList = addresses.map(a => {
        if (a.id === editingAddressId) {
          return { ...a, title, address: formatted, isDefault };
        }
        if (isDefault && a.id !== editingAddressId) {
          return { ...a, isDefault: false };
        }
        return a;
      });
      toast.success('Address updated successfully');
    } else {
      const newId = Date.now().toString();
      const updated = isDefault ? addresses.map(a => ({ ...a, isDefault: false })) : addresses;
      nextList = [...updated, { id: newId, title, address: formatted, isDefault }];
      toast.success('Address saved successfully');
    }

    setAddresses(nextList);
    setIsAddingAddress(false);
    setEditingAddressId(null);
    setShowSavedTabMapPicker(false);

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
  const [skippedMeals, setSkippedMeals] = useState<string[]>([]);
  const [mealSkipModalOpen, setMealSkipModalOpen] = useState(false);
  const [selectedDateForMeals, setSelectedDateForMeals] = useState<{
    date: Date;
    dateStr: string;
    formattedDate: string;
    sub: any;
  } | null>(null);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);

  const toggleProfileSelection = async (field: 'allergies' | 'preferences', item: string, sub?: any) => {
    const targetSub = sub || subscriptionsList[0];
    const currentList = field === 'allergies'
      ? (targetSub?.allergies || allergies)
      : (targetSub?.preferences || preferences);

    const isRemoving = currentList.includes(item);
    const updatedList = isRemoving
      ? currentList.filter((i: string) => i !== item)
      : [...currentList, item];

    if (field === 'allergies') {
      setAllergies(updatedList);
    } else {
      setPreferences(updatedList);
    }

    if (targetSub) {
      const payload = field === 'allergies'
        ? { allergies: updatedList }
        : { preferences: updatedList };

      try {
        const { updateBackendSubscriptionDetails } = await import('../../services/api');
        await updateBackendSubscriptionDetails(targetSub.id, payload);

        setSubscriptionsList(prev => prev.map(s => s.id === targetSub.id ? { ...s, ...payload } : s));

        const stored = localStorage.getItem('activeSubscription');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.id === targetSub.id || parsed.subId === targetSub.id || targetSub.id === 'sub_active') {
              localStorage.setItem('activeSubscription', JSON.stringify({ ...parsed, ...payload }));
            }
          } catch (e) {}
        }

        const label = field === 'allergies' ? 'Allergy' : 'Preference';
        toast.success(
          isRemoving ? `Removed ${item} from ${label.toLowerCase()}s` : `Added ${item} to ${label.toLowerCase()}s`,
          { id: `diet-${field}` }
        );
      } catch (err) {
        console.warn('Failed to sync dietary preference:', err);
        toast.error('Failed to update dietary preference. Please try again.');
      }
    }
  };

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const getSubAvailableMealSlots = (sub?: any): Array<{
    type: 'Breakfast' | 'Lunch' | 'Dinner';
    label: string;
    time: string;
  }> => {
    const latestSub = subscriptionsList.find(s => s.id === sub?.id) || sub || subscriptionsList[0];

    const slotBreakfast = { type: 'Breakfast' as const, label: 'Breakfast', time: '07:30 AM - 08:30 AM' };
    const slotLunch = { type: 'Lunch' as const, label: 'Lunch', time: '12:00 PM - 01:00 PM' };
    const slotDinner = { type: 'Dinner' as const, label: 'Dinner', time: '07:30 PM - 08:30 PM' };

    // 1. Try to get mealsPerDay directly or deduce from text
    let mealsCount = 0;
    if (latestSub?.mealsPerDay) {
      mealsCount = parseInt(String(latestSub.mealsPerDay), 10);
    }

    const rawSlot = String(latestSub?.slot || '').toLowerCase();
    const rawSlotLabel = String(latestSub?.slotLabel || '').toLowerCase();
    const rawMeals = String(latestSub?.meals || '').toLowerCase();
    const combinedStr = `${rawSlot} ${rawSlotLabel} ${rawMeals}`.trim();

    if (!mealsCount || isNaN(mealsCount)) {
      if (combinedStr.includes('3 meal') || combinedStr.includes('all meal') || combinedStr === 'all') {
        mealsCount = 3;
      } else if (
        combinedStr.includes('2 meal') || 
        combinedStr.includes('&') || 
        combinedStr.includes('breakfast-lunch') || 
        combinedStr.includes('lunch-dinner') || 
        combinedStr.includes('breakfast-dinner')
      ) {
        mealsCount = 2;
      } else if (
        combinedStr.includes('1 meal') || 
        combinedStr.includes('breakfast') || 
        combinedStr.includes('lunch') || 
        combinedStr.includes('dinner')
      ) {
        mealsCount = 1;
      } else {
        mealsCount = 3; // default fallback
      }
    }

    // 2. Filter available meal slots based on mealsCount and selected slot
    if (mealsCount === 1) {
      if (combinedStr.includes('breakfast')) {
        return [slotBreakfast];
      }
      if (combinedStr.includes('dinner')) {
        return [slotDinner];
      }
      return [slotLunch];
    }

    if (mealsCount === 2) {
      const hasBreakfast = combinedStr.includes('breakfast');
      const hasLunch = combinedStr.includes('lunch');
      const hasDinner = combinedStr.includes('dinner');

      if (hasBreakfast && hasDinner && !hasLunch) {
        return [slotBreakfast, slotDinner];
      }
      if (hasLunch && hasDinner && !hasBreakfast) {
        return [slotLunch, slotDinner];
      }
      // Default 2-meal combination is Breakfast & Lunch
      return [slotBreakfast, slotLunch];
    }

    // 3 meals: Breakfast, Lunch & Dinner
    return [slotBreakfast, slotLunch, slotDinner];
  };

  const checkIsMealSkipped = (dateStr: string, mealType: 'Breakfast' | 'Lunch' | 'Dinner', sub?: any) => {
    const latestSub = subscriptionsList.find(s => s.id === sub?.id) || sub;
    const currentDates = latestSub?.skippedDates || skippedDates;
    const currentMeals = latestSub?.skippedMeals || skippedMeals;
    return isMealSkipped(currentDates, currentMeals, dateStr, mealType);
  };

  const getDateSkipStatus = (dateStr: string, sub?: any): 'none' | 'partial' | 'all' => {
    const latestSub = subscriptionsList.find(s => s.id === sub?.id) || sub;
    const currentDates = latestSub?.skippedDates || skippedDates;
    if (isDateSkipped(currentDates, dateStr)) return 'all';

    const availableSlots = getSubAvailableMealSlots(latestSub);
    if (availableSlots.length === 0) return 'none';

    let skippedCount = 0;
    for (const s of availableSlots) {
      if (checkIsMealSkipped(dateStr, s.type, latestSub)) {
        skippedCount++;
      }
    }

    if (skippedCount === 0) return 'none';
    if (skippedCount === availableSlots.length) return 'all';
    return 'partial';
  };

  const openMealSkipModal = (clickedDate: Date, dateStr: string, sub?: any) => {
    const latestSub = subscriptionsList.find(s => s.id === sub?.id) || sub || subscriptionsList[0];
    const formattedDate = clickedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    setSelectedDateForMeals({
      date: clickedDate,
      dateStr,
      formattedDate,
      sub: latestSub
    });
    setMealSkipModalOpen(true);
  };

  const handleToggleMealSlot = async (
    targetDateStr: string,
    slotType: 'Breakfast' | 'Lunch' | 'Dinner',
    sub?: any
  ) => {
    const targetSub = subscriptionsList.find(s => s.id === sub?.id) || sub || subscriptionsList[0];
    if (!targetSub) return;

    const currentDates = targetSub.skippedDates || skippedDates || [];
    const currentMeals = targetSub.skippedMeals || skippedMeals || [];

    const mealKey = `${targetDateStr}:${slotType}`;
    const isCurrentlySkipped = isMealSkipped(currentDates, currentMeals, targetDateStr, slotType);

    const availableSlots = getSubAvailableMealSlots(targetSub);
    let nextMeals = [...currentMeals];
    let nextDates = [...currentDates];

    if (isCurrentlySkipped) {
      // Restore this meal slot
      nextMeals = nextMeals.filter(m => {
        const clean = String(m).trim().toLowerCase();
        return clean !== mealKey.toLowerCase() && !clean.includes(mealKey.toLowerCase());
      });
      // Also if whole date was skipped, un-skip whole date and keep other slots in nextMeals
      if (isDateSkipped(nextDates, targetDateStr)) {
        nextDates = nextDates.filter(d => !isDateSkipped([d], targetDateStr));
        for (const s of availableSlots) {
          if (s.type !== slotType) {
            const otherKey = `${targetDateStr}:${s.type}`;
            if (!nextMeals.some(m => m.toLowerCase() === otherKey.toLowerCase())) {
              nextMeals.push(otherKey);
            }
          }
        }
      }
    } else {
      // Skip this meal slot
      if (!nextMeals.some(m => m.toLowerCase() === mealKey.toLowerCase())) {
        nextMeals.push(mealKey);
      }
      // Check if now all available slots are skipped
      const allSlotsSkipped = availableSlots.every(s => 
        s.type === slotType || nextMeals.some(m => m.toLowerCase() === `${targetDateStr}:${s.type}`.toLowerCase())
      );
      if (allSlotsSkipped) {
        if (!isDateSkipped(nextDates, targetDateStr)) {
          nextDates.push(targetDateStr);
        }
      }
    }

    setSkippedDates(nextDates);
    setSkippedMeals(nextMeals);
    setSelectedDateForMeals(prev => prev ? {
      ...prev,
      sub: { ...prev.sub, skippedDates: nextDates, skippedMeals: nextMeals }
    } : null);

    setSubscriptionsList(prev => prev.map(s => s.id === targetSub.id ? { 
      ...s, 
      skippedDates: nextDates,
      skippedMeals: nextMeals
    } : s));

    const stored = localStorage.getItem('activeSubscription');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.id === targetSub.id || parsed.subId === targetSub.id || targetSub.id === 'sub_active' || parsed.planName === targetSub.planName) {
          localStorage.setItem('activeSubscription', JSON.stringify({ 
            ...parsed, 
            skippedDates: nextDates,
            skippedMeals: nextMeals
          }));
        }
      } catch (e) {}
    }

    // Sync admin subscriptions store in real-time
    try {
      const rawAdmin = localStorage.getItem('shift24_admin_subscriptions');
      if (rawAdmin) {
        const parsedAdmin = JSON.parse(rawAdmin);
        const updatedAdmin = parsedAdmin.map((s: any) => {
          if (s.id === targetSub.id || s.subId === targetSub.id || (targetSub.customerEmail && s.customerEmail === targetSub.customerEmail) || parsedAdmin.length === 1) {
            return { ...s, skippedDates: nextDates, skippedMeals: nextMeals };
          }
          return s;
        });
        localStorage.setItem('shift24_admin_subscriptions', JSON.stringify(updatedAdmin));
        window.dispatchEvent(new Event('shift24-subscriptions-updated'));
        window.dispatchEvent(new Event('shift24-orders-updated'));
      }
    } catch (e) {}

    try {
      const { updateBackendSubscriptionDetails } = await import('../../services/api');
      await updateBackendSubscriptionDetails(targetSub.id, { 
        skippedDates: nextDates,
        skippedMeals: nextMeals
      });
    } catch (err) {
      console.warn('Backend sync note:', err);
    }

    if (isCurrentlySkipped) {
      toast.success(`Restored ${slotType} for ${selectedDateForMeals?.formattedDate || targetDateStr}`);
    } else {
      toast.success(`Skipped ${slotType} for ${selectedDateForMeals?.formattedDate || targetDateStr}`);
    }
  };

  const handleSkipEntireDay = async (targetDateStr: string, sub?: any) => {
    const targetSub = subscriptionsList.find(s => s.id === sub?.id) || sub || subscriptionsList[0];
    if (!targetSub) return;

    const currentDates = targetSub.skippedDates || skippedDates || [];
    const currentMeals = targetSub.skippedMeals || skippedMeals || [];
    const availableSlots = getSubAvailableMealSlots(targetSub);

    let nextDates = [...currentDates];
    if (!isDateSkipped(nextDates, targetDateStr)) {
      nextDates.push(targetDateStr);
    }
    let nextMeals = [...currentMeals];
    for (const s of availableSlots) {
      const mealKey = `${targetDateStr}:${s.type}`;
      if (!nextMeals.some(m => m.toLowerCase() === mealKey.toLowerCase())) {
        nextMeals.push(mealKey);
      }
    }

    setSkippedDates(nextDates);
    setSkippedMeals(nextMeals);
    setSelectedDateForMeals(prev => prev ? {
      ...prev,
      sub: { ...prev.sub, skippedDates: nextDates, skippedMeals: nextMeals }
    } : null);

    setSubscriptionsList(prev => prev.map(s => s.id === targetSub.id ? { 
      ...s, 
      skippedDates: nextDates,
      skippedMeals: nextMeals
    } : s));

    const stored = localStorage.getItem('activeSubscription');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.id === targetSub.id || parsed.subId === targetSub.id || targetSub.id === 'sub_active' || parsed.planName === targetSub.planName) {
          localStorage.setItem('activeSubscription', JSON.stringify({ 
            ...parsed, 
            skippedDates: nextDates,
            skippedMeals: nextMeals
          }));
        }
      } catch (e) {}
    }

    try {
      const rawAdmin = localStorage.getItem('shift24_admin_subscriptions');
      if (rawAdmin) {
        const parsedAdmin = JSON.parse(rawAdmin);
        const updatedAdmin = parsedAdmin.map((s: any) => {
          if (s.id === targetSub.id || s.subId === targetSub.id || (targetSub.customerEmail && s.customerEmail === targetSub.customerEmail) || parsedAdmin.length === 1) {
            return { ...s, skippedDates: nextDates, skippedMeals: nextMeals };
          }
          return s;
        });
        localStorage.setItem('shift24_admin_subscriptions', JSON.stringify(updatedAdmin));
        window.dispatchEvent(new Event('shift24-subscriptions-updated'));
        window.dispatchEvent(new Event('shift24-orders-updated'));
      }
    } catch (e) {}

    try {
      const { updateBackendSubscriptionDetails } = await import('../../services/api');
      await updateBackendSubscriptionDetails(targetSub.id, { 
        skippedDates: nextDates,
        skippedMeals: nextMeals
      });
    } catch (err) {
      console.warn('Backend sync note:', err);
    }

    toast.success(`Skipped all meals for ${selectedDateForMeals?.formattedDate || targetDateStr}`);
  };

  const handleRestoreEntireDay = async (targetDateStr: string, sub?: any) => {
    const targetSub = subscriptionsList.find(s => s.id === sub?.id) || sub || subscriptionsList[0];
    if (!targetSub) return;

    const currentDates = targetSub.skippedDates || skippedDates || [];
    const currentMeals = targetSub.skippedMeals || skippedMeals || [];

    const nextDates = currentDates.filter(d => !isDateSkipped([d], targetDateStr));
    const nextMeals = currentMeals.filter(m => !String(m).toLowerCase().includes(targetDateStr.toLowerCase()));

    setSkippedDates(nextDates);
    setSkippedMeals(nextMeals);
    setSelectedDateForMeals(prev => prev ? {
      ...prev,
      sub: { ...prev.sub, skippedDates: nextDates, skippedMeals: nextMeals }
    } : null);

    setSubscriptionsList(prev => prev.map(s => s.id === targetSub.id ? { 
      ...s, 
      skippedDates: nextDates,
      skippedMeals: nextMeals
    } : s));

    const stored = localStorage.getItem('activeSubscription');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.id === targetSub.id || parsed.subId === targetSub.id || targetSub.id === 'sub_active' || parsed.planName === targetSub.planName) {
          localStorage.setItem('activeSubscription', JSON.stringify({ 
            ...parsed, 
            skippedDates: nextDates,
            skippedMeals: nextMeals
          }));
        }
      } catch (e) {}
    }

    try {
      const rawAdmin = localStorage.getItem('shift24_admin_subscriptions');
      if (rawAdmin) {
        const parsedAdmin = JSON.parse(rawAdmin);
        const updatedAdmin = parsedAdmin.map((s: any) => {
          if (s.id === targetSub.id || s.subId === targetSub.id || (targetSub.customerEmail && s.customerEmail === targetSub.customerEmail) || parsedAdmin.length === 1) {
            return { ...s, skippedDates: nextDates, skippedMeals: nextMeals };
          }
          return s;
        });
        localStorage.setItem('shift24_admin_subscriptions', JSON.stringify(updatedAdmin));
        window.dispatchEvent(new Event('shift24-subscriptions-updated'));
        window.dispatchEvent(new Event('shift24-orders-updated'));
      }
    } catch (e) {}

    try {
      const { updateBackendSubscriptionDetails } = await import('../../services/api');
      await updateBackendSubscriptionDetails(targetSub.id, { 
        skippedDates: nextDates,
        skippedMeals: nextMeals
      });
    } catch (err) {
      console.warn('Backend sync note:', err);
    }

    toast.success(`Restored all meals for ${selectedDateForMeals?.formattedDate || targetDateStr}`);
  };

  const handleDayClick = async (year: number, month: number, day: number, sub?: any) => {
    const clickedDate = new Date(year, month, day);
    // Remove the time portion for accurate 'today' comparison
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (clickedDate < todayDateOnly) return; 

    // Month in JS is 0-indexed, format to standard YYYY-MM-DD
    const mPadded = String(month + 1).padStart(2, '0');
    const dPadded = String(day).padStart(2, '0');
    const dateStr = `${year}-${mPadded}-${dPadded}`;

    const targetSub = sub || subscriptionsList[0];
    const currentSkipped = targetSub?.skippedDates || skippedDates;
    const willSkip = !isDateSkipped(currentSkipped, dateStr);
    const nextSkipped = willSkip 
      ? [...currentSkipped, dateStr] 
      : currentSkipped.filter((d: string) => !isDateSkipped([d], dateStr));

    setSkippedDates(nextSkipped);

    if (targetSub) {
      try {
        const { updateBackendSubscriptionDetails } = await import('../../services/api');
        await updateBackendSubscriptionDetails(targetSub.id, { skippedDates: nextSkipped });
        setSubscriptionsList(prev => prev.map(s => s.id === targetSub.id ? { ...s, skippedDates: nextSkipped } : s));

        const stored = localStorage.getItem('activeSubscription');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.id === targetSub.id || parsed.subId === targetSub.id || targetSub.id === 'sub_active') {
              localStorage.setItem('activeSubscription', JSON.stringify({ ...parsed, skippedDates: nextSkipped }));
            }
          } catch (e) {}
        }

        // Sync admin subscriptions store in real-time
        try {
          const rawAdmin = localStorage.getItem('shift24_admin_subscriptions');
          if (rawAdmin) {
            const parsedAdmin = JSON.parse(rawAdmin);
            const updatedAdmin = parsedAdmin.map((s: any) => {
              if (s.id === targetSub.id || s.subId === targetSub.id || (targetSub.customerEmail && s.customerEmail === targetSub.customerEmail) || parsedAdmin.length === 1) {
                return { ...s, skippedDates: nextSkipped };
              }
              return s;
            });
            localStorage.setItem('shift24_admin_subscriptions', JSON.stringify(updatedAdmin));
            window.dispatchEvent(new Event('shift24-subscriptions-updated'));
          }
        } catch (e) {}

        const dateFormatted = clickedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (willSkip) {
          toast.success(`Skipped delivery for ${dateFormatted}`);
        } else {
          toast.success(`Restored delivery for ${dateFormatted}`);
        }
      } catch (err) {
        console.warn('Failed to sync skipped date:', err);
        toast.error('Failed to update delivery date. Please try again.');
      }
    }
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });


  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);

  const getSubSchedule = (sub: any) => {
    const latestSub = subscriptionsList.find(s => s.id === sub?.id) || sub;
    const currentSkippedDates = latestSub?.skippedDates || skippedDates || [];

    // Parse start date
    let subStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (latestSub?.startDate && latestSub.startDate !== 'Recent') {
      const cleanStart = String(latestSub.startDate).split('T')[0];
      const parts = cleanStart.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(d.getTime())) subStart = d;
      } else {
        const parsed = new Date(latestSub.startDate);
        if (!isNaN(parsed.getTime())) {
          subStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
        }
      }
    }

    const totalDays = Number(latestSub?.durationDays) || parseInt(String(latestSub?.duration || '')) || 26;

    // Build active dates by walking from subStart until totalDays are fulfilled
    const subActiveDates = new Set<string>();
    let temp = new Date(subStart);
    let daysCounted = 0;
    let subEndDate = new Date(subStart);
    let loopCount = 0;

    while (daysCounted < totalDays && loopCount < 365) {
      loopCount++;
      const mPadded = String(temp.getMonth() + 1).padStart(2, '0');
      const dPadded = String(temp.getDate()).padStart(2, '0');
      const dateStr = `${temp.getFullYear()}-${mPadded}-${dPadded}`;

      let isPaused = false;
      if (latestSub?.pauseStartDate) {
        const pStartISO = String(latestSub.pauseStartDate).trim().split('T')[0];
        const pEndISO = latestSub?.pauseEndDate ? String(latestSub.pauseEndDate).trim().split('T')[0] : null;
        isPaused = pEndISO ? (dateStr >= pStartISO && dateStr <= pEndISO) : (dateStr >= pStartISO);
      }

      const isFullSkip = isDateSkipped(currentSkippedDates, dateStr);

      if (!isFullSkip && !isPaused) {
        subActiveDates.add(dateStr);
        daysCounted++;
        subEndDate = new Date(temp);
      }

      temp.setDate(temp.getDate() + 1);
    }

    // Safety fallback: If active subscription's calculated end date is in the past,
    // extend active dates forward from today so the user can manage upcoming deliveries!
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (latestSub?.status === 'Active' && subEndDate < todayDateOnly) {
      subStart = new Date(todayDateOnly);
      subActiveDates.clear();
      temp = new Date(subStart);
      daysCounted = 0;
      loopCount = 0;
      while (daysCounted < totalDays && loopCount < 365) {
        loopCount++;
        const mPadded = String(temp.getMonth() + 1).padStart(2, '0');
        const dPadded = String(temp.getDate()).padStart(2, '0');
        const dateStr = `${temp.getFullYear()}-${mPadded}-${dPadded}`;

        const isFullSkip = isDateSkipped(currentSkippedDates, dateStr);
        if (!isFullSkip) {
          subActiveDates.add(dateStr);
          daysCounted++;
          subEndDate = new Date(temp);
        }
        temp.setDate(temp.getDate() + 1);
      }
    }

    return { subStart, subEndDate, subActiveDates, totalDays, currentSkippedDates };
  };

  // Pause Delivery with Date Selection Modal State
  const [pausingSub, setPausingSub] = useState<any | null>(null);
  const [pauseStartDate, setPauseStartDate] = useState<string>('');
  const [pauseResumeMode, setPauseResumeMode] = useState<'3days' | '1week' | '2weeks' | 'custom' | 'indefinite'>('1week');
  const [pauseCustomResumeDate, setPauseCustomResumeDate] = useState<string>('');
  const [isSubmittingPause, setIsSubmittingPause] = useState(false);

  const getCalculatedResumeDate = (startDateStr: string, mode: string, customDateStr: string) => {
    if (mode === 'indefinite') return null;
    if (mode === 'custom') return customDateStr || null;
    
    const base = startDateStr ? new Date(startDateStr) : new Date();
    const daysToAdd = mode === '3days' ? 3 : mode === '1week' ? 7 : 14;
    const target = new Date(base);
    target.setDate(target.getDate() + daysToAdd);
    return target.toISOString().split('T')[0];
  };

  const openPauseModal = (sub: any) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    setPausingSub(sub);
    setPauseStartDate(sub.pauseStartDate || tomorrowStr);
    setPauseResumeMode('1week');
    setPauseCustomResumeDate(sub.pauseEndDate || nextWeekStr);
  };

  const handleResumeDelivery = (sub: any) => {
    showConfirmToast({
      title: `Resume deliveries for ${sub.planName}?`,
      description: 'Your scheduled meal deliveries will restart starting tomorrow morning.',
      confirmText: 'Resume Deliveries',
      cancelText: 'Keep Paused',
      confirmButtonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      iconBgClass: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      onConfirm: async () => {
        try {
          const { updateBackendSubscriptionStatus } = await import('../../services/api');
          await updateBackendSubscriptionStatus(sub.id, 'Active');

          setSubscriptionsList(prev => prev.map(s => s.id === sub.id ? { 
            ...s, 
            status: 'Active',
            pauseStartDate: null,
            pauseEndDate: null,
            nextDelivery: 'Tomorrow, 07:30 AM'
          } : s));

          // Also update global store
          const allSubs = getAdminSubscriptions();
          const updatedSubs = allSubs.map(s => s.id === sub.id ? {
            ...s,
            status: 'Active' as const,
            pauseStartDate: null,
            pauseEndDate: null,
            nextDelivery: 'Tomorrow, 07:30 AM'
          } : s);
          saveAdminSubscriptions(updatedSubs);
          window.dispatchEvent(new Event('shift24-subscriptions-updated'));

          toast.success('Deliveries resumed! Your daily meal routine is active.');
        } catch (err) {
          toast.error('Failed to resume delivery');
        }
      }
    });
  };

  const handleConfirmPause = async () => {
    if (!pausingSub) return;
    setIsSubmittingPause(true);

    const calculatedResumeDate = getCalculatedResumeDate(pauseStartDate, pauseResumeMode, pauseCustomResumeDate);

    try {
      const { updateBackendSubscriptionStatus } = await import('../../services/api');
      await updateBackendSubscriptionStatus(pausingSub.id, 'Paused', {
        pauseStartDate,
        pauseEndDate: calculatedResumeDate || undefined
      });

      const nextDeliveryText = calculatedResumeDate 
        ? `Resuming on ${new Date(calculatedResumeDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : `Paused from ${new Date(pauseStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      setSubscriptionsList(prev => prev.map(s => s.id === pausingSub.id ? { 
        ...s, 
        status: 'Paused',
        pauseStartDate,
        pauseEndDate: calculatedResumeDate || null,
        nextDelivery: nextDeliveryText
      } : s));

      const stored = localStorage.getItem('activeSubscription');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.id === pausingSub.id || parsed.subId === pausingSub.id || pausingSub.id === 'sub_active') {
            parsed.status = 'Paused';
            parsed.pauseStartDate = pauseStartDate;
            parsed.pauseEndDate = calculatedResumeDate || null;
            parsed.nextDelivery = nextDeliveryText;
            localStorage.setItem('activeSubscription', JSON.stringify(parsed));
          }
        } catch (e) {}
      }

      // Also purge non-delivered orders for paused subscription in local storage
      try {
        const rawAdminOrders = localStorage.getItem('shift24_admin_orders');
        if (rawAdminOrders) {
          const adminOrders = JSON.parse(rawAdminOrders);
          const cleanId = String(pausingSub.id).replace(/^SUB-/, '');
          const filteredOrders = adminOrders.filter((o: any) => {
            if (o.status === 'Delivered') return true;
            if (o.subscriptionId === pausingSub.id || (o.id && o.id.startsWith(`ORD-${cleanId}-`))) return false;
            return true;
          });
          localStorage.setItem('shift24_admin_orders', JSON.stringify(filteredOrders));
        }

        const rawAdminSubs = localStorage.getItem('shift24_admin_subscriptions');
        if (rawAdminSubs) {
          const adminSubs = JSON.parse(rawAdminSubs);
          const updatedAdminSubs = adminSubs.map((s: any) => {
            if (s.id === pausingSub.id || s.subId === pausingSub.id) {
              return {
                ...s,
                status: 'Paused',
                pauseStartDate,
                pauseEndDate: calculatedResumeDate || null,
                nextDelivery: nextDeliveryText
              };
            }
            return s;
          });
          localStorage.setItem('shift24_admin_subscriptions', JSON.stringify(updatedAdminSubs));
        }

        window.dispatchEvent(new Event('shift24-subscriptions-updated'));
        window.dispatchEvent(new Event('shift24-orders-updated'));
      } catch (syncErr) {}

      toast.success(calculatedResumeDate 
        ? `Deliveries paused until ${new Date(calculatedResumeDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. Resume anytime!`
        : 'Deliveries paused. Resume anytime from your profile!'
      );
      setPausingSub(null);
    } catch (err: any) {
      toast.error('Failed to pause delivery');
    } finally {
      setIsSubmittingPause(false);
    }
  };

  const handleTogglePause = (sub: any) => {
    if (sub.status === 'Paused') {
      handleResumeDelivery(sub);
    } else {
      openPauseModal(sub);
    }
  };

  // Delivery Address Modal State (like Checkout page)
  const [addressModalSub, setAddressModalSub] = useState<any | null>(null);
  const [addressMode, setAddressMode] = useState<'saved' | 'new'>('saved');
  const [selectedAddrIndex, setSelectedAddrIndex] = useState<number | null>(null);
  const [showAddressMapPicker, setShowAddressMapPicker] = useState<boolean>(false);
  const [addressMapCoords, setAddressMapCoords] = useState<{ lat: number; lng: number }>({
    lat: 9.9312,
    lng: 76.2673
  });
  const [manualAddressFields, setManualAddressFields] = useState({
    flatNo: '',
    street: '',
    area: '',
    landmark: '',
    city: 'Kochi',
    state: 'Kerala',
    pincode: '',
    tag: 'Home'
  });
  const [saveToAddresses, setSaveToAddresses] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const formatManualAddress = (fields: typeof manualAddressFields) => {
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

  const openDeliveryAddressModal = (sub: any) => {
    setAddressModalSub(sub);
    setShowAddressMapPicker(false);
    
    // Check if sub address matches any saved address
    const matchIdx = addresses.findIndex(a => a.address.trim().toLowerCase() === (sub.address || '').trim().toLowerCase());
    if (matchIdx >= 0) {
      setSelectedAddrIndex(matchIdx);
      setAddressMode('saved');
    } else if (addresses.length > 0) {
      setSelectedAddrIndex(0);
      setAddressMode('saved');
    } else {
      setSelectedAddrIndex(null);
      setAddressMode('new');
    }

    setManualAddressFields({
      flatNo: '',
      street: sub.address || '',
      area: '',
      landmark: '',
      city: 'Kochi',
      state: 'Kerala',
      pincode: '',
      tag: 'Home'
    });

    if (sub.coordinates && typeof sub.coordinates.lat === 'number' && typeof sub.coordinates.lng === 'number') {
      setAddressMapCoords({ lat: sub.coordinates.lat, lng: sub.coordinates.lng });
    } else if (typeof sub.latitude === 'number' && typeof sub.longitude === 'number') {
      setAddressMapCoords({ lat: sub.latitude, lng: sub.longitude });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setAddressMapCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }
  };

  const handleAddressLocationPicked = (geo: GeocodedAddress, isSilent: boolean = false) => {
    setAddressMapCoords({ lat: geo.lat, lng: geo.lng });
    setManualAddressFields(prev => ({
      ...prev,
      street: geo.street || geo.displayName.split(',')[0] || prev.street,
      area: geo.area || prev.area,
      city: geo.city || prev.city || 'Kochi',
      state: geo.state || prev.state || 'Kerala',
      pincode: geo.pincode || prev.pincode
    }));
    if (!isSilent) {
      toast.success('Location updated & address filled from map!', { id: 'location-picked-toast' });
    }
  };

  const confirmDeleteAddress = (id: string) => {
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'
          } transition-all duration-200 ease-out max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto p-4 border border-slate-200 ring-1 ring-black/5 flex flex-col gap-3`}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-xl shrink-0">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                Are you sure you want to delete this saved address?
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                This address will be removed from your saved list.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                toast.dismiss(t.id);
                await handleDeleteAddress(id);
                toast.success('Address removed from saved list');
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      { id: `delete-addr-${id}`, duration: 8000 }
    );
  };

  const confirmDeleteModalAddress = (id: string, idx: number) => {
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'
          } transition-all duration-200 ease-out max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto p-4 border border-slate-200 ring-1 ring-black/5 flex flex-col gap-3`}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-xl shrink-0">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                Are you sure you want to delete this saved address?
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                This address will be removed from your saved list.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                toast.dismiss(t.id);
                await executeDeleteModalAddress(id, idx);
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      { id: `delete-modal-addr-${id}`, duration: 8000 }
    );
  };

  const executeDeleteModalAddress = async (id: string, idx: number) => {
    await handleDeleteAddress(id);
    toast.success('Address removed from saved list');

    const nextAddrs = addresses.filter(a => a.id !== id);
    if (nextAddrs.length === 0) {
      setSelectedAddrIndex(null);
      setAddressMode('new');
    } else if (selectedAddrIndex === idx) {
      setSelectedAddrIndex(0);
    } else if (selectedAddrIndex !== null && selectedAddrIndex > idx) {
      setSelectedAddrIndex(selectedAddrIndex - 1);
    }
  };

  const handleSaveDeliveryAddress = async () => {
    if (!addressModalSub) return;
    setIsSavingAddress(true);

    let finalAddress = '';
    let addressTitle = 'Delivery Address';

    if (addressMode === 'saved' && selectedAddrIndex !== null && addresses[selectedAddrIndex]) {
      finalAddress = addresses[selectedAddrIndex].address;
      addressTitle = addresses[selectedAddrIndex].title || 'Home';
    } else {
      finalAddress = formatManualAddress(manualAddressFields);
      addressTitle = manualAddressFields.tag || 'Home';
      if (!finalAddress.trim()) {
        toast.error('Please enter a valid address.');
        setIsSavingAddress(false);
        return;
      }
    }

    try {
      const { updateBackendSubscriptionDetails } = await import('../../services/api');
      const coordsToSave = addressMapCoords && typeof addressMapCoords.lat === 'number' && typeof addressMapCoords.lng === 'number' ? addressMapCoords : undefined;
      await updateBackendSubscriptionDetails(addressModalSub.id, { 
        address: finalAddress,
        coordinates: coordsToSave,
        latitude: coordsToSave?.lat,
        longitude: coordsToSave?.lng
      });

      setSubscriptionsList(prev => prev.map(s => s.id === addressModalSub.id ? { 
        ...s, 
        address: finalAddress,
        coordinates: coordsToSave,
        latitude: coordsToSave?.lat,
        longitude: coordsToSave?.lng
      } : s));

      const stored = localStorage.getItem('activeSubscription');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.id === addressModalSub.id || parsed.subId === addressModalSub.id || addressModalSub.id === 'sub_active') {
            localStorage.setItem('activeSubscription', JSON.stringify({ 
              ...parsed, 
              address: finalAddress,
              coordinates: coordsToSave,
              latitude: coordsToSave?.lat,
              longitude: coordsToSave?.lng
            }));
          }
        } catch (e) {}
      }

      if (addressMode === 'new' && saveToAddresses) {
        const exists = addresses.some(a => a.address.trim().toLowerCase() === finalAddress.trim().toLowerCase());
        if (!exists) {
          const newAddr = {
            id: Date.now().toString(),
            title: addressTitle,
            address: finalAddress,
            isDefault: addresses.length === 0
          };
          const updatedAddrs = [...addresses, newAddr];
          setAddresses(updatedAddrs);
          if (loggedInUser && localStorage.getItem('token')) {
            try {
              const { apiUpdateAddresses } = await import('../../services/api');
              await apiUpdateAddresses(updatedAddrs.map(a => ({ title: a.title, address: a.address, isDefault: a.isDefault })));
              const updatedUser = { ...loggedInUser, addresses: updatedAddrs };
              localStorage.setItem('user', JSON.stringify(updatedUser));
            } catch (err) {
              console.warn('Failed to sync new address to user profile:', err);
            }
          }
        }
      }

      toast.success('Delivery address updated successfully!');
      setAddressModalSub(null);
    } catch (err: any) {
      toast.error('Failed to update address. Please try again.');
    } finally {
      setIsSavingAddress(false);
    }
  };


  // Load subscriptions for logged-in user
  useEffect(() => {
    const loadUserSubscriptions = async () => {
      setLoadingSubs(true);
      const userEmail = loggedInUser?.email;

      // 1. If user has activeSubscription in localStorage, check if it belongs to current session
      const storedSubRaw = localStorage.getItem('activeSubscription');
      let localSub: any = null;
      try {
        if (storedSubRaw) {
          localSub = JSON.parse(storedSubRaw);
          if (localSub?.customerName || localSub?.customerPhone) {
            setUserProfile(prev => ({
              ...prev,
              name: localSub.customerName || prev.name,
              phone: localSub.customerPhone || prev.phone
            }));
            if (localSub.customerName) localStorage.setItem('userName', localSub.customerName);
            if (localSub.customerPhone) localStorage.setItem('userPhone', localSub.customerPhone);
          }
        }
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
              const latestSub = res.data[0];
              if (latestSub && (latestSub.customerName || latestSub.customerPhone)) {
                setUserProfile(prev => ({
                  ...prev,
                  name: latestSub.customerName || prev.name,
                  phone: latestSub.customerPhone || prev.phone
                }));
                if (latestSub.customerName) localStorage.setItem('userName', latestSub.customerName);
                if (latestSub.customerPhone) localStorage.setItem('userPhone', latestSub.customerPhone);
                try {
                  const cur = localStorage.getItem('user');
                  if (cur) {
                    const parsed = JSON.parse(cur);
                    if (latestSub.customerName) parsed.name = latestSub.customerName;
                    if (latestSub.customerPhone) parsed.phone = latestSub.customerPhone;
                    localStorage.setItem('user', JSON.stringify(parsed));
                  }
                } catch {}
                window.dispatchEvent(new Event('auth-change'));
              }
              const mapped = res.data.map((s: any) => ({
                id: s.subId || s._id,
                planName: s.planTitle || 'Healthy Meal Plan',
                status: s.status || 'Active',
                nextDelivery: s.nextDelivery || 'Tomorrow, 08:00 AM - 09:00 AM',
                startDate: s.startDate || 'Recent',
                endDate: s.endDate || 'Ongoing',
                duration: s.duration || `${s.durationDays || 30} Days`,
                durationDays: s.durationDays || 26,
                meals: s.slotLabel ? (s.slotLabel.includes('Meal') ? s.slotLabel : `${s.mealsPerDay || 1} ${Number(s.mealsPerDay) === 1 ? 'Meal' : 'Meals'} (${s.slotLabel})`) : (s.meals || `${s.mealsPerDay || 3} Meals Daily`),
                mealsPerDay: s.mealsPerDay ? String(s.mealsPerDay) : undefined,
                slot: s.slot || undefined,
                slotLabel: s.slotLabel || undefined,
                address: s.address || 'Delivery Address',
                pauseStartDate: s.pauseStartDate || null,
                pauseEndDate: s.pauseEndDate || null,
                allergies: s.allergies || [],
                preferences: s.preferences || [],
                skippedDates: s.skippedDates || [],
                skippedMeals: s.skippedMeals || []
              }));
              setSubscriptionsList(mapped);

              if (mapped[0]) {
                if (Array.isArray(mapped[0].allergies) && mapped[0].allergies.length > 0) setAllergies(mapped[0].allergies);
                if (Array.isArray(mapped[0].preferences) && mapped[0].preferences.length > 0) setPreferences(mapped[0].preferences);
                if (Array.isArray(mapped[0].skippedDates) && mapped[0].skippedDates.length > 0) setSkippedDates(mapped[0].skippedDates);
                if (Array.isArray((mapped[0] as any).skippedMeals) && (mapped[0] as any).skippedMeals.length > 0) setSkippedMeals((mapped[0] as any).skippedMeals);
              }

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
          durationDays: localSub.durationDays || 26,
          meals: localSub.slotLabel || localSub.meals || 'Daily Meals',
          mealsPerDay: localSub.mealsPerDay ? String(localSub.mealsPerDay) : undefined,
          slot: localSub.slot || undefined,
          slotLabel: localSub.slotLabel || undefined,
          address: subAddress,
          pauseStartDate: localSub.pauseStartDate || null,
          pauseEndDate: localSub.pauseEndDate || null,
          allergies: localSub.allergies || [],
          preferences: localSub.preferences || [],
          skippedDates: localSub.skippedDates || [],
          skippedMeals: localSub.skippedMeals || []
        }]);

        if (Array.isArray(localSub.allergies) && localSub.allergies.length > 0) setAllergies(localSub.allergies);
        if (Array.isArray(localSub.preferences) && localSub.preferences.length > 0) setPreferences(localSub.preferences);
        if (Array.isArray(localSub.skippedDates) && localSub.skippedDates.length > 0) setSkippedDates(localSub.skippedDates);
        if (Array.isArray(localSub.skippedMeals) && localSub.skippedMeals.length > 0) setSkippedMeals(localSub.skippedMeals);

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
                 {displayName.charAt(0)}
               </div>
               <div className="overflow-hidden">
                 <h2 className="text-lg font-bold text-slate-900 truncate">{displayName}</h2>
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
                          You haven't subscribed to any meal routine yet. Choose from our 1-Day Trial, 7-Day Plan, or 30-Day Plan to get fresh chef-cooked meals delivered daily.
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
                                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                    sub.status === 'Paused'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : sub.status === 'Cancelled'
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  }`}>
                                    {sub.status}
                                  </span>
                                  <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                              </div>
                              
                              {isExpanded && (
                                <div className="px-6 pb-6 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                                  {sub.status === 'Paused' && (
                                    <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                                          <Pause className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-amber-900">
                                            Meal Deliveries are currently Paused
                                          </p>
                                          <p className="text-xs text-amber-700 mt-0.5">
                                            {sub.pauseStartDate && sub.pauseEndDate ? (
                                              <>On hold from <strong className="font-semibold">{sub.pauseStartDate}</strong> until <strong className="font-semibold">{sub.pauseEndDate}</strong>.</>
                                            ) : sub.pauseStartDate ? (
                                              <>On hold starting from <strong className="font-semibold">{sub.pauseStartDate}</strong>.</>
                                            ) : (
                                              <>Temporarily on hold. Your remaining paid days are safe.</>
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleTogglePause(sub);
                                        }}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                                      >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                        <span>Resume Deliveries</span>
                                      </button>
                                    </div>
                                  )}

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
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Address</p>
                                        {sub.status !== 'Cancelled' && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openDeliveryAddressModal(sub);
                                            }}
                                            className="text-xs text-emerald-600 font-bold hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                            <span>Change</span>
                                          </button>
                                        )}
                                      </div>
                                      <p className="text-slate-800 font-medium">{sub.address}</p>
                                    </div>
                                  </div>

                                  <div className="mt-8 pt-6 border-t border-slate-100">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
                                      <div>
                                        <h3 className="text-sm font-bold text-slate-800">Dietary Requirements</h3>
                                        <p className="text-xs text-emerald-600 font-medium mt-0.5">Tap any ingredient to add or exclude from your daily meals.</p>
                                      </div>
                                    </div>

                                    <div className="space-y-6">
                                      <div>
                                        <div className="flex items-center justify-between mb-2.5">
                                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Food Allergies
                                          </label>
                                          <span className="text-[11px] text-slate-400 font-medium">Excluded from meals</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {commonIngredients.map(item => {
                                            const subAllergies = sub.allergies || allergies;
                                            const isSelected = subAllergies.includes(item);
                                            return (
                                              <button
                                                key={`allergy-${item}`}
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); toggleProfileSelection('allergies', item, sub); }}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                                                  isSelected 
                                                    ? 'bg-red-50 text-red-600 border-red-300 shadow-xs font-bold ring-1 ring-red-400' 
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                }`}
                                              >
                                                {isSelected ? '✕ ' : '+ '}{item}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex items-center justify-between mb-2.5">
                                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Special Preferences
                                          </label>
                                          <span className="text-[11px] text-slate-400 font-medium">Included / prioritized</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {commonIngredients.map(item => {
                                            const subPreferences = sub.preferences || preferences;
                                            const isSelected = subPreferences.includes(item);
                                            return (
                                              <button
                                                key={`pref-${item}`}
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); toggleProfileSelection('preferences', item, sub); }}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                                                  isSelected 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs font-bold ring-1 ring-emerald-400' 
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                }`}
                                              >
                                                {isSelected ? '✓ ' : '+ '}{item}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-8 pt-6 border-t border-slate-100">
                                    <div className="flex items-center gap-3 mb-4">
                                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                                         <CalendarIcon className="w-5 h-5" />
                                      </div>
                                      <div>
                                        <h3 className="text-sm font-bold text-slate-800">Manage Deliveries</h3>
                                        <p className="text-xs text-emerald-600 font-medium mt-1">Tap any future date to skip individual meals (Breakfast, Lunch, Dinner) or full days.</p>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-slate-50/50 rounded-2xl p-4 md:p-6 border border-slate-200">
                                       {(() => {
                                         const { subStart, subEndDate, subActiveDates, currentSkippedDates } = getSubSchedule(sub);
                                         return (
                                           <>
                                             <div className="flex items-center justify-between mb-6 px-2">
                                               <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}}>
                                                 <ChevronLeft className="w-5 h-5 text-slate-600" />
                                               </button>
                                               <span className="font-bold text-slate-800 text-lg">{monthName}</span>
                                               <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}}>
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
                                                 const mPadded = String(month + 1).padStart(2, '0');
                                                 const dPadded = String(day).padStart(2, '0');
                                                 const dateStr = `${year}-${mPadded}-${dPadded}`;
                                                 const clickedDate = new Date(year, month, day);
                                                 const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                                 
                                                 const isPast = clickedDate < todayDateOnly;
                                                 const skipStatus = getDateSkipStatus(dateStr, sub);
                                                 const isFullSkipped = skipStatus === 'all';
                                                 const isPartialSkipped = skipStatus === 'partial';
                                                 const isActive = subActiveDates.has(dateStr);
                                                 const isWithinPlan = clickedDate >= subStart && clickedDate <= subEndDate;
                                                 const isEditable = !isPast && sub.status !== 'Cancelled' && (isActive || isFullSkipped || isPartialSkipped || isWithinPlan);
                                                 
                                                 let dayClass = 'bg-white text-slate-400 border-slate-100 opacity-40';
                                                 if (isFullSkipped) {
                                                   dayClass = 'bg-rose-50 text-rose-700 border-2 border-rose-300 font-bold shadow-xs';
                                                 } else if (isPartialSkipped) {
                                                   dayClass = 'bg-amber-50 text-amber-900 border-2 border-amber-400 font-bold shadow-xs';
                                                 } else if (isActive) {
                                                   if (isPast) {
                                                     dayClass = 'bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold';
                                                   } else {
                                                     dayClass = 'bg-emerald-500 text-white border border-emerald-600 font-bold shadow-sm';
                                                   }
                                                 } else if (!isPast && isWithinPlan) {
                                                   dayClass = 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300';
                                                 }

                                                 return (
                                                   <div 
                                                     key={day}
                                                     onClick={(e) => {
                                                       e.stopPropagation();
                                                       if (isEditable) openMealSkipModal(clickedDate, dateStr, sub);
                                                     }}
                                                     className={`p-1.5 md:p-2 rounded-xl border text-sm flex flex-col items-center justify-center transition-all duration-300 min-h-[44px] md:min-h-[50px] relative ${dayClass} ${isEditable ? 'cursor-pointer hover:scale-105 hover:shadow-md' : 'cursor-default'}`}
                                                     title={isFullSkipped ? 'All meals skipped - tap to manage' : isPartialSkipped ? 'Specific meal(s) skipped - tap to manage' : isEditable ? 'Tap to manage meals or skip delivery' : ''}
                                                   >
                                                     <span className="font-bold text-xs md:text-sm">{day}</span>
                                                     {isFullSkipped && (
                                                       <span className="text-[9px] font-black uppercase text-rose-600 leading-none mt-0.5">Skip</span>
                                                     )}
                                                     {isPartialSkipped && (
                                                       <span className="text-[8px] font-black uppercase text-amber-800 leading-none mt-0.5 bg-amber-200/60 px-1 py-0.2 rounded">Meal</span>
                                                     )}
                                                   </div>
                                                 );
                                               })}
                                             </div>

                                             <div className="mt-8 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                                               {/* Calendar Skip Status Legend */}
                                               <div className="mb-4 pb-4 border-b border-slate-200/80 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-600">
                                                 <div className="flex items-center gap-1.5">
                                                   <div className="w-3.5 h-3.5 rounded-md bg-emerald-500 border border-emerald-600"></div>
                                                   <span>Active Delivery</span>
                                                 </div>
                                                 <div className="flex items-center gap-1.5">
                                                   <div className="w-3.5 h-3.5 rounded-md bg-amber-50 border-2 border-amber-400"></div>
                                                   <span>Specific Meal(s) Skipped</span>
                                                 </div>
                                                 <div className="flex items-center gap-1.5">
                                                   <div className="w-3.5 h-3.5 rounded-md bg-rose-50 border-2 border-rose-300"></div>
                                                   <span>Full Day Skipped</span>
                                                 </div>
                                               </div>

                                               <div className="flex justify-between items-center mb-3">
                                                 <span className="text-slate-600 text-sm font-medium">Start Date:</span>
                                                 <span className="text-slate-900 font-bold text-sm">
                                                   {subStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                 </span>
                                               </div>
                                               <div className="flex justify-between items-center">
                                                 <span className="text-slate-600 text-sm font-medium">End Date:</span>
                                                 <span className="text-emerald-700 font-bold text-sm">
                                                   {subEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                 </span>
                                               </div>
                                               {currentSkippedDates.length > 0 && (
                                                 <div className="mt-4 pt-4 border-t border-slate-200">
                                                   <p className="text-xs text-rose-600 font-medium mb-2">
                                                     Plan extended by {currentSkippedDates.length} skipped day{currentSkippedDates.length > 1 ? 's' : ''}.
                                                   </p>
                                                   <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                                     Extended dates: <span className="text-emerald-700 font-bold">{
                                                       Array.from(subActiveDates).slice(-currentSkippedDates.length).map(d => {
                                                         const [y, m, date] = d.split('-');
                                                         return new Date(Number(y), Number(m) - 1, Number(date)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                       }).join(', ')
                                                     }</span>
                                                   </p>
                                                 </div>
                                               )}
                                             </div>
                                           </>
                                         );
                                       })()}
                                     </div>
                                   </div>

                                   {sub.status !== 'Cancelled' && (
                                    <div className="flex flex-wrap gap-3 mt-8">
                                      <button 
                                        type="button"
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          handleTogglePause(sub); 
                                        }}
                                        className={`px-5 py-2.5 font-bold rounded-xl transition-all flex items-center gap-2 text-sm shadow-xs cursor-pointer ${
                                          sub.status === 'Paused'
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                            : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                      >
                                        {sub.status === 'Paused' ? (
                                          <>
                                            <Play className="w-4 h-4 fill-current" />
                                            <span>Resume Delivery</span>
                                          </>
                                        ) : (
                                          <>
                                            <Pause className="w-4 h-4" />
                                            <span>Pause Delivery</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}
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
                         type="button"
                         onClick={handleStartAddNewAddress}
                         className="text-emerald-600 font-semibold hover:text-emerald-700 text-sm bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-full transition-colors cursor-pointer"
                       >
                         + Add New
                       </button>
                     )}
                   </div>

                   {(isAddingAddress || editingAddressId) ? (
                     <div className="border border-slate-200 rounded-3xl p-6 sm:p-7 bg-white shadow-sm mb-6 space-y-5 animate-in fade-in duration-300">
                       <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                         <div>
                           <h3 className="font-extrabold text-slate-900 text-lg">
                             {editingAddressId ? 'Edit Address' : 'Add New Address'}
                           </h3>
                           <p className="text-xs text-slate-500 mt-0.5">
                             Pinpoint on the map or enter your address details below
                           </p>
                         </div>
                         <button
                           type="button"
                           onClick={() => { setIsAddingAddress(false); setEditingAddressId(null); setShowSavedTabMapPicker(false); }}
                           className="text-xs font-bold text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                         >
                           <X className="w-4 h-4" />
                         </button>
                       </div>

                       {/* Google Maps & GPS Section */}
                       {!showSavedTabMapPicker ? (
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
                             onClick={() => setShowSavedTabMapPicker(true)}
                             className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                           >
                             <Compass className="w-4 h-4" />
                             Choose on Map
                           </button>
                         </div>
                       ) : (
                         <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                           <div className="flex items-center justify-between px-1">
                             <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                               <Compass className="w-4 h-4 text-emerald-600" />
                               Pinpoint on Map or Search Place
                             </span>
                             <button
                               type="button"
                               onClick={() => setShowSavedTabMapPicker(false)}
                               className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center gap-1"
                             >
                               <X className="w-3.5 h-3.5" />
                               Close Map
                             </button>
                           </div>
                           <LocationMapPicker
                             initialLat={savedTabMapCoords.lat}
                             initialLng={savedTabMapCoords.lng}
                             onLocationSelect={handleSavedTabLocationPicked}
                             onClose={() => {
                               setShowSavedTabMapPicker(false);
                               toast.success('Location confirmed from map!', { id: 'saved-tab-location-toast' });
                             }}
                           />
                         </div>
                       )}

                       {/* Structured manual address fields */}
                       <div className="space-y-4">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div>
                             <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                               Flat / House / Door No. <span className="text-red-500">*</span>
                             </label>
                             <input
                               type="text"
                               placeholder="e.g. Flat 402, 4th Floor"
                               value={savedTabAddressFields.flatNo}
                               onChange={(e) => setSavedTabAddressFields(prev => ({ ...prev, flatNo: e.target.value }))}
                               className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                             />
                           </div>
                           <div>
                             <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                               Building / Street / Society <span className="text-red-500">*</span>
                             </label>
                             <input
                               type="text"
                               placeholder="e.g. Green Meadows, 12th Main"
                               value={savedTabAddressFields.street}
                               onChange={(e) => setSavedTabAddressFields(prev => ({ ...prev, street: e.target.value }))}
                               className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
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
                               value={savedTabAddressFields.area}
                               onChange={(e) => setSavedTabAddressFields(prev => ({ ...prev, area: e.target.value }))}
                               className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                             />
                           </div>
                           <div>
                             <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                               Landmark <span className="text-slate-400 font-normal lowercase">(optional)</span>
                             </label>
                             <input
                               type="text"
                               placeholder="e.g. Near Metro Station / Park"
                               value={savedTabAddressFields.landmark}
                               onChange={(e) => setSavedTabAddressFields(prev => ({ ...prev, landmark: e.target.value }))}
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
                               value={savedTabAddressFields.city}
                               onChange={(e) => setSavedTabAddressFields(prev => ({ ...prev, city: e.target.value }))}
                               className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                             />
                           </div>
                           <div>
                             <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                               State <span className="text-red-500">*</span>
                             </label>
                             <input
                               type="text"
                               placeholder="e.g. Kerala"
                               value={savedTabAddressFields.state}
                               onChange={(e) => setSavedTabAddressFields(prev => ({ ...prev, state: e.target.value }))}
                               className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                             />
                           </div>
                           <div>
                             <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                               Pincode <span className="text-red-500">*</span>
                             </label>
                             <input
                               type="text"
                               placeholder="e.g. 682036"
                               value={savedTabAddressFields.pincode}
                               onChange={(e) => setSavedTabAddressFields(prev => ({ ...prev, pincode: e.target.value }))}
                               className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                             />
                           </div>
                         </div>

                         {/* Address Tag Selector */}
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
                               const isSel = savedTabAddressFields.tag === t.id;
                               return (
                                 <button
                                   key={t.id}
                                   type="button"
                                   onClick={() => setSavedTabAddressFields(prev => ({ ...prev, tag: t.id }))}
                                   className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                     isSel
                                       ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
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

                         {/* Formatted Address Summary / Preview */}
                         {formatSavedTabAddress(savedTabAddressFields) && (
                           <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
                             <span className="font-bold text-slate-900 block mb-0.5">Address Preview:</span>
                             <p className="text-slate-600 leading-relaxed">{formatSavedTabAddress(savedTabAddressFields)}</p>
                           </div>
                         )}

                         {/* Set as default checkbox */}
                         <div
                           onClick={() => setSavedTabAddressFields(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                           className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                             savedTabAddressFields.isDefault
                               ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-500/20 shadow-2xs'
                               : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-200 hover:bg-slate-50'
                           }`}
                         >
                           <input
                             type="checkbox"
                             checked={savedTabAddressFields.isDefault}
                             onChange={(e) => setSavedTabAddressFields(prev => ({ ...prev, isDefault: e.target.checked }))}
                             className="sr-only"
                           />
                           <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                             savedTabAddressFields.isDefault ? 'bg-emerald-600 text-white shadow-2xs' : 'border-2 border-slate-300 bg-white'
                           }`}>
                             {savedTabAddressFields.isDefault && <Check className="w-3 h-3 stroke-[3]" />}
                           </div>
                           <span className="text-sm font-semibold">Set as default address</span>
                         </div>

                         {/* Actions */}
                         <div className="flex gap-3 pt-2">
                           <button
                             type="button"
                             onClick={handleSaveAddress}
                             className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                           >
                             Save Address
                           </button>
                           <button
                             type="button"
                             onClick={() => { setIsAddingAddress(false); setEditingAddressId(null); setShowSavedTabMapPicker(false); }}
                             className="px-5 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                           >
                             Cancel
                           </button>
                         </div>
                       </div>
                     </div>
                   ) : (
                     <div className="space-y-4">
                       {addresses.length === 0 ? (
                         <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                           <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                           <p className="text-slate-500 text-sm font-medium">No saved addresses yet.</p>
                           <button
                             type="button"
                             onClick={handleStartAddNewAddress}
                             className="mt-3 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer"
                           >
                             + Add Your First Address
                           </button>
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
                               <button onClick={() => confirmDeleteAddress(addr.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer" title="Delete Address"><Trash2 className="w-4 h-4 text-red-500" /></button>
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
                    
                    {/* Profile Information Form */}
                    <div className="bg-white p-6 sm:p-7 border border-slate-200 rounded-3xl shadow-xs mb-6">
                      <div className="mb-5">
                        <h3 className="font-extrabold text-slate-900 text-lg">Profile Information</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Update your personal account details</p>
                      </div>

                      <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={userProfile.name}
                            onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter your name"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={userProfile.email}
                            disabled
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-100 text-slate-500 cursor-not-allowed select-none"
                            title="Email address is linked to your login and cannot be modified directly"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">Email address is linked to your account.</p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={userProfile.phone}
                            onChange={(e) => setUserProfile(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="e.g. +91 9876543210"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-colors"
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={isUpdatingProfile}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-xs text-sm cursor-pointer flex items-center gap-2"
                          >
                            {isUpdatingProfile ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Changes'
                            )}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Change Password Form */}
                    <div className="bg-white p-6 sm:p-7 border border-slate-200 rounded-3xl shadow-xs">
                      <div className="mb-5">
                        <h3 className="font-extrabold text-slate-900 text-lg">Change Password</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Ensure your account is using a secure password</p>
                      </div>

                      <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Current Password <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            New Password <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            placeholder="At least 6 characters"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Confirm New Password <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            placeholder="Confirm your new password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 focus:bg-white transition-colors"
                          />
                        </div>
                        <div className="pt-2 flex items-center gap-3 flex-wrap">
                          <button
                            type="submit"
                            disabled={isUpdatingPassword}
                            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-xs text-sm cursor-pointer flex items-center gap-2"
                          >
                            {isUpdatingPassword ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Updating...
                              </>
                            ) : (
                              'Update Password'
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowForgotPasswordModal(true)}
                            className="bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-200/80 px-5 py-2.5 rounded-xl font-bold transition-all text-sm cursor-pointer flex items-center gap-2 shadow-2xs"
                          >
                            <Mail className="w-4 h-4 text-emerald-600" />
                            Forgot Password?
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Forgot Password Modal */}
                    <ForgotPasswordModal
                      isOpen={showForgotPasswordModal}
                      onClose={() => setShowForgotPasswordModal(false)}
                      defaultEmail={userProfile.email || loggedInUser?.email || localStorage.getItem('userEmail') || ''}
                      onSuccess={() => {
                        setPasswordForm({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: '',
                        });
                      }}
                    />
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

      {/* Delivery Address Modal (Search via Map/GPS or Enter Manually like Checkout page) */}
      {addressModalSub && (
        <div className="fixed inset-0 bg-slate-900/60 z-[999] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white max-w-xl w-full rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex justify-between items-start shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950">
                    Delivery Address
                  </span>
                  <span className="text-slate-400 text-xs font-semibold">ID: {addressModalSub.id}</span>
                </div>
                <h3 className="text-xl font-black tracking-tight">Change Delivery Address</h3>
                <p className="text-slate-400 text-xs mt-0.5">{addressModalSub.planName}</p>
              </div>
              <button
                type="button"
                onClick={() => setAddressModalSub(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Toggle (Saved Addresses vs New Address) */}
            <div className="px-5 sm:px-6 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60 shrink-0">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {addressMode === 'saved' ? `Saved Addresses (${addresses.length})` : 'Enter or Search Address'}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (addressMode === 'new') {
                    if (addresses.length > 0) setAddressMode('saved');
                  } else {
                    setAddressMode('new');
                  }
                }}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                {addressMode === 'new' ? (
                  addresses.length > 0 ? <>Use Saved Address ({addresses.length})</> : null
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Enter New Address
                  </>
                )}
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {addressMode === 'saved' && addresses.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">Choose one of your saved delivery addresses:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {addresses.map((addr: any, idx: number) => {
                      const isSelected = selectedAddrIndex === idx;
                      return (
                        <div
                          key={addr.id || `saved-addr-${idx}`}
                          onClick={() => setSelectedAddrIndex(idx)}
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
                            <div className="flex items-center gap-1.5">
                              {addr.isDefault && (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                  Default
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDeleteModalAddress(addr.id, idx);
                                }}
                                className="p-1.5 rounded-lg text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                                title="Delete saved address"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed pl-6 pr-2">
                            {addr.address}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* New / Manual / Map Address Entry matching Checkout.tsx */
                <div className="space-y-4">
                  {/* Google Maps & GPS Section */}
                  {!showAddressMapPicker ? (
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
                        onClick={() => setShowAddressMapPicker(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                      >
                        <Compass className="w-4 h-4" />
                        Choose on Map
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Compass className="w-4 h-4 text-emerald-600" />
                          Pinpoint on Map or Search Place
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddressMapPicker(false)}
                          className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          Close Map
                        </button>
                      </div>
                      <LocationMapPicker
                        initialLat={addressMapCoords.lat}
                        initialLng={addressMapCoords.lng}
                        onLocationSelect={handleAddressLocationPicked}
                        onClose={() => {
                          setShowAddressMapPicker(false);
                          toast.success('Location confirmed from map!', { id: 'location-picked-toast' });
                        }}
                      />
                    </div>
                  )}

                  {/* Structured manual address fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Flat / House / Door No. <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Flat 402, 4th Floor"
                        value={manualAddressFields.flatNo}
                        onChange={(e) => setManualAddressFields(prev => ({ ...prev, flatNo: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Building / Street / Society <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Green Meadows, 12th Main"
                        value={manualAddressFields.street}
                        onChange={(e) => setManualAddressFields(prev => ({ ...prev, street: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs sm:text-sm"
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
                        value={manualAddressFields.area}
                        onChange={(e) => setManualAddressFields(prev => ({ ...prev, area: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Landmark <span className="text-slate-400 font-normal lowercase">(optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Near Metro Station / Park"
                        value={manualAddressFields.landmark}
                        onChange={(e) => setManualAddressFields(prev => ({ ...prev, landmark: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs sm:text-sm"
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
                        value={manualAddressFields.city}
                        onChange={(e) => setManualAddressFields(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Kerala"
                        value={manualAddressFields.state}
                        onChange={(e) => setManualAddressFields(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Pincode <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 682036"
                        value={manualAddressFields.pincode}
                        onChange={(e) => setManualAddressFields(prev => ({ ...prev, pincode: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Address Label Tag */}
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
                        const isSel = manualAddressFields.tag === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setManualAddressFields(prev => ({ ...prev, tag: t.id }))}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              isSel
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
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

                  {/* Summary preview */}
                  {formatManualAddress(manualAddressFields) && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                      <span className="font-bold text-slate-900 block mb-0.5">Delivery Address Preview:</span>
                      <p className="text-slate-600 leading-relaxed">{formatManualAddress(manualAddressFields)}</p>
                    </div>
                  )}

                  {/* Save to addresses checkbox */}
                  <div
                    onClick={() => setSaveToAddresses(!saveToAddresses)}
                    className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                      saveToAddresses
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-500/20 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={saveToAddresses}
                      onChange={(e) => setSaveToAddresses(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                        saveToAddresses
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'border-2 border-slate-300 bg-white'
                      }`}
                    >
                      {saveToAddresses && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-semibold">
                      Save this address to My Saved Addresses
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setAddressModalSub(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSavingAddress}
                onClick={handleSaveDeliveryAddress}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingAddress ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Address...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Update Delivery Address</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meal Slot Skip / Customization Modal */}
      {mealSkipModalOpen && selectedDateForMeals && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setMealSkipModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg tracking-tight">Manage Meals</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      {selectedDateForMeals.sub?.planName || 'Meal Plan'}
                    </span>
                    {(selectedDateForMeals.sub?.slotLabel || selectedDateForMeals.sub?.meals) && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700/90 text-emerald-300 border border-emerald-500/30">
                        {selectedDateForMeals.sub.slotLabel || selectedDateForMeals.sub.meals}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5 font-medium">
                    <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{selectedDateForMeals.formattedDate}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMealSkipModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Quick action buttons */}
              {(() => {
                const availableSlots = getSubAvailableMealSlots(selectedDateForMeals.sub);
                const allSkipped = availableSlots.length > 0 && availableSlots.every(s => 
                  checkIsMealSkipped(selectedDateForMeals.dateStr, s.type, selectedDateForMeals.sub)
                );
                const allActive = availableSlots.length > 0 && availableSlots.every(s => 
                  !checkIsMealSkipped(selectedDateForMeals.dateStr, s.type, selectedDateForMeals.sub)
                );

                const skipLabel = availableSlots.length === 1 
                  ? `Skip Day (${availableSlots[0].label})`
                  : availableSlots.length === 2
                  ? 'Skip Both Meals'
                  : 'Skip Full Day (All 3 Meals)';

                const deliverLabel = availableSlots.length === 1
                  ? `Deliver Day (${availableSlots[0].label})`
                  : availableSlots.length === 2
                  ? 'Deliver Both Meals'
                  : 'Deliver Full Day (All 3 Meals)';

                return (
                  <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => handleSkipEntireDay(selectedDateForMeals.dateStr, selectedDateForMeals.sub)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        allSkipped
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200/80 hover:border-rose-200 shadow-2xs'
                      }`}
                    >
                      <CalendarX className={`w-3.5 h-3.5 ${allSkipped ? 'text-white' : 'text-rose-500'}`} />
                      <span>{skipLabel}</span>
                      {allSkipped && <span className="text-[10px] bg-rose-700/80 px-1.5 py-0.2 rounded font-black uppercase">Active</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRestoreEntireDay(selectedDateForMeals.dateStr, selectedDateForMeals.sub)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        allActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/80 hover:border-emerald-200 shadow-2xs'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${allActive ? 'text-white' : 'text-emerald-600'}`} />
                      <span>{deliverLabel}</span>
                      {allActive && <span className="text-[10px] bg-emerald-700/80 px-1.5 py-0.2 rounded font-black uppercase">Active</span>}
                    </button>
                  </div>
                );
              })()}

              {/* Meal cards list */}
              <div className="space-y-2.5">
                {(() => {
                  const availableSlots = getSubAvailableMealSlots(selectedDateForMeals.sub);
                  return (
                    <div className="flex items-center justify-between px-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Scheduled Meals ({availableSlots.length} {availableSlots.length === 1 ? 'Delivery' : 'Deliveries'})
                      </p>
                      {(selectedDateForMeals.sub?.slotLabel || selectedDateForMeals.sub?.meals) && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          {selectedDateForMeals.sub.slotLabel || selectedDateForMeals.sub.meals}
                        </span>
                      )}
                    </div>
                  );
                })()}
                {getSubAvailableMealSlots(selectedDateForMeals.sub).map((slot) => {
                  const isSkipped = checkIsMealSkipped(selectedDateForMeals.dateStr, slot.type, selectedDateForMeals.sub);
                  
                  return (
                    <div 
                      key={slot.type}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSkipped
                          ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                          : 'bg-emerald-50/40 border-emerald-200/80 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          isSkipped ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {slot.type === 'Breakfast' ? (
                            <Coffee className="w-5 h-5" />
                          ) : slot.type === 'Lunch' ? (
                            <Sun className="w-5 h-5" />
                          ) : (
                            <Moon className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{slot.label}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isSkipped
                                ? 'bg-rose-200 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isSkipped ? '✕ Skipped' : '✓ Scheduled'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{slot.time}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleMealSlot(selectedDateForMeals.dateStr, slot.type, selectedDateForMeals.sub)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
                          isSkipped
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300'
                        }`}
                      >
                        {isSkipped ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Resume</span>
                          </>
                        ) : (
                          <>
                            <X className="w-3.5 h-3.5" />
                            <span>Skip Meal</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Informative Note */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Zero Food Waste Guarantee</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Skipping any meal automatically postpones that meal credit so you never lose paid meals. You can resume any meal anytime before daily dispatch cutoff.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setMealSkipModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Delivery with Date Selection Modal */}
      {pausingSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <Pause className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Pause Meal Deliveries</h3>
                  <p className="text-amber-100 text-xs font-medium mt-0.5">
                    {pausingSub.planName} &bull; ID: {pausingSub.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPausingSub(null)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* 1. Pause Start Date */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  1. Start Pause On
                </label>
                <p className="text-xs text-slate-500 mb-3">When should we temporarily stop preparing your meals?</p>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      const tom = new Date(Date.now() + 86400000);
                      setPauseStartDate(tom.toISOString().split('T')[0]);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      pauseStartDate === new Date(Date.now() + 86400000).toISOString().split('T')[0]
                        ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Tomorrow ({new Date(Date.now() + 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      setPauseStartDate(todayStr);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      pauseStartDate === new Date().toISOString().split('T')[0]
                        ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Today ({new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={pauseStartDate}
                    onChange={(e) => setPauseStartDate(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* 2. Resume Date */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  2. Resume Deliveries
                </label>
                <p className="text-xs text-slate-500 mb-3">How long would you like to put deliveries on hold?</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {[
                    { id: '3days', label: '3 Days', desc: 'Quick break' },
                    { id: '1week', label: '1 Week', desc: '7 days hold' },
                    { id: '2weeks', label: '2 Weeks', desc: '14 days hold' },
                    { id: 'custom', label: 'Pick Date', desc: 'Specific return' },
                    { id: 'indefinite', label: 'Indefinite', desc: 'Until I resume' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPauseResumeMode(opt.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        pauseResumeMode === opt.id
                          ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold ring-2 ring-amber-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-xs font-bold">{opt.label}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>

                {pauseResumeMode === 'custom' && (
                  <div className="mt-2 animate-in fade-in">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">Select Resume Date:</span>
                    <input
                      type="date"
                      min={pauseStartDate || new Date().toISOString().split('T')[0]}
                      value={pauseCustomResumeDate}
                      onChange={(e) => setPauseCustomResumeDate(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Pause Summary Box */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Remaining Days Guaranteed</span>
                </div>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  {pauseResumeMode === 'indefinite' ? (
                    <>Deliveries will be on hold starting from <strong className="font-bold">{pauseStartDate || 'selected date'}</strong>. You can resume anytime from your profile without losing any paid days.</>
                  ) : (
                    <>Deliveries will be on hold starting <strong className="font-bold">{pauseStartDate || 'selected date'}</strong> and will automatically resume on <strong className="font-bold">{getCalculatedResumeDate(pauseStartDate, pauseResumeMode, pauseCustomResumeDate) || 'selected resume date'}</strong>.</>
                  )}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPausingSub(null)}
                className="px-4 py-2.5 text-slate-600 hover:text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Keep Deliveries Active
              </button>

              <button
                type="button"
                disabled={isSubmittingPause}
                onClick={handleConfirmPause}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingPause ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Pausing...</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Confirm & Pause Delivery</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
