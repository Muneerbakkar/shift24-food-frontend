/**
 * Universal helper to check if a date is skipped.
 * Supports both standard 1-indexed ISO format ('2026-10-25') and legacy 0-indexed month format ('2026-9-25').
 */
export const isDateSkipped = (skippedDates: any[], targetDateISO: string): boolean => {
  if (!Array.isArray(skippedDates) || skippedDates.length === 0 || !targetDateISO) return false;

  const targetParts = targetDateISO.split('-');
  if (targetParts.length !== 3) return false;
  const tY = Number(targetParts[0]);
  const tM = Number(targetParts[1]); // 1-12
  const tD = Number(targetParts[2]);

  return skippedDates.some(sd => {
    if (!sd) return false;
    const clean = String(sd).trim();
    if (clean === targetDateISO) return true;

    const parts = clean.split('-');
    if (parts.length === 3) {
      const sY = Number(parts[0]);
      const sM = Number(parts[1]);
      const sD = Number(parts[2]);

      // 1. Direct 1-indexed match (e.g. 2026-10-25 or 2026-10-5)
      if (sY === tY && sM === tM && sD === tD) return true;

      // 2. Legacy 0-indexed match (where month 0-11 was saved, e.g. 9 for October)
      if (sY === tY && sM === (tM - 1) && sD === tD) return true;
    }
    return false;
  });
};

/**
 * Universal helper to check if a specific meal slot is skipped.
 * Checks both whole date skips (skippedDates) and specific meal skips (skippedMeals, e.g. '2026-10-25:Breakfast').
 */
/**
 * Format timestamp into 12-hour AM/PM format (e.g. "08:30 PM", "11:45 AM")
 */
export function formatDelivered12Hr(
  dateInput?: string | Date | null, 
  fallbackSlot?: string,
  mealType?: string
): string {
  if (dateInput) {
    try {
      const d = new Date(dateInput);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
    } catch {}
  }

  // Fallback to slot end time only if deliveredAt timestamp was not recorded
  if (fallbackSlot && fallbackSlot.includes('-')) {
    const parts = fallbackSlot.split('-');
    if (parts.length > 1) {
      return parts[1].trim();
    }
  }

  const mType = (mealType || '').toLowerCase();
  if (mType.includes('breakfast')) return '08:30 AM';
  if (mType.includes('lunch')) return '01:30 PM';
  if (mType.includes('dinner')) return '08:30 PM';

  return '';
}

export const isMealSkipped = (
  skippedDates: any[] | undefined,
  skippedMeals: any[] | undefined,
  targetDateISO: string,
  mealType: 'Breakfast' | 'Lunch' | 'Dinner'
): boolean => {
  if (isDateSkipped(skippedDates || [], targetDateISO)) return true;

  if (Array.isArray(skippedMeals) && skippedMeals.length > 0) {
    const targetKey = `${targetDateISO}:${mealType}`.toLowerCase();
    const suffix = mealType === 'Breakfast' ? 'B' : mealType === 'Lunch' ? 'L' : 'D';
    const targetKeySuffix = `${targetDateISO}-${suffix}`.toLowerCase();

    return skippedMeals.some(sm => {
      if (!sm) return false;
      const clean = String(sm).trim().toLowerCase();
      if (clean === targetKey || clean === targetKeySuffix) return true;
      if (clean.includes(targetDateISO.toLowerCase()) && clean.includes(mealType.toLowerCase())) return true;
      return false;
    });
  }

  return false;
};

export interface AdminSubscription {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  planId: string;
  planTitle: string;
  duration: string;
  durationDays: number;
  mealsPerDay: '1' | '2' | '3' | string;
  slot: string;
  slotLabel: string;
  totalPrice: number;
  status: 'Active' | 'Paused' | 'Cancelled' | 'Completed';
  startDate: string;
  endDate: string;
  nextDelivery: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
  allergies: string[];
  skippedDates?: string[];
  skippedMeals?: string[];
  preferences?: string[];
  pauseStartDate?: string;
  pauseEndDate?: string;
}

export interface AdminOrder {
  id: string;
  subscriptionId?: string;
  customerName: string;
  customerPhone: string;
  planTitle: string;
  mealName: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner';
  deliveryDate: string;
  deliveryTimeSlot: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
  status: 'Pending' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  amount: number;
  paymentMethod: string;
  allergies: string[];
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicle?: string;
  assignedAt?: string;
  stopIndex?: number;
  distanceFromHub?: number;
  distanceFromPrevOrder?: number;
  deliveredAt?: string;
}

export interface AdminDriver {
  id: string;
  driverId?: string;
  name: string;
  phone: string;
  email?: string;
  password?: string;
  vehicleType: 'Motorcycle' | 'Scooter' | 'Car' | 'Van' | 'Bicycle';
  vehicleNumber: string;
  licenseNumber?: string;
  status: 'Available' | 'On Delivery' | 'Off Duty' | 'Inactive';
  currentZone?: string;
  notes?: string;
  avatar?: string;
  activeOrdersCount?: number;
  createdAt?: string;
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  joinedDate: string;
  activePlan?: string;
  allergies: string[];
  address: string;
  coordinates?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
  status: 'Active' | 'Inactive';
}

export interface IDurationOption {
  id: string;
  title: string;
  days: number;
  description: string;
  discount: number;
  popular: boolean;
  badge?: string;
  price?: number;
  customPrice?: number;
  prices?: {
    '1'?: number;
    '2'?: number;
    '3'?: number;
  };
  slotPrices?: {
    breakfast?: number;
    lunch?: number;
    dinner?: number;
    'breakfast-lunch'?: number;
    'lunch-dinner'?: number;
    'breakfast-dinner'?: number;
  };
  features?: string[];
}

export interface IMealOption {
  id: '1' | '2' | '3';
  label: string;
  sub: string;
  multiplier: number;
}

export interface AdminPlanConfig {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  pricePerWeek: number;
  calories: string;
  benefits: string[];
  durationOptions?: IDurationOption[];
  mealOptions?: IMealOption[];
  active: boolean;
  popular?: boolean;
  badge?: string;
  order?: number;
  dailyCommission?: number;
}

export const DEFAULT_DURATION_OPTIONS: IDurationOption[] = [
  {
    id: '1-day',
    title: '1-Day Trial',
    days: 1,
    description: 'Taste-test our chef-prepared healthy meals for a day.',
    discount: 0,
    popular: false,
    badge: '',
    price: 400,
    customPrice: 400,
    features: ['{meal_count} Meals daily', 'Free daily delivery', '100% clean healthy food']
  },
  {
    id: '7-day',
    title: '7 Day Plan',
    days: 7,
    description: 'Perfect for building healthy eating habits over a week.',
    discount: 0,
    popular: false,
    badge: '',
    price: 2800,
    customPrice: 2800,
    features: ['{meal_count} Meals daily', 'Free daily delivery', 'Fresh rotating daily menu', 'Pause or skip anytime']
  },
  {
    id: '30-day',
    title: '30 Day Plan',
    days: 30,
    description: 'Commit to healthy eating all month long and save more.',
    discount: 10,
    popular: true,
    badge: 'MOST POPULAR',
    price: 10800,
    customPrice: 10800,
    features: ['{meal_count} Meals daily', 'Free daily delivery', 'Maximum monthly savings', 'Pause or skip anytime']
  }
];

