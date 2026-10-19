import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
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
  Percent, 
  Layers, 
  HelpCircle,
  Eye,
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
    popular: false,
    badge: 'MOST POPULAR',
    benefitsText: ''
  });

  const [mealOptions, setMealOptions] = useState<IMealOption[]>(DEFAULT_MEAL_OPTIONS);
  const [durationOptions, setDurationOptions] = useState<IDurationOption[]>(DEFAULT_DURATION_OPTIONS);
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
    customPrice: string;
    featuresText: string;
  }>({
    id: '',
    title: '',
    days: 7,
    description: '',
    discount: 0,
    popular: false,
    badge: '',
    customPrice: '',
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
        popular: Boolean(activePlan.popular),
        badge: activePlan.badge || (activePlan.popular ? 'MOST POPULAR' : ''),
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
  const calculatePreviewPrice = (option: IDurationOption, mealsPerDay: '1' | '2' | '3') => {
    if (option.customPrice && option.customPrice > 0) {
      return option.customPrice;
    }
    const mealOption = mealOptions.find(m => m.id === mealsPerDay) || DEFAULT_MEAL_OPTIONS.find(m => m.id === mealsPerDay);
    const multiplier = mealOption ? mealOption.multiplier : 1;
    const dailyPrice = (Number(planForm.pricePerWeek) / 7) * multiplier;
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
      mealOptions,
      durationOptions: sortedOptions
    };

    const updatedPlans = plans.map(p => p.id === activePlan.id ? updatedPlan : p);
    onPlansUpdated(updatedPlans);
    saveAdminPlans(updatedPlans);

    try {
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
      mealOptions,
      durationOptions: sortedDurationOptions
    };

    const updatedPlans = plans.map(p => {
      if (p.id === activePlan.id) return updatedPlan;
      if (planForm.popular) return { ...p, popular: false };
      return p;
    });
    onPlansUpdated(updatedPlans);
    saveAdminPlans(updatedPlans);

    try {
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
  const handleDeletePlan = async (planIdToDelete: string) => {
    if (plans.length <= 1) {
      toast.error('At least one meal plan is required for "Choose Your Path"');
      return;
    }

    const planToDelete = plans.find(p => p.id === planIdToDelete);
    const planTitle = planToDelete?.title || 'this plan';

    if (!window.confirm(`Are you sure you want to delete "${planTitle}" from Choose Your Path? This action cannot be undone.`)) {
      return;
    }

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
  };

  // Multiplier change handler
  const handleMultiplierChange = (id: '1' | '2' | '3', key: keyof IMealOption, value: any) => {
    setMealOptions(prev => prev.map(m => m.id === id ? { ...m, [key]: value } : m));
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
      customPrice: '',
      featuresText: '{meal_count} Meals daily\nFree daily delivery\n{plan_title} macros'
    });
    setIsPackageModalOpen(true);
  };

  // Package Modal Open (Edit)
  const handleOpenEditPackage = (pkg: IDurationOption) => {
    setPackageModalMode('edit');
    setEditingPackageId(pkg.id);
    setPackageForm({
      id: pkg.id,
      title: pkg.title,
      days: pkg.days,
      description: pkg.description,
      discount: pkg.discount,
      popular: pkg.popular,
      badge: pkg.badge || (pkg.popular ? 'MOST POPULAR' : ''),
      customPrice: pkg.customPrice ? String(pkg.customPrice) : '',
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
      toast.error('Package title is required');
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

    const newPkg: IDurationOption = {
      id: packageModalMode === 'edit' && editingPackageId ? editingPackageId : (packageForm.id || `${packageForm.days}-day`),
      title: packageForm.title.trim(),
      days: Number(packageForm.days),
      description: packageForm.description.trim(),
      discount: Number(packageForm.discount) || 0,
      popular: Boolean(packageForm.popular),
      badge: packageForm.popular ? (packageForm.badge.trim() || 'MOST POPULAR') : '',
      customPrice: packageForm.customPrice ? Number(packageForm.customPrice) : undefined,
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
        ? `Duration package "${newPkg.title}" updated successfully!`
        : `Duration package "${newPkg.title}" added successfully!`
    );
  };

  // Delete Package
  const handleDeletePackage = async (pkgId: string) => {
    if (durationOptions.length <= 1) {
      toast.error('At least one duration package is required');
      return;
    }
    const pkgToDelete = durationOptions.find(p => p.id === pkgId);
    const pkgTitle = pkgToDelete?.title || 'package';
    if (!window.confirm(`Are you sure you want to remove "${pkgTitle}"?`)) return;

    const updated = durationOptions.filter(p => p.id !== pkgId);
    await persistDurationOptions(updated, `Duration package "${pkgTitle}" deleted successfully!`);
  };

  // Toggle Popular
  const handleTogglePopular = async (pkgId: string) => {
    const updated = durationOptions.map(p => ({
      ...p,
      popular: p.id === pkgId ? !p.popular : false,
      badge: p.id === pkgId && !p.popular ? 'MOST POPULAR' : (p.id === pkgId ? '' : p.badge)
    }));
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

      {/* 3. Meals Per Day Configuration & Multipliers */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-600" />
              <span>Meals Per Day & Multipliers ("Choose Meals Per Day")</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control the buttons customers click to pick 1, 2, or 3 meals daily, and how much the base price scales.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mealOptions.map((opt) => (
            <div key={opt.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">{opt.id} Meal Option</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  {Math.round(opt.multiplier * 100)}% of daily rate
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Button Title</label>
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => handleMultiplierChange(opt.id, 'label', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Subtitle / Hint</label>
                <input
                  type="text"
                  value={opt.sub}
                  onChange={(e) => handleMultiplierChange(opt.id, 'sub', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Rate Multiplier (0.1 to 1.5)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="2.0"
                  value={opt.multiplier}
                  onChange={(e) => handleMultiplierChange(opt.id, 'multiplier', Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Duration Packages Manager (Cards) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              <span>Subscription Duration Packages (The 4 Cards)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Add, remove, or modify the duration options (1-Day, 7-Day, 15-Day, 30-Day), discounts, and popular badges.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Saving...' : 'Save Packages'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddPackage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Duration Package</span>
            </button>
          </div>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {durationOptions.map((pkg) => {
            const previewPrice = calculatePreviewPrice(pkg, previewMealsPerDay);
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
                    <span className="text-xl font-extrabold text-slate-900">₹{previewPrice}</span>
                    <span className="text-[11px] text-slate-400">
                      {pkg.days === 1 ? '/day' : 'total'}
                    </span>
                  </div>

                  {pkg.discount > 0 ? (
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 mb-3">
                      Save {pkg.discount}%
                    </span>
                  ) : (
                    <div className="h-6 mb-3"></div>
                  )}

                  <ul className="space-y-1.5 text-[11px] text-slate-600 mb-4 border-t border-slate-100 pt-3">
                    {(pkg.features || ['{meal_count} Meals daily', 'Free daily delivery', '{plan_title} macros']).slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {f.replace('{meal_count}', previewMealsPerDay).replace('{plan_title}', planForm.title || 'Plan')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => handleTogglePopular(pkg.id)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                      pkg.popular
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {pkg.popular ? '★ Popular' : 'Mark Popular'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPackage(pkg)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Package"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Package"
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

      {/* 5. Live Interactive Preview (Matches User's Screenshot Exactly!) */}
      <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-black text-slate-900">
              Live Customer Page Preview
            </h3>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              What Customers See
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Interactive preview: test changing meals per day to see calculated prices.
          </p>
        </div>

        {/* Preview Page Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-2">
            {planForm.title || 'Plan'} Subscription
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
            {planForm.subtitle}
          </p>
        </div>

        {/* Preview Meal Configuration Selector */}
        <div className="max-w-xl mx-auto bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Choose Meals Per Day
          </p>
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            {mealOptions.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPreviewMealsPerDay(m.id)}
                className={`py-2.5 px-2 rounded-2xl border text-center transition-all ${
                  previewMealsPerDay === m.id
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:border-emerald-200 hover:bg-white'
                }`}
              >
                <div className="text-xs sm:text-sm font-bold">{m.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">{m.sub}</div>
              </button>
            ))}
          </div>

          {previewMealsPerDay === '1' && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-1.5 animate-in fade-in duration-200">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Choose slot:</span>
              {(['breakfast', 'lunch', 'dinner'] as const).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setPreviewSlot(slot)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold capitalize transition-all border ${
                    previewSlot === slot
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {slot} {slot === 'lunch' ? '★' : ''}
                </button>
              ))}
            </div>
          )}

          {previewMealsPerDay === '2' && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-1.5 animate-in fade-in duration-200">
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
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${
                    previewTwoSlot === combo.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {combo.label} {combo.popular ? '★' : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preview Duration Cards (Screenshot match) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto">
          {durationOptions.map((opt) => {
            const price = calculatePreviewPrice(opt, previewMealsPerDay);
            const isFeatured = opt.popular;

            const slotSummary = previewMealsPerDay === '1'
              ? `1 Meal/day (${previewSlot.charAt(0).toUpperCase() + previewSlot.slice(1)})`
              : previewMealsPerDay === '2'
              ? `2 Meals/day (${twoMealLabels[previewTwoSlot] || 'Breakfast & Lunch'})`
              : `${previewMealsPerDay} Meals daily`;

            return (
              <div 
                key={opt.id}
                className={`relative flex flex-col p-6 rounded-2xl md:rounded-[28px] transition-transform ${
                  isFeatured 
                    ? 'bg-emerald-600 text-white shadow-xl lg:-translate-y-2 z-10' 
                    : 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-300 text-emerald-900 text-[11px] font-black uppercase tracking-wider py-1 px-3 rounded-full shadow-xs">
                    {opt.badge || 'Most Popular'}
                  </div>
                )}
                
                <h3 className={`text-xl font-bold mb-1 ${isFeatured ? 'text-white' : 'text-slate-900'}`}>{opt.title}</h3>
                <p className={`text-xs mb-5 min-h-[34px] leading-relaxed ${isFeatured ? 'text-emerald-50' : 'text-slate-500'}`}>{opt.description}</p>
                
                <div className="mb-4 flex items-baseline gap-1.5">
                  <span className="text-3xl md:text-4xl font-extrabold">₹{price}</span>
                  <span className={`text-xs font-medium ${isFeatured ? 'text-emerald-200' : 'text-slate-400'}`}>
                    {opt.days === 1 ? '/day' : 'total'}
                  </span>
                </div>

                {opt.discount > 0 ? (
                  <div className={`inline-block mb-6 px-2.5 py-0.5 rounded-full text-[11px] font-bold w-fit ${isFeatured ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                    Save {opt.discount}%
                  </div>
                ) : (
                  <div className="mb-6 h-5"></div>
                )}

                <ul className="space-y-3 mb-8 flex-grow text-xs">
                  {(opt.features || ['{meal_count} Meals daily', 'Free daily delivery', '{plan_title} macros']).map((feature, i) => {
                    const resolved = feature
                      .replace('{meal_count} Meals daily', slotSummary)
                      .replace('{meal_count}', previewMealsPerDay)
                      .replace('{plan_title}', planForm.title || 'Plan');
                    return (
                      <li key={i} className="flex items-center gap-2.5">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${isFeatured ? 'text-emerald-300' : 'text-emerald-500'}`} />
                        <span className="font-medium">{resolved}</span>
                      </li>
                    );
                  })}
                </ul>

                <button 
                  type="button"
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                    isFeatured 
                      ? 'bg-white text-emerald-700 hover:bg-slate-50' 
                      : 'bg-slate-100 text-slate-800 hover:bg-emerald-50 hover:text-emerald-600'
                  }`}
                >
                  Select Plan <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Edit / Add Duration Package Modal */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsPackageModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {packageModalMode === 'edit' ? `Edit ${packageForm.title}` : 'Add Duration Package'}
                </h3>
                <p className="text-xs text-slate-500">Configure pricing, discount, and features for this card</p>
              </div>
            </div>

            <form onSubmit={handleSavePackageModal} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Package Title</label>
                  <input
                    type="text"
                    required
                    value={packageForm.title}
                    onChange={(e) => setPackageForm({ ...packageForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                    placeholder="e.g. 15 Day Plan"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration in Days</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={packageForm.days}
                    onChange={(e) => setPackageForm({ ...packageForm, days: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                    placeholder="15"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Card Hook / Description</label>
                <input
                  type="text"
                  value={packageForm.description}
                  onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                  placeholder="e.g. Build healthy habits over two weeks."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discount % (e.g. 5, 10)</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={packageForm.discount}
                    onChange={(e) => setPackageForm({ ...packageForm, discount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Custom Price Override (Optional ₹)
                  </label>
                  <input
                    type="number"
                    value={packageForm.customPrice}
                    onChange={(e) => setPackageForm({ ...packageForm, customPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                    placeholder="Leave empty for auto"
                  />
                </div>
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                  placeholder="{meal_count} Meals daily&#10;Free daily delivery&#10;{plan_title} macros"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Use {'{meal_count}'} for dynamic meal slot and {'{plan_title}'} for plan name.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-xs"
                >
                  {packageModalMode === 'edit' ? 'Update Card' : 'Add Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Add Plan Modal (Choose Your Path card) */}
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
