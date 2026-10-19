import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ArrowRight, ArrowLeft, Coffee, Sun, Moon } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
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

function formatFoodItem(item: FoodItem, planId: string) {
  return {
    name: item.name,
    cals: item.calories,
    desc: item.description || `${item.name} prepared fresh according to your ${planId} targets.`,
    image: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
    benefits: item.benefits && item.benefits.length > 0 ? item.benefits : ['Chef crafted', 'Balanced nutrition', 'High quality ingredients'],
    macros: {
      protein: item.protein || '25g',
      carbs: item.carbs || '40g',
      fat: item.fat || '15g'
    },
    micros: ['Iron', 'Potassium', 'Vitamin C']
  };
}

export function getFoodForPlanAndDay(planId: string, day: number, mealType: 'breakfast' | 'lunch' | 'dinner') {
  const foods = getAdminFoods();
  const normalizedPlanId = (planId || 'balance').trim().toLowerCase();
  const normalizedMealType = (mealType || '').trim().toLowerCase();

  // 1. Direct match for exact plan, day, mealType
  const exactMatch = foods.find(f => {
    const fPlan = (f.planId || (f as any).id || '').trim().toLowerCase();
    const fMeal = (f.mealType || '').trim().toLowerCase();
    return (fPlan === normalizedPlanId || fPlan === 'all') && Number(f.day) === Number(day) && fMeal === normalizedMealType;
  });
  if (exactMatch) {
    return formatFoodItem(exactMatch, planId);
  }

  // 2. Cycle through other scheduled days for this plan & mealType
  const planFoods = foods.filter(f => {
    const fPlan = (f.planId || (f as any).id || '').trim().toLowerCase();
    const fMeal = (f.mealType || '').trim().toLowerCase();
    return (fPlan === normalizedPlanId || fPlan === 'all') && fMeal === normalizedMealType;
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
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
    benefits: ['Chef Crafted', 'Balanced Nutrition', 'High Quality Ingredients'],
    macros: { protein: '30g', carbs: '40g', fat: '15g' },
    micros: ['Iron', 'Potassium', 'Vitamin C']
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

  const currentMultiplier = plan.mealOptions.find(m => m.id === mealsPerDay)?.multiplier ?? MEAL_MULTIPLIERS[mealsPerDay] ?? 1;

  const calculatePrice = (option: IDurationOption) => {
    if (option.customPrice && option.customPrice > 0) {
      return option.customPrice;
    }
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
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
  const { planId, durationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [adminPlans, setAdminPlans] = useState<AdminPlanConfig[]>(() => getAdminPlans());
  const [, setFoodsVersion] = useState(0);

  useEffect(() => {
    const sync = () => {
      setAdminPlans(getAdminPlans());
      setFoodsVersion(v => v + 1);
    };
    window.addEventListener('shift24-plans-updated', sync);
    window.addEventListener('shift24-foods-updated', sync);
    window.addEventListener('storage', sync);

    fetchWeeklyMenu().then(res => {
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const localFoods = getAdminFoods();
        const backendKeys = new Set(res.data.map((i: any) => `${(i.planId || '').toLowerCase()}-${Number(i.day)}-${(i.mealType || '').toLowerCase()}`));
        const extraLocal = localFoods.filter(f => !backendKeys.has(`${(f.planId || '').toLowerCase()}-${Number(f.day)}-${(f.mealType || '').toLowerCase()}`));
        const merged = [...res.data, ...extraLocal];
        saveAdminFoods(merged);
      }
    }).catch(() => {});

    return () => {
      window.removeEventListener('shift24-plans-updated', sync);
      window.removeEventListener('shift24-foods-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const plan = adminPlans.find(p => p.id === planId || (p as any).planId === planId) || adminPlans[0] || {
    id: planId || 'balance',
    title: 'Healthy Meal Plan',
    description: 'Custom nutrition plan'
  };
  const resolvedPlanId = plan.id || (plan as any).planId || 'balance';

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
    return 'breakfast';
  };

  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner'>(getInitialMealType);

  const durationDays = parseInt(durationId?.split('-')[0] || '7');

  // Generate menu for the full duration tailored to this specific plan
  const fullMenu = Array.from({ length: durationDays }, (_, i) => {
    const dayNum = i + 1;
    return {
      day: dayNum,
      breakfast: getFoodForPlanAndDay(resolvedPlanId, dayNum, 'breakfast'),
      lunch: getFoodForPlanAndDay(resolvedPlanId, dayNum, 'lunch'),
      dinner: getFoodForPlanAndDay(resolvedPlanId, dayNum, 'dinner')
    };
  });

  return (
    <div className="py-24 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10">
        <button 
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-emerald-600 mb-10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Plans
        </button>

        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Your {plan.title} Menu</h2>
          <p className="text-slate-500 text-lg">
            Here is a sneak peek at what you'll be eating on the {plan.title} plan for {durationDays} days.
          </p>
        </div>

        {/* Meal Type Navigation */}
        <div className="flex overflow-x-auto gap-4 pb-4 mb-8 justify-center snap-x hide-scrollbar">
          {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => (
            <button
              key={mealType}
              onClick={() => setSelectedMealType(mealType)}
              className={`snap-center shrink-0 px-8 py-3 rounded-full font-bold transition-all capitalize ${
                selectedMealType === mealType 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {mealType}
            </button>
          ))}
        </div>

        {/* Meals Grid */}
        <motion.div 
          key={selectedMealType}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {fullMenu.map((dayMenu, idx) => {
            const meal = dayMenu[selectedMealType];
            const icon = selectedMealType === 'breakfast' ? <Coffee className="w-5 h-5" /> : selectedMealType === 'lunch' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />;
            const color = selectedMealType === 'breakfast' ? 'text-amber-500' : selectedMealType === 'lunch' ? 'text-orange-500' : 'text-indigo-500';

            return (
              <div 
                key={idx}
                onClick={() => navigate(`/plan/${resolvedPlanId}/menu/${durationId}/meal/${dayMenu.day}/${selectedMealType}`)}
                className="bg-white rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200 shadow-sm flex flex-col hover:border-emerald-400 hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-1"
              >
                <div className="w-full h-48 relative bg-slate-100">
                  <img src={meal.image} alt={meal.name} className="w-full h-full object-cover" />
                  <div className={`absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm ${color} rounded-2xl flex items-center justify-center shadow-sm`}>
                    {icon}
                  </div>
                  <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    Day {dayMenu.day}
                  </div>
                </div>
                <div className="p-6 md:p-8 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors">{meal.name}</h3>
                  <p className="text-slate-500 text-sm mb-6 flex-grow">{meal.desc}</p>
                  <div className="font-semibold text-emerald-600 mt-auto">{meal.cals}</div>
                </div>
              </div>
            );
          })}
        </motion.div>
        
        <div className="mt-12 text-center">
           <button 
             onClick={() => {
               const checkoutUrl = `/checkout/${resolvedPlanId}/${durationId}?meals=${mealsParam}&slot=${slotParam}`;
               const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
               if (isLoggedIn) {
                 navigate(checkoutUrl);
               } else {
                 navigate('/login', { state: { from: { pathname: checkoutUrl } } });
               }
             }}
             className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-12 rounded-full shadow-lg transition-transform hover:scale-105"
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
  const [, setVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setVersion(v => v + 1);
    window.addEventListener('shift24-foods-updated', handleUpdate);
    window.addEventListener('shift24-plans-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('shift24-foods-updated', handleUpdate);
      window.removeEventListener('shift24-plans-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);
  
  const adminPlans = getAdminPlans();
  const matchedPlan = adminPlans.find(p => p.id === planId || (p as any).planId === planId);
  const resolvedPlanId = matchedPlan?.id || (matchedPlan as any)?.planId || planId || 'balance';

  const dayNum = parseInt(dayId || '1');
  const mealTypeStr = mealType as 'breakfast' | 'lunch' | 'dinner';
  const meal = getFoodForPlanAndDay(resolvedPlanId, dayNum, mealTypeStr);

  // reset image index when navigating between meals
  useEffect(() => {
    setActiveImageIndex(0);
  }, [meal]);

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

  const extras = {
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

  const galleryImages = [meal.image, ...extras[mealTypeStr]];

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
                    onClick={() => setActiveImageIndex(idx)}
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
  const [planId, setPlanId] = useState(activePlans[0]?.id || 'weight-loss');
  const currentPlan = activePlans.find(p => p.id === planId) || activePlans[0];
  const durations = ((currentPlan?.durationOptions && currentPlan.durationOptions.length > 0)
    ? currentPlan.durationOptions
    : DEFAULT_DURATION_OPTIONS).slice().sort((a, b) => (Number(a.days) || 0) - (Number(b.days) || 0));
  const [durationId, setDurationId] = useState(durations[0]?.id || '7-days');

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
                    setDurationId(p.durationOptions[0].id);
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
