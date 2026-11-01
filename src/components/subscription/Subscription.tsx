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
    name: item.name,
    cals: item.calories,
    desc: item.description || `${item.name} prepared fresh according to your ${planId} targets.`,
    image: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
    benefits: item.benefits && item.benefits.length > 0 ? item.benefits : ['Chef crafted', 'Balanced nutrition', 'High quality ingredients'],
    macros: {
      protein: item.protein || '25g',
      carbs: item.carbs || '40g',
      fat: item.fat || '15g'
    },
    micros: (item.microNutrients && item.microNutrients.length > 0)
      ? item.microNutrients.map((m: any) => typeof m === 'string' ? m : `${m.name} (${m.amount})`)
      : ['Iron', 'Potassium', 'Vitamin C'],
    ingredients: item.ingredients || []
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
    macros: { protein: '30g', carbs: '40g', fat: '15g' },
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

// -------------------------------------------------------------
// Helper Component: CustomerMealSlotCard
// Matches AdminMenu schedule cards with customer-focused interactions
// -------------------------------------------------------------
interface CustomerMealSlotCardProps {
  mealType: 'breakfast' | 'lunch' | 'dinner';
  icon: React.ReactNode;
  title: string;
  theme: 'amber' | 'orange' | 'indigo';
  food?: any;
  day: number;
  isAdmin?: boolean;
  onClick?: () => void;
  onAdminManage?: () => void;
}

function CustomerMealSlotCard({
  mealType,
  icon,
  title,
  theme,
  food,
  isAdmin,
  onClick,
  onAdminManage
}: CustomerMealSlotCardProps) {
  const themeStyles = {
    amber: {
      border: 'border-amber-200',
      bg: 'bg-amber-50/40',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      tag: 'text-amber-800 bg-amber-50 border-amber-200',
      accent: 'text-amber-700'
    },
    orange: {
      border: 'border-orange-200',
      bg: 'bg-orange-50/40',
      badge: 'bg-orange-100 text-orange-800 border-orange-200',
      tag: 'text-orange-800 bg-orange-50 border-orange-200',
      accent: 'text-orange-700'
    },
    indigo: {
      border: 'border-indigo-200',
      bg: 'bg-indigo-50/40',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      tag: 'text-indigo-800 bg-indigo-50 border-indigo-200',
      accent: 'text-indigo-700'
    }
  }[theme];

  return (
    <div 
      className={`rounded-3xl border ${themeStyles.border} ${themeStyles.bg} p-5 flex flex-col justify-between shadow-xs transition-all duration-200 ${
        food ? 'hover:shadow-md cursor-pointer group' : ''
      }`}
      onClick={food ? onClick : undefined}
    >
      <div>
        {/* Slot Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
            {icon}
            <span>{title}</span>
          </div>

          {food && (
            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${themeStyles.badge}`}>
              {food.cals || food.calories}
            </span>
          )}
        </div>

        {/* Slot Content */}
        {food ? (
          <div className="space-y-3">
            {food.image && (
              <div className="w-full h-36 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 mb-2">
                <img
                  src={food.image}
                  alt={food.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}

            <div>
              <h4 className="text-base font-black text-slate-900 leading-snug group-hover:text-emerald-600 transition-colors">
                {food.name}
              </h4>
              {food.desc && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {food.desc}
                </p>
              )}
            </div>

            {/* Macros Chips */}
            <div className="grid grid-cols-3 gap-1.5 text-center text-xs pt-1">
              <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">Protein</span>
                <span className="font-extrabold text-slate-800">{food.macros?.protein || food.protein || '20g'}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">Carbs</span>
                <span className="font-extrabold text-slate-800">{food.macros?.carbs || food.carbs || '40g'}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">Fats</span>
                <span className="font-extrabold text-slate-800">{food.macros?.fat || food.fat || '15g'}</span>
              </div>
            </div>

            {/* Ingredients & Micronutrients Badges */}
            {((food.ingredients && food.ingredients.length > 0) || (food.micros && food.micros.length > 0)) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                {food.ingredients && food.ingredients.length > 0 && (
                  <span className="font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                    <Scale className="w-3 h-3 text-emerald-600" />
                    <span>{food.ingredients.length} Ingredients</span>
                  </span>
                )}
                {food.micros && food.micros.length > 0 && (
                  <span className="font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1 shadow-2xs">
                    <Sparkles className="w-3 h-3 text-sky-600" />
                    <span>{food.micros.length} Nutrients</span>
                  </span>
                )}
              </div>
            )}

            {/* Benefits */}
            {food.benefits && food.benefits.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {food.benefits.slice(0, 2).map((b: string, i: number) => (
                  <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-slate-600 border border-slate-200/80">
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 my-2">
            <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">No Food Assigned</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isAdmin ? 'Click below to add a dish for this slot' : 'No dish scheduled for this slot yet'}
            </p>
          </div>
        )}
      </div>

      {/* Card Action Buttons / Footer */}
      <div className="pt-4 mt-4 border-t border-slate-200/60">
        {food ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onClick) onClick();
            }}
            className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs group-hover:border-emerald-300 group-hover:text-emerald-700 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600" />
            <span>View Recipe & Ingredients</span>
          </button>
        ) : isAdmin ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onAdminManage) onAdminManage();
            }}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add {mealType.charAt(0).toUpperCase() + mealType.slice(1)} in Admin</span>
          </button>
        ) : (
          <div className="py-2 text-center text-xs text-slate-400 font-semibold">
            Not Scheduled
          </div>
        )}
      </div>
    </div>
  );
}

