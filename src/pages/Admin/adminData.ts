export interface AdminSubscription {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  planId: 'weight-loss' | 'balance' | 'weight-gain';
  planTitle: string;
  duration: string;
  durationDays: number;
  mealsPerDay: '1' | '2' | '3';
  slot: string;
  slotLabel: string;
  totalPrice: number;
  status: 'Active' | 'Paused' | 'Cancelled' | 'Completed';
  startDate: string;
  endDate: string;
  nextDelivery: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  allergies: string[];
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
  status: 'Pending' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  amount: number;
  paymentMethod: string;
  allergies: string[];
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
  customPrice?: number;
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
    description: 'Taste-test our chef-prepared meals for a day.',
    discount: 0,
    popular: false,
    badge: '',
    features: ['{meal_count} Meals daily', 'Free daily delivery', '{plan_title} macros']
  },
  {
    id: '7-day',
    title: '7 Day Plan',
    days: 7,
    description: 'Perfect for trying us out.',
    discount: 0,
    popular: false,
    badge: '',
    features: ['{meal_count} Meals daily', 'Free daily delivery', '{plan_title} macros']
  },
  {
    id: '15-day',
    title: '15 Day Plan',
    days: 15,
    description: 'Build healthy habits over two weeks.',
    discount: 5,
    popular: true,
    badge: 'MOST POPULAR',
    features: ['{meal_count} Meals daily', 'Free daily delivery', '{plan_title} macros']
  },
  {
    id: '30-day',
    title: '30 Day Plan',
    days: 30,
    description: 'Commit to your goals and save more.',
    discount: 10,
    popular: false,
    badge: '',
    features: ['{meal_count} Meals daily', 'Free daily delivery', '{plan_title} macros']
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
    id: 'weight-loss',
    title: 'Weight Loss',
    subtitle: 'Customize your daily meal routine and subscription duration. The longer you commit, the more you save.',
    description: 'Calorie-controlled, nutrient-dense meals designed to help you shed pounds safely.',
    pricePerWeek: 3000,
    calories: '1200 - 1500 kcal/day',
    benefits: ['High protein', 'Low carb', 'Metabolism boosting'],
    durationOptions: DEFAULT_DURATION_OPTIONS,
    mealOptions: DEFAULT_MEAL_OPTIONS,
    active: true,
    popular: false,
    order: 1,
    dailyCommission: 100,
  },
  {
    id: 'weight-gain',
    title: 'Weight Gain',
    subtitle: 'Customize your daily meal routine and subscription duration. The longer you commit, the more you save.',
    description: 'Calorie-surplus, high-protein meals for muscle building and healthy weight gain.',
    pricePerWeek: 3500,
    calories: '2500 - 3000 kcal/day',
    benefits: ['High protein', 'Complex carbs', 'Muscle recovery'],
    durationOptions: DEFAULT_DURATION_OPTIONS,
    mealOptions: DEFAULT_MEAL_OPTIONS,
    active: true,
    popular: false,
    order: 2,
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
    popular: true,
    badge: 'MOST POPULAR',
    order: 3,
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

export function getAdminSales(): any[] {
  try {
    const raw = localStorage.getItem('shift24_admin_sales');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
          }
          if (p.dailyCommission === undefined) {
            p.dailyCommission = 100;
            updated = true;
          }
          return p as AdminPlanConfig;
        });

        const hasExplicitPopular = hydrated.some(p => p.popular === true);

        hydrated.forEach((p, idx) => {
          p.order = getPlanSortRank(p);
          if (!hasExplicitPopular && (p.id?.includes('balance') || (p as any).planId?.includes('balance'))) {
            p.popular = true;
            p.badge = p.badge || 'MOST POPULAR';
            updated = true;
          }
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
