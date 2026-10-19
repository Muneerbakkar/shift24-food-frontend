import { useNavigate } from 'react-router-dom';
import { MealPlans } from '../../components/sections/Sections';

export function SubscribePage() {
  const navigate = useNavigate();
  return (
    <div className="bg-slate-50 min-h-screen flex flex-col justify-start">
      <MealPlans onSelectPlan={(id) => navigate(`/plan/${id}`)} />
    </div>
  );
}