export function PlanMenu() {
  const { planId, durationId: routeDurationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [adminPlans, setAdminPlans] = useState<AdminPlanConfig[]>(() => getAdminPlans());
  const [dbFoods, setDbFoods] = useState<any[]>(() => getAdminFoods());
  const [loading, setLoading] = useState(true);
  const [activeDurationId, setActiveDurationId] = useState<string>(routeDurationId || '7-day');

  const initialDayParam = parseInt(searchParams.get('day') || '1', 10);
  const [selectedDay, setSelectedDay] = useState<number>(() => isNaN(initialDayParam) || initialDayParam < 1 ? 1 : initialDayParam);

  const plan = adminPlans.find(p => p.id === planId || (p as any).planId === planId) || adminPlans[0] || {
    id: planId || 'healthy-food',
    title: 'Balanced Healthy Meals',
    description: 'Custom nutrition plan'
  };
  const resolvedPlanId = plan.id || (plan as any).planId || 'healthy-food';

  const isAdmin = typeof window !== 'undefined' && (
    localStorage.getItem('isAdmin') === 'true' || 
    localStorage.getItem('userRole') === 'admin'
  );

  useEffect(() => {
    let isMounted = true;
    const sync = () => {
      setAdminPlans(getAdminPlans());
      setDbFoods(getAdminFoods());
    };
    window.addEventListener('shift24-plans-updated', sync);
    window.addEventListener('shift24-foods-updated', sync);
    window.addEventListener('storage', sync);

    // Fetch live from MongoDB menuitems collection
    fetchWeeklyMenu().then(res => {
      if (isMounted && res.success && Array.isArray(res.data) && res.data.length > 0) {
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

  const matchedDuration = (plan as any).durationOptions?.find(
    (d: any) => d.id === activeDurationId || String(d.days) === activeDurationId || d.id === `${activeDurationId}-day`
  );
  const rawParsed = parseInt(activeDurationId?.split('-')[0] || '7', 10);
  const durationDays = (matchedDuration?.days && Number(matchedDuration.days) > 0 && Number(matchedDuration.days) <= 90)
    ? Number(matchedDuration.days)
    : (!isNaN(rawParsed) && rawParsed > 0 && rawParsed <= 90 ? rawParsed : 7);

  // Find all foods in database for this plan
  const planDbFoods = dbFoods.filter(f => {
    const p = (f.planId || '').toLowerCase().trim();
    const r = resolvedPlanId.toLowerCase().trim();
    return p === r || p === 'all' || 
      (r === 'healthy-food' && (p === 'balance' || p === 'healthy_food')) || 
      (r === 'balance' && (p === 'healthy-food' || p === 'healthy_food'));
  });

  const dbDays: number[] = Array.from(
    new Set<number>(planDbFoods.map((f: any) => Number(f.day)).filter((d: number) => d > 0))
  ).sort((a, b) => a - b);

  // Days list: at least 7 days or up to maximum available day
  const maxDayCount = Math.max(7, dbDays.length > 0 ? Math.max(...dbDays) : 7);
  const availableDays = Array.from({ length: maxDayCount }, (_, i) => i + 1);

  // Active day meals
  const currentPlanDayFoods = planDbFoods.filter(item => Number(item.day) === Number(selectedDay));
  const breakfastRaw = currentPlanDayFoods.find(f => (f.mealType || '').toLowerCase().trim() === 'breakfast');
  const lunchRaw = currentPlanDayFoods.find(f => (f.mealType || '').toLowerCase().trim() === 'lunch');
  const dinnerRaw = currentPlanDayFoods.find(f => (f.mealType || '').toLowerCase().trim() === 'dinner');

  const breakfastFood = breakfastRaw ? formatFoodItem(breakfastRaw, resolvedPlanId) : null;
  const lunchFood = lunchRaw ? formatFoodItem(lunchRaw, resolvedPlanId) : null;
  const dinnerFood = dinnerRaw ? formatFoodItem(dinnerRaw, resolvedPlanId) : null;

  const durationOptions = (plan as any).durationOptions || DEFAULT_DURATION_OPTIONS;

  return (
    <div className="py-24 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Plans
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate('/admin/menu')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Admin Schedule Manager</span>
            </button>
          )}
        </div>

        {/* 1. Schedule Foods By Day Top Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span>Schedule Foods By Day for "{plan.title}"</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pick a cycle day below to explore Breakfast, Lunch, and Dinner dishes.
              </p>
            </div>

            {/* Duration selector pill buttons */}
            {durationOptions.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Duration:</span>
                {durationOptions.map((opt: any) => {
                  const isSelected = activeDurationId === opt.id || String(opt.days) === activeDurationId;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setActiveDurationId(opt.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-900 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {opt.title || `${opt.days} Days`}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Days Pill List */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {availableDays.map(day => {
              const isSelected = selectedDay === day;
              const mealsForThisDay = planDbFoods.filter(
                m => Number(m.day) === day && ['breakfast', 'lunch', 'dinner'].includes((m.mealType || '').toLowerCase().trim())
              );
              const count = mealsForThisDay.length;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setSelectedDay(day);
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('day', String(day));
                    navigate(`?${newParams.toString()}`, { replace: true });
                  }}
                  className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border text-left cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div>Day {day}</div>
                  <div className={`text-[10px] font-semibold mt-0.5 ${
                    isSelected ? 'text-emerald-100' : count === 3 ? 'text-emerald-600 font-bold' : 'text-slate-400'
                  }`}>
                    {count === 3 ? '3 meals ready' : `${count}/3 meals`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Subheader for selected day */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">
            Day {selectedDay} Menu &bull; {plan.title}
          </span>
          <span className="text-xs text-slate-500">
            Click any meal card to view recipe & ingredients
          </span>
        </div>

        {/* 3. Three Meal Slots: Breakfast, Lunch, Dinner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Breakfast Slot Card */}
          <CustomerMealSlotCard
            mealType="breakfast"
            icon={<Coffee className="w-4 h-4 text-amber-600" />}
            title="Breakfast Slot"
            theme="amber"
            food={breakfastFood}
            day={selectedDay}
            isAdmin={isAdmin}
            onClick={() => breakfastFood && navigate(`/plan/${resolvedPlanId}/menu/${activeDurationId}/meal/${selectedDay}/breakfast`)}
            onAdminManage={() => navigate('/admin/menu')}
          />

          {/* Lunch Slot Card */}
          <CustomerMealSlotCard
            mealType="lunch"
            icon={<Sun className="w-4 h-4 text-orange-600" />}
            title="Lunch Slot"
            theme="orange"
            food={lunchFood}
            day={selectedDay}
            isAdmin={isAdmin}
            onClick={() => lunchFood && navigate(`/plan/${resolvedPlanId}/menu/${activeDurationId}/meal/${selectedDay}/lunch`)}
            onAdminManage={() => navigate('/admin/menu')}
          />

          {/* Dinner Slot Card */}
          <CustomerMealSlotCard
            mealType="dinner"
            icon={<Moon className="w-4 h-4 text-indigo-600" />}
            title="Dinner Slot"
            theme="indigo"
            food={dinnerFood}
            day={selectedDay}
            isAdmin={isAdmin}
            onClick={() => dinnerFood && navigate(`/plan/${resolvedPlanId}/menu/${activeDurationId}/meal/${selectedDay}/dinner`)}
            onAdminManage={() => navigate('/admin/menu')}
          />
        </div>
        
        {/* 4. Checkout Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Fresh Rotating Daily Menu
              </span>
              <span className="text-xs text-slate-400">
                • {availableDays.length}-Day Cycle
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Subscribe to {plan.title}
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Enjoy freshly prepared meals made from premium ingredients delivered on time every day. Pause or customize your plan anytime.
            </p>
          </div>

          <div className="w-full md:w-auto shrink-0">
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
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-4 px-8 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 text-base cursor-pointer"
            >
              <span>Checkout & Start {durationDays === 1 ? '1-Day Trial' : `${durationDays} Days`}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
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
  const [dbFoods, setDbFoods] = useState<any[]>(() => getAdminFoods());
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

  const extras: Record<string, string[]> = {
    breakfast: [
      "https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1494597564530-871f2b93ac55?auto=format&fit=crop&q=80&w=600"
    ],
    lunch: [
      "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&q=80&w=600"
    ],
    dinner: [
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&q=80&w=600"
    ]
  };

  const galleryImages = useMemo(() => {
    if (!meal) return [];
    const extraList = extras[mealTypeStr] || extras.breakfast || [];
    return [meal.image, ...extraList].filter(Boolean);
  }, [meal?.image, mealTypeStr]);

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
                <img 
                  src={galleryImages[activeImageIndex]} 
                  alt={meal.name} 
                  className="w-full h-full object-cover transition-opacity duration-500" 
                  style={{
                    transformOrigin: `${zoomProps.x}% ${zoomProps.y}%`,
                    transform: `scale(${zoomProps.scale})`,
                    transition: zoomProps.scale > 1 ? 'transform 0.1s ease-out' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </div>
              
              {/* Thumbnails Row */}
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
                </div>
              </div>

              {/* Micros */}
              <div className="bg-emerald-50/50 p-6 md:p-8 rounded-2xl md:rounded-3xl border border-emerald-100">
                <h4 className="text-sm font-black uppercase tracking-widest text-emerald-600/70 mb-8">Micronutrient Profile</h4>
                <p className="text-slate-600 mb-6">This meal is particularly rich in the following essential vitamins and minerals:</p>
                <div className="flex flex-wrap gap-3">
                  {meal.micros.map((micro: string, i: number) => (
                    <span key={i} className="bg-white text-emerald-700 px-5 py-3 rounded-xl text-base font-bold border border-emerald-100 shadow-sm">
                      {micro}
                    </span>
                  ))}
                </div>
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
