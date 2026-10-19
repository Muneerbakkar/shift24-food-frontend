import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  Edit2, 
  Check, 
  Coffee, 
  Sun, 
  Moon, 
  Plus, 
  Sparkles, 
  Save,
  Trash2,
  X,
  Flame,
  Scale,
  TrendingUp,
  Calendar,
  Image as ImageIcon,
  Tag,
  Activity,
  RefreshCw,
  Clock,
  Layers,
  Sliders
} from 'lucide-react';
import { 
  getAdminPlans, 
  saveAdminPlans, 
  getAdminFoods,
  saveAdminFoods,
  AdminPlanConfig,
  DEFAULT_DURATION_OPTIONS,
  DEFAULT_MEAL_OPTIONS,
  getPlanSortRank
} from './adminData';
import { AdminSubscriptionPageEditor } from './AdminSubscriptionPageEditor';
import { 
  fetchPlans, 
  createBackendPlan, 
  updateBackendPlan, 
  deleteBackendPlan, 
  fetchWeeklyMenu, 
  saveBackendMenuItem, 
  deleteBackendMenuItem 
} from '../../services/api';
import toast from 'react-hot-toast';

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

const PRESET_FOOD_IMAGES = [
  { label: 'Oatmeal & Berries', url: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&q=80&w=600' },
  { label: 'Grilled Chicken Bowl', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600' },
  { label: 'Baked Salmon', url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600' },
  { label: 'Avocado Toast & Egg', url: 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?auto=format&fit=crop&q=80&w=600' },
  { label: 'Lentil Salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600' },
  { label: 'Protein Pancakes', url: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&q=80&w=600' },
  { label: 'Lean Steak & Veggies', url: 'https://images.unsplash.com/photo-1544025162-8111f4a7a0a0?auto=format&fit=crop&q=80&w=600' },
  { label: 'Smoothie Bowl', url: 'https://images.unsplash.com/photo-1494597564530-871f2b93ac55?auto=format&fit=crop&q=80&w=600' }
];

const DEFAULT_INITIAL_FOODS: FoodItem[] = [
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

export function AdminMenu() {
  const [plans, setPlans] = useState<AdminPlanConfig[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('weight-loss');
  const [activeSection, setActiveSection] = useState<'subscription-pricing' | 'daily-food'>('subscription-pricing');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [availableDays, setAvailableDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Plan editing & modal state
  const [editingPlan, setEditingPlan] = useState<AdminPlanConfig | null>(null);
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [newPlanForm, setNewPlanForm] = useState({
    title: '',
    description: '',
    pricePerWeek: 3000,
    calories: '1500 - 2000 kcal/day',
    benefits: 'High protein, Balanced macros'
  });

  // Food item modal state
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [foodModalMode, setFoodModalMode] = useState<'create' | 'edit'>('create');
  const [foodForm, setFoodForm] = useState<{
    id?: string;
    planId: string;
    day: number;
    mealType: 'breakfast' | 'lunch' | 'dinner';
    name: string;
    calories: string;
    description: string;
    protein: string;
    carbs: string;
    fat: string;
    benefits: string;
    image: string;
    microNutrients: MicroNutrient[];
    ingredients: IngredientItem[];
  }>({
    planId: 'weight-loss',
    day: 1,
    mealType: 'breakfast',
    name: '',
    calories: '400 kcal',
    description: '',
    protein: '30g',
    carbs: '40g',
    fat: '15g',
    benefits: 'High Protein, Fresh Ingredients',
    image: '',
    microNutrients: [],
    ingredients: []
  });

  // 1. Initial Load of Plans & Menu Items
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    // Load plans
    try {
      const plansRes = await fetchPlans();
      if (plansRes?.success && Array.isArray(plansRes.data) && plansRes.data.length > 0) {
        const localPlans = getAdminPlans();
        const formattedPlans: AdminPlanConfig[] = plansRes.data.map((p: any) => ({
          id: p.planId || p.id || p._id,
          title: p.title,
          subtitle: p.subtitle || 'Customize your daily meal routine and subscription duration. The longer you commit, the more you save.',
          description: p.description,
          pricePerWeek: p.pricePerWeek,
          calories: p.calories,
          benefits: p.benefits || [],
          durationOptions: Array.isArray(p.durationOptions) && p.durationOptions.length > 0 ? p.durationOptions : DEFAULT_DURATION_OPTIONS,
          mealOptions: Array.isArray(p.mealOptions) && p.mealOptions.length > 0 ? p.mealOptions : DEFAULT_MEAL_OPTIONS,
          active: p.active !== false
        }));

        // Keep any local plans that aren't in backend yet
        const backendIds = new Set(formattedPlans.map(p => p.id));
        const extraLocal = localPlans.filter(p => !backendIds.has(p.id));
        const finalPlans = [...formattedPlans, ...extraLocal].sort((a, b) => getPlanSortRank(a) - getPlanSortRank(b));

        setPlans(finalPlans);
        saveAdminPlans(finalPlans);
      } else {
        setPlans(getAdminPlans());
      }
    } catch {
      setPlans(getAdminPlans());
    }

    // Load menu items
    try {
      const menuRes = await fetchWeeklyMenu();
      if (menuRes?.success && Array.isArray(menuRes.data) && menuRes.data.length > 0) {
        const localFoods = getAdminFoods();
        const items: FoodItem[] = menuRes.data.map((item: any) => ({
          id: item._id || item.id,
          planId: (item.planId || 'balance').trim().toLowerCase(),
          day: Number(item.day),
          mealType: item.mealType,
          name: item.name,
          calories: item.calories,
          description: item.description || '',
          protein: item.protein || '20g',
          carbs: item.carbs || '40g',
          fat: item.fat || '15g',
          benefits: item.benefits || [],
          image: item.image || '',
          microNutrients: Array.isArray(item.microNutrients) ? item.microNutrients : [],
          ingredients: Array.isArray(item.ingredients) ? item.ingredients : []
        }));

        // Keep any local items that aren't in backend yet
        const backendKeys = new Set(items.map(i => `${i.planId}-${i.day}-${i.mealType}`));
        const extraLocalFoods = localFoods.filter(f => !backendKeys.has(`${(f.planId || '').trim().toLowerCase()}-${Number(f.day)}-${f.mealType}`));
        const finalFoods = [...items, ...extraLocalFoods];

        setMenuItems(finalFoods);
        saveAdminFoods(finalFoods);
      } else {
        loadStoredFoods();
      }
    } catch {
      loadStoredFoods();
    } finally {
      setIsLoading(false);
    }
  };

  const loadStoredFoods = () => {
    const foods = getAdminFoods();
    setMenuItems(foods);
  };

  // Sync available days based on loaded menu items or current selection
  useEffect(() => {
    const planItems = menuItems.filter(m => m.planId === selectedPlanId);
    const daysInItems = planItems.map(m => m.day);
    const maxDay = Math.max(7, ...daysInItems, selectedDay);
    const daysList = Array.from({ length: maxDay }, (_, i) => i + 1);
    setAvailableDays(daysList);
  }, [selectedPlanId, menuItems, selectedDay]);

  const activePlan = plans.find(p => p.id === selectedPlanId) || plans[0] || {
    id: 'weight-loss',
    title: 'Weight Loss',
    description: 'Calorie-controlled meals',
    pricePerWeek: 3000,
    calories: '1200 - 1500 kcal/day',
    benefits: ['High protein', 'Low carb'],
    active: true
  };

  // Current day foods for active plan
  const currentPlanDayFoods = menuItems.filter(
    item => (item.planId || '').toLowerCase().trim() === selectedPlanId.toLowerCase().trim() && Number(item.day) === Number(selectedDay)
  );
  const breakfastFood = currentPlanDayFoods.find(f => (f.mealType || '').toLowerCase().trim() === 'breakfast');
  const lunchFood = currentPlanDayFoods.find(f => (f.mealType || '').toLowerCase().trim() === 'lunch');
  const dinnerFood = currentPlanDayFoods.find(f => (f.mealType || '').toLowerCase().trim() === 'dinner');

  // Plan Management Handlers
  const handleOpenEditPlan = (plan: AdminPlanConfig) => {
    setEditingPlan({ ...plan });
  };

  const handleSavePlanDetails = async () => {
    if (!editingPlan) return;
    try {
      await updateBackendPlan(editingPlan.id, {
        title: editingPlan.title,
        subtitle: editingPlan.subtitle,
        pricePerWeek: Number(editingPlan.pricePerWeek),
        calories: editingPlan.calories,
        description: editingPlan.description,
        benefits: editingPlan.benefits,
        durationOptions: editingPlan.durationOptions,
        mealOptions: editingPlan.mealOptions,
        active: editingPlan.active
      });
      const updated = plans.map(p => p.id === editingPlan.id ? editingPlan : p);
      setPlans(updated);
      saveAdminPlans(updated);
      setEditingPlan(null);
      toast.success(`${editingPlan.title} plan updated successfully`);
    } catch {
      const updated = plans.map(p => p.id === editingPlan.id ? editingPlan : p);
      setPlans(updated);
      saveAdminPlans(updated);
      setEditingPlan(null);
      toast.success(`${editingPlan.title} saved locally`);
    }
  };

  const handleCreateNewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanForm.title.trim()) {
      toast.error('Please provide a plan title');
      return;
    }
    const slug = newPlanForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newPlanObj: AdminPlanConfig = {
      id: slug,
      title: newPlanForm.title.trim(),
      subtitle: 'Customize your daily meal routine and subscription duration. The longer you commit, the more you save.',
      description: newPlanForm.description.trim() || 'Custom chef meal plan',
      pricePerWeek: Number(newPlanForm.pricePerWeek) || 3000,
      calories: newPlanForm.calories.trim() || '1500 - 2000 kcal/day',
      benefits: newPlanForm.benefits.split(',').map(s => s.trim()).filter(Boolean),
      durationOptions: DEFAULT_DURATION_OPTIONS,
      mealOptions: DEFAULT_MEAL_OPTIONS,
      active: true
    };

    try {
      await createBackendPlan({
        planId: slug,
        ...newPlanObj
      });
    } catch (err) {
      console.warn('Backend plan save fallback to local:', err);
    }

    const updated = [...plans, newPlanObj];
    setPlans(updated);
    saveAdminPlans(updated);
    setSelectedPlanId(slug);
    setIsNewPlanModalOpen(false);
    setNewPlanForm({
      title: '',
      description: '',
      pricePerWeek: 3000,
      calories: '1500 - 2000 kcal/day',
      benefits: 'High protein, Balanced macros'
    });
    toast.success(`Plan "${newPlanObj.title}" created successfully!`);
  };

  const handleDeleteCustomPlan = async (planId: string) => {
    if (plans.length <= 1) {
      toast.error('At least one meal plan is required');
      return;
    }
    const planToDelete = plans.find(p => p.id === planId);
    if (!window.confirm(`Are you sure you want to delete "${planToDelete?.title || planId}" and all its assigned meals?`)) return;
    try {
      await deleteBackendPlan(planId);
    } catch {}

    const updated = plans.filter(p => p.id !== planId);
    setPlans(updated);
    saveAdminPlans(updated);
    setSelectedPlanId(updated[0]?.id || 'weight-loss');
    toast.success(`Plan "${planToDelete?.title || planId}" deleted successfully`);
  };

  // Food Item Management Handlers
  const handleOpenAddFoodModal = (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    setFoodModalMode('create');
    setFoodForm({
      planId: selectedPlanId,
      day: selectedDay,
      mealType,
      name: '',
      calories: mealType === 'breakfast' ? '350 kcal' : mealType === 'lunch' ? '500 kcal' : '450 kcal',
      description: '',
      protein: '30g',
      carbs: '40g',
      fat: '15g',
      benefits: 'Clean Fuel, Chef Prepared, Nutrient Rich',
      image: PRESET_FOOD_IMAGES[0].url,
      microNutrients: [
        { name: 'Dietary Fiber', amount: '4g' },
        { name: 'Sodium', amount: '220mg' },
        { name: 'Potassium', amount: '350mg' }
      ],
      ingredients: []
    });
    setIsFoodModalOpen(true);
  };

  const handleOpenEditFoodModal = (food: FoodItem) => {
    setFoodModalMode('edit');
    setFoodForm({
      id: food.id || food._id,
      planId: food.planId,
      day: food.day,
      mealType: food.mealType,
      name: food.name,
      calories: food.calories,
      description: food.description || '',
      protein: food.protein || '25g',
      carbs: food.carbs || '40g',
      fat: food.fat || '15g',
      benefits: (food.benefits || []).join(', '),
      image: food.image || '',
      microNutrients: Array.isArray(food.microNutrients) && food.microNutrients.length > 0
        ? [...food.microNutrients]
        : [
            { name: 'Dietary Fiber', amount: '3g' },
            { name: 'Sodium', amount: '180mg' }
          ],
      ingredients: Array.isArray(food.ingredients) ? [...food.ingredients] : []
    });
    setIsFoodModalOpen(true);
  };

  const handleSaveFoodForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodForm.name.trim()) {
      toast.error('Please enter food/dish name');
      return;
    }

    const benefitsArray = foodForm.benefits
      .split(',')
      .map(b => b.trim())
      .filter(Boolean);

    const payload: FoodItem = {
      id: foodForm.id,
      planId: foodForm.planId,
      day: Number(foodForm.day),
      mealType: foodForm.mealType,
      name: foodForm.name.trim(),
      calories: foodForm.calories.trim(),
      description: foodForm.description.trim(),
      protein: foodForm.protein.trim(),
      carbs: foodForm.carbs.trim(),
      fat: foodForm.fat.trim(),
      benefits: benefitsArray,
      image: foodForm.image.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
      microNutrients: foodForm.microNutrients.filter(m => m.name.trim()),
      ingredients: foodForm.ingredients
        .filter(i => i.name.trim())
        .map(i => ({
          name: i.name.trim(),
          quantity: i.quantity.trim(),
          price: Number(i.price) || 0
        }))
    };

    // 1. Save to backend
    try {
      const res = await saveBackendMenuItem(payload);
      if (res?.data?._id) {
        payload.id = res.data._id;
      }
    } catch (err) {
      console.warn('Could not save to backend API, saving locally:', err);
    }

    // 2. Update local state
    const existingIndex = menuItems.findIndex(
      m => m.planId === payload.planId && m.day === payload.day && m.mealType === payload.mealType
    );

    let updatedList: FoodItem[];
    if (existingIndex >= 0) {
      updatedList = [...menuItems];
      updatedList[existingIndex] = payload;
    } else {
      updatedList = [...menuItems, payload];
    }

    setMenuItems(updatedList);
    saveAdminFoods(updatedList);
    setIsFoodModalOpen(false);
    toast.success(`${payload.name} saved for Day ${payload.day} (${payload.mealType})!`);
  };

  const handleDeleteFood = async (food: FoodItem) => {
    if (!window.confirm(`Are you sure you want to remove "${food.name}" from this meal slot?`)) return;

    try {
      await deleteBackendMenuItem({
        id: food.id || food._id,
        planId: food.planId,
        day: food.day,
        mealType: food.mealType
      });
    } catch (err) {
      console.warn('Backend delete error:', err);
    }

    const updated = menuItems.filter(
      m => !(m.planId === food.planId && m.day === food.day && m.mealType === food.mealType)
    );
    setMenuItems(updated);
    saveAdminFoods(updated);
    toast.success(`Removed from Day ${food.day} ${food.mealType}`);
  };

  const handleAddDay = () => {
    const nextDay = availableDays.length + 1;
    if (nextDay > 30) {
      toast.error('Maximum duration is 30 days');
      return;
    }
    setAvailableDays(prev => [...prev, nextDay]);
    setSelectedDay(nextDay);
    toast.success(`Day ${nextDay} unlocked! You can now add meals for this day.`);
  };

  const getPlanIcon = (planId: string, title?: string) => {
    const key = `${planId || ''} ${title || ''}`.toLowerCase();
    if (key.includes('loss') || key.includes('shed') || key.includes('burn')) return <Flame className="w-4 h-4 text-rose-500" />;
    if (key.includes('gain') || key.includes('muscle') || key.includes('bulk')) return <TrendingUp className="w-4 h-4 text-amber-500" />;
    if (key.includes('balance') || key.includes('maintain') || key.includes('scale')) return <Scale className="w-4 h-4 text-emerald-500" />;
    return <Sparkles className="w-4 h-4 text-sky-500" />;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-emerald-600" />
            <span>Meal Plans & Food Catalog</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure different meal plans (Weight Loss, Balance, Weight Gain), and schedule dishes for each day.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewPlanModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Plan</span>
          </button>
        </div>
      </div>

      {/* Main Section Navigation Switcher */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveSection('subscription-pricing')}
          className={`flex items-center gap-2 pb-3.5 px-4 text-xs sm:text-sm font-extrabold border-b-2 transition-all ${
            activeSection === 'subscription-pricing'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Subscription Duration & Pricing Page</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold hidden sm:inline-block">
            Customer View
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('daily-food')}
          className={`flex items-center gap-2 pb-3.5 px-4 text-xs sm:text-sm font-extrabold border-b-2 transition-all ${
            activeSection === 'daily-food'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Daily Food Catalog & Schedule</span>
        </button>
      </div>

      {activeSection === 'subscription-pricing' ? (
        <AdminSubscriptionPageEditor
          plans={plans}
          selectedPlanId={selectedPlanId}
          setSelectedPlanId={setSelectedPlanId}
          onPlansUpdated={setPlans}
        />
      ) : (
        <>
          {/* 1. Plan Tabs Selector (Weight Loss, Balance, Weight Gain + Custom Plans) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                Select Meal Plan
          </span>
          <span className="text-[11px] text-slate-400 font-semibold">
            {plans.length} Active Plans Available
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {[...plans].sort((a, b) => getPlanSortRank(a) - getPlanSortRank(b)).map(p => {
            const isSelected = selectedPlanId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlanId(p.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-emerald-500/30'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                {getPlanIcon(p.id, p.title)}
                <span>{p.title}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  ₹{p.pricePerWeek}/wk
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsNewPlanModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all border border-dashed border-emerald-300 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Plan Card</span>
          </button>
        </div>

        {/* Selected Plan Details & Fast Edit Banner */}
        {activePlan && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 p-4 rounded-2xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-slate-900">{activePlan.title} Plan</h4>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xl">{activePlan.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs pt-1 font-semibold text-slate-600">
                <span>Base Price: <strong className="text-slate-900">₹{activePlan.pricePerWeek}/week</strong></span>
                <span>Calories: <strong className="text-slate-900">{activePlan.calories}</strong></span>
                {activePlan.benefits && activePlan.benefits.length > 0 && (
                  <span className="text-[11px] text-slate-400">
                    &bull; {activePlan.benefits.join(', ')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => handleOpenEditPlan(activePlan)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Plan Pricing</span>
              </button>

              {plans.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteCustomPlan(activePlan.id)}
                  className="inline-flex items-center gap-1 p-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                  title="Delete this plan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Days Selector Toolbar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Schedule Foods By Day for "{activePlan.title}"</span>
            </h3>
            <p className="text-xs text-slate-500">
              Pick a cycle day below to assign or customize Breakfast, Lunch, and Dinner dishes.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddDay}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Day {availableDays.length + 1}</span>
          </button>
        </div>

        {/* Days Pill List */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {availableDays.map(day => {
            const isSelected = selectedDay === day;
            const mealsForThisDay = menuItems.filter(
              m => m.planId === selectedPlanId && m.day === day
            );
            const count = mealsForThisDay.length;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border text-left ${
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

      {/* 3. Three Meal Slots: Breakfast, Lunch, Dinner */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">
            Day {selectedDay} Menu &bull; {activePlan.title}
          </span>
          <span className="text-xs text-slate-500">
            Click any meal card to edit or add food
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Breakfast Slot Card */}
          <MealSlotCard
            mealType="breakfast"
            icon={<Coffee className="w-4 h-4 text-amber-600" />}
            title="Breakfast Slot"
            theme="amber"
            food={breakfastFood}
            onAdd={() => handleOpenAddFoodModal('breakfast')}
            onEdit={() => breakfastFood && handleOpenEditFoodModal(breakfastFood)}
            onDelete={() => breakfastFood && handleDeleteFood(breakfastFood)}
          />

          {/* Lunch Slot Card */}
          <MealSlotCard
            mealType="lunch"
            icon={<Sun className="w-4 h-4 text-orange-600" />}
            title="Lunch Slot"
            theme="orange"
            food={lunchFood}
            onAdd={() => handleOpenAddFoodModal('lunch')}
            onEdit={() => lunchFood && handleOpenEditFoodModal(lunchFood)}
            onDelete={() => lunchFood && handleDeleteFood(lunchFood)}
          />

          {/* Dinner Slot Card */}
          <MealSlotCard
            mealType="dinner"
            icon={<Moon className="w-4 h-4 text-indigo-600" />}
            title="Dinner Slot"
            theme="indigo"
            food={dinnerFood}
            onAdd={() => handleOpenAddFoodModal('dinner')}
            onEdit={() => dinnerFood && handleOpenEditFoodModal(dinnerFood)}
            onDelete={() => dinnerFood && handleDeleteFood(dinnerFood)}
          />
        </div>
      </div>
      </>
      )}

      {/* 4. Add / Edit Food Item Modal */}
      {isFoodModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl sm:max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200 my-6 max-h-[92vh] flex flex-col">
            <button
              type="button"
              onClick={() => setIsFoodModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 shrink-0">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {foodModalMode === 'edit' ? 'Edit Food Item' : 'Add Food Item'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure dish for {plans.find(p => p.id === foodForm.planId)?.title || foodForm.planId} on Day {foodForm.day} ({foodForm.mealType})
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveFoodForm} className="space-y-5 text-xs overflow-y-auto pr-1 sm:pr-2 flex-1">
              {/* Plan & Day Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Plan</label>
                  <select
                    value={foodForm.planId}
                    onChange={(e) => setFoodForm({ ...foodForm, planId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cycle Day</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={foodForm.day}
                    onChange={(e) => setFoodForm({ ...foodForm, day: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Meal Slot</label>
                  <select
                    value={foodForm.mealType}
                    onChange={(e) => setFoodForm({ ...foodForm, mealType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 capitalize"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>
              </div>

              {/* Dish Name & Calories */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Dish / Food Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Avocado Toast with Poached Egg"
                    value={foodForm.name}
                    onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Calories *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 450 kcal"
                    value={foodForm.calories}
                    onChange={(e) => setFoodForm({ ...foodForm, calories: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Macronutrients Breakdown */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block font-bold text-slate-700 mb-2">Macronutrients (Protein, Carbs, Fat)</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Protein</span>
                    <input
                      type="text"
                      placeholder="e.g. 35g"
                      value={foodForm.protein}
                      onChange={(e) => setFoodForm({ ...foodForm, protein: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Carbs</span>
                    <input
                      type="text"
                      placeholder="e.g. 40g"
                      value={foodForm.carbs}
                      onChange={(e) => setFoodForm({ ...foodForm, carbs: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Fat</span>
                    <input
                      type="text"
                      placeholder="e.g. 15g"
                      value={foodForm.fat}
                      onChange={(e) => setFoodForm({ ...foodForm, fat: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Micronutrients (Vitamins & Minerals) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Micronutrients (Vitamins & Minerals)</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Specify fiber, vitamins, minerals, and electrolyte values
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFoodForm({
                      ...foodForm,
                      microNutrients: [...foodForm.microNutrients, { name: '', amount: '' }]
                    })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-emerald-700 border border-slate-300 rounded-lg font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Micronutrient</span>
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    { name: 'Dietary Fiber', def: '4g' },
                    { name: 'Vitamin C', def: '35mg' },
                    { name: 'Iron', def: '3.5mg' },
                    { name: 'Calcium', def: '120mg' },
                    { name: 'Potassium', def: '380mg' },
                    { name: 'Sodium', def: '200mg' },
                    { name: 'Vitamin A', def: '450mcg' },
                    { name: 'Vitamin D', def: '5mcg' },
                    { name: 'Zinc', def: '2.5mg' }
                  ].map(preset => {
                    const alreadyAdded = foodForm.microNutrients.some(m => m.name.toLowerCase() === preset.name.toLowerCase());
                    if (alreadyAdded) return null;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setFoodForm({
                            ...foodForm,
                            microNutrients: [...foodForm.microNutrients, { name: preset.name, amount: preset.def }]
                          });
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer"
                      >
                        + {preset.name}
                      </button>
                    );
                  })}
                </div>

                {/* Micronutrients List */}
                {foodForm.microNutrients.length === 0 ? (
                  <div className="text-center py-3 bg-white/70 rounded-xl border border-dashed border-slate-300 text-[11px] text-slate-400">
                    No micronutrients added yet. Click &quot;Add Micronutrient&quot; or select a quick preset above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {foodForm.microNutrients.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Micronutrient name (e.g. Vitamin C, Iron)"
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...foodForm.microNutrients];
                            updated[idx].name = e.target.value;
                            setFoodForm({ ...foodForm, microNutrients: updated });
                          }}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Amount (e.g. 25mg, 5g)"
                          value={item.amount}
                          onChange={(e) => {
                            const updated = [...foodForm.microNutrients];
                            updated[idx].amount = e.target.value;
                            setFoodForm({ ...foodForm, microNutrients: updated });
                          }}
                          className="w-28 sm:w-36 px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = foodForm.microNutrients.filter((_, i) => i !== idx);
                            setFoodForm({ ...foodForm, microNutrients: updated });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove micronutrient"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recipe Ingredients with Quantity & Price */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Ingredients with Quantity & Price</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Portion measures and ingredient costing for cloud kitchen production
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFoodForm({
                      ...foodForm,
                      ingredients: [...foodForm.ingredients, { name: '', quantity: '', price: 0 }]
                    })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-emerald-700 border border-slate-300 rounded-lg font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Ingredient</span>
                  </button>
                </div>

                {/* Ingredients List */}
                {foodForm.ingredients.length === 0 ? (
                  <div className="text-center py-3 bg-white/70 rounded-xl border border-dashed border-slate-300 text-[11px] text-slate-400">
                    No ingredients entered. Click &quot;Add Ingredient&quot; to specify quantities and unit costs.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase text-slate-400 px-1">
                      <span className="col-span-5 sm:col-span-6">Ingredient Name</span>
                      <span className="col-span-4 sm:col-span-3">Quantity</span>
                      <span className="col-span-2 sm:col-span-2">Price (₹)</span>
                      <span className="col-span-1 text-center"></span>
                    </div>

                    {foodForm.ingredients.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5 sm:col-span-6">
                          <input
                            type="text"
                            placeholder="e.g. Organic Spinach, Egg Whites"
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...foodForm.ingredients];
                              updated[idx].name = e.target.value;
                              setFoodForm({ ...foodForm, ingredients: updated });
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-3">
                          <input
                            type="text"
                            placeholder="e.g. 150g, 3 pcs"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...foodForm.ingredients];
                              updated[idx].quantity = e.target.value;
                              setFoodForm({ ...foodForm, ingredients: updated });
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-2">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold text-xs">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={item.price || ''}
                              onChange={(e) => {
                                const updated = [...foodForm.ingredients];
                                updated[idx].price = Number(e.target.value) || 0;
                                setFoodForm({ ...foodForm, ingredients: updated });
                              }}
                              className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = foodForm.ingredients.filter((_, i) => i !== idx);
                              setFoodForm({ ...foodForm, ingredients: updated });
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove ingredient"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Costing Summary */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-xs px-1">
                      <span className="font-bold text-slate-500">
                        Total Ingredients: <strong className="text-slate-800">{foodForm.ingredients.filter(i => i.name.trim()).length}</strong>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Est. Food Cost:</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-200">
                          ₹{foodForm.ingredients.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dish Description & Culinary Notes</label>
                <textarea
                  rows={2}
                  placeholder="Key culinary preparation details, chef instructions..."
                  value={foodForm.description}
                  onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Benefits / Tags */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Key Health Benefits (comma-separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. High Protein, Low Glycemic, Omega-3 Rich"
                  value={foodForm.benefits}
                  onChange={(e) => setFoodForm({ ...foodForm, benefits: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                />
              </div>

              {/* Food Image URL & Quick Presets */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Image URL (or select preset thumbnail)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={foodForm.image}
                  onChange={(e) => setFoodForm({ ...foodForm, image: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 mb-2"
                />

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {PRESET_FOOD_IMAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFoodForm({ ...foodForm, image: preset.url })}
                      className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                        foodForm.image === preset.url
                          ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-4 h-4 rounded-full object-cover" />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFoodModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Food Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Add New Plan Modal */}
      {isNewPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsNewPlanModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Add New Meal Plan</h3>
                <p className="text-xs text-slate-500">Create a new dietary or nutritional subscription tier</p>
              </div>
            </div>

            <form onSubmit={handleCreateNewPlan} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plan Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keto Cleanse, Muscle Hypertrophy..."
                  value={newPlanForm.title}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Short overview of what this plan targets..."
                  value={newPlanForm.description}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Weekly Price (₹)</label>
                  <input
                    type="number"
                    value={newPlanForm.pricePerWeek}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, pricePerWeek: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Calories Target</label>
                  <input
                    type="text"
                    value={newPlanForm.calories}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, calories: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Benefits (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. High Protein, Ketogenic, Clean Fuel"
                  value={newPlanForm.benefits}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, benefits: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewPlanModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-xs"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Edit Plan Pricing Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setEditingPlan(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <Edit2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Edit {editingPlan.title}</h3>
                <p className="text-xs text-slate-500">Update pricing and target calorie metrics</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plan Title</label>
                <input
                  type="text"
                  value={editingPlan.title}
                  onChange={(e) => setEditingPlan({ ...editingPlan, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price per Week (₹)</label>
                  <input
                    type="number"
                    value={editingPlan.pricePerWeek}
                    onChange={(e) => setEditingPlan({ ...editingPlan, pricePerWeek: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Calories Target</label>
                  <input
                    type="text"
                    value={editingPlan.calories}
                    onChange={(e) => setEditingPlan({ ...editingPlan, calories: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePlanDetails}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Helper Component: MealSlotCard
// -------------------------------------------------------------
interface MealSlotCardProps {
  mealType: 'breakfast' | 'lunch' | 'dinner';
  icon: React.ReactNode;
  title: string;
  theme: 'amber' | 'orange' | 'indigo';
  food?: FoodItem;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function MealSlotCard({
  mealType,
  icon,
  title,
  theme,
  food,
  onAdd,
  onEdit,
  onDelete
}: MealSlotCardProps) {
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
    <div className={`rounded-3xl border ${themeStyles.border} ${themeStyles.bg} p-5 flex flex-col justify-between shadow-xs transition-all`}>
      <div>
        {/* Slot Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
            {icon}
            <span>{title}</span>
          </div>

          {food && (
            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${themeStyles.badge}`}>
              {food.calories}
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
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}

            <div>
              <h4 className="text-base font-black text-slate-900 leading-snug">{food.name}</h4>
              {food.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{food.description}</p>
              )}
            </div>

            {/* Macros Chips */}
            <div className="grid grid-cols-3 gap-1.5 text-center text-xs pt-1">
              <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">Protein</span>
                <span className="font-extrabold text-slate-800">{food.protein || '20g'}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">Carbs</span>
                <span className="font-extrabold text-slate-800">{food.carbs || '40g'}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">Fats</span>
                <span className="font-extrabold text-slate-800">{food.fat || '15g'}</span>
              </div>
            </div>

            {/* Ingredients & Micronutrients Badges */}
            {((food.ingredients && food.ingredients.length > 0) || (food.microNutrients && food.microNutrients.length > 0)) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                {food.ingredients && food.ingredients.length > 0 && (
                  <span className="font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                    <Scale className="w-3 h-3 text-emerald-600" />
                    <span>{food.ingredients.length} Ingredients</span>
                    <span className="text-emerald-950 font-black">
                      (₹{food.ingredients.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0).toFixed(0)})
                    </span>
                  </span>
                )}
                {food.microNutrients && food.microNutrients.length > 0 && (
                  <span className="font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1 shadow-2xs">
                    <Sparkles className="w-3 h-3 text-sky-600" />
                    <span>{food.microNutrients.length} Micronutrients</span>
                  </span>
                )}
              </div>
            )}

            {/* Benefits */}
            {food.benefits && food.benefits.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {food.benefits.map((b, i) => (
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
            <p className="text-[11px] text-slate-400 mt-0.5">Click below to add a dish for this slot</p>
          </div>
        )}
      </div>

      {/* Card Action Buttons */}
      <div className="pt-4 mt-4 border-t border-slate-200/60 flex items-center gap-2">
        {food ? (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Food</span>
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl transition-colors"
              title="Remove this dish"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add {title.replace(' Slot', '')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
