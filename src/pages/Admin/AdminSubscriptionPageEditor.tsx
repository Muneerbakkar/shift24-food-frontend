import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  ExternalLink, 
  Sparkles, 
  Sliders, 
  Check, 
  Flame, 
  Scale, 
  TrendingUp, 
  Info, 
  X, 
  Tag, 
  Layers, 
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { 
  AdminPlanConfig, 
  IDurationOption, 
  IMealOption, 
  DEFAULT_DURATION_OPTIONS, 
  DEFAULT_MEAL_OPTIONS,
  saveAdminPlans,
  getPlanSortRank,
  getAdminCommissionRate
} from './adminData';
import { 
  createBackendPlan, 
  updateBackendPlan, 
  deleteBackendPlan 
} from '../../services/api';
import toast from 'react-hot-toast';
import { showConfirmToast } from '../../utils/confirmToast';

interface AdminSubscriptionPageEditorProps {
  plans: AdminPlanConfig[];
  selectedPlanId: string;
  setSelectedPlanId: (id: string) => void;
  onPlansUpdated: (plans: AdminPlanConfig[]) => void;
}

export function AdminSubscriptionPageEditor({
  plans,
  selectedPlanId,
  setSelectedPlanId,
  onPlansUpdated
}: AdminSubscriptionPageEditorProps) {
  const activePlan = plans.find(p => p.id === selectedPlanId) || plans[0];

  // Local editable form state for active plan
  const [planForm, setPlanForm] = useState<{
    title: string;
    subtitle: string;
    pricePerWeek: number;
    dailyCommission: number;
    calories: string;
    description: string;
    active: boolean;
    popular: boolean;
    badge: string;
    benefitsText: string;
  }>({
    title: '',
    subtitle: '',
    pricePerWeek: 3000,
    dailyCommission: 100,
    calories: '',
    description: '',
    active: true,
    popular: false,
    badge: 'MOST POPULAR',
    benefitsText: ''
  });

  const [mealOptions, setMealOptions] = useState<IMealOption[]>(DEFAULT_MEAL_OPTIONS);
  const [durationOptions, setDurationOptions] = useState<IDurationOption[]>(DEFAULT_DURATION_OPTIONS);
  const [syncPackagesToAllPlans, setSyncPackagesToAllPlans] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Add Plan Modal State (Choose Your Path card)
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [addPlanForm, setAddPlanForm] = useState<{
    title: string;
    subtitle: string;
    pricePerWeek: number;
    dailyCommission: number;
    calories: string;
    description: string;
    benefitsText: string;
    popular: boolean;
    badge: string;
  }>({
    title: '',
    subtitle: 'Customize your daily meal routine and subscription duration. The longer you commit, the more you save.',
    pricePerWeek: 3000,
    dailyCommission: 100,
    calories: '1500 - 2000 kcal/day',
    description: 'Fresh chef-prepared meals crafted to meet your goals.',
    benefitsText: 'High protein\nBalanced macros\nNutrient dense',
    popular: false,
    badge: 'MOST POPULAR'
  });

  // Interactive Live Preview State
  const [previewMealsPerDay, setPreviewMealsPerDay] = useState<'1' | '2' | '3'>('3');
  const [previewSlot, setPreviewSlot] = useState<string>('lunch');
  const [previewTwoSlot, setPreviewTwoSlot] = useState<string>('lunch-dinner');

  // Package Modal State (Edit or Add)
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packageModalMode, setPackageModalMode] = useState<'create' | 'edit'>('create');
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [packageForm, setPackageForm] = useState<{
    id: string;
    title: string;
    days: number;
    description: string;
    discount: number;
    popular: boolean;
    badge: string;
    price: string;
    customPrice: string;
    price1Meal: string;
    price2Meals: string;
    priceBreakfast: string;
    priceLunch: string;
    priceDinner: string;
    priceBreakfastLunch: string;
    priceLunchDinner: string;
    priceBreakfastDinner: string;
    featuresText: string;
  }>({
    id: '',
    title: '',
    days: 7,
    description: '',
    discount: 0,
    popular: false,
    badge: '',
    price: '',
    customPrice: '',
    price1Meal: '',
    price2Meals: '',
    priceBreakfast: '',
    priceLunch: '',
    priceDinner: '',
    priceBreakfastLunch: '',
    priceLunchDinner: '',
    priceBreakfastDinner: '',
    featuresText: ''
  });

  // Keep local form in sync when activePlan changes
  useEffect(() => {
    if (activePlan) {
      setPlanForm({
        title: activePlan.title || '',
        subtitle: activePlan.subtitle || 'Customize your daily meal routine and subscription duration. The longer you commit, the more you save.',
        pricePerWeek: activePlan.pricePerWeek || 3000,
        dailyCommission: activePlan.dailyCommission !== undefined ? Number(activePlan.dailyCommission) : 100,
        calories: activePlan.calories || '1200 - 1500 kcal/day',
        description: activePlan.description || '',
        active: activePlan.active !== false,
        popular: Boolean(activePlan.popular),
        badge: activePlan.popular ? (activePlan.badge || 'MOST POPULAR') : '',
        benefitsText: (activePlan.benefits && activePlan.benefits.length > 0)
          ? activePlan.benefits.join('\n')
          : 'High protein\nLow carb\nMetabolism boosting'
      });
      setMealOptions(activePlan.mealOptions && activePlan.mealOptions.length > 0 ? activePlan.mealOptions : DEFAULT_MEAL_OPTIONS);
      const rawOptions = activePlan.durationOptions && activePlan.durationOptions.length > 0 ? activePlan.durationOptions : DEFAULT_DURATION_OPTIONS;
      const sortedOptions = [...rawOptions].sort((a, b) => (Number(a.days) || 0) - (Number(b.days) || 0));
      setDurationOptions(sortedOptions);
    }
  }, [activePlan]);

  const getPlanIcon = (planId: string, title?: string) => {
    const key = `${planId || ''} ${title || ''}`.toLowerCase();
    if (key.includes('loss') || key.includes('shed') || key.includes('burn')) return <Flame className="w-4 h-4 text-rose-500" />;
    if (key.includes('gain') || key.includes('muscle') || key.includes('bulk')) return <TrendingUp className="w-4 h-4 text-amber-500" />;
    if (key.includes('balance') || key.includes('maintain') || key.includes('scale')) return <Scale className="w-4 h-4 text-emerald-500" />;
    return <Sparkles className="w-4 h-4 text-sky-500" />;
  };

  // Price calculation formula
  const calculatePreviewPrice = (option: IDurationOption, mealsPerDay: '1' | '2' | '3', activeSlot?: string) => {
    // 1. Explicit slot price configured on THIS card
    if (activeSlot && activeSlot !== 'all' && option.slotPrices && (option.slotPrices as any)[activeSlot] && (option.slotPrices as any)[activeSlot] > 0) {
      return (option.slotPrices as any)[activeSlot];
    }

    // 2. Proportional slot price inherited from 1-day trial / daily slot rates
    if (activeSlot && activeSlot !== 'all') {
      const oneDayOption = durationOptions.find(o => Number(o.days) === 1);
      const oneDaySlotPrice = oneDayOption?.slotPrices && (oneDayOption.slotPrices as any)[activeSlot];
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
      const oneDayOption = durationOptions.find(o => Number(o.days) === 1);
      const oneDayMealPrice = oneDayOption?.prices?.[mealsPerDay];
      if (oneDayMealPrice && Number(oneDayMealPrice) > 0) {
        return Math.round(Number(oneDayMealPrice) * option.days * (1 - (option.discount || 0) / 100));
      }
    }

    const mealOption = mealOptions.find(m => m.id === mealsPerDay) || DEFAULT_MEAL_OPTIONS.find(m => m.id === mealsPerDay);
    const multiplier = (mealOption && typeof mealOption.multiplier === 'number' && mealOption.multiplier > 0)
      ? (mealsPerDay === '1' && mealOption.multiplier >= 0.9 ? 0.40 : mealsPerDay === '2' && (mealOption.multiplier >= 0.95 || mealOption.multiplier < 0.3) ? 0.72 : mealOption.multiplier)
      : (mealsPerDay === '1' ? 0.40 : mealsPerDay === '2' ? 0.72 : 1.00);

    // 5. Card base price override scaled by meal multiplier & discount
    const cardPrice = option.price || option.customPrice;
    if (cardPrice && cardPrice > 0) {
      if (mealsPerDay === '3') {
        return Math.round(cardPrice * (1 - (option.discount || 0) / 100));
      }
      return Math.round(cardPrice * multiplier * (1 - (option.discount || 0) / 100));
    }

    // 6. Default plan calculation from base weekly price
    const dailyPrice = (Number(planForm.pricePerWeek || 3000) / 7) * multiplier;
    const basePrice = dailyPrice * option.days;
    const finalPrice = basePrice * (1 - (option.discount || 0) / 100);
    return Math.round(finalPrice);
  };

  // Helper to persist duration options changes immediately to state, localStorage, and backend
  const persistDurationOptions = async (updatedOptions: IDurationOption[], successMsg?: string) => {
    if (!activePlan) return;

    // Always sort by duration in days ascending (e.g. 1-Day, 7-Day, 15-Day, 30-Day)
    const sortedOptions = [...updatedOptions].sort((a, b) => (Number(a.days) || 0) - (Number(b.days) || 0));

    setDurationOptions(sortedOptions);

    const updatedPlan: AdminPlanConfig = {
      ...activePlan,
      title: planForm.title.trim() || activePlan.title,
      subtitle: planForm.subtitle.trim() || activePlan.subtitle,
      pricePerWeek: Number(planForm.pricePerWeek) || activePlan.pricePerWeek,
      dailyCommission: Number(planForm.dailyCommission) >= 0 ? Number(planForm.dailyCommission) : (activePlan.dailyCommission ?? 100),
      calories: planForm.calories.trim() || activePlan.calories,
      description: planForm.description.trim() || activePlan.description,
      popular: Boolean(planForm.popular),
      badge: planForm.popular ? (planForm.badge.trim() || 'MOST POPULAR') : '',
      active: planForm.active !== false,
      mealOptions,
      durationOptions: sortedOptions
    };

    let updatedPlans: AdminPlanConfig[];
    if (syncPackagesToAllPlans) {
      updatedPlans = plans.map(p => {
        if (p.id === activePlan.id) {
          return updatedPlan;
        }
        return {
          ...p,
          popular: updatedPlan.popular ? false : p.popular,
          badge: updatedPlan.popular ? '' : p.badge,
          durationOptions: sortedOptions
        };
      });
    } else {
      updatedPlans = plans.map(p => {
        if (p.id === activePlan.id) {
          return updatedPlan;
        }
        return {
          ...p,
          popular: updatedPlan.popular ? false : p.popular,
          badge: updatedPlan.popular ? '' : p.badge
        };
      });
    }

    onPlansUpdated(updatedPlans);
    saveAdminPlans(updatedPlans);

    try {
      if (syncPackagesToAllPlans) {
        await Promise.all([
          updateBackendPlan(activePlan.id, {
            title: updatedPlan.title,
            subtitle: updatedPlan.subtitle,
            pricePerWeek: updatedPlan.pricePerWeek,
            dailyCommission: updatedPlan.dailyCommission,
            calories: updatedPlan.calories,
            description: updatedPlan.description,
            benefits: updatedPlan.benefits,
            mealOptions: updatedPlan.mealOptions,
            durationOptions: updatedPlan.durationOptions,
            active: updatedPlan.active,
            popular: updatedPlan.popular,
            badge: updatedPlan.badge
          }),
          ...plans
            .filter(p => p.id !== activePlan.id)
            .map(p => updateBackendPlan(p.id, {
              durationOptions: sortedOptions,
              ...(updatedPlan.popular ? { popular: false, badge: '' } : {})
            }))
        ]);
      } else {
        await Promise.all([
          updateBackendPlan(activePlan.id, {
            title: updatedPlan.title,
            subtitle: updatedPlan.subtitle,
            pricePerWeek: updatedPlan.pricePerWeek,
            dailyCommission: updatedPlan.dailyCommission,
            calories: updatedPlan.calories,
            description: updatedPlan.description,
            benefits: updatedPlan.benefits,
            mealOptions: updatedPlan.mealOptions,
            durationOptions: updatedPlan.durationOptions,
            active: updatedPlan.active,
            popular: updatedPlan.popular,
            badge: updatedPlan.badge
          }),
          ...(updatedPlan.popular
            ? plans.filter(p => p.id !== activePlan.id).map(p => updateBackendPlan(p.id, { popular: false, badge: '' }))
            : [])
        ]);
      }
      if (successMsg) toast.success(successMsg);
    } catch {
      if (successMsg) toast.success(`${successMsg} (Saved locally)`);
    }
  };

  // Save all changes for the selected plan
  const handleSaveAll = async () => {
    if (!activePlan) return;
    setIsSaving(true);

    const sortedDurationOptions = [...durationOptions].sort((a, b) => (Number(a.days) || 0) - (Number(b.days) || 0));

    const benefits = planForm.benefitsText
      .split('\n')
      .map(b => b.trim())
      .filter(Boolean);

    const updatedPlan: AdminPlanConfig = {
      ...activePlan,
      title: planForm.title.trim(),
      subtitle: planForm.subtitle.trim(),
      pricePerWeek: Number(planForm.pricePerWeek) || 3000,
      dailyCommission: Number(planForm.dailyCommission) >= 0 ? Number(planForm.dailyCommission) : 100,
      calories: planForm.calories.trim(),
      description: planForm.description.trim(),
      benefits: benefits.length > 0 ? benefits : (activePlan.benefits || []),
      popular: Boolean(planForm.popular),
      badge: planForm.popular ? (planForm.badge.trim() || 'MOST POPULAR') : '',
      active: planForm.active !== false,
      mealOptions,
      durationOptions: sortedDurationOptions
    };

    let updatedPlans: AdminPlanConfig[];
    if (syncPackagesToAllPlans) {
      updatedPlans = plans.map(p => {
        if (p.id === activePlan.id) return updatedPlan;
        return {
          ...p,
          popular: planForm.popular ? false : p.popular,
          durationOptions: sortedDurationOptions
        };
      });
    } else {
      updatedPlans = plans.map(p => {
        if (p.id === activePlan.id) return updatedPlan;
        if (planForm.popular) return { ...p, popular: false };
        return p;
      });
    }
    onPlansUpdated(updatedPlans);
    saveAdminPlans(updatedPlans);

    try {
      if (syncPackagesToAllPlans) {
        await Promise.all([
          updateBackendPlan(activePlan.id, {
            title: updatedPlan.title,
            subtitle: updatedPlan.subtitle,
            pricePerWeek: updatedPlan.pricePerWeek,
            dailyCommission: updatedPlan.dailyCommission,
            calories: updatedPlan.calories,
            description: updatedPlan.description,
            benefits: updatedPlan.benefits,
            mealOptions: updatedPlan.mealOptions,
            durationOptions: updatedPlan.durationOptions,
            active: updatedPlan.active,
            popular: updatedPlan.popular,
            badge: updatedPlan.badge
          }),
          ...plans
            .filter(p => p.id !== activePlan.id)
            .map(p => updateBackendPlan(p.id, { durationOptions: sortedDurationOptions }))
        ]);
      } else {
        await updateBackendPlan(activePlan.id, {
          title: updatedPlan.title,
          subtitle: updatedPlan.subtitle,
          pricePerWeek: updatedPlan.pricePerWeek,
          dailyCommission: updatedPlan.dailyCommission,
          calories: updatedPlan.calories,
          description: updatedPlan.description,
          benefits: updatedPlan.benefits,
          mealOptions: updatedPlan.mealOptions,
          durationOptions: updatedPlan.durationOptions,
          active: updatedPlan.active,
          popular: updatedPlan.popular,
          badge: updatedPlan.badge
        });
      }
      toast.success(`Settings for "${updatedPlan.title}" saved successfully!`);
    } catch {
      toast.success(`Saved locally! (Backend offline)`);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Add Plan Modal (Choose Your Path card)
  const handleOpenAddPlanModal = () => {
    setAddPlanForm({
      title: '',
      subtitle: 'Customize your daily meal routine and subscription duration. The longer you commit, the more you save.',
      pricePerWeek: 3000,
      dailyCommission: getAdminCommissionRate(),
      calories: '1500 - 2000 kcal/day',
      description: 'Fresh chef-prepared meals crafted to meet your goals.',
      benefitsText: 'High protein\nBalanced macros\nNutrient dense',
      popular: false,
      badge: 'MOST POPULAR'
    });
    setIsAddPlanModalOpen(true);
  };

  // Create new Plan (Choose Your Path card)
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPlanForm.title.trim()) {
      toast.error('Plan title is required');
      return;
    }

    const slug = addPlanForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = plans.find(p => p.id === slug);
    const finalId = existing ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

    const benefits = addPlanForm.benefitsText
      .split('\n')
      .map(b => b.trim())
      .filter(Boolean);

    const newPlanObj: AdminPlanConfig = {
      id: finalId,
      title: addPlanForm.title.trim(),
      subtitle: addPlanForm.subtitle.trim(),
      description: addPlanForm.description.trim(),
      pricePerWeek: Number(addPlanForm.pricePerWeek) || 3000,
      dailyCommission: Number(addPlanForm.dailyCommission) >= 0 ? Number(addPlanForm.dailyCommission) : 100,
      calories: addPlanForm.calories.trim() || '1500 - 2000 kcal/day',
      benefits: benefits.length > 0 ? benefits : ['High protein', 'Balanced macros'],
      durationOptions: DEFAULT_DURATION_OPTIONS,
      mealOptions: DEFAULT_MEAL_OPTIONS,
      active: true,
      popular: Boolean(addPlanForm.popular),
      badge: addPlanForm.popular ? (addPlanForm.badge.trim() || 'MOST POPULAR') : '',
      order: plans.length + 1
    };

    let updatedPlans = plans.map(p => newPlanObj.popular ? { ...p, popular: false } : p);
    updatedPlans.push(newPlanObj);

    onPlansUpdated(updatedPlans);
    saveAdminPlans(updatedPlans);
    setSelectedPlanId(finalId);
    setIsAddPlanModalOpen(false);

    try {
      await createBackendPlan({
        planId: finalId,
        ...newPlanObj
      });
      toast.success(`Plan "${newPlanObj.title}" created successfully and live on Choose Your Path!`);
    } catch {
      toast.success(`Plan "${newPlanObj.title}" saved locally!`);
    }
  };

  // Delete Plan (Choose Your Path card)
  const handleDeletePlan = (planIdToDelete: string) => {
    if (plans.length <= 1) {
      toast.error('At least one meal plan is required for "Choose Your Path"');
      return;
    }

    const planToDelete = plans.find(p => p.id === planIdToDelete);
    const planTitle = planToDelete?.title || 'this plan';

    showConfirmToast({
      title: `Delete "${planTitle}" from Choose Your Path?`,
      description: 'This will remove the plan card from the homepage and configuration. This action cannot be undone.',
      confirmText: 'Delete Plan',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white',
      onConfirm: async () => {
        try {
          await deleteBackendPlan(planIdToDelete);
        } catch (err) {
          console.warn('Backend delete fallback:', err);
        }

        const updatedPlans = plans.filter(p => p.id !== planIdToDelete);
        onPlansUpdated(updatedPlans);
        saveAdminPlans(updatedPlans);

        const nextPlan = updatedPlans[0];
        if (nextPlan) {
          setSelectedPlanId(nextPlan.id);
        }

        toast.success(`Plan "${planTitle}" deleted from Choose Your Path!`);
      }
    });
  };

  // Package Modal Open (Add)
  const handleOpenAddPackage = () => {
    setPackageModalMode('create');
    setEditingPackageId(null);
    setPackageForm({
      id: `${Date.now()}-plan`,
      title: 'New Duration Plan',
      days: 14,
      description: 'Ideal 2-week transformation plan.',
      discount: 5,
      popular: false,
      badge: '',
      price: '5500',
      customPrice: '5500',
      price1Meal: '',
      price2Meals: '',
      priceBreakfast: '',
      priceLunch: '',
      priceDinner: '',
      priceBreakfastLunch: '',
      priceLunchDinner: '',
      priceBreakfastDinner: '',
      featuresText: '{meal_count} Meals daily\nFree daily delivery\n{plan_title} macros'
    });
    setIsPackageModalOpen(true);
  };

  // Package Modal Open (Edit)
  const handleOpenEditPackage = (pkg: IDurationOption) => {
    setPackageModalMode('edit');
    setEditingPackageId(pkg.id);
    const rawPrice = pkg.price || pkg.customPrice || pkg.prices?.['3'] || Math.round((Number(planForm.pricePerWeek || 3000) / 7) * pkg.days);
    setPackageForm({
      id: pkg.id,
      title: pkg.title,
      days: pkg.days,
      description: pkg.description,
      discount: pkg.discount,
      popular: pkg.popular,
      badge: pkg.badge || (pkg.popular ? 'MOST POPULAR' : ''),
      price: rawPrice ? String(rawPrice) : '',
      customPrice: rawPrice ? String(rawPrice) : '',
      price1Meal: pkg.prices?.['1'] ? String(pkg.prices['1']) : '',
      price2Meals: pkg.prices?.['2'] ? String(pkg.prices['2']) : '',
      priceBreakfast: pkg.slotPrices?.breakfast ? String(pkg.slotPrices.breakfast) : '',
      priceLunch: pkg.slotPrices?.lunch ? String(pkg.slotPrices.lunch) : '',
      priceDinner: pkg.slotPrices?.dinner ? String(pkg.slotPrices.dinner) : '',
      priceBreakfastLunch: pkg.slotPrices?.['breakfast-lunch'] ? String(pkg.slotPrices['breakfast-lunch']) : '',
      priceLunchDinner: pkg.slotPrices?.['lunch-dinner'] ? String(pkg.slotPrices['lunch-dinner']) : '',
      priceBreakfastDinner: pkg.slotPrices?.['breakfast-dinner'] ? String(pkg.slotPrices['breakfast-dinner']) : '',
      featuresText: (pkg.features && pkg.features.length > 0)
        ? pkg.features.join('\n')
        : '{meal_count} Meals daily\nFree daily delivery\n{plan_title} macros'
    });
    setIsPackageModalOpen(true);
  };

  // Package Save
  const handleSavePackageModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageForm.title.trim()) {
      toast.error('Card title is required');
      return;
    }
    if (Number(packageForm.days) < 1) {
      toast.error('Days must be at least 1');
      return;
    }

    const featuresList = packageForm.featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean);

    const enteredPrice = Number(packageForm.price) || Number(packageForm.customPrice) || undefined;
    const pricesObj: { '1'?: number; '2'?: number; '3'?: number } = {};
    if (packageForm.price1Meal && Number(packageForm.price1Meal) > 0) {
      pricesObj['1'] = Number(packageForm.price1Meal);
    }
    if (packageForm.price2Meals && Number(packageForm.price2Meals) > 0) {
      pricesObj['2'] = Number(packageForm.price2Meals);
    }
    if (enteredPrice) {
      pricesObj['3'] = enteredPrice;
    }

    const slotPricesObj: {
      breakfast?: number;
      lunch?: number;
      dinner?: number;
      'breakfast-lunch'?: number;
      'lunch-dinner'?: number;
      'breakfast-dinner'?: number;
    } = {};
    if (packageForm.priceBreakfast && Number(packageForm.priceBreakfast) > 0) slotPricesObj.breakfast = Number(packageForm.priceBreakfast);
    if (packageForm.priceLunch && Number(packageForm.priceLunch) > 0) slotPricesObj.lunch = Number(packageForm.priceLunch);
    if (packageForm.priceDinner && Number(packageForm.priceDinner) > 0) slotPricesObj.dinner = Number(packageForm.priceDinner);
    if (packageForm.priceBreakfastLunch && Number(packageForm.priceBreakfastLunch) > 0) slotPricesObj['breakfast-lunch'] = Number(packageForm.priceBreakfastLunch);
    if (packageForm.priceLunchDinner && Number(packageForm.priceLunchDinner) > 0) slotPricesObj['lunch-dinner'] = Number(packageForm.priceLunchDinner);
    if (packageForm.priceBreakfastDinner && Number(packageForm.priceBreakfastDinner) > 0) slotPricesObj['breakfast-dinner'] = Number(packageForm.priceBreakfastDinner);

    const newPkg: IDurationOption = {
      id: packageModalMode === 'edit' && editingPackageId ? editingPackageId : (packageForm.id || `${packageForm.days}-day`),
      title: packageForm.title.trim(),
      days: Number(packageForm.days),
      description: packageForm.description.trim(),
      discount: Number(packageForm.discount) || 0,
      popular: Boolean(packageForm.popular),
      badge: packageForm.popular ? (packageForm.badge.trim() || 'MOST POPULAR') : '',
      price: enteredPrice,
      customPrice: enteredPrice,
      prices: Object.keys(pricesObj).length > 0 ? pricesObj : undefined,
      slotPrices: Object.keys(slotPricesObj).length > 0 ? slotPricesObj : undefined,
      features: featuresList.length > 0 ? featuresList : ['{meal_count} Meals daily', 'Free daily delivery', '{plan_title} macros']
    };

    let updatedList: IDurationOption[];
    if (packageModalMode === 'edit') {
      updatedList = durationOptions.map(p => {
        // If this package is marked popular, unmark others unless multiple allowed
        if (newPkg.popular && p.id !== editingPackageId) {
          return { ...p, popular: false };
        }
        return p.id === editingPackageId ? newPkg : p;
      });
    } else {
      updatedList = durationOptions.map(p => newPkg.popular ? { ...p, popular: false } : p);
      updatedList.push(newPkg);
    }

    setIsPackageModalOpen(false);
    await persistDurationOptions(
      updatedList,
      packageModalMode === 'edit'
        ? `Duration card "${newPkg.title}" updated successfully!`
        : `Duration card "${newPkg.title}" added successfully!`
    );
  };

  // Delete Package
  const handleDeletePackage = (pkgId: string) => {
    if (durationOptions.length <= 1) {
      toast.error('At least one duration package is required');
      return;
    }
    const pkgToDelete = durationOptions.find(p => p.id === pkgId);
    const pkgTitle = pkgToDelete?.title || 'package';

    showConfirmToast({
      title: `Remove "${pkgTitle}" duration card?`,
      description: 'Customers will no longer see or be able to subscribe to this duration option.',
      confirmText: 'Remove Card',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white',
      onConfirm: async () => {
        const updated = durationOptions.filter(p => p.id !== pkgId);
        await persistDurationOptions(updated, `Duration package "${pkgTitle}" deleted successfully!`);
      }
    });
  };

  // Toggle Popular
  const handleTogglePopular = async (pkgId: string) => {
    const updated = durationOptions.map(p => {
      const willBePopular = p.id === pkgId ? !p.popular : false;
      return {
        ...p,
        popular: willBePopular,
        badge: willBePopular ? (p.badge || 'MOST POPULAR') : ''
      };
    });
    await persistDurationOptions(updated, 'Popular duration package updated!');
  };

  const twoMealLabels: Record<string, string> = {
    'breakfast-lunch': 'Breakfast & Lunch',
    'lunch-dinner': 'Lunch & Dinner',
    'breakfast-dinner': 'Breakfast & Dinner',
  };

  return (
    <div className="space-y-8">
      {/* 1. Plan Selector Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Configure Plan &quot;Choose Your Path&quot; Cards
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Add, edit, or remove the meal plan cards displayed in the homepage &quot;Choose Your Path&quot; section.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleOpenAddPlanModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Plan Card</span>
            </button>

            <a
              href={`/plan/${selectedPlanId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Customer Page</span>
            </a>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {[...plans].sort((a, b) => getPlanSortRank(a) - getPlanSortRank(b)).map(p => {
            const isSelected = selectedPlanId === p.id;
            return (
              <div
                key={p.id}
                className={`group flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-emerald-500/30'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedPlanId(p.id)}
                  className="flex items-center gap-2"
                >
                  {getPlanIcon(p.id, p.title)}
                  <span>{p.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                  }`}>
                    ₹{p.pricePerWeek}/wk
                  </span>
                </button>

                {plans.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlan(p.id);
                    }}
                    className={`p-1 rounded-lg transition-colors ml-1 ${
                      isSelected
                        ? 'text-rose-300 hover:text-white hover:bg-rose-600/50'
                        : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title={`Delete "${p.title}" card from Choose Your Path`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleOpenAddPlanModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border border-dashed border-emerald-300 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Plan Card</span>
          </button>
        </div>
      </div>

      {/* 2. Page Header & Base Plan Settings */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>Page Header & Plan Information (&quot;Choose Your Path&quot; Card)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit the title, price, benefits, and homepage highlights for this meal plan.
            </p>
          </div>

          {plans.length > 1 && (
            <button
              type="button"
              onClick={() => handleDeletePlan(activePlan.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
              title={`Delete ${activePlan.title} from Choose Your Path`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Plan</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Plan Title</label>
            <input
              type="text"
              value={planForm.title}
              onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              placeholder="e.g. Weight Loss"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Displayed as &quot;{planForm.title || 'Plan'} Subscription&quot;</span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Base Weekly Price (₹)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
              <input
                type="number"
                value={planForm.pricePerWeek}
                onChange={(e) => setPlanForm({ ...planForm, pricePerWeek: Number(e.target.value) })}
                className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                placeholder="3000"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Base anchor price used on homepage and to calculate duration options</span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Platform Commission (₹/day)</span>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Daily Fee</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                value={planForm.dailyCommission}
                onChange={(e) => setPlanForm({ ...planForm, dailyCommission: Math.max(0, Number(e.target.value)) })}
                className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                placeholder="100"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Take rate from subscription (e.g. ₹100/day = ₹3,000 platform profit on 30 days)</span>
          </div>

          <div className="md:col-span-3">
            <label className="block font-bold text-slate-700 mb-1">Page Subtitle / Tagline</label>
            <input
              type="text"
              value={planForm.subtitle}
              onChange={(e) => setPlanForm({ ...planForm, subtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              placeholder="Customize your daily meal routine and subscription duration. The longer you commit, the more you save."
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Calories Target</label>
            <input
              type="text"
              value={planForm.calories}
              onChange={(e) => setPlanForm({ ...planForm, calories: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              placeholder="1200 - 1500 kcal/day"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Short Description</label>
            <input
              type="text"
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              placeholder="Calorie-controlled, nutrient-dense meals..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">
              Card Benefits / Bullet Points (One per line)
            </label>
            <textarea
              rows={3}
              value={planForm.benefitsText}
              onChange={(e) => setPlanForm({ ...planForm, benefitsText: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              placeholder="High protein&#10;Low carb&#10;Metabolism boosting"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              These appear as green checkmark bullets on the homepage &quot;Choose Your Path&quot; card.
            </span>
          </div>

          {/* Active Status on Choose Your Path */}
          <div className="md:col-span-1 pt-3 border-t border-slate-100 flex items-center justify-between gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div>
              <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-800 text-xs">
                <input
                  type="checkbox"
                  checked={planForm.active}
                  onChange={(e) => setPlanForm({ ...planForm, active: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-slate-900 font-extrabold">Show on "Choose Your Path"</span>
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5 ml-6">
                Display this card on the homepage
              </p>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
              planForm.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {planForm.active ? 'Active' : 'Hidden'}
            </span>
          </div>

          <div className="md:col-span-2 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100/60">
            <div>
              <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-800 text-xs">
                <input
                  type="checkbox"
                  checked={planForm.popular}
                  onChange={(e) => setPlanForm({ ...planForm, popular: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-emerald-950 font-extrabold">Highlight as "Most Popular" Plan on Homepage</span>
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5 ml-6">
                Only this single plan will show the highlighted card style and badge on the homepage "Choose Your Path" section.
              </p>
            </div>

            {planForm.popular && (
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-bold text-emerald-900">Badge Text:</label>
                <input
                  type="text"
                  value={planForm.badge}
                  onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                  className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-extrabold text-emerald-800 focus:outline-hidden focus:border-emerald-500"
                  placeholder="MOST POPULAR"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Duration Cards Manager */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              <span>Subscription Duration Cards ({durationOptions.length} Cards)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manually edit each card's price, duration (days), discounts, and features.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 transition-colors mr-1">
              <input
                type="checkbox"
                checked={syncPackagesToAllPlans}
                onChange={e => setSyncPackagesToAllPlans(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Apply to all plans</span>
            </label>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Saving...' : 'Save Cards'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddPackage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Duration Card</span>
            </button>
          </div>
        </div>

        {/* Choose Meals Per Day Selector */}
        <div className="max-w-xl mx-auto w-full bg-slate-50/80 p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs text-center my-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Choose Meals Per Day
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-2.5">
            {mealOptions.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPreviewMealsPerDay(m.id)}
                className={`py-3 px-2 rounded-2xl border text-center transition-all cursor-pointer ${
                  previewMealsPerDay === m.id
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-extrabold shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs sm:text-sm font-extrabold">{m.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">{m.sub}</div>
              </button>
            ))}
          </div>

          {previewMealsPerDay === '1' && (
            <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-center gap-1.5 animate-in fade-in duration-200">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Choose slot:</span>
              {(['breakfast', 'lunch', 'dinner'] as const).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setPreviewSlot(slot)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold capitalize transition-all border cursor-pointer ${
                    previewSlot === slot
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {slot} {slot === 'lunch' ? '★' : ''}
                </button>
              ))}
            </div>
          )}

          {previewMealsPerDay === '2' && (
            <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-center gap-1.5 animate-in fade-in duration-200">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Choose 2 meals:</span>
              {[
                { id: 'breakfast-lunch', label: 'Breakfast & Lunch' },
                { id: 'lunch-dinner', label: 'Lunch & Dinner', popular: true },
                { id: 'breakfast-dinner', label: 'Breakfast & Dinner' },
              ].map((combo) => (
                <button
                  key={combo.id}
                  type="button"
                  onClick={() => setPreviewTwoSlot(combo.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all border cursor-pointer ${
                    previewTwoSlot === combo.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {combo.label} {combo.popular ? '★' : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Packages Grid */}
        <div className={`grid grid-cols-1 ${
          durationOptions.length === 1 ? 'max-w-md mx-auto sm:grid-cols-1' :
          durationOptions.length === 2 ? 'sm:grid-cols-2 max-w-3xl mx-auto' :
          durationOptions.length === 3 ? 'sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto' :
          'sm:grid-cols-2 lg:grid-cols-4'
        } gap-4 pt-2`}>
          {durationOptions.map((pkg) => {
            const currentSlot = previewMealsPerDay === '1' ? previewSlot : previewMealsPerDay === '2' ? previewTwoSlot : undefined;
            const previewPrice = calculatePreviewPrice(pkg, previewMealsPerDay, currentSlot);
            const isExplicitSlot = Boolean(currentSlot && pkg.slotPrices && (pkg.slotPrices as any)[currentSlot] > 0);
            const oneDayOption = durationOptions.find(o => Number(o.days) === 1);
            const isInheritedSlot = Boolean(!isExplicitSlot && currentSlot && oneDayOption?.slotPrices && (oneDayOption.slotPrices as any)[currentSlot] > 0);
            const slotSummary = previewMealsPerDay === '1'
              ? `1 Meal/day (${previewSlot.charAt(0).toUpperCase() + previewSlot.slice(1)})`
              : previewMealsPerDay === '2'
              ? `2 Meals/day (${twoMealLabels[previewTwoSlot] || 'Breakfast & Lunch'})`
              : `${previewMealsPerDay} Meals daily`;

            return (
              <div 
                key={pkg.id}
                className={`relative rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                  pkg.popular 
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider py-0.5 px-2.5 rounded-full shadow-xs">
                    {pkg.badge || 'Most Popular'}
                  </div>
                )}

                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-extrabold text-slate-900 text-sm">{pkg.title}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                      {pkg.days} {pkg.days === 1 ? 'Day' : 'Days'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-3 min-h-[32px] line-clamp-2 leading-relaxed">
                    {pkg.description}
                  </p>

                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-2xl font-black text-slate-900">₹{previewPrice}</span>
                    <span className="text-[11px] text-slate-400">
                      {pkg.days === 1 ? '/day' : 'total'}
                    </span>
                    {isExplicitSlot && (
                      <span className="ml-auto text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Slot Price
                      </span>
                    )}
                    {isInheritedSlot && (
                      <span className="ml-auto text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                        Slot Rate
                      </span>
                    )}
                  </div>

                  {pkg.discount > 0 ? (
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 mb-3">
                      Save {pkg.discount}%
                    </span>
                  ) : (
                    <div className="h-6 mb-3"></div>
                  )}

                  <ul className="space-y-1.5 text-[11px] text-slate-600 mb-4 border-t border-slate-100 pt-3">
                    {(pkg.features || ['{meal_count} Meals daily', 'Free daily delivery', '{plan_title} macros']).slice(0, 4).map((f, i) => {
                      const resolved = f
                        .replace('{meal_count} Meals daily', slotSummary)
                        .replace('{meal_count}', previewMealsPerDay)
                        .replace('{plan_title}', planForm.title || 'Plan');
                      return (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{resolved}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => handleTogglePopular(pkg.id)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                      pkg.popular
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {pkg.popular ? '★ Popular' : 'Mark Popular'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPackage(pkg)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg transition-colors cursor-pointer"
                      title="Edit Card"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Edit Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Edit / Add Duration Card Modal */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {packageModalMode === 'edit' ? `Edit ${packageForm.title || 'Duration Card'}` : 'Add Duration Card'}
                  </h3>
                  <p className="text-xs text-slate-500">Manually set card price, duration, discounts, and slot prices</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPackageModalOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePackageModal} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Card Title</label>
                    <input
                      type="text"
                      required
                      value={packageForm.title}
                      onChange={(e) => setPackageForm({ ...packageForm, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                      placeholder="e.g. 7 Day Plan"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={packageForm.days}
                      onChange={(e) => setPackageForm({ ...packageForm, days: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                      placeholder="7"
                    />
                  </div>
                </div>

                {/* Manual Pricing Section */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Manual Card Pricing
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Direct prices for customers</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Card Price (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          required
                          value={packageForm.price}
                          onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value, customPrice: e.target.value })}
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-extrabold text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                          placeholder="e.g. 2800"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Full price for 3 meals daily</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Discount % Badge</label>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={packageForm.discount}
                        onChange={(e) => setPackageForm({ ...packageForm, discount: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                        placeholder="0"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">e.g. 5 shows &quot;Save 5%&quot; badge</span>
                    </div>
                  </div>

                  {/* Optional per-meal & per-slot price overrides */}
                  {(() => {
                    const oneDayCard = durationOptions.find(o => Number(o.days) === 1 && o.id !== editingPackageId);
                    const modalDays = Number(packageForm.days) || 1;
                    const modalDiscount = Number(packageForm.discount) || 0;
                    const calcAutoSlotPrice = (slotKey: string, fallbackRatio: number) => {
                      if (oneDayCard?.slotPrices && (oneDayCard.slotPrices as any)[slotKey]) {
                        return Math.round(Number((oneDayCard.slotPrices as any)[slotKey]) * modalDays * (1 - modalDiscount / 100));
                      }
                      const baseP = Number(packageForm.price || packageForm.customPrice) || 0;
                      return Math.round(baseP * fallbackRatio * (1 - modalDiscount / 100));
                    };
                    const auto1Meal = Number(packageForm.price) > 0 ? Math.round(Number(packageForm.price) * 0.40) : 0;
                    const auto2Meal = Number(packageForm.price) > 0 ? Math.round(Number(packageForm.price) * 0.72) : 0;

                    return (
                      <div className="pt-3 border-t border-slate-200/80 space-y-3">
                        <div>
                          <span className="text-[11px] font-extrabold text-slate-800 block">
                            Custom Prices for Different Slots &amp; Meals (₹)
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Optionally set custom prices for specific meal counts or individual slots. Leave any blank to scale automatically.
                          </span>
                        </div>

                        {/* 1 Meal / Day Slots */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                              1 Meal / Day Slots
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">General 1-Meal Price:</span>
                              <input
                                type="number"
                                min="0"
                                value={packageForm.price1Meal}
                                onChange={(e) => setPackageForm({ ...packageForm, price1Meal: e.target.value })}
                                className="w-28 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                                placeholder={auto1Meal > 0 ? `Auto (₹${auto1Meal})` : "Auto (~40%)"}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Breakfast (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={packageForm.priceBreakfast}
                                onChange={(e) => setPackageForm({ ...packageForm, priceBreakfast: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                                placeholder={calcAutoSlotPrice('breakfast', 0.35) > 0 ? `Auto (₹${calcAutoSlotPrice('breakfast', 0.35)})` : "e.g. 180"}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Lunch (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={packageForm.priceLunch}
                                onChange={(e) => setPackageForm({ ...packageForm, priceLunch: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                                placeholder={calcAutoSlotPrice('lunch', 0.40) > 0 ? `Auto (₹${calcAutoSlotPrice('lunch', 0.40)})` : "e.g. 220"}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Dinner (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={packageForm.priceDinner}
                                onChange={(e) => setPackageForm({ ...packageForm, priceDinner: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                                placeholder={calcAutoSlotPrice('dinner', 0.40) > 0 ? `Auto (₹${calcAutoSlotPrice('dinner', 0.40)})` : "e.g. 200"}
                              />
                            </div>
                          </div>
                        </div>

                        {/* 2 Meals / Day Slots */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                              2 Meals / Day Slots
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">General 2-Meal Price:</span>
                              <input
                                type="number"
                                min="0"
                                value={packageForm.price2Meals}
                                onChange={(e) => setPackageForm({ ...packageForm, price2Meals: e.target.value })}
                                className="w-28 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                                placeholder={auto2Meal > 0 ? `Auto (₹${auto2Meal})` : "Auto (~72%)"}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Breakfast &amp; Lunch (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={packageForm.priceBreakfastLunch}
                                onChange={(e) => setPackageForm({ ...packageForm, priceBreakfastLunch: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                                placeholder={calcAutoSlotPrice('breakfast-lunch', 0.68) > 0 ? `Auto (₹${calcAutoSlotPrice('breakfast-lunch', 0.68)})` : "e.g. 350"}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Lunch &amp; Dinner (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={packageForm.priceLunchDinner}
                                onChange={(e) => setPackageForm({ ...packageForm, priceLunchDinner: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                                placeholder={calcAutoSlotPrice('lunch-dinner', 0.76) > 0 ? `Auto (₹${calcAutoSlotPrice('lunch-dinner', 0.76)})` : "e.g. 400"}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Breakfast &amp; Dinner (₹)</label>
                              <input
                                type="number"
                                min="0"
                                value={packageForm.priceBreakfastDinner}
                                onChange={(e) => setPackageForm({ ...packageForm, priceBreakfastDinner: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                                placeholder={calcAutoSlotPrice('breakfast-dinner', 0.70) > 0 ? `Auto (₹${calcAutoSlotPrice('breakfast-dinner', 0.70)})` : "e.g. 380"}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Card Subtitle / Description</label>
                  <input
                    type="text"
                    value={packageForm.description}
                    onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                    placeholder="e.g. Build healthy habits over two weeks."
                  />
                </div>

                {/* Popular Card Toggle */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-emerald-950 block">Highlight as "Most Popular" Card</span>
                    <span className="text-[11px] text-emerald-700 block">
                      Gives the card the prominent green background and top floating badge
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={packageForm.popular}
                    onChange={(e) => setPackageForm({ ...packageForm, popular: e.target.checked })}
                    className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>

                {packageForm.popular && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={packageForm.badge}
                      onChange={(e) => setPackageForm({ ...packageForm, badge: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                      placeholder="MOST POPULAR"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Card Features / Bullet Points (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={packageForm.featuresText}
                    onChange={(e) => setPackageForm({ ...packageForm, featuresText: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                    placeholder="{meal_count} Meals daily&#10;Free daily delivery&#10;{plan_title} macros"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Use {'{meal_count}'} for dynamic meal slot and {'{plan_title}'} for plan name.
                  </span>
                </div>
              </div>

              {/* Modal Footer (Always visible) */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
                >
                  {packageModalMode === 'edit' ? 'Save Card Changes' : 'Add Duration Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add Plan Modal (Choose Your Path card) */}
      {isAddPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsAddPlanModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Add Choose Your Path Card
                </h3>
                <p className="text-xs text-slate-500">
                  Create a new meal plan card for the homepage &amp; subscription page
                </p>
              </div>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Plan Title</label>
                  <input
                    type="text"
                    required
                    value={addPlanForm.title}
                    onChange={(e) => setAddPlanForm({ ...addPlanForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                    placeholder="e.g. Keto Diet"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base Weekly Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={addPlanForm.pricePerWeek}
                    onChange={(e) => setAddPlanForm({ ...addPlanForm, pricePerWeek: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                    placeholder="3200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Platform Commission (₹/day)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={addPlanForm.dailyCommission}
                    onChange={(e) => setAddPlanForm({ ...addPlanForm, dailyCommission: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={addPlanForm.subtitle}
                  onChange={(e) => setAddPlanForm({ ...addPlanForm, subtitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                  placeholder="Customize your daily meal routine..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Calories Target</label>
                <input
                  type="text"
                  value={addPlanForm.calories}
                  onChange={(e) => setAddPlanForm({ ...addPlanForm, calories: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                  placeholder="1400 - 1600 kcal/day"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Short Description</label>
                <input
                  type="text"
                  value={addPlanForm.description}
                  onChange={(e) => setAddPlanForm({ ...addPlanForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                  placeholder="Fresh chef-prepared meals crafted to meet your goals."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Card Benefits / Bullet Points (One per line)
                </label>
                <textarea
                  rows={3}
                  value={addPlanForm.benefitsText}
                  onChange={(e) => setAddPlanForm({ ...addPlanForm, benefitsText: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                  placeholder="High protein&#10;Low carb&#10;Metabolism boosting"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  These appear as checkmark bullet points on the homepage &quot;Choose Your Path&quot; card.
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-emerald-950 block">Highlight as &quot;Most Popular&quot; Card</span>
                  <span className="text-[11px] text-emerald-700 block">
                    Shows the prominent green card on the homepage &quot;Choose Your Path&quot;
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={addPlanForm.popular}
                  onChange={(e) => setAddPlanForm({ ...addPlanForm, popular: e.target.checked })}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPlanModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-xs"
                >
                  Add Plan Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
