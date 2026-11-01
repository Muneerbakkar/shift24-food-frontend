import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, ArrowRight, ArrowLeft, Coffee, Sun, Moon,
  Calendar, UtensilsCrossed, Scale, Sparkles, ChefHat, Eye, Plus
} from 'lucide-react';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  getAdminPlans, 
  saveAdminPlans,
  AdminPlanConfig, 
  IDurationOption, 
  DEFAULT_DURATION_OPTIONS, 
  DEFAULT_MEAL_OPTIONS,
  FoodItem,
  getAdminFoods,
  saveAdminFoods,
  getPlanSortRank
} from '../../pages/Admin/adminData';
import { fetchPlans, fetchWeeklyMenu } from '../../services/api';

export type MealCount = '1' | '2' | '3';
export type SingleMealSlot = 'breakfast' | 'lunch' | 'dinner';
export type TwoMealSlot = 'breakfast-lunch' | 'lunch-dinner' | 'breakfast-dinner';
export type MealSlot = SingleMealSlot | TwoMealSlot | 'all';

export const MEAL_MULTIPLIERS: Record<MealCount, number> = {
  '1': 0.40,
  '2': 0.72,
  '3': 1.00,
};

export const twoMealLabels: Record<TwoMealSlot, string> = {
  'breakfast-lunch': 'Breakfast & Lunch',
  'lunch-dinner': 'Lunch & Dinner',
  'breakfast-dinner': 'Breakfast & Dinner',
};

function formatFoodItem(item: any, planId: string) {
  return {
    id: item._id || item.id,
    day: Number(item.day) || 1,
    mealType: item.mealType,
    name: item.name,
    cals: item.calories || '450 kcal',
    desc: item.description || `${item.name} prepared fresh according to your ${planId} targets.`,
    image: item.image || '',
    benefits: item.benefits && item.benefits.length > 0 ? item.benefits : ['Chef crafted', 'Balanced nutrition', 'High quality ingredients'],
    macros: {
      protein: item.protein || '25g',
      carbs: item.carbs || '40g',
      fat: item.fat || '15g',
      fiber: item.fiber || ''
    },
    micros: (item.microNutrients && item.microNutrients.length > 0)
      ? item.microNutrients
          .map((m: any) => {
            if (typeof m === 'string') return m.trim();
            const name = String(m?.name || '').trim();
            const amount = String(m?.amount || '').trim();
            if (!name) return '';
            // Only show "(value)" when an amount was actually entered.
            return amount ? `${name} (${amount})` : name;
          })
          .filter(Boolean)
      : [],
    ingredients: item.ingredients || [],
    images: Array.isArray(item.images) ? item.images.filter(Boolean) : []
  };
}