export const DEFAULT_MEAL_OPTIONS: IMealOption[] = [
  { id: '1', label: '1 Meal / Day', sub: 'Breakfast, Lunch or Dinner', multiplier: 0.40 },
  { id: '2', label: '2 Meals / Day', sub: 'Breakfast & Lunch / Dinner', multiplier: 0.72 },
  { id: '3', label: '3 Meals / Day', sub: 'All Meals', multiplier: 1.00 }
];

const INITIAL_SUBSCRIPTIONS: AdminSubscription[] = [];

const INITIAL_ORDERS: AdminOrder[] = [];

const INITIAL_CUSTOMERS: AdminCustomer[] = [];

const INITIAL_PLANS: AdminPlanConfig[] = [
  {
    id: 'healthy-food',
    title: 'Healthy Food',
    subtitle: 'Customize your daily meal routine and subscription duration. The longer you commit, the more you save.',
    description: 'Fresh chef-prepared healthy meals crafted daily with clean, nutrient-dense ingredients.',
    pricePerWeek: 2800,
    calories: '1500 - 2000 kcal/day',
    benefits: ['100% clean ingredients', 'Chef-prepared fresh daily', 'Balanced nutrition & macros', 'Free doorstep delivery'],
    durationOptions: DEFAULT_DURATION_OPTIONS,
    mealOptions: DEFAULT_MEAL_OPTIONS,
    active: true,
    popular: true,
    badge: 'MOST POPULAR',
    order: 1,
    dailyCommission: 100,
  },
  {
    id: 'balance',
    title: 'Balance Weight',
    subtitle: 'Customize your daily meal routine and subscription duration. The longer you commit, the more you save.',
    description: 'Perfectly portioned meals to maintain your current physique and optimize health.',
    pricePerWeek: 2800,
    calories: '1800 - 2000 kcal/day',
    benefits: ['Balanced macros', 'Sustained energy', 'Heart healthy'],
    durationOptions: DEFAULT_DURATION_OPTIONS,
    mealOptions: DEFAULT_MEAL_OPTIONS,
    active: true,
    popular: false,
    order: 2,
    dailyCommission: 100,
  }
];

// Helper functions with localStorage persistence
export function getAdminSubscriptions(): AdminSubscription[] {
  try {
    const raw = localStorage.getItem('shift24_admin_subscriptions');
    if (raw) {
      const parsed: AdminSubscription[] = JSON.parse(raw);
      const dummyIds = new Set(['SUB-801', 'SUB-802', 'SUB-803', 'SUB-804', 'SUB-805']);
      const dummyEmails = new Set(['rahul.s@example.com', 'ananya.roy@example.com', 'vikram.m@example.com', 'pooja.i@example.com', 'karthik.n@example.com']);
      const filtered = parsed.filter(s => !dummyIds.has(s.id) && !dummyIds.has((s as any).subId) && !dummyEmails.has(s.customerEmail));

      // Sync activeSubscription skipped dates and status if available
      try {
        const activeSubRaw = localStorage.getItem('activeSubscription');
        if (activeSubRaw) {
          const activeSub = JSON.parse(activeSubRaw);
          for (const s of filtered) {
            if (s.id === activeSub.id || s.id === activeSub.subId) {
              if (activeSub.skippedDates && Array.isArray(activeSub.skippedDates)) {
                if (!s.skippedDates || s.skippedDates.length === 0) {
                  s.skippedDates = activeSub.skippedDates;
                }
              }

            }
          }
        }
      } catch (e) {}

      if (filtered.length !== parsed.length) {
        saveAdminSubscriptions(filtered);
      }
      return filtered;
    }
  } catch (e) {
    console.error(e);
  }
  return INITIAL_SUBSCRIPTIONS;
}

export function saveAdminSubscriptions(subs: AdminSubscription[]) {
  localStorage.setItem('shift24_admin_subscriptions', JSON.stringify(subs));
}

export function getAdminOrders(): AdminOrder[] {
  try {
    const raw = localStorage.getItem('shift24_admin_orders');
    if (raw) {
      const parsed: AdminOrder[] = JSON.parse(raw);
      const dummyOrderIds = new Set(['ORD-901', 'ORD-902', 'ORD-903', 'ORD-904', 'ORD-905', 'ORD-906']);
      const dummyCustomerNames = new Set(['Rahul Sharma', 'Ananya Roy', 'Vikram Menon', 'Pooja Iyer', 'Karthik Nair']);
      const filtered = parsed.filter(o => 
        !dummyOrderIds.has(o.id) && 
        !dummyCustomerNames.has(o.customerName)
      );

      if (filtered.length !== parsed.length) {
        saveAdminOrders(filtered);
      }
      return filtered;
    }
  } catch (e) {
    console.error(e);
  }
  return INITIAL_ORDERS;
}

export function saveAdminOrders(orders: AdminOrder[]) {
  localStorage.setItem('shift24_admin_orders', JSON.stringify(orders));
}

export function clearAdminOrders() {
  localStorage.setItem('shift24_admin_orders', JSON.stringify([]));
  window.dispatchEvent(new Event('shift24-orders-updated'));
}

export function deleteAdminOrder(orderId: string): AdminOrder[] {
  const orders = getAdminOrders().filter(o => o.id !== orderId);
  saveAdminOrders(orders);
  window.dispatchEvent(new Event('shift24-orders-updated'));
  return orders;
}

export function deleteAdminOrdersBulk(orderIds: string[]): AdminOrder[] {
  const idSet = new Set(orderIds);
  const orders = getAdminOrders().filter(o => !idSet.has(o.id));
  saveAdminOrders(orders);
  window.dispatchEvent(new Event('shift24-orders-updated'));
  return orders;
}

export const INITIAL_DRIVERS: AdminDriver[] = [
  {
    id: 'DRV-101',
    driverId: 'DRV-101',
    name: 'Suresh Kumar',
    phone: '+91 98470 12345',
    email: 'suresh.k@shift24.food',
    vehicleType: 'Motorcycle',
    vehicleNumber: 'KL-07-CB-2341',
    licenseNumber: 'KL0720180045129',
    status: 'Available',
    currentZone: 'Kakkanad & Infopark',
    notes: 'Primary morning slot dispatch rider. Highly punctual.'
  },
  {
    id: 'DRV-102',
    driverId: 'DRV-102',
    name: 'Abhijith Nair',
    phone: '+91 94460 56789',
    email: 'abhijith.n@shift24.food',
    vehicleType: 'Scooter',
    vehicleNumber: 'KL-07-CD-8812',
    licenseNumber: 'KL0720200078341',
    status: 'Available',
    currentZone: 'Edachira & Rajagiri Campus',
    notes: 'Handles Rajagiri and Edachira residential routes.'
  },
  {
    id: 'DRV-103',
    driverId: 'DRV-103',
    name: 'Mohammed Fasil',
    phone: '+91 97455 33412',
    email: 'fasil.m@shift24.food',
    vehicleType: 'Motorcycle',
    vehicleNumber: 'KL-07-CK-9900',
    licenseNumber: 'KL0720190033221',
    status: 'Available',
    currentZone: 'Palarivattom & Kaloor',
    notes: 'Express route specialist for lunch and dinner drops.'
  },
  {
    id: 'DRV-104',
    driverId: 'DRV-104',
    name: 'Rahul Varma',
    phone: '+91 98950 77123',
    email: 'rahul.v@shift24.food',
    vehicleType: 'Van',
    vehicleNumber: 'KL-07-BX-1122',
    licenseNumber: 'KL0720160012908',
    status: 'Available',
    currentZone: 'Bulk Corporate Delivery & Catering',
    notes: 'Bulk fleet driver for large office orders and multiple meal kits.'
  }
];

