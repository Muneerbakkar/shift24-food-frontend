import { useNavigate } from 'react-router-dom';
import { 
  HowItWorks, 
  MealPlans, 
  AboutTheFood, 
  WhyUs, 
  Testimonials, 
  FAQ, 
  FeaturedCarousel 
} from '../../components/sections/Sections';
import { FeaturedMenuCarousel } from '../../components/ui/FeaturedMenuCarousel';

export function Home() {
  const navigate = useNavigate();
  return (
    <div className="w-full overflow-x-hidden">
      <FeaturedCarousel />
      <HowItWorks />
      <FeaturedMenuCarousel />
      <MealPlans onSelectPlan={(id) => { navigate(`/plan/${id}`); }} />
      <AboutTheFood />
      <WhyUs />
      <Testimonials />
      <FAQ />
    </div>
  );
}
