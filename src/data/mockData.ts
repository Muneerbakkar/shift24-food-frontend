import { MealPlan, MenuItem } from '../types';

export const plans: MealPlan[] = [
  {
    id: 'weight-loss',
    title: 'Weight Loss',
    description: 'Calorie-controlled, nutrient-dense meals designed to help you shed pounds safely.',
    icon: 'TrendingDown',
    calories: '1200 - 1500 kcal/day',
    benefits: ['High protein', 'Low carb', 'Metabolism boosting'],
    pricePerWeek: 3000,
  },
  {
    id: 'balance',
    title: 'Balance Weight',
    description: 'Perfectly portioned meals to maintain your current physique and optimize health.',
    icon: 'Scale',
    calories: '1800 - 2000 kcal/day',
    benefits: ['Balanced macros', 'Sustained energy', 'Heart healthy'],
    pricePerWeek: 2800,
  },
  {
    id: 'weight-gain',
    title: 'Weight Gain',
    description: 'Calorie-surplus, high-protein meals for muscle building and healthy weight gain.',
    icon: 'TrendingUp',
    calories: '2500 - 3000 kcal/day',
    benefits: ['High protein', 'Complex carbs', 'Muscle recovery'],
    pricePerWeek: 3500,
  }
];

export const sampleMenu: MenuItem[] = [
  {
    id: '1',
    planType: 'weight-loss',
    name: 'Grilled Lemon Herb Chicken',
    description: 'Served with steamed asparagus and quinoa.',
    protein: 35,
    carbs: 20,
    fat: 8,
    calories: 320,
    imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '2',
    planType: 'balance',
    name: 'Miso Glazed Salmon',
    description: 'Wild-caught salmon with brown rice and bok choy.',
    protein: 32,
    carbs: 45,
    fat: 15,
    calories: 450,
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '3',
    planType: 'weight-gain',
    name: 'Steak & Sweet Potato Bowl',
    description: 'Grass-fed sirloin, roasted sweet potatoes, and avocado.',
    protein: 45,
    carbs: 65,
    fat: 22,
    calories: 680,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
  }
];

export const commonIngredients = [
  'Chicken', 'Asparagus', 'Quinoa', 'Lemon',
  'Salmon', 'Brown Rice', 'Bok Choy', 'Miso',
  'Steak', 'Sweet Potato', 'Avocado',
  'Peanuts', 'Dairy', 'Gluten', 'Shellfish', 'Soy', 'Eggs', 'Tree Nuts', 'Mushrooms', 'Cilantro', 'Pork', 'Spicy'
].sort();
