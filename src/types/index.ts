export type PlanType = 'weight-loss' | 'weight-gain' | 'balance';

export interface MealPlan {
  id: PlanType;
  title: string;
  description: string;
  icon: string;
  calories: string;
  benefits: string[];
  pricePerWeek: number;
}

export interface MenuItem {
  id: string;
  planType: PlanType;
  name: string;
  description: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  imageUrl: string;
}