export function getFoodForPlanAndDay(planId: string, day: number, mealType: 'breakfast' | 'lunch' | 'dinner', customFoods?: any[]) {
  const foods = customFoods && customFoods.length > 0 ? customFoods : getAdminFoods();
  const normalizedPlanId = (planId || 'healthy-food').trim().toLowerCase();
  const normalizedMealType = (mealType || '').trim().toLowerCase();

  // Helper to match plan IDs
  const matchPlan = (fPlan: string) => {
    const p = fPlan.toLowerCase().trim();
    return p === normalizedPlanId || p === 'all' || 
      (normalizedPlanId === 'healthy-food' && (p === 'balance' || p === 'healthy_food')) || 
      (normalizedPlanId === 'balance' && (p === 'healthy-food' || p === 'healthy_food'));
  };

  // 1. Direct match for exact plan, day, mealType
  const exactMatch = foods.find(f => {
    const fPlan = (f.planId || (f as any).id || '').trim().toLowerCase();
    const fMeal = (f.mealType || '').trim().toLowerCase();
    return matchPlan(fPlan) && Number(f.day) === Number(day) && fMeal === normalizedMealType;
  });
  if (exactMatch) {
    return formatFoodItem(exactMatch, planId);
  }

  // 2. Cycle through other scheduled days for this plan & mealType
  const planFoods = foods.filter(f => {
    const fPlan = (f.planId || (f as any).id || '').trim().toLowerCase();
    const fMeal = (f.mealType || '').trim().toLowerCase();
    return matchPlan(fPlan) && fMeal === normalizedMealType;
  }).sort((a, b) => Number(a.day) - Number(b.day));

  if (planFoods.length > 0) {
    const cycleMatch = planFoods[(day - 1) % planFoods.length];
    return formatFoodItem(cycleMatch, planId);
  }

  // 3. Fallback to any food matching mealType across catalog
  const mealTypeFoods = foods.filter(f => {
    const fMeal = (f.mealType || '').trim().toLowerCase();
    return fMeal === normalizedMealType;
  }).sort((a, b) => Number(a.day) - Number(b.day));

  if (mealTypeFoods.length > 0) {
    const cycleMatch = mealTypeFoods[(day - 1) % mealTypeFoods.length];
    return formatFoodItem(cycleMatch, planId);
  }

  // 4. Clean chef-curated fallback
  return {
    name: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Special`,
    cals: '450 kcal',
    desc: `Chef-crafted fresh meal tailored for the ${planId} plan.`,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
    benefits: ['Chef Crafted', 'Balanced Nutrition', 'High Quality Ingredients'],
    macros: { protein: '30g', carbs: '40g', fat: '15g', fiber: '' },
    micros: ['Iron', 'Potassium', 'Vitamin C'],
    ingredients: []
  };
}

export function SubscriptionPlan() {
  const { planId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [plansList, setPlansList] = useState<AdminPlanConfig[]>(() => getAdminPlans());

  useEffect(() => {
    const handleUpdate = () => {
      setPlansList(getAdminPlans());
    };
    window.addEventListener('shift24-plans-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Fetch from backend API to ensure latest data
    fetchPlans().then(res => {
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        const rawLocal = localStorage.getItem('shift24_admin_plans');
        if (rawLocal && res.fallback) {
          return;
        }
        const formatted = res.data.map((p: any) => ({
          ...p,
          id: p.id || p.planId || p._id
        }));
        saveAdminPlans(formatted);
      }
    }).catch(() => {});

    return () => {
      window.removeEventListener('shift24-plans-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const adminPlan = plansList.find(p => p.id === planId || (p as any).planId === planId) || plansList[0];
  const fallbackId = adminPlan?.id || (adminPlan as any)?.planId || planId || 'balance';

  const plan = {
    id: fallbackId,
    title: adminPlan?.title || 'Healthy Meal Plan',
    subtitle: adminPlan?.subtitle || 'Customize your daily meal routine and subscription duration. The longer you commit, the more you save.',
    pricePerWeek: adminPlan?.pricePerWeek || 2800,
    calories: adminPlan?.calories || '1800 - 2000 kcal/day',
    description: adminPlan?.description || 'Personalized chef-crafted nutrition program.',
    durationOptions: (adminPlan?.durationOptions && adminPlan.durationOptions.length > 0)
      ? adminPlan.durationOptions
      : DEFAULT_DURATION_OPTIONS,
    mealOptions: (adminPlan?.mealOptions && adminPlan.mealOptions.length > 0)
      ? adminPlan.mealOptions
      : DEFAULT_MEAL_OPTIONS
  };

  const [mealsPerDay, setMealsPerDay] = useState<MealCount>(
    (searchParams.get('meals') as MealCount) || '3'
  );
  const initialSlot = searchParams.get('slot');
  const [singleSlot, setSingleSlot] = useState<SingleMealSlot>(
    initialSlot === 'breakfast' || initialSlot === 'dinner' ? initialSlot : 'lunch'
  );
  const [twoSlot, setTwoSlot] = useState<TwoMealSlot>(
    initialSlot === 'breakfast-lunch' || initialSlot === 'breakfast-dinner' ? initialSlot : 'lunch-dinner'
  );

  const activeSlot = mealsPerDay === '1' ? singleSlot : mealsPerDay === '2' ? twoSlot : 'all';

  const handleSelectPlan = (durationId: string) => {
    navigate(`/plan/${plan.id}/menu/${durationId}?meals=${mealsPerDay}&slot=${activeSlot}`);
  };

  const subscriptionOptions = (plan.durationOptions || []).slice().sort((a, b) => (Number(a.days) || 0) - (Number(b.days) || 0));

  const getMealMultiplier = (mId: string): number => {
    const found = plan.mealOptions.find(m => m.id === mId);
    if (found && typeof found.multiplier === 'number' && found.multiplier > 0) {
      if (mId === '1' && found.multiplier >= 0.9) return 0.40;
      if (mId === '2' && (found.multiplier >= 0.95 || found.multiplier < 0.3)) return 0.72;
      return found.multiplier;
    }
    return MEAL_MULTIPLIERS[mId as MealCount] || (mId === '1' ? 0.40 : mId === '2' ? 0.72 : 1.00);
  };

  const currentMultiplier = getMealMultiplier(mealsPerDay);

  const calculatePrice = (option: IDurationOption) => {
    const currentSlot = mealsPerDay === '1' ? singleSlot : mealsPerDay === '2' ? twoSlot : undefined;

    // 1. Explicit slot price configured on THIS card
    if (currentSlot && option.slotPrices && (option.slotPrices as any)[currentSlot] && (option.slotPrices as any)[currentSlot] > 0) {
      return (option.slotPrices as any)[currentSlot];
    }

    // 2. Proportional slot price inherited from 1-day trial / daily slot rates
    if (currentSlot) {
      const oneDayOption = subscriptionOptions.find(o => Number(o.days) === 1);
      const oneDaySlotPrice = oneDayOption?.slotPrices && (oneDayOption.slotPrices as any)[currentSlot];
      if (oneDaySlotPrice && Number(oneDaySlotPrice) > 0) {
        return Math.round(Number(oneDaySlotPrice) * option.days * (1 - (option.discount || 0) / 100));
      }
    }

    // 3. Explicit meal-count price configured on THIS card
    if (option.prices && option.prices[mealsPerDay] && option.prices[mealsPerDay]! > 0) {
      if (mealsPerDay === '3' && option.discount && option.discount > 0) {
        return Math.round(option.prices[mealsPerDay]! * (1 - option.discount / 100));
      }
      return option.prices[mealsPerDay]!;
    }

    // 4. Proportional meal-count price inherited from 1-day trial
    if (mealsPerDay !== '3') {
      const oneDayOption = subscriptionOptions.find(o => Number(o.days) === 1);
      const oneDayMealPrice = oneDayOption?.prices?.[mealsPerDay];
      if (oneDayMealPrice && Number(oneDayMealPrice) > 0) {
        return Math.round(Number(oneDayMealPrice) * option.days * (1 - (option.discount || 0) / 100));
      }
    }

    // 5. Card base price override scaled by meal multiplier & discount
    const cardPrice = option.price || option.customPrice;
    if (cardPrice && cardPrice > 0) {
      if (mealsPerDay === '3') {
        return Math.round(cardPrice * (1 - (option.discount || 0) / 100));
      }
      return Math.round(cardPrice * currentMultiplier * (1 - (option.discount || 0) / 100));
    }

    // 6. Plan weekly base price scaled by days, multiplier & discount
    const dailyPrice = (plan.pricePerWeek / 7) * currentMultiplier;
    const basePrice = dailyPrice * option.days;
    const finalPrice = basePrice * (1 - (option.discount || 0) / 100);
    return Math.round(finalPrice);
  };

  return (
    <div className="py-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="max-w-6xl mx-auto w-full">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-emerald-600 mb-10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4">{plan.title} Subscription</h1>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
            {plan.subtitle}
          </p>
        </div>

        {/* Meal Configuration Selector */}
        <div className="max-w-2xl mx-auto mb-14 bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Choose Meals Per Day</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {plan.mealOptions.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMealsPerDay(m.id as MealCount)}
                className={`py-3 px-2 rounded-2xl border text-center transition-all ${
                  mealsPerDay === m.id
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:border-emerald-200 hover:bg-white'
                }`}
              >
                <div className="text-sm sm:text-base font-bold">{m.label}</div>
                <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{m.sub}</div>
              </button>
            ))}
          </div>

          {mealsPerDay === '1' && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2 animate-in fade-in duration-300">
              <span className="text-xs font-bold text-slate-500 mr-1">Choose slot:</span>
              {(['breakfast', 'lunch', 'dinner'] as SingleMealSlot[]).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSingleSlot(slot)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all border ${
                    singleSlot === slot
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {slot} {slot === 'lunch' ? '★' : ''}
                </button>
              ))}
            </div>
          )}

          {mealsPerDay === '2' && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2 animate-in fade-in duration-300">
              <span className="text-xs font-bold text-slate-500 mr-1">Choose 2 meals:</span>
              {[
                { id: 'breakfast-lunch' as const, label: 'Breakfast & Lunch' },
                { id: 'lunch-dinner' as const, label: 'Lunch & Dinner', popular: true },
                { id: 'breakfast-dinner' as const, label: 'Breakfast & Dinner' },
              ].map((combo) => (
                <button
                  key={combo.id}
                  type="button"
                  onClick={() => setTwoSlot(combo.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    twoSlot === combo.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {combo.label} {combo.popular ? '★' : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`grid grid-cols-1 ${
          subscriptionOptions.length === 1 
            ? 'max-w-md mx-auto sm:grid-cols-1' 
            : subscriptionOptions.length === 2 
            ? 'max-w-3xl lg:max-w-4xl mx-auto sm:grid-cols-2 gap-8' 
            : subscriptionOptions.length === 3 
            ? 'max-w-5xl lg:max-w-6xl mx-auto sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8' 
            : 'max-w-7xl mx-auto sm:grid-cols-2 lg:grid-cols-4 gap-6'
        } items-stretch pb-12`}>
          {subscriptionOptions.map((option, index) => {
            const price = calculatePrice(option);
            const isFeatured = option.popular;

            const slotSummary = mealsPerDay === '1' 
              ? `1 Meal/day (${singleSlot.charAt(0).toUpperCase() + singleSlot.slice(1)})` 
              : mealsPerDay === '2'
              ? `2 Meals/day (${twoMealLabels[twoSlot] || 'Breakfast & Lunch'})`
              : `${mealsPerDay} Meals daily`;
            
            return (
              <motion.div 
                key={option.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative flex flex-col p-6 rounded-2xl md:rounded-[28px] ${isFeatured ? 'bg-emerald-600 text-white shadow-xl lg:-translate-y-2 z-10' : 'bg-white text-slate-900 border border-slate-200 shadow-sm'}`}
              >
                {isFeatured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-300 text-emerald-900 text-[11px] font-black uppercase tracking-wider py-1 px-3 rounded-full shadow-sm">
                    {option.badge || 'Most Popular'}
                  </div>
                )}
                
                <h3 className={`text-xl font-bold mb-1 ${isFeatured ? 'text-white' : 'text-slate-900'}`}>{option.title}</h3>
                <p className={`text-xs mb-5 min-h-[34px] leading-relaxed ${isFeatured ? 'text-emerald-50' : 'text-slate-500'}`}>{option.description}</p>
                
                <div className="mb-4 flex items-baseline gap-1.5">
                  <span className="text-3xl md:text-4xl font-extrabold">₹{price}</span>
                  <span className={`text-xs font-medium ${isFeatured ? 'text-emerald-200' : 'text-slate-400'}`}>
                    {option.days === 1 ? '/day' : 'total'}
                  </span>
                </div>

                {option.discount > 0 ? (
                  <div className={`inline-block mb-6 px-2.5 py-0.5 rounded-full text-[11px] font-bold w-fit ${isFeatured ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                    Save {option.discount}%
                  </div>
                ) : (
                  <div className="mb-6 h-5"></div>
                )}

                <ul className="space-y-3 mb-8 flex-grow text-xs">
                  {(option.features || ['{meal_count} Meals daily', 'Free daily delivery', '{plan_title} macros']).map((feature, fIdx) => {
                    const resolved = feature
                      .replace('{meal_count} Meals daily', slotSummary)
                      .replace('{meal_count}', mealsPerDay)
                      .replace('{plan_title}', plan.title);

                    return (
                      <li key={fIdx} className="flex items-center gap-2.5">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${isFeatured ? 'text-emerald-300' : 'text-emerald-500'}`} />
                        <span className="font-medium">{resolved}</span>
                      </li>
                    );
                  })}
                </ul>

                <button 
                  onClick={() => handleSelectPlan(option.id)}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${isFeatured ? 'bg-white text-emerald-700 hover:bg-slate-50' : 'bg-slate-100 text-slate-800 hover:bg-emerald-50 hover:text-emerald-600'}`}
                >
                  Select Plan <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PlanMenu() {
  const { planId, durationId: routeDurationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [adminPlans, setAdminPlans] = useState<AdminPlanConfig[]>(() => getAdminPlans());
  const [dbFoods, setDbFoods] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('shift24_admin_foods');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [activeDurationId, setActiveDurationId] = useState<string>(routeDurationId || '7-day');

  const plan = adminPlans.find(p => p.id === planId || (p as any).planId === planId) || adminPlans[0] || {
    id: planId || 'healthy-food',
    title: 'Balanced Healthy Meals',
    description: 'Custom nutrition plan'
  };
  const resolvedPlanId = plan.id || (plan as any).planId || 'healthy-food';

  useEffect(() => {
    let isMounted = true;
    const sync = () => {
      setAdminPlans(getAdminPlans());
    };
    window.addEventListener('shift24-plans-updated', sync);
    window.addEventListener('shift24-foods-updated', sync);
    window.addEventListener('storage', sync);

    // Fetch live from MongoDB menuitems collection - ONLY ACTUAL DATA
    fetchWeeklyMenu().then(res => {
      if (isMounted && res.success && Array.isArray(res.data)) {
        setDbFoods(res.data);
        saveAdminFoods(res.data);
      }
    }).catch(err => {
      console.warn('Failed to load menuitems from database:', err);
    }).finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      window.removeEventListener('shift24-plans-updated', sync);
      window.removeEventListener('shift24-foods-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, [resolvedPlanId]);

  const mealsParam = (searchParams.get('meals') as MealCount) || '3';
  const slotParam = searchParams.get('slot') || 'lunch';

  const getInitialMealType = (): 'breakfast' | 'lunch' | 'dinner' => {
    if (mealsParam === '1') {
      if (slotParam === 'breakfast' || slotParam === 'dinner') return slotParam;
      return 'lunch';
    }
    if (mealsParam === '2') {
      if (slotParam.includes('breakfast')) return 'breakfast';
      if (slotParam.includes('lunch')) return 'lunch';
      return 'dinner';
    }
    return 'lunch';
  };

  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner'>(getInitialMealType);

  const matchedDuration = (plan as any).durationOptions?.find(
    (d: any) => d.id === activeDurationId || String(d.days) === activeDurationId || d.id === `${activeDurationId}-day`
  );
  const rawParsed = parseInt(activeDurationId?.split('-')[0] || '7', 10);
  const durationDays = (matchedDuration?.days && Number(matchedDuration.days) > 0 && Number(matchedDuration.days) <= 90)
    ? Number(matchedDuration.days)
    : (!isNaN(rawParsed) && rawParsed > 0 && rawParsed <= 90 ? rawParsed : 7);

  // Find all foods in database for this plan - NO DUMMY DATA
  const planDbFoods = dbFoods.filter(f => {
    const p = (f.planId || '').toLowerCase().trim();
    const r = resolvedPlanId.toLowerCase().trim();
    return p === r || p === 'all' || 
      (r === 'healthy-food' && (p === 'balance' || p === 'healthy_food')) || 
      (r === 'balance' && (p === 'healthy-food' || p === 'healthy_food'));
  });

  // Filter only items actually added in the database for the selected meal type, sorted by day
  const displayedMeals = planDbFoods
    .filter(f => (f.mealType || '').toLowerCase().trim() === selectedMealType)
    .sort((a, b) => Number(a.day) - Number(b.day))
    .map(item => formatFoodItem(item, resolvedPlanId));

  const durationOptions = (plan as any).durationOptions || DEFAULT_DURATION_OPTIONS;

  return (
    <div className="py-24 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10">
        <button 
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-emerald-600 mb-10 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Plans
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Your {plan.title} Menu</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Here is a sneak peek at what you'll be eating on the {plan.title} plan.
          </p>

          {/* Duration selector pill buttons */}
          {durationOptions.length > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Preview Duration:</span>
              {durationOptions.map((opt: any) => {
                const isSelected = activeDurationId === opt.id || String(opt.days) === activeDurationId;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setActiveDurationId(opt.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-slate-900 text-white shadow-sm ring-2 ring-emerald-500' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    {opt.title || `${opt.days} Days`}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Meal Type Navigation Tabs */}
        <div className="flex overflow-x-auto gap-4 pb-4 mb-8 justify-center snap-x hide-scrollbar">
          {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => (
            <button
              key={mealType}
              onClick={() => setSelectedMealType(mealType)}
              className={`snap-center shrink-0 px-8 py-3 rounded-full font-bold transition-all capitalize cursor-pointer ${
                selectedMealType === mealType 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {mealType}
            </button>
          ))}
        </div>

        {/* Meals Grid - ONLY ACTUAL DATABASE DATA */}
        {displayedMeals.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto my-8">
            <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 mb-1 capitalize">No {selectedMealType} meals added</h3>
            <p className="text-xs text-slate-500">
              Only items added in the database appear here. No dummy data is displayed.
            </p>
          </div>
        ) : (
          <motion.div 
            key={selectedMealType}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {displayedMeals.map((meal, idx) => {
              const icon = selectedMealType === 'breakfast' ? <Coffee className="w-5 h-5" /> : selectedMealType === 'lunch' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />;
              const color = selectedMealType === 'breakfast' ? 'text-amber-500' : selectedMealType === 'lunch' ? 'text-orange-500' : 'text-indigo-500';

              return (
                <div 
                  key={meal.id || idx}
                  onClick={() => navigate(`/plan/${resolvedPlanId}/menu/${activeDurationId}/meal/${meal.day}/${selectedMealType}`)}
                  className="bg-white rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200 shadow-sm flex flex-col hover:border-emerald-400 hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-1 group"
                >
                  <div className="w-full h-48 relative bg-slate-100 overflow-hidden">
                    {meal.image ? (
                      <img 
                        src={meal.image} 
                        alt={meal.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <UtensilsCrossed className="w-10 h-10" />
                      </div>
                    )}
                    <div className={`absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm ${color} rounded-2xl flex items-center justify-center shadow-sm`}>
                      {icon}
                    </div>
                    <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      Day {meal.day}
                    </div>
                  </div>
                  <div className="p-6 md:p-8 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-1">{meal.name}</h3>
                    <p className="text-slate-500 text-sm mb-4 flex-grow line-clamp-2 leading-relaxed">{meal.desc}</p>
                    
                    {/* Macros Pills */}
                    <div className="flex flex-wrap items-center gap-2 mb-4 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold">{meal.macros.protein} Prot</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md">{meal.macros.carbs} Carbs</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md">{meal.macros.fat} Fat</span>
                      {meal.macros.fiber && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md">{meal.macros.fiber} Fibre</span>
                      )}
                    </div>

                    <div className="font-bold text-emerald-600 mt-auto flex items-center justify-between">
                      <span>{meal.cals}</span>
                      <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">View Recipe &rarr;</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
        
        <div className="mt-12 text-center">
           <button 
             onClick={() => {
               const checkoutUrl = `/checkout/${resolvedPlanId}/${activeDurationId}?meals=${mealsParam}&slot=${slotParam}`;
               const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
               if (isLoggedIn) {
                 navigate(checkoutUrl);
               } else {
                 navigate('/login', { state: { from: { pathname: checkoutUrl } } });
               }
             }}
             className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-12 rounded-full shadow-lg transition-transform hover:scale-105 cursor-pointer"
           >
             Checkout & Start {durationDays === 1 ? '1-Day Trial' : `${durationDays} Days`}
           </button>
        </div>
      </div>
    </div>
  );
}

export function MealDetails() {
  const { planId, durationId, dayId, mealType } = useParams();
  const navigate = useNavigate();
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomProps, setZoomProps] = useState({ scale: 1, x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const zoomStateRef = useRef({ scale: 1, x: 50, y: 50 });
  const [dbFoods, setDbFoods] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('shift24_admin_foods');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setVersion(v => v + 1);
    window.addEventListener('shift24-foods-updated', handleUpdate);
    window.addEventListener('shift24-plans-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    fetchWeeklyMenu().then(res => {
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setDbFoods(res.data);
      }
    }).catch(() => {});

    return () => {
      window.removeEventListener('shift24-foods-updated', handleUpdate);
      window.removeEventListener('shift24-plans-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);
  
  const adminPlans = getAdminPlans();
  const matchedPlan = adminPlans.find(p => p.id === planId || (p as any).planId === planId);
  const resolvedPlanId = matchedPlan?.id || (matchedPlan as any)?.planId || planId || 'healthy-food';

  const dayNum = parseInt(dayId || '1');
  const mealTypeStr = (mealType as 'breakfast' | 'lunch' | 'dinner') || 'breakfast';
  
  const meal = useMemo(() => {
    return getFoodForPlanAndDay(resolvedPlanId, dayNum, mealTypeStr, dbFoods);
  }, [resolvedPlanId, dayNum, mealTypeStr, version, dbFoods]);

  // reset image index when navigating between meals or changing days/slots
  useEffect(() => {
    setActiveImageIndex(0);
    setZoomProps({ scale: 1, x: 50, y: 50 });
    zoomStateRef.current = { scale: 1, x: 50, y: 50 };
  }, [resolvedPlanId, dayNum, mealTypeStr]);

  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;

    let initialDist = 0;
    let initialScale = 1;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const { left, top, width, height } = container.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 100;
      const y = ((e.clientY - top) / height) * 100;

      zoomStateRef.current = {
        ...zoomStateRef.current,
        scale: Math.min(Math.max(1, zoomStateRef.current.scale - e.deltaY * 0.01), 5),
        x,
        y
      };
      
      setZoomProps({ ...zoomStateRef.current });
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        initialScale = zoomStateRef.current.scale;
        
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        const { left, top, width, height } = container.getBoundingClientRect();
        
        zoomStateRef.current = {
          ...zoomStateRef.current,
          x: ((centerX - left) / width) * 100,
          y: ((centerY - top) / height) * 100
        };
        setZoomProps({ ...zoomStateRef.current });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        
        const newScale = Math.min(Math.max(1, initialScale * (dist / initialDist)), 5);
        
        zoomStateRef.current = {
          ...zoomStateRef.current,
          scale: newScale
        };
        setZoomProps({ ...zoomStateRef.current });
      } else if (e.touches.length === 1 && zoomStateRef.current.scale > 1) {
        e.preventDefault(); // Prevent page scroll when zoomed in
        
        // Allow panning with 1 finger
        const touch = e.touches[0];
        const { left, top, width, height } = container.getBoundingClientRect();
        const x = ((touch.clientX - left) / width) * 100;
        const y = ((touch.clientY - top) / height) * 100;
        
        zoomStateRef.current = {
          ...zoomStateRef.current,
          x,
          y
        };
        setZoomProps({ ...zoomStateRef.current });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  if (!meal) {
    return (
      <div className="py-24 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-xl text-slate-500">Meal not found.</p>
      </div>
    );
  }

  // Only the images actually attached to this dish in the admin panel: cover first,
  // then the gallery uploaded with it. No stock/dummy photos.
  const galleryImages = useMemo(() => {
    if (!meal) return [];
    const uploaded = Array.isArray((meal as any).images) ? (meal as any).images : [];
    return Array.from(new Set([meal.image, ...uploaded].filter(Boolean))) as string[];
  }, [meal]);

  const activeImage = galleryImages[Math.min(activeImageIndex, Math.max(galleryImages.length - 1, 0))] || '';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    zoomStateRef.current = { ...zoomStateRef.current, x, y };
    setZoomProps({ ...zoomStateRef.current });
  };

  const handleMouseLeave = () => {
    zoomStateRef.current = { scale: 1, x: 50, y: 50 };
    setZoomProps({ ...zoomStateRef.current });
  };

  return (
    <div className="py-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <button 
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-emerald-600 mb-10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Menu
        </button>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl md:rounded-[32px] overflow-hidden shadow-sm border border-slate-200 p-6 md:p-12 lg:p-16"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            
            {/* Left Column: Product Gallery */}
            <div className="flex flex-col gap-6">
              <div 
                ref={imageContainerRef}
                className={`w-full aspect-[4/3] rounded-2xl md:rounded-3xl relative bg-slate-100 overflow-hidden border border-slate-100 ${zoomProps.scale > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                {activeImage ? (
                  <img 
                    src={activeImage} 
                    alt={meal.name} 
                    className="w-full h-full object-cover transition-opacity duration-500" 
                    style={{
                      transformOrigin: `${zoomProps.x}% ${zoomProps.y}%`,
                      transform: `scale(${zoomProps.scale})`,
                      transition: zoomProps.scale > 1 ? 'transform 0.1s ease-out' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300">
                    <UtensilsCrossed className="w-12 h-12" />
                    <span className="text-xs font-semibold text-slate-400">Photo coming soon</span>
                  </div>
                )}
              </div>
              
              {/* Thumbnails Row — only the photos uploaded for this dish */}
              {galleryImages.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                  {galleryImages.map((img, idx) => (
                    <button 
                      key={idx}
                      onClick={() => {
                      setActiveImageIndex(idx);
                      setZoomProps({ scale: 1, x: 50, y: 50 });
                      zoomStateRef.current = { scale: 1, x: 50, y: 50 };
                    }}
                      className={`w-24 h-24 shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${activeImageIndex === idx ? 'border-emerald-500 shadow-md scale-105' : 'border-transparent opacity-60 hover:opacity-100 hover:border-slate-300'}`}
                    >
                      <img src={img} className="w-full h-full object-cover" alt={`Gallery thumbnail ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Product Details */}
            <div className="flex flex-col">
              <div className="text-emerald-600 font-black tracking-widest uppercase text-xs mb-4">
                Day {dayId} &bull; {mealTypeStr}
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
                {meal.name}
              </h1>
              
              <div className="flex items-center gap-4 mb-8">
                <span className="text-3xl md:text-4xl font-black text-emerald-500">{meal.cals}</span>
                <span className="text-slate-400 font-medium bg-slate-100 px-3 py-1 rounded-full text-sm">Per Serving</span>
              </div>
              
              <p className="text-lg text-slate-600 mb-10 leading-relaxed">
                {meal.desc} Expertly crafted by our nutritionists, this meal ensures you get the perfect balance of flavor and fuel. Every ingredient is carefully sourced to provide maximum nutritional value, support your metabolism, and keep you satisfied throughout the day.
              </p>

              <div className="mb-10">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Key Benefits</h4>
                <ul className="space-y-4">
                  {meal.benefits.map((benefit: string, i: number) => (
                    <li key={i} className="flex items-center gap-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                      <span className="text-slate-800 font-bold text-base">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {meal.ingredients && meal.ingredients.length > 0 && (
                <div className="mb-10">
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Fresh Ingredients</h4>
                  <div className="flex flex-wrap gap-2">
                    {meal.ingredients.map((ing: any, i: number) => {
                      const name = typeof ing === 'string' ? ing : ing.name;
                      const qty = typeof ing === 'object' && ing.quantity ? ` (${ing.quantity})` : '';
                      return (
                        <span key={i} className="bg-slate-100 text-slate-800 px-3.5 py-1.5 rounded-xl text-sm font-bold border border-slate-200">
                          {name}{qty}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>

          <hr className="border-slate-100 my-16" />

          {/* Bottom Section: Nutrition Facts Specifications */}
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-10">Detailed Nutrition Facts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              
              {/* Macros */}
              <div className="bg-slate-50 p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8">Macronutrients</h4>
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between text-lg mb-3">
                      <span className="font-semibold text-slate-600">Protein</span>
                      <span className="font-black text-slate-900">{meal.macros.protein}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div className="bg-blue-500 h-3 rounded-full shadow-sm" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-lg mb-3">
                      <span className="font-semibold text-slate-600">Carbs</span>
                      <span className="font-black text-slate-900">{meal.macros.carbs}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div className="bg-amber-500 h-3 rounded-full shadow-sm" style={{ width: '35%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-lg mb-3">
                      <span className="font-semibold text-slate-600">Fat</span>
                      <span className="font-black text-slate-900">{meal.macros.fat}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div className="bg-red-500 h-3 rounded-full shadow-sm" style={{ width: '20%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-lg mb-3">
                      <span className="font-semibold text-slate-600">Fibre</span>
                      <span className="font-black text-slate-900">{meal.macros.fiber || '—'}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div className="bg-emerald-500 h-3 rounded-full shadow-sm" style={{ width: meal.macros.fiber ? '25%' : '0%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Micros */}
              <div className="bg-emerald-50/50 p-6 md:p-8 rounded-2xl md:rounded-3xl border border-emerald-100">
                <h4 className="text-sm font-black uppercase tracking-widest text-emerald-600/70 mb-8">Micronutrient Profile</h4>
                {meal.micros.length > 0 ? (
                  <>
                    <p className="text-slate-600 mb-6">This meal is particularly rich in the following essential vitamins and minerals:</p>
                    <div className="flex flex-wrap gap-3">
                      {meal.micros.map((micro: string, i: number) => (
                        <span key={i} className="bg-white text-emerald-700 px-5 py-3 rounded-xl text-base font-bold border border-emerald-100 shadow-sm">
                          {micro}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500 text-sm">Micronutrient values haven&apos;t been added for this dish yet.</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function MenuExplorer() {
  const [plansList, setPlansList] = useState<AdminPlanConfig[]>(() => getAdminPlans());
  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => setPlansList(getAdminPlans());
    window.addEventListener('shift24-plans-updated', sync);
    window.addEventListener('storage', sync);
    fetchPlans().then(res => {
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const rawLocal = localStorage.getItem('shift24_admin_plans');
        if (rawLocal && res.fallback) {
          return;
        }
        const formatted = res.data.map((p: any) => ({
          ...p,
          id: p.id || p.planId || p._id
        }));
        saveAdminPlans(formatted);
      }
    }).catch(() => {});
    return () => {
      window.removeEventListener('shift24-plans-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const activePlans = [...plansList]
    .filter(p => p.active !== false)
    .sort((a, b) => getPlanSortRank(a) - getPlanSortRank(b));
  const [planId, setPlanId] = useState(activePlans[0]?.id || 'healthy-food');
  const currentPlan = activePlans.find(p => p.id === planId) || activePlans[0];
  const durations = ((currentPlan?.durationOptions && currentPlan.durationOptions.length > 0)
    ? currentPlan.durationOptions
    : DEFAULT_DURATION_OPTIONS).slice().sort((a, b) => (Number(a.days) || 0) - (Number(b.days) || 0));
  const defaultDur = durations.find((d: any) => Number(d.days) === 7 || d.popular) || durations[0];
  const [durationId, setDurationId] = useState(defaultDur?.id || '7-day');

  return (
    <div className="py-24 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">Explore Our Menus</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">Preview the delicious, chef-crafted meals you'll enjoy on each of our specialized diet plans.</p>
        </div>
        
        <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-12 shadow-sm border border-slate-200">
          <h3 className="text-2xl font-bold text-slate-900 mb-6">1. Select your diet goal</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {activePlans.map(p => (
              <button 
                key={p.id}
                onClick={() => {
                  setPlanId(p.id);
                  if (p.durationOptions && p.durationOptions.length > 0) {
                    const dur = p.durationOptions.find((d: any) => Number(d.days) === 7 || d.popular) || p.durationOptions[0];
                    setDurationId(dur.id);
                  }
                }}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${planId === p.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'}`}
              >
                <h4 className="font-bold text-lg text-slate-900 mb-2">{p.title}</h4>
                <p className="text-sm text-slate-600">{p.subtitle || p.description}</p>
              </button>
            ))}
          </div>

          <h3 className="text-2xl font-bold text-slate-900 mb-6">2. Select duration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {durations.map(d => (
              <button 
                key={d.id}
                onClick={() => setDurationId(d.id)}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${durationId === d.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'}`}
              >
                <h4 className="font-bold text-lg text-slate-900 mb-2">{d.title || `${d.days} Days`}</h4>
                <p className="text-sm text-slate-600">{d.description}</p>
              </button>
            ))}
          </div>

          <div className="text-center pt-8 border-t border-slate-100">
            <button 
              onClick={() => navigate(`/plan/${planId}/menu/${durationId}`)}
              className="bg-slate-900 text-white font-bold text-lg px-12 py-4 rounded-full hover:bg-emerald-600 transition-colors shadow-lg"
            >
              View {currentPlan?.title || 'Plan'} Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
