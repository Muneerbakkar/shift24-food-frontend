import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { TrendingDown, Scale, TrendingUp, Sparkles, Flame, CheckCircle2, ArrowRight, MapPin, Mail, Phone, ChevronLeft, ChevronRight, ClipboardList, ChefHat, Truck, Utensils, Play, Star, Quote, Plus, Minus, MessageCircle, User } from 'lucide-react';
import { getAdminPlans, AdminPlanConfig, saveAdminPlans, getPlanSortRank } from '../../pages/Admin/adminData';
import { fetchPlans } from '../../services/api';

const iconMap = {
  TrendingDown,
  Scale,
  TrendingUp,
  Sparkles,
  Flame,
};

export function HowItWorks() {
  const steps = [
    {
      icon: ClipboardList,
      title: "1. Choose Your Plan",
      description: "Enjoy our wholesome, chef-curated healthy meal plan, thoughtfully crafted and suitable for everyone.",
      color: "bg-blue-50 text-blue-500 border-blue-100"
    },
    {
      icon: ChefHat,
      title: "2. We Cook Fresh",
      description: "Our expert chefs prepare your meals using 100% organic, locally-sourced ingredients.",
      color: "bg-emerald-50 text-emerald-500 border-emerald-100"
    },
    {
      icon: Truck,
      title: "3. Fast Delivery",
      description: "Enjoy fresh, punctual daily deliveries directly to your doorstep or office across Kakkanad.",
      color: "bg-orange-50 text-orange-500 border-orange-100"
    },
    {
      icon: Utensils,
      title: "4. Heat & Enjoy",
      description: "Ready in just 3 minutes. No prep, no cooking, no cleaning. Just pure nutrition.",
      color: "bg-purple-50 text-purple-500 border-purple-100"
    }
  ];

  return (
    <section className="relative bg-white pt-12 pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-base md:text-lg">Getting healthy has never been easier. We handle the meal prep, cooking, and delivery so you can focus on living your best life.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + (index * 0.1) }}
                className="flex flex-col items-center text-center group"
              >
                <div className={`w-20 h-20 rounded-[24px] flex items-center justify-center mb-6 shadow-sm border group-hover:scale-110 transition-transform ${step.color}`}>
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2 md:mb-3">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  );
}