export function getAdminDrivers(): AdminDriver[] {
  try {
    const raw = localStorage.getItem('shift24_admin_drivers');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading drivers:', e);
  }
  return INITIAL_DRIVERS;
}

export function saveAdminDrivers(drivers: AdminDriver[]) {
  try {
    localStorage.setItem('shift24_admin_drivers', JSON.stringify(drivers));
    window.dispatchEvent(new Event('shift24-drivers-updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('Error saving drivers:', e);
  }
}

export function addAdminDriver(driver: Omit<AdminDriver, 'id'>): AdminDriver[] {
  const drivers = getAdminDrivers();
  const id = driver.driverId || `DRV-${Math.floor(100 + Math.random() * 900)}`;
  const newDriver: AdminDriver = {
    ...driver,
    id,
    driverId: id,
    createdAt: new Date().toISOString()
  };
  const updated = [newDriver, ...drivers];
  saveAdminDrivers(updated);
  return updated;
}

export function updateAdminDriver(id: string, updates: Partial<AdminDriver>): AdminDriver[] {
  const drivers = getAdminDrivers().map(d => {
    if (d.id === id || d.driverId === id) {
      return { ...d, ...updates };
    }
    return d;
  });
  saveAdminDrivers(drivers);
  return drivers;
}

export function deleteAdminDriver(id: string): AdminDriver[] {
  const drivers = getAdminDrivers().filter(d => d.id !== id && d.driverId !== id);
  saveAdminDrivers(drivers);
  return drivers;
}

export function assignDriverToOrdersLocally(
  orderIds: string[], 
  driver: AdminDriver | null,
  updateStatusToOutForDelivery: boolean = true
): AdminOrder[] {
  const orders = getAdminOrders().map(o => {
    if (orderIds.includes(o.id)) {
      if (driver) {
        return {
          ...o,
          driverId: driver.driverId || driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          driverVehicle: `${driver.vehicleType} (${driver.vehicleNumber})`,
          assignedAt: new Date().toISOString(),
          ...(updateStatusToOutForDelivery && (o.status === 'Preparing' || o.status === 'Pending') 
            ? { status: 'Out for Delivery' as const } 
            : {})
        };
      } else {
        const copy: any = { ...o };
        delete copy.driverId;
        delete copy.driverName;
        delete copy.driverPhone;
        delete copy.driverVehicle;
        delete copy.assignedAt;
        return copy as AdminOrder;
      }
    }
    return o;
  });

  saveAdminOrders(orders);
  window.dispatchEvent(new Event('shift24-orders-updated'));
  return orders;
}

/**
 * Synchronize daily dispatch orders for active subscriptions directly into local state/storage
 */
export function syncLocalOrdersFromSubscriptions(subs?: AdminSubscription[], options?: { slot?: 'Breakfast' | 'Lunch' | 'Dinner'; todayOnly?: boolean; targetDateISO?: string }): AdminOrder[] {
  try {
    const subscriptions = subs || getAdminSubscriptions();
    const activeSubs = subscriptions.filter(s => s.status === 'Active');
    if (!activeSubs || activeSubs.length === 0) {
      try {
        const raw = localStorage.getItem('shift24_admin_orders');
        return raw ? JSON.parse(raw) : INITIAL_ORDERS;
      } catch {
        return INITIAL_ORDERS;
      }
    }

    const getLocalDateISO = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const now = new Date();
    const todayObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayISO = getLocalDateISO(todayObj);

    const tomorrowObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowISO = getLocalDateISO(tomorrowObj);

    const breakfastVarieties = [
      'Chef Breakfast',
      'Protein Oatmeal & Fresh Berries',
      'Scrambled Eggs & Sourdough Toast',
      'Greek Yogurt Protein Parfait',
      'Avocado Spinach Egg Omelette',
      'Chia Seed High-Protein Pudding',
      'Whole Grain High-Protein Toast'
    ];
    const lunchVarieties = [
      'Power Lunch',
      'Grilled Herb Chicken & Quinoa',
      'Pan-Seared Salmon Teriyaki Bowl',
      'Lean Beef Steak Strips & Steamed Greens',
      'Mediterranean Chickpea & Grain Bowl',
      'Lemon Herb Roasted Chicken Breast',
      'High-Protein Tofu & Avocado Crunch Bowl'
    ];
    const dinnerVarieties = [
      'Balanced Dinner',
      'Roasted Salmon & Steamed Asparagus',
      'Herb Crusted Grilled Chicken Breast',
      'Pan-Seared Protein Medallions & Sweet Potato',
      'Low-Carb Zucchini & Ricotta Lasagna',
      'Hearty Grilled Steak Salad',
      'Garlic Basil Chicken with Brown Rice'
    ];

    let rawExisting: AdminOrder[] = [];
    try {
      const stored = localStorage.getItem('shift24_admin_orders');
      if (stored) rawExisting = JSON.parse(stored);
    } catch {}

    const existingMap = new Map<string, AdminOrder>();
    for (const o of rawExisting) {
      if (o.id) existingMap.set(o.id, o);
    }

    // Purge non-delivered orders for any paused or inactive subscriptions from existingMap
    for (const sub of subscriptions) {
      if (sub.status !== 'Active') {
        const cleanId = (sub.id || '').replace(/^SUB-/, '') || 'SUB';
        for (const [id, ord] of Array.from(existingMap.entries())) {
          if (
            (ord.subscriptionId === sub.id || id.startsWith(`ORD-${cleanId}-`) || (ord.customerPhone && sub.customerPhone && ord.customerPhone === sub.customerPhone)) &&
            ord.status !== 'Delivered'
          ) {
            existingMap.delete(id);
          }
        }
      }
    }

    // Purge any existing non-delivered orders for skipped dates across all active subscriptions
    for (const sub of activeSubs) {
      if (sub.status !== 'Active') continue;
      const cleanId = (sub.id || '').replace(/^SUB-/, '') || 'SUB';
      if (Array.isArray(sub.skippedDates) && sub.skippedDates.length > 0) {
        for (const sd of sub.skippedDates) {
          if (!sd) continue;
          const parts = String(sd).trim().split('-');
          if (parts.length === 3) {
            const sY = Number(parts[0]);
            const sM = Number(parts[1]);
            const sD = Number(parts[2]);
            const slug1 = `${sY}${String(sM).padStart(2, '0')}${String(sD).padStart(2, '0')}`;
            const slug2 = `${sY}${String(sM + 1).padStart(2, '0')}${String(sD).padStart(2, '0')}`;
            for (const slug of [slug1, slug2]) {
              for (const suffix of ['B', 'L', 'D']) {
                const dateOrderId = `ORD-${cleanId}-${slug}-${suffix}`;
                const existing = existingMap.get(dateOrderId);
                if (existing && existing.status !== 'Delivered') {
                  existingMap.delete(dateOrderId);
                }
              }
            }
          }
        }
      }
    }

    const allGeneratedOrders: AdminOrder[] = [];

    for (const sub of activeSubs) {
      const cleanId = (sub.id || '').replace(/^SUB-/, '') || 'SUB';
      const mealsPerDay = parseInt(sub.mealsPerDay as any) || 3;
      const slot = (sub.slot || 'all').toLowerCase();
      const durationDays = Number(sub.durationDays) || 7;
      const perMealCost = Math.round(Number(sub.totalPrice || 0) / (durationDays * mealsPerDay)) || 150;

      let slotsToGenerate: Array<{
        suffix: string;
        type: 'Breakfast' | 'Lunch' | 'Dinner';
        time: string;
      }> = [];

      if (mealsPerDay === 3 || slot === 'all') {
        slotsToGenerate.push(
          { suffix: 'B', type: 'Breakfast', time: '07:30 AM - 08:30 AM' },
          { suffix: 'L', type: 'Lunch', time: '12:00 PM - 01:00 PM' },
          { suffix: 'D', type: 'Dinner', time: '07:30 PM - 08:30 PM' }
        );
      } else if (mealsPerDay === 2) {
        if (slot.includes('dinner')) {
          slotsToGenerate.push(
            { suffix: 'L', type: 'Lunch', time: '12:00 PM - 01:00 PM' },
            { suffix: 'D', type: 'Dinner', time: '07:30 PM - 08:30 PM' }
          );
        } else {
          slotsToGenerate.push(
            { suffix: 'B', type: 'Breakfast', time: '07:30 AM - 08:30 AM' },
            { suffix: 'L', type: 'Lunch', time: '12:00 PM - 01:00 PM' }
          );
        }
      } else {
        if (slot.includes('breakfast')) {
          slotsToGenerate.push({ suffix: 'B', type: 'Breakfast', time: '07:30 AM - 08:30 AM' });
        } else if (slot.includes('dinner')) {
          slotsToGenerate.push({ suffix: 'D', type: 'Dinner', time: '07:30 PM - 08:30 PM' });
        } else {
          slotsToGenerate.push({ suffix: 'L', type: 'Lunch', time: '12:00 PM - 01:00 PM' });
        }
      }

      if (options?.slot) {
        slotsToGenerate = slotsToGenerate.filter(s => s.type.toLowerCase() === options.slot!.toLowerCase());
      }

      let subStartDate = new Date(todayObj);
      if (sub.startDate) {
        const cleanStart = String(sub.startDate).split('T')[0];
        const parts = cleanStart.split('-');
        if (parts.length === 3) {
          subStartDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else {
          const parsed = new Date(sub.startDate);
          if (!isNaN(parsed.getTime())) {
            subStartDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
          }
        }
      }

      const totalDays = Math.min(Math.max(durationDays, 1), 60);

      for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
        const orderDate = new Date(subStartDate.getFullYear(), subStartDate.getMonth(), subStartDate.getDate() + dayIdx);
        const orderISO = getLocalDateISO(orderDate);

        const targetDate = options?.targetDateISO || todayISO;
        if (orderISO !== targetDate) {
          continue;
        }

        const shortDate = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const isSkipped = isDateSkipped(sub.skippedDates, orderISO);
        if (isSkipped) {
          const dateSlug = orderISO.replace(/-/g, '');
          for (const s of slotsToGenerate) {
            const dateOrderId = `ORD-${cleanId}-${dateSlug}-${s.suffix}`;
            const existing = existingMap.get(dateOrderId);
            if (existing && existing.status !== 'Delivered') {
              existingMap.delete(dateOrderId);
            }
          }
          continue;
        }

        // Skip dates if subscription was paused (range or indefinite)
        if (sub.status === 'Paused') {
          continue;
        }

        if (sub.pauseStartDate) {
          const pStartISO = String(sub.pauseStartDate).trim().split('T')[0];
          const pEndISO = sub.pauseEndDate ? String(sub.pauseEndDate).trim().split('T')[0] : null;
          const isPaused = pEndISO
            ? (orderISO >= pStartISO && orderISO <= pEndISO)
            : (orderISO >= pStartISO);

          if (isPaused) {
            const dateSlug = orderISO.replace(/-/g, '');
            for (const s of slotsToGenerate) {
              const dateOrderId = `ORD-${cleanId}-${dateSlug}-${s.suffix}`;
              const existing = existingMap.get(dateOrderId);
              if (existing && existing.status !== 'Delivered') {
                existingMap.delete(dateOrderId);
              }
            }
            continue;
          }
        }

        const isToday = orderISO === todayISO;
        const isTomorrow = orderISO === tomorrowISO;
        const isPast = orderISO < todayISO;

        let labelPrefix = shortDate;
        if (isToday) {
          labelPrefix = `Today, ${shortDate}`;
        } else if (isTomorrow) {
          labelPrefix = `Tomorrow, ${shortDate}`;
        }
        const fullDeliveryDate = `${labelPrefix} (${orderISO})`;

        let defaultStatus: AdminOrder['status'] = 'Pending';
        if (isPast) {
          defaultStatus = 'Delivered';
        } else if (isToday) {
          defaultStatus = 'Preparing';
        }

        const dateSlug = orderISO.replace(/-/g, '');

        for (const s of slotsToGenerate) {
          // Check if this specific meal slot was skipped
          if (isMealSkipped(sub.skippedDates, sub.skippedMeals, orderISO, s.type)) {
            const dateOrderId = `ORD-${cleanId}-${dateSlug}-${s.suffix}`;
            const existing = existingMap.get(dateOrderId);
            if (existing && existing.status !== 'Delivered') {
              existingMap.delete(dateOrderId);
            }
            continue;
          }

          const mealTitle = s.type === 'Breakfast'
            ? `${sub.planTitle} - ${breakfastVarieties[dayIdx % breakfastVarieties.length]}`
            : s.type === 'Lunch'
            ? `${sub.planTitle} - ${lunchVarieties[dayIdx % lunchVarieties.length]}`
            : `${sub.planTitle} - ${dinnerVarieties[dayIdx % dinnerVarieties.length]}`;

          const dateOrderId = `ORD-${cleanId}-${dateSlug}-${s.suffix}`;
          const existing = existingMap.get(dateOrderId);

          const subLat = typeof sub.latitude === 'number' && !isNaN(sub.latitude) ? sub.latitude : sub.coordinates?.lat;
          const subLng = typeof sub.longitude === 'number' && !isNaN(sub.longitude) ? sub.longitude : sub.coordinates?.lng;
          const finalCoords = (typeof subLat === 'number' && typeof subLng === 'number') 
            ? { lat: subLat, lng: subLng } 
            : (sub.coordinates || (existing ? existing.coordinates : undefined));

          const finalOrder: AdminOrder = {
            id: dateOrderId,
            subscriptionId: sub.id,
            customerName: sub.customerName,
            customerPhone: sub.customerPhone,
            planTitle: sub.planTitle,
            mealName: mealTitle,
            mealType: s.type,
            deliveryDate: fullDeliveryDate,
            deliveryTimeSlot: s.time,
            address: sub.address || 'Address on file',
            coordinates: finalCoords,
            latitude: subLat || existing?.latitude,
            longitude: subLng || existing?.longitude,
            status: existing ? existing.status : defaultStatus,
            amount: perMealCost,
            paymentMethod: 'Online / Subscription',
            allergies: Array.isArray(sub.allergies) ? sub.allergies : [],
            driverId: existing?.driverId,
            driverName: existing?.driverName,
            driverPhone: existing?.driverPhone,
            driverVehicle: existing?.driverVehicle,
            deliveredAt: existing?.deliveredAt || (defaultStatus === 'Delivered' ? new Date().toISOString() : undefined),
            stopIndex: existing?.stopIndex,
            distanceFromHub: existing?.distanceFromHub,
            distanceFromPrevOrder: existing?.distanceFromPrevOrder
          };

          allGeneratedOrders.push(finalOrder);
        }
      }
    }

    if (allGeneratedOrders.length > 0) {
      for (const ord of allGeneratedOrders) {
        existingMap.set(ord.id, ord);
      }
      const mergedOrders = Array.from(existingMap.values());
      saveAdminOrders(mergedOrders);
      return mergedOrders;
    }
    return Array.from(existingMap.values());
  } catch (e) {
    console.error('Error syncing local orders from subscriptions:', e);
  }
  return getAdminOrders();
}

/**
 * Dynamically project/calculate scheduled meal orders for ANY target date (e.g. Tomorrow)
 * directly from active subscriptions. This ensures the kitchen prep board can always preview
 * upcoming meal batches and allergen warnings even before dispatch orders are generated.
 */
export function projectOrdersForDate(targetDateISO: string, subs?: AdminSubscription[]): AdminOrder[] {
  try {
    const subscriptions = subs || getAdminSubscriptions();
    const activeSubs = subscriptions.filter(s => s.status === 'Active' || s.status === 'Paused');
    if (!activeSubs || activeSubs.length === 0) return [];

    const getLocalDateISO = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const now = new Date();
    const todayObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayISO = getLocalDateISO(todayObj);

    const targetParts = targetDateISO.split('-');
    const targetObj = new Date(Number(targetParts[0]), Number(targetParts[1]) - 1, Number(targetParts[2]));
    const targetFormatted = targetObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const tomorrowObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowISO = getLocalDateISO(tomorrowObj);

    let labelPrefix = targetFormatted;
    if (targetDateISO === todayISO) labelPrefix = `Today, ${targetFormatted}`;
    else if (targetDateISO === tomorrowISO) labelPrefix = `Tomorrow, ${targetFormatted}`;
    const fullDeliveryDate = `${labelPrefix} (${targetDateISO})`;

    const breakfastVarieties = [
      'Chef Breakfast',
      'Protein Oatmeal & Fresh Berries',
      'Scrambled Eggs & Sourdough Toast',
      'Greek Yogurt Protein Parfait',
      'Avocado Spinach Egg Omelette',
      'Chia Seed High-Protein Pudding',
      'Whole Grain High-Protein Toast'
    ];
    const lunchVarieties = [
      'Power Lunch',
      'Grilled Herb Chicken & Quinoa',
      'Pan-Seared Salmon Teriyaki Bowl',
      'Lean Beef Steak Strips & Steamed Greens',
      'Mediterranean Chickpea & Grain Bowl',
      'Lemon Herb Roasted Chicken Breast',
      'High-Protein Tofu & Avocado Crunch Bowl'
    ];
    const dinnerVarieties = [
      'Balanced Dinner',
      'Roasted Salmon & Steamed Asparagus',
      'Herb Crusted Grilled Chicken Breast',
      'Pan-Seared Protein Medallions & Sweet Potato',
      'Low-Carb Zucchini & Ricotta Lasagna',
      'Hearty Grilled Steak Salad',
      'Garlic Basil Chicken with Brown Rice'
    ];

    const projected: AdminOrder[] = [];

    for (const sub of activeSubs) {
      const cleanId = (sub.id || '').replace(/^SUB-/, '') || 'SUB';
      const mealsPerDay = parseInt(sub.mealsPerDay as any) || 3;
      const slot = (sub.slot || 'all').toLowerCase();
      const durationDays = Number(sub.durationDays) || 7;
      const perMealCost = Math.round(Number(sub.totalPrice || 0) / (durationDays * mealsPerDay)) || 150;

      let slotsToGenerate: Array<{
        suffix: string;
        type: 'Breakfast' | 'Lunch' | 'Dinner';
        time: string;
      }> = [];

      if (mealsPerDay === 3 || slot === 'all') {
        slotsToGenerate.push(
          { suffix: 'B', type: 'Breakfast', time: '07:30 AM - 08:30 AM' },
          { suffix: 'L', type: 'Lunch', time: '12:00 PM - 01:00 PM' },
          { suffix: 'D', type: 'Dinner', time: '07:30 PM - 08:30 PM' }
        );
      } else if (mealsPerDay === 2) {
        if (slot.includes('dinner')) {
          slotsToGenerate.push(
            { suffix: 'L', type: 'Lunch', time: '12:00 PM - 01:00 PM' },
            { suffix: 'D', type: 'Dinner', time: '07:30 PM - 08:30 PM' }
          );
        } else {
          slotsToGenerate.push(
            { suffix: 'B', type: 'Breakfast', time: '07:30 AM - 08:30 AM' },
            { suffix: 'L', type: 'Lunch', time: '12:00 PM - 01:00 PM' }
          );
        }
      } else {
        if (slot.includes('breakfast')) {
          slotsToGenerate.push({ suffix: 'B', type: 'Breakfast', time: '07:30 AM - 08:30 AM' });
        } else if (slot.includes('dinner')) {
          slotsToGenerate.push({ suffix: 'D', type: 'Dinner', time: '07:30 PM - 08:30 PM' });
        } else {
          slotsToGenerate.push({ suffix: 'L', type: 'Lunch', time: '12:00 PM - 01:00 PM' });
        }
      }

      let subStartDate = new Date(todayObj);
      if (sub.startDate) {
        const cleanStart = String(sub.startDate).split('T')[0];
        const parts = cleanStart.split('-');
        if (parts.length === 3) {
          subStartDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        } else {
          const parsed = new Date(sub.startDate);
          if (!isNaN(parsed.getTime())) {
            subStartDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
          }
        }
      }

      // Check if target date is skipped
      const isSkipped = isDateSkipped(sub.skippedDates, targetDateISO);
      if (isSkipped) continue;

      if (sub.pauseStartDate && sub.pauseEndDate) {
        const pStart = new Date(sub.pauseStartDate);
        const pEnd = new Date(sub.pauseEndDate);
        if (!isNaN(pStart.getTime()) && !isNaN(pEnd.getTime())) {
          if (targetObj >= pStart && targetObj <= pEnd) continue;
        }
      }

      const diffDays = Math.round((targetObj.getTime() - subStartDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0 || diffDays >= durationDays) {
        // Outside subscription duration
        continue;
      }

      const dayIdx = diffDays;
      const dateSlug = targetDateISO.replace(/-/g, '');

      for (const s of slotsToGenerate) {
        const mealTitle = s.type === 'Breakfast'
          ? `${sub.planTitle} - ${breakfastVarieties[dayIdx % breakfastVarieties.length]}`
          : s.type === 'Lunch'
          ? `${sub.planTitle} - ${lunchVarieties[dayIdx % lunchVarieties.length]}`
          : `${sub.planTitle} - ${dinnerVarieties[dayIdx % dinnerVarieties.length]}`;

        projected.push({
          id: `ORD-${cleanId}-${dateSlug}-${s.suffix}`,
          subscriptionId: sub.id,
          customerName: sub.customerName,
          customerPhone: sub.customerPhone,
          planTitle: sub.planTitle,
          mealName: mealTitle,
          mealType: s.type,
          deliveryDate: fullDeliveryDate,
          deliveryTimeSlot: s.time,
          address: sub.address || 'Address on file',
          coordinates: sub.coordinates,
          status: 'Preparing',
          amount: perMealCost,
          paymentMethod: 'Online / Subscription',
          allergies: Array.isArray(sub.allergies) ? sub.allergies : []
        });
      }
    }

    return projected;
  } catch (e) {
    console.error('Error projecting orders for date:', e);
    return [];
  }
}

export function getAdminSales(): any[] {
  try {
    const raw = localStorage.getItem('shift24_admin_sales');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const subs = getAdminSubscriptions();
        const validSubIds = new Set(subs.map(s => s.id || (s as any).subId));
        return parsed.filter(s => {
          if (isDummyCustomer(s)) return false;
          if (s.source === 'Subscription' && validSubIds.size > 0) {
            return validSubIds.has(s.linkedId) || validSubIds.has((s.saleId || '').replace(/^INV-/, 'SUB-'));
          }
          return true;
        });
      }
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveAdminSales(sales: any[]) {
  try {
    localStorage.setItem('shift24_admin_sales', JSON.stringify(sales));
  } catch (e) {
    console.error(e);
  }
}

export function getAdminCommissionRate(): number {
  try {
    const raw = localStorage.getItem('shift24_commission_rate');
    if (raw !== null && !isNaN(Number(raw))) {
      return Math.max(0, Number(raw));
    }
  } catch (e) {
    console.error(e);
  }
  return 100; // default ₹100 / day
}

export function saveAdminCommissionRate(rate: number) {
  try {
    const safeRate = Math.max(0, Number(rate) || 0);
    localStorage.setItem('shift24_commission_rate', String(safeRate));
    window.dispatchEvent(new Event('shift24-commission-updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error(e);
  }
}

export function isDummyCustomer(c: any): boolean {
  if (!c) return true;
  const email = (c.email || c.customerEmail || '').toLowerCase().trim();
  const name = (c.name || c.customerName || '').toLowerCase().trim();
  const id = (c.id || c.subId || c._id || '').toString();

  if (['CUST-101', 'CUST-102', 'CUST-103', 'CUST-104', 'CUST-105', 'CUST-972', 'CUST-143', 'SUB-801', 'SUB-802', 'SUB-803', 'SUB-804', 'SUB-805', 'SUB-674', 'SUB-445'].includes(id)) {
    return true;
  }

  const dummyNames = [
    'rahul sharma', 'ananya roy', 'vikram menon', 'pooja iyer', 'karthik nair',
    'aarav sharma', 'alex mercer', 'peter parker',
    'test customer a', 'test customer', 'demo customer', 'shift24 super admin', 'probe customer'
  ];
  if (dummyNames.includes(name) || name.startsWith('test ') || name.startsWith('demo ') || name === 'test' || name === 'demo' || name.includes('probe')) {
    return true;
  }

  const dummyEmails = new Set([
    'rahul.s@example.com', 'ananya.roy@example.com', 'vikram.m@example.com', 
    'pooja.i@example.com', 'karthik.n@example.com', 'test.customer@gmail.com', 
    'aarav@shift24.food', 'alex.mercer@gmail.com', 'peterparkar@gmail.com',
    'user@shift24.food', 'demo@shift24.com', 'admin@shift24.com', 'probe.customer@shift24.food'
  ]);
  if (dummyEmails.has(email)) return true;
  if (email.includes('probe')) return true;
  if (email.endsWith('@example.com') || email.endsWith('@example.net') || email.endsWith('@example.org') || email.endsWith('@test.com') || email.endsWith('@demo.com')) {
    return true;
  }
  if (email.startsWith('test.') || email.startsWith('demo.') || email.startsWith('test_') || email.startsWith('demo_')) {
    return true;
  }

  return false;
}

export function getAdminCustomers(): AdminCustomer[] {
  try {
    const raw = localStorage.getItem('shift24_admin_customers');
    if (raw) {
      const parsed: AdminCustomer[] = JSON.parse(raw);
      const filtered = parsed.filter(c => !isDummyCustomer(c));
      if (filtered.length !== parsed.length) {
        saveAdminCustomers(filtered);
      }
      return filtered;
    }
  } catch (e) {
    console.error(e);
  }
  return INITIAL_CUSTOMERS;
}

export function saveAdminCustomers(customers: AdminCustomer[]) {
  const cleaned = customers.filter(c => !isDummyCustomer(c));
  localStorage.setItem('shift24_admin_customers', JSON.stringify(cleaned));
}

export const getPlanSortRank = (p: any): number => {
  const id = String(p?.id || p?.planId || '').toLowerCase();
  const title = String(p?.title || '').toLowerCase();
  if (id.includes('healthy') || title.includes('healthy')) return 0;
  if (id.includes('loss') || title.includes('loss')) return 1;
  if (id.includes('gain') || title.includes('gain')) return 2;
  if (id.includes('balance') || title.includes('balance') || id.includes('maintain') || title.includes('maintain') || id.includes('scale')) return 3;
  return Number(p?.order) || 99;
};

export function getAdminPlans(): AdminPlanConfig[] {
  try {
    const raw = localStorage.getItem('shift24_admin_plans');
    if (raw) {
      const parsed: any[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let updated = false;
        const hydrated = parsed.map(plan => {
          let p: any = { ...plan };
          if (!p.id) {
            p.id = p.planId || p._id || 'plan';
            updated = true;
          }
          if (!p.planId) {
            p.planId = p.id;
            updated = true;
          }
          if (!p.subtitle) {
            p.subtitle = 'Customize your daily meal routine and subscription duration. The longer you commit, the more you save.';
            updated = true;
          }
          if (!p.durationOptions || !Array.isArray(p.durationOptions) || p.durationOptions.length === 0) {
            p.durationOptions = DEFAULT_DURATION_OPTIONS;
            updated = true;
          }
          if (!p.mealOptions || !Array.isArray(p.mealOptions) || p.mealOptions.length === 0) {
            p.mealOptions = DEFAULT_MEAL_OPTIONS;
            updated = true;
          } else {
            p.mealOptions = p.mealOptions.map((m: any) => ({
              ...m,
              multiplier: (typeof m?.multiplier === 'number' && m.multiplier > 0)
                ? (m.id === '1' && m.multiplier >= 0.9 ? 0.40 : m.id === '2' && (m.multiplier >= 0.95 || m.multiplier < 0.3) ? 0.72 : m.multiplier)
                : (m?.id === '1' ? 0.40 : m?.id === '2' ? 0.72 : 1.00)
            }));
          }
          if (p.active === undefined) {
            p.active = true;
            updated = true;
          }
          if (p.dailyCommission === undefined) {
            p.dailyCommission = 100;
            updated = true;
          }
          return p as AdminPlanConfig;
        });

        hydrated.forEach((p) => {
          p.order = getPlanSortRank(p);
        });

        hydrated.sort((a, b) => getPlanSortRank(a) - getPlanSortRank(b));

        if (updated) {
          saveAdminPlans(hydrated);
        }
        return hydrated;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return INITIAL_PLANS;
}

export function saveAdminPlans(plans: AdminPlanConfig[]) {
  try {
    const normalized = plans.map(p => {
      const id = p.id || (p as any).planId || (p as any)._id || 'plan';
      return {
        ...p,
        id,
        planId: id
      };
    });
    localStorage.setItem('shift24_admin_plans', JSON.stringify(normalized));
    window.dispatchEvent(new Event('shift24-plans-updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error(e);
  }
}

export interface MicroNutrient {
  name: string;
  amount: string;
}

export interface IngredientItem {
  name: string;
  quantity: string;
  price: number;
}

export interface FoodItem {
  id?: string;
  _id?: string;
  planId: string;
  day: number;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  name: string;
  calories: string;
  description?: string;
  protein: string;
  carbs: string;
  fat: string;
  benefits?: string[];
  image?: string;
  microNutrients?: MicroNutrient[];
  ingredients?: IngredientItem[];
}

export const DEFAULT_INITIAL_FOODS: FoodItem[] = [
  // --- WEIGHT LOSS PLAN ---
  { planId: 'weight-loss', day: 1, mealType: 'breakfast', name: 'Spinach & Egg White Omelet', calories: '280 kcal', protein: '26g', carbs: '6g', fat: '14g', description: 'Fresh organic spinach, 3 egg whites, mushrooms, and microgreens.', benefits: ['Low Carb', 'High Protein', 'Lean Calorie'], image: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&q=80&w=600' },
  { planId: 'weight-loss', day: 1, mealType: 'lunch', name: 'Zucchini Noodle Turkey Bowl', calories: '390 kcal', protein: '38g', carbs: '15g', fat: '12g', description: 'Spiralized fresh zucchini with lean seasoned ground turkey breast.', benefits: ['Keto Friendly', 'Metabolism Boost'], image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&q=80&w=600' },
  { planId: 'weight-loss', day: 1, mealType: 'dinner', name: 'Pan-Seared Lemon Cod & Asparagus', calories: '340 kcal', protein: '40g', carbs: '12g', fat: '8g', description: 'Wild Atlantic cod fillet, steamed asparagus spears, herb vinaigrette.', benefits: ['Ultra Lean', 'Rich in Selenium'], image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=600' },

  { planId: 'weight-loss', day: 2, mealType: 'breakfast', name: 'Greek Yogurt & Chia Crunch', calories: '290 kcal', protein: '24g', carbs: '20g', fat: '8g', description: 'Zero-fat Greek yogurt, soaked chia seeds, fresh raspberries.', benefits: ['Gut Health', 'Antioxidants'], image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=600' },
  { planId: 'weight-loss', day: 2, mealType: 'lunch', name: 'Grilled Herb Chicken Breast & Greens', calories: '410 kcal', protein: '42g', carbs: '10g', fat: '14g', description: 'Char-grilled chicken breast, baby spinach, cucumbers, olive oil drizzle.', benefits: ['High Satiety', 'Low Glycemic'], image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600' },
  { planId: 'weight-loss', day: 2, mealType: 'dinner', name: 'Baked Salmon with Steamed Broccoli', calories: '380 kcal', protein: '35g', carbs: '8g', fat: '18g', description: 'Wild salmon fillet with garlic steamed florets.', benefits: ['Omega-3 Rich', 'Cardio Support'], image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600' },

  // --- BALANCE WEIGHT PLAN ---
  { planId: 'balance', day: 1, mealType: 'breakfast', name: 'Oatmeal with Berries & Walnuts', calories: '350 kcal', protein: '14g', carbs: '52g', fat: '10g', description: 'Rolled oats, almond milk, fresh mixed blueberries and crushed walnuts.', benefits: ['Sustained Energy', 'Heart Healthy'], image: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&q=80&w=600' },
  { planId: 'balance', day: 1, mealType: 'lunch', name: 'Grilled Chicken Quinoa Bowl', calories: '550 kcal', protein: '45g', carbs: '42g', fat: '15g', description: 'Marinated chicken breast, tricolor quinoa, roasted bell peppers.', benefits: ['Balanced Macros', 'Complete Protein'], image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600' },
  { planId: 'balance', day: 1, mealType: 'dinner', name: 'Baked Salmon with Sweet Potato Mash', calories: '480 kcal', protein: '36g', carbs: '32g', fat: '20g', description: 'Wild salmon, roasted garlic sweet potato puree, steamed greens.', benefits: ['Clean Carb Fuel', 'Anti-Inflammatory'], image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600' },

  { planId: 'balance', day: 2, mealType: 'breakfast', name: 'Artisan Avocado Sourdough Toast & Poached Egg', calories: '400 kcal', protein: '18g', carbs: '36g', fat: '22g', description: 'Toasted organic sourdough, seasoned mashed avocado, soft poached egg.', benefits: ['Healthy Fats', 'Brain Fuel'], image: 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?auto=format&fit=crop&q=80&w=600' },
  { planId: 'balance', day: 2, mealType: 'lunch', name: 'Mediterranean Lentil & Feta Salad', calories: '480 kcal', protein: '22g', carbs: '54g', fat: '16g', description: 'Sprouted brown lentils, cherry tomatoes, cucumbers, crumbled sheep feta.', benefits: ['Fiber Rich', 'Steady Digestion'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600' },
  { planId: 'balance', day: 2, mealType: 'dinner', name: 'Turkey Meatballs with Herb Basmati Rice', calories: '490 kcal', protein: '40g', carbs: '45g', fat: '14g', description: 'Herbed lean turkey meatballs in vine-ripened marinara with fragrant basmati.', benefits: ['Muscle Recovery', 'Vitamins B6 & B12'], image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&q=80&w=600' },

  // --- WEIGHT GAIN PLAN ---
  { planId: 'weight-gain', day: 1, mealType: 'breakfast', name: 'Peanut Butter Banana Protein Pancakes', calories: '620 kcal', protein: '42g', carbs: '75g', fat: '18g', description: 'Oat whey pancakes stacked with sliced banana, natural peanut butter, pure honey.', benefits: ['High Calorie Surplus', 'Rapid Anabolic Fuel'], image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&q=80&w=600' },
  { planId: 'weight-gain', day: 1, mealType: 'lunch', name: 'Double Steak & Sweet Potato Mash Bowl', calories: '750 kcal', protein: '55g', carbs: '70g', fat: '26g', description: 'Grass-fed sirloin strips, roasted spiced sweet potatoes, sliced avocado, black beans.', benefits: ['Creatine & Iron Rich', 'Mass Building'], image: 'https://images.unsplash.com/photo-1544025162-8111f4a7a0a0?auto=format&fit=crop&q=80&w=600' },
  { planId: 'weight-gain', day: 1, mealType: 'dinner', name: 'Creamy Garlic Butter Salmon & Jasmine Rice', calories: '720 kcal', protein: '48g', carbs: '65g', fat: '28g', description: 'Double wild salmon fillet, aromatic jasmine rice, sautéed garlic spinach.', benefits: ['High Dense Energy', 'Deep Recovery'], image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600' },

  { planId: 'weight-gain', day: 2, mealType: 'breakfast', name: 'Egg & Avocado Loaded Power Bagel', calories: '580 kcal', protein: '34g', carbs: '58g', fat: '24g', description: 'Whole multigrain bagel, 3 fluffy eggs, melted aged cheddar, ripe avocado.', benefits: ['Strength Fuel', 'High Macro Density'], image: 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?auto=format&fit=crop&q=80&w=600' },
  { planId: 'weight-gain', day: 2, mealType: 'lunch', name: 'Teriyaki Chicken Rice Bowl with Roasted Cashews', calories: '740 kcal', protein: '52g', carbs: '80g', fat: '22g', description: 'Generous grilled chicken, housemade teriyaki glaze, sticky rice, toasted cashew nuts.', benefits: ['Complex Glycogen Load', 'Muscle Synthesis'], image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600' },
  { planId: 'weight-gain', day: 2, mealType: 'dinner', name: 'Herb Roasted Beef Sirloin & Butter Mash', calories: '710 kcal', protein: '54g', carbs: '55g', fat: '28g', description: 'Tender beef sirloin steak, real butter mashed potatoes, roasted baby carrots.', benefits: ['Heavy Iron Fuel', 'Night Growth'], image: 'https://images.unsplash.com/photo-1544025162-8111f4a7a0a0?auto=format&fit=crop&q=80&w=600' }
];

export function getAdminFoods(): FoodItem[] {
  try {
    const raw = localStorage.getItem('shift24_admin_foods');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_INITIAL_FOODS;
}

export function saveAdminFoods(foods: FoodItem[]) {
  try {
    localStorage.setItem('shift24_admin_foods', JSON.stringify(foods));
    window.dispatchEvent(new Event('shift24-foods-updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error(e);
  }
}

// ---------------------------------------------------------------------------
// Cloud Kitchen Settings
// ---------------------------------------------------------------------------

export interface KitchenSettings {
  kitchenName: string;
  address: string;
  email: string;
  phone: string;
  latitude: number;
  longitude: number;
  operatingHours?: string;
  deliveryRadiusKm?: number;
}

export const DEFAULT_KITCHEN_SETTINGS: KitchenSettings = {
  kitchenName: 'Shift24 Cloud Kitchen',
  address: 'Infopark Expressway, Kakkanad, Kochi, Kerala 682042',
  email: 'kitchen@shift24.food',
  phone: '+91 98470 12345',
  latitude: 10.01586,
  longitude: 76.36306,
  operatingHours: '06:00 AM - 10:30 PM',
  deliveryRadiusKm: 25
};

export function getAdminKitchenSettings(): KitchenSettings {
  try {
    const raw = localStorage.getItem('shift24_kitchen_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_KITCHEN_SETTINGS,
        ...parsed,
        latitude: typeof parsed.latitude === 'number' && !isNaN(parsed.latitude) ? parsed.latitude : DEFAULT_KITCHEN_SETTINGS.latitude,
        longitude: typeof parsed.longitude === 'number' && !isNaN(parsed.longitude) ? parsed.longitude : DEFAULT_KITCHEN_SETTINGS.longitude
      };
    }
  } catch {}
  return { ...DEFAULT_KITCHEN_SETTINGS };
}

export function saveAdminKitchenSettings(settings: KitchenSettings): void {
  try {
    localStorage.setItem('shift24_kitchen_settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('shift24-kitchen-settings-updated'));
  } catch (e) {
    console.error('Failed to save kitchen settings locally:', e);
  }
}



export interface SubscriptionStatusSummary {
  targetDateISO: string;
  activeCount: number;
  skippedSubscriptions: Array<{
    subId: string;
    customerName: string;
    customerPhone?: string;
    planTitle?: string;
    skippedDate: string;
    reason: string;
  }>;
  pausedSubscriptions: Array<{
    subId: string;
    customerName: string;
    customerPhone?: string;
    planTitle?: string;
    pauseStartDate?: string;
    pauseEndDate?: string;
    reason: string;
  }>;
}

export function getSubscriptionDispatchSummary(targetDateISO?: string, subs?: AdminSubscription[]): SubscriptionStatusSummary {
  const subscriptions = subs || getAdminSubscriptions();
  const dateISO = targetDateISO || new Date().toISOString().split('T')[0];

  const skippedSubscriptions: SubscriptionStatusSummary['skippedSubscriptions'] = [];
  const pausedSubscriptions: SubscriptionStatusSummary['pausedSubscriptions'] = [];
  let activeCount = 0;

  for (const s of subscriptions) {
    const subId = s.id || (s as any).subId || 'SUB';
    if (s.status === 'Paused') {
      const pStart = s.pauseStartDate ? String(s.pauseStartDate).split('T')[0] : '';
      const pEnd = s.pauseEndDate ? String(s.pauseEndDate).split('T')[0] : '';
      pausedSubscriptions.push({
        subId,
        customerName: s.customerName || 'Customer',
        customerPhone: s.customerPhone,
        planTitle: s.planTitle,
        pauseStartDate: pStart || undefined,
        pauseEndDate: pEnd || undefined,
        reason: pStart && pEnd ? `Paused from ${pStart} until ${pEnd}` : pStart ? `Paused starting ${pStart}` : 'Subscription is currently paused'
      });
      continue;
    }

    if (s.status === 'Active') {
      if (s.pauseStartDate) {
        const pStartISO = String(s.pauseStartDate).trim().split('T')[0];
        const pEndISO = s.pauseEndDate ? String(s.pauseEndDate).trim().split('T')[0] : null;
        const isPaused = pEndISO ? (dateISO >= pStartISO && dateISO <= pEndISO) : (dateISO >= pStartISO);
        if (isPaused) {
          pausedSubscriptions.push({
            subId,
            customerName: s.customerName || 'Customer',
            customerPhone: s.customerPhone,
            planTitle: s.planTitle,
            pauseStartDate: pStartISO,
            pauseEndDate: pEndISO || undefined,
            reason: pEndISO ? `Paused from ${pStartISO} until ${pEndISO}` : `Paused starting ${pStartISO}`
          });
          continue;
        }
      }

      const slots = ['Breakfast', 'Lunch', 'Dinner'] as const;
      const isFullDaySkipped = isDateSkipped(s.skippedDates, dateISO);
      if (isFullDaySkipped) {
        skippedSubscriptions.push({
          subId,
          customerName: s.customerName || 'Customer',
          customerPhone: s.customerPhone,
          planTitle: s.planTitle,
          skippedDate: dateISO,
          reason: `All meals opted out by customer (${dateISO})`
        });
        continue;
      }

      // Check slot-level skips
      const skippedMealSlots: string[] = [];
      for (const slot of slots) {
        if (isMealSkipped(s.skippedDates, s.skippedMeals, dateISO, slot)) {
          skippedMealSlots.push(slot);
        }
      }
      if (skippedMealSlots.length > 0) {
        skippedSubscriptions.push({
          subId,
          customerName: s.customerName || 'Customer',
          customerPhone: s.customerPhone,
          planTitle: s.planTitle,
          skippedDate: dateISO,
          reason: `Skipped: ${skippedMealSlots.join(', ')} (${dateISO})`
        });
      }

      activeCount++;
    }
  }

  return {
    targetDateISO: dateISO,
    activeCount,
    skippedSubscriptions,
    pausedSubscriptions
  };
}