export function FeaturedCarousel() {
  const slides = [
    {
      src: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=1600",
      title: "Fresh & Vibrant",
      subtitle: "Nutrient-dense bowls for everyday vitality."
    },
    {
      src: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=1600",
      title: "Plant-Powered",
      subtitle: "Delicious greens to fuel your body and mind."
    },
    {
      src: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=1600",
      title: "Lean Protein",
      subtitle: "Perfectly balanced macros to support your goals."
    },
    {
      src: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&q=80&w=1600",
      title: "Chef Crafted",
      subtitle: "Gourmet flavors without the guilt."
    },
    {
      src: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&q=80&w=1600",
      title: "Guilt-Free Indulgence",
      subtitle: "Satisfy your cravings with wholesome ingredients."
    }
  ];
  
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [currentIndex]);

  return (
    <section className="pt-8 pb-6 bg-white overflow-hidden relative">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative h-[350px] md:h-[450px] lg:h-[500px] xl:h-[600px] rounded-2xl md:rounded-[40px] overflow-hidden shadow-lg border border-slate-200 group">
          <div 
            className="flex h-full transition-transform duration-700 ease-out" 
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {slides.map((slide, i) => (
              <div key={i} className="w-full h-full flex-shrink-0 relative">
                <img 
                  src={slide.src} 
                  alt={`Featured meal ${i + 1}`} 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent flex flex-col justify-end p-6 pb-24 md:p-16 md:pb-24">
                  <h3 className="text-2xl md:text-5xl font-bold text-white mb-3 tracking-tight">{slide.title}</h3>
                  <p className="text-lg md:text-xl text-slate-200 max-w-2xl">{slide.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={prevSlide}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center text-slate-800 hover:bg-white hover:scale-105 transition-all shadow-md z-10 opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center text-slate-800 hover:bg-white hover:scale-105 transition-all shadow-md z-10 opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10 p-3 bg-slate-900/40 backdrop-blur-md rounded-full">
            {slides.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentIndex ? 'bg-white scale-125' : 'bg-white/60 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function MealPlans({ onSelectPlan }: { onSelectPlan: (id: string, meals?: string) => void }) {
  const [plansList, setPlansList] = useState<AdminPlanConfig[]>(() => getAdminPlans());

  useEffect(() => {
    const handleUpdate = () => {
      setPlansList(getAdminPlans());
    };
    window.addEventListener('shift24-plans-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

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
      window.removeEventListener('shift24-plans-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const sortedPlans = [...plansList].sort((a, b) => getPlanSortRank(a) - getPlanSortRank(b));

  const activePlans = sortedPlans.filter(p => p.active !== false);

  // Exactly ONE plan is featured if marked popular in admin panel (or null if none)
  const featuredPlanKey = useMemo(() => {
    const explicitPopular = activePlans.find(p => (p as any).popular === true);
    return explicitPopular ? (explicitPopular.id || (explicitPopular as any).planId) : null;
  }, [activePlans]);

  const getIconForPlan = (plan: any, planKey: string, index: number) => {
    if ((plan as any).icon && (iconMap as any)[(plan as any).icon]) {
      return (iconMap as any)[(plan as any).icon];
    }
    const key = `${planKey} ${plan.title || ''}`.toLowerCase();
    if (key.includes('loss') || key.includes('shed') || key.includes('burn')) return Flame;
    if (key.includes('gain') || key.includes('muscle') || key.includes('bulk')) return TrendingUp;
    if (key.includes('balance') || key.includes('maintain') || key.includes('scale')) return Scale;
    return Sparkles;
  };

  const getIconBgForPlan = (plan: any, planKey: string, isFeatured: boolean) => {
    if (isFeatured) return 'bg-white/20 text-white';
    const key = `${planKey} ${plan.title || ''}`.toLowerCase();
    if (key.includes('loss') || key.includes('shed') || key.includes('burn')) return 'bg-rose-50 text-rose-500';
    if (key.includes('gain') || key.includes('muscle') || key.includes('bulk')) return 'bg-orange-50 text-orange-500';
    if (key.includes('balance') || key.includes('maintain') || key.includes('scale')) return 'bg-emerald-50 text-emerald-600';
    return 'bg-sky-50 text-sky-500';
  };

  return (
    <section id="about" className="py-12 md:py-24 bg-white border-t border-slate-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-4">Choose Your Path</h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-base md:text-lg">We've designed specialized nutrition programs to help you achieve your specific body goals without sacrificing flavor.</p>
        </div>

        {activePlans.length === 1 ? (
          <div className="max-w-4xl lg:max-w-5xl mx-auto w-full pb-12">
            {activePlans.map((plan, index) => {
              const planKey = plan.id || (plan as any).planId || `plan-${index}`;
              const isFeatured = planKey === featuredPlanKey;
              const Icon = getIconForPlan(plan, planKey, index);
              const iconBg = getIconBgForPlan(plan, planKey, isFeatured);

              return (
                <motion.div 
                  key={planKey}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: 0.1 }}
                  className={`w-full relative ${
                    isFeatured 
                      ? 'bg-emerald-600 rounded-3xl md:rounded-[36px] p-7 md:p-12 shadow-2xl text-white' 
                      : 'bg-white border border-slate-200 rounded-3xl md:rounded-[36px] p-7 md:p-12 shadow-sm hover:shadow-md'
                  }`}
                >
                  {isFeatured && (
                    <div className="absolute top-5 right-6 md:top-8 md:right-10 bg-emerald-400 text-emerald-950 text-[10px] md:text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                      {(plan as any).badge || 'Most Popular'}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    <div className="lg:col-span-7 space-y-4">
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center ${iconBg}`}>
                        <Icon className="w-6 h-6 md:w-7 md:h-7" />
                      </div>
                      <div>
                        <h3 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2 ${isFeatured ? 'text-white' : 'text-slate-900'}`}>
                          {plan.title}
                        </h3>
                        <p className={`text-sm sm:text-base leading-relaxed max-w-xl ${isFeatured ? 'text-emerald-100' : 'text-slate-500'}`}>
                          {plan.subtitle || plan.description}
                        </p>
                      </div>
                      <div className="pt-2">
                        <span className="text-3xl sm:text-4xl md:text-5xl font-black">₹{plan.pricePerWeek}</span>
                        <span className={`text-sm sm:text-base ml-1.5 font-semibold ${isFeatured ? 'text-emerald-200' : 'text-slate-400'}`}>/week</span>
                      </div>
                    </div>

                    <div className={`lg:col-span-5 flex flex-col justify-between h-full space-y-6 lg:pl-6 ${isFeatured ? 'lg:border-l lg:border-white/20' : 'lg:border-l lg:border-slate-100'}`}>
                      {plan.benefits && plan.benefits.length > 0 && (
                        <ul className="space-y-3.5">
                          {plan.benefits.map((benefit, i) => (
                            <li key={i} className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isFeatured ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                              <span className={`text-sm sm:text-base font-semibold ${isFeatured ? 'text-emerald-50' : 'text-slate-700'}`}>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <button 
                        onClick={() => onSelectPlan(planKey)}
                        className={`w-full py-4 px-6 font-extrabold rounded-2xl text-base md:text-lg transition-all transform hover:scale-[1.01] shadow-lg ${
                          isFeatured 
                            ? 'bg-white text-emerald-700 hover:bg-emerald-50' 
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        Choose {plan.title}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${
            activePlans.length === 2 
              ? 'max-w-5xl lg:max-w-6xl mx-auto md:grid-cols-2 gap-8' 
              : activePlans.length === 3 
              ? 'max-w-7xl mx-auto md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8' 
              : 'max-w-7xl mx-auto sm:grid-cols-2 lg:grid-cols-4 gap-6'
          } items-stretch pb-12`}>
            {activePlans.map((plan, index) => {
              const planKey = plan.id || (plan as any).planId || `plan-${index}`;
              const isFeatured = planKey === featuredPlanKey;
              const Icon = getIconForPlan(plan, planKey, index);
              const iconBg = getIconBgForPlan(plan, planKey, isFeatured);

              const cardClasses = isFeatured 
                ? 'bg-emerald-600 rounded-2xl md:rounded-[32px] p-6 md:p-8 flex flex-col shadow-xl text-white transform lg:scale-105 relative z-10'
                : 'bg-white border border-slate-200 rounded-2xl md:rounded-[32px] p-6 md:p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow';

              return (
                <motion.div 
                  key={planKey}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: index * 0.1 }}
                  className={`w-full ${cardClasses}`}
                >
                  {isFeatured && (
                    <div className="absolute top-4 right-6 md:top-6 md:right-8 bg-emerald-400 text-emerald-950 text-[9px] md:text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider shadow-xs">
                      {(plan as any).badge || 'Most Popular'}
                    </div>
                  )}
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 ${iconBg}`}>
                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <h3 className={`text-xl md:text-2xl font-bold mb-2 ${isFeatured ? 'text-white' : 'text-slate-800'}`}>{plan.title}</h3>
                  <p className={`text-sm mb-6 flex-grow leading-relaxed ${isFeatured ? 'text-emerald-100' : 'text-slate-500'}`}>{plan.subtitle || plan.description}</p>
                  <div className="mb-6">
                    <span className="text-2xl md:text-3xl font-bold">₹{plan.pricePerWeek}</span>
                    <span className={`text-sm ml-1 ${isFeatured ? 'text-emerald-200' : 'text-slate-400'}`}>/week</span>
                  </div>
                  {plan.benefits && plan.benefits.length > 0 && (
                    <ul className="space-y-3 mb-8">
                      {plan.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle2 className={`w-5 h-5 shrink-0 ${isFeatured ? 'text-white' : 'text-emerald-500'}`} />
                          <span className={`text-sm font-medium ${isFeatured ? 'text-emerald-50' : 'text-slate-700'}`}>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button 
                    onClick={() => onSelectPlan(planKey)}
                    className={`w-full py-3 font-bold rounded-xl md:rounded-2xl text-sm md:text-base ${isFeatured ? 'bg-white text-emerald-600 shadow-lg hover:bg-emerald-50' : 'bg-slate-50 text-slate-800 border border-slate-200 hover:bg-slate-100'} transition-colors mt-auto`}
                  >
                    Choose {plan.title}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export function AboutTheFood() {
  return (
    <section className="py-12 md:py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative h-[300px] md:h-[500px] rounded-2xl md:rounded-[32px] overflow-hidden group cursor-pointer"
          >
            <img 
              src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=1600" 
              alt="Chef cooking" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-white/80 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform bg-black/10">
                <Play className="w-6 h-6 md:w-8 md:h-8 text-white ml-1" fill="currentColor" />
              </div>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="max-w-xl"
          >
            <div className="text-emerald-600 font-bold text-xs md:text-base uppercase tracking-widest mb-3 md:mb-4">
              ABOUT THE FOOD
            </div>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-4 md:mb-6">
              Shift24ing Mornings, Crafted with Care
            </h2>
            <p className="text-base md:text-lg text-slate-500 leading-relaxed">
              Real food, thoughtfully prepared. Balanced recipes, seasonal ingredients, and consistent nutrition—so eating well feels effortless.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function WhyUs() {
  const points = [
    "Cooked fresh daily with seasonal, locally sourced ingredients—so your food is as wholesome as it is tasty.",
    "Balanced recipes designed for steady energy: thoughtful portions, macro awareness, and real-food ingredients.",
    "Flexible plans for real life—daily, weekly, or monthly. Pause, switch, or resume easily as your routine changes.",
    "Clean cooking methods, minimal processed additives, and transparent labels. What's inside is exactly what we say.",
    "Careful delivery across our service zones with sturdy, eco-minded packaging that keeps meals fresh and mess-free.",
    "Shift24 care team that listens: quick help, menu guidance, and feedback loops that continuously improve your meals."
  ];

  return (
    <section className="py-12 md:py-24 bg-slate-50 border-t border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-4 uppercase tracking-widest">Why Us</h2>
          <div className="w-16 h-1 bg-emerald-500 mx-auto mb-6 rounded-full"></div>
          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            At <span className="font-semibold text-emerald-600">Shift24</span>, we make eating right easy—freshly cooked, thoughtfully balanced, and delivered to your door.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="space-y-4">
            {points.map((point, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 hover:border-emerald-200 hover:shadow-md transition-all group"
              >
                <div className="mt-1.5 bg-emerald-100 rounded-full p-1.5 shrink-0 group-hover:bg-emerald-500 transition-colors duration-300">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full group-hover:bg-white transition-colors duration-300"></div>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {point}
                </p>
              </motion.div>
            ))}
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="relative h-full min-h-[600px] w-full hidden lg:flex items-center justify-center pointer-events-none overflow-hidden"
          >
            {/* The Measuring Tape SVG */}
            <svg viewBox="0 0 400 600" className="absolute inset-0 w-full h-full overflow-hidden" style={{ filter: 'drop-shadow(0px 15px 20px rgba(16, 185, 129, 0.2))' }}>
              {/* Main tape */}
              <path
                d="M 100,550 C 300,500 350,380 200,300 C 50,220 50,120 200,80 C 300,50 350,-20 300,-50"
                fill="none"
                stroke="#10b981"
                strokeWidth="42"
                strokeLinecap="round"
              />
              {/* Tape tick marks */}
              <path
                d="M 100,550 C 300,500 350,380 200,300 C 50,220 50,120 200,80 C 300,50 350,-20 300,-50"
                fill="none"
                stroke="#ffffff"
                strokeWidth="3"
                strokeDasharray="4 24"
                strokeLinecap="round"
              />
            </svg>

            {/* Floating Graphics */}
            <motion.div animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="absolute top-[10%] left-[20%] text-6xl drop-shadow-xl z-10">🥑</motion.div>
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 1 }} className="absolute top-[5%] right-[25%] text-7xl drop-shadow-xl transform rotate-12 z-0">🥕</motion.div>
            <motion.div animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.5 }} className="absolute top-[35%] left-[10%] text-7xl drop-shadow-xl -rotate-12 z-0">🥦</motion.div>
            <motion.div animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1.5 }} className="absolute top-[25%] right-[10%] text-6xl drop-shadow-xl rotate-12 z-10">🥚</motion.div>
            <motion.div animate={{ y: [0, -18, 0] }} transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut", delay: 2 }} className="absolute top-[50%] right-[30%] text-[5rem] drop-shadow-xl -rotate-6 z-10">🍊</motion.div>
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut", delay: 0.8 }} className="absolute bottom-[25%] right-[15%] text-7xl drop-shadow-xl rotate-6 z-0">🍅</motion.div>
            <motion.div animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 4.8, ease: "easeInOut", delay: 2.5 }} className="absolute bottom-[30%] left-[20%] text-6xl drop-shadow-xl -rotate-12 z-10">🧀</motion.div>
            <motion.div animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1.2 }} className="absolute bottom-[10%] left-[40%] text-7xl drop-shadow-xl rotate-12 z-0">🍎</motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function AboutUs() {
  return (
    <div className="pt-8 md:pt-16 lg:pt-24 pb-12 lg:pb-24 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
        
        {/* Who We Are Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 md:mb-8">Who We Are</h2>
            <div className="space-y-6 text-[17px] text-slate-600 leading-relaxed">
              <p>
                We're <span className="text-emerald-700 font-semibold">Shift24</span> — a healthy food delivery service on a mission to make eating well easy, reliable, and genuinely delicious. Our meals are designed by chefs and reviewed by a nutritionist, so you get the right balance of quality ingredients and consistent nutrition in every order.
              </p>
              <p>
                From sourcing clean produce to mindful portioning and daily-fresh prep, quality is at the center of what we do. We pack with <span className="font-semibold text-slate-700">eco-friendly materials</span> and keep the journey from kitchen to your door smooth and safe.
              </p>
              <p>
                Whether you choose a one-time order or a subscription, our promise stays the same: dependable taste, transparent nutrition, and <span className="font-semibold text-slate-700">on-time delivery</span>.
              </p>
              <p>
                We believe healthy food should be accessible, delightful, and sustainable. That's the standard we hold ourselves to—every single day.
              </p>
            </div>
          </div>
          <div className="relative h-[400px] lg:h-[600px]">
            <div className="absolute inset-0 bg-emerald-100 rounded-2xl md:rounded-[32px] transform translate-x-3 translate-y-3 md:translate-x-4 md:translate-y-4"></div>
            <img 
              src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1000" 
              alt="Chef preparing healthy food" 
              className="relative z-10 w-full h-full object-cover rounded-2xl md:rounded-[32px] shadow-sm border border-slate-200" 
            />
          </div>
        </section>

        {/* Our Mission Section */}
        <section className="max-w-4xl">
          <h2 className="text-[28px] font-bold text-slate-900 mb-6">Our Mission</h2>
          <div className="space-y-6 text-[16px] text-slate-600 leading-relaxed">
            <div>
              <h3 className="text-[17px] font-semibold text-slate-800 mb-2">Elevating Every Meal Experience</h3>
              <p>
                Shift24 blends nutrition-first recipes with chef-crafted flavor. From wholesome salads and bowls to thoughtfully prepared breakfasts and healthy drinks, we don't just deliver meals—we deliver a daily commitment to your well-being.
              </p>
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-slate-800 mb-2">Subscription Simplified, Taste Amplified</h3>
              <p>
                Pick a 6-day, 12-day, or one-month (26-day) plan and relax. Our kitchen and nutrition team handle the planning, rotating menus, and nutrition balance—so eating right is effortless.
              </p>
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-slate-800 mb-2">A New Menu Rhythm, Minus the Monotony</h3>
              <p>
                Variety matters. Our evolving 26-day cycle keeps things interesting while maintaining your macros and portions.
              </p>
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-slate-800 mb-2">Hygiene First, Always</h3>
              <p>
                We operate with strict hygiene protocols in a modern kitchen environment. Your meals are sealed securely, labeled clearly, and come with transparent nutrition info.
              </p>
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-slate-800 mb-2">Eco-Friendly Packing & On-Time Delivery</h3>
              <p>
                We use eco-friendly packaging wherever possible and focus on reliable, on-time delivery. Your order should arrive fresh, intact, and right when you expect it.
              </p>
            </div>
          </div>
        </section>

        {/* Our Vision Section */}
        <section className="max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 md:mb-8">Our Vision</h2>
          <div className="space-y-6 text-[17px] text-slate-600 leading-relaxed">
            <p>To make clean, balanced food the easy choice for everyday life.</p>
            <p>
              With every delivery, we aim to inspire a lifestyle that radiates health, clarity, and energy—without sacrificing flavor or convenience.
            </p>
            <p>
              Through culinary craft, thoughtful nutrition, and sustainable practices, we're building a food culture where people feel good about what they eat and how it's made.
            </p>
            <p>
              Our long-term goal is to be a trusted leader in healthy meal solutions—helping more people choose well, every day.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}

export function ContactUs() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.success('Message sent successfully! Our team will get back to you soon.');
    e.currentTarget.reset();
  };

  return (
    <section id="contact" className="py-12 md:py-16 lg:py-24 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <div className="text-emerald-600 font-bold text-xs uppercase tracking-widest mb-4">Get in Touch</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4 md:mb-6">We'd love to hear from you.</h2>
            <p className="text-base md:text-lg text-slate-500 mb-8 md:mb-10 leading-relaxed">
              Have questions about our meal plans, sourcing, or custom dietary requirements? Our nutrition team is here to help you achieve your goals.
            </p>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 text-emerald-600 shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Headquarters</p>
                  <p className="text-slate-500">123 Health Ave, Wellness City, CA 90210</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 text-emerald-600 shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Email Us</p>
                  <p className="text-slate-500">hello@Shift24.com</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 text-emerald-600 shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Call Us</p>
                  <p className="text-slate-500">1-800-Shift24</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl md:rounded-[32px] p-6 md:p-10 shadow-sm border border-slate-200">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Full Name</label>
                <input required type="text" placeholder="John Doe" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-slate-50" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                <input required type="email" placeholder="john@example.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-slate-50" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Message</label>
                <textarea required placeholder="How can we help you?" rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-slate-50 resize-none"></textarea>
              </div>
              <button type="submit" className="w-full py-3 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-[20px] font-bold text-base md:text-lg hover:bg-slate-800 transition-colors shadow-md md:shadow-lg">
                Send Message
              </button>
            </form>
          </div>
        </div>
        
        <div className="mt-16 bg-white rounded-2xl md:rounded-[32px] p-2 shadow-sm border border-slate-200">
          <div className="rounded-xl md:rounded-[24px] overflow-hidden h-[400px] w-full bg-slate-100 relative">
            <iframe
              title="Our Location"
              src="https://maps.google.com/maps?q=15/293-C%20Muriyankara,%20Pinarmunda%20Road,%20Peringala,%20Ernakulam&t=&z=15&ie=UTF8&iwloc=&output=embed"
              className="absolute top-0 left-0 w-full h-full"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

const testimonials = [
    {
      name: "Rony Joseph",
      text: "Honestly, the best thing is that the food isn't oily or heavy. You eat lunch, feel satisfied, and there's no afternoon sluggishness or heavy stomach. Delivery has been consistently on time every day.",
      rating: 5
    },
    {
      name: "Fathima Nasreen",
      text: "I was skeptical about meal subscriptions, but Shift24 genuinely surprised me. The portions are filling, the vegetables taste fresh, and having clean food sorted every day takes away so much daily stress.",
      rating: 5
    },
    {
      name: "Ananthakrishnan Nair",
      text: "The hygiene and taste are spot on. Doesn't feel like typical mess food at all—feels clean, simple, and properly balanced. Exactly what I was looking for.",
      rating: 5
    },
    {
      name: "Merin Thomas",
      text: "Zero drama and completely reliable. The meals arrive fresh and warm right when expected, and the taste is comforting like good home food. Very happy with the service.",
      rating: 5
    },
    {
      name: "Mohammed Faizal",
      text: "Consistent taste and no stomach issues at all. I've been ordering for almost a month now and I genuinely look forward to lunch every day. Neatly packed and hassle-free.",
      rating: 5
    },
    {
      name: "Meera Krishna",
      text: "Clean, wholesome food without complicated diet plans. Good variety throughout the week, fresh ingredients, and reliable daily delivery.",
      rating: 5
    }
  ];

  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  return (
    <section className="py-10 md:py-16 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="md:bg-slate-50 md:rounded-[32px] md:border md:border-slate-100 py-4 md:p-12 flex flex-col lg:flex-row items-center gap-12 md:shadow-sm">
          
          {/* Left Column: Context & Controls */}
          <div className="w-full lg:w-1/3 shrink-0 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-widest mb-4">
              <Star className="w-3 h-3 fill-emerald-700" /> Reviews
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-4">Loved by Thousands</h2>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto lg:mx-0">
              Don't just take our word for it. See what our Kakkanad community has to say about their Shift24 experience.
            </p>
            <div className="flex items-center justify-center lg:justify-start gap-4">
              <button 
                onClick={prevTestimonial}
                className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-colors shadow-sm"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={nextTestimonial}
                className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-colors shadow-sm"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right Column: Carousel Content */}
          <div className="w-full lg:w-2/3 relative min-h-[260px] flex items-center">
            <Quote className="absolute -top-4 -left-4 md:-top-8 md:-left-8 w-16 h-16 text-slate-200/50 -rotate-12 z-0" />
            
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="relative z-10 w-full bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100"
            >
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-100 border-2 border-slate-200 text-slate-400 flex items-center justify-center shrink-0 shadow-xs">
                  <User className="w-8 h-8 md:w-10 md:h-10 text-slate-400 stroke-[1.5]" />
                </div>
                <div>
                  <div className="flex gap-1 mb-3">
                    {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                    ))}
                  </div>
                  <p className="text-slate-700 text-base md:text-xl font-medium leading-relaxed mb-4">
                    "{testimonials[currentIndex].text}"
                  </p>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base md:text-lg">{testimonials[currentIndex].name}</h4>
                    <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified Subscriber</span>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "Do you deliver to Kakkanad?",
      answer: "Yes! We currently deliver exclusively across Kakkanad, including Infopark, SmartCity, Rajagiri, and surrounding neighborhoods. Check your exact delivery address during checkout."
    },
    {
      question: "Are there vegan or gluten-free options?",
      answer: "Absolutely. We believe eating well should be for everyone. Our weekly rotating menu always features dedicated vegan and gluten-friendly options crafted to be just as delicious as our standard fare."
    },
    {
      question: "Can I pause or skip a week?",
      answer: "Flexible plans for real life is our motto. You can easily pause, skip a delivery, or switch your plan entirely through your online dashboard up to 48 hours before your next scheduled delivery."
    },
    {
      question: "How do the meals stay fresh?",
      answer: "Our meals are cooked fresh every single morning and immediately sealed in our innovative eco-friendly packaging. They are then transported in temperature-controlled vans directly to your doorstep."
    }
  ];

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-emerald-600 tracking-widest uppercase mb-3">FAQ</h2>
          <h3 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-4 md:mb-6">Frequently Asked Questions</h3>
          <p className="text-slate-500 text-base md:text-lg">
            Explore our FAQ for concise and helpful answers to common queries. Find quick solutions and gain insights into frequently asked questions here.
          </p>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="border-b border-slate-200 last:border-0"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between py-6 text-left focus:outline-none group"
              >
                <h3 className={`text-base md:text-xl font-medium pr-8 transition-colors ${openIndex === index ? 'text-emerald-600' : 'text-slate-900 group-hover:text-emerald-600'}`}>
                  {faq.question}
                </h3>
                <div className={`shrink-0 transition-colors ${openIndex === index ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'}`}>
                  {openIndex === index ? <Minus className="w-6 h-6 stroke-[1.5]" /> : <Plus className="w-6 h-6 stroke-[1.5]" />}
                </div>
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pb-6 pr-12">
                      <p className="text-slate-500 text-base md:text-lg leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
