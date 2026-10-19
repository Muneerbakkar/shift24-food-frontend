import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

export function FeaturedMenuCarousel() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const menuItems = [
    {
      id: 1,
      name: "Herbrost Beef Tenderloin Bowl",
      description: "Herbrost Beef Tenderloin Bowl is a protein-packed, nutrient-rich dish...",
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800",
      price: 380
    },
    {
      id: 2,
      name: "Buttercraft Beef Tenderloin Bowl",
      description: "Buttercraft Beef Tenderloin Bowl is a rich, savory meal made with...",
      image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800",
      price: 420
    },
    {
      id: 3,
      name: "Millet Pasta Veggie Bowl",
      description: "A wholesome, millet-based veggie bowl packed with fiber-rich pasta an...",
      image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800",
      price: 320
    },
    {
      id: 4,
      name: "Veg Style Cauli Rice Bowl",
      description: "A clean, protein-packed vegetarian bowl made with flavorful cauliflower...",
      image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=800",
      price: 290
    },
    {
      id: 5,
      name: "Spicy Lemon Herb Chicken",
      description: "Tender chicken breast with a zesty lemon herb marinade and roasted veg...",
      image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&q=80&w=800",
      price: 340
    },
    {
      id: 6,
      name: "Mediterranean Quinoa Bowl",
      description: "Fresh Mediterranean flavors layered over a bed of fluffy, protein-rich quinoa...",
      image: "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&q=80&w=800",
      price: 360
    }
  ];

  // Auto-play functionality
  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        // If we've reached the end, scroll back to the start smoothly
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
      }
    }, 3000); // Moves every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Hidden for now as instant delivery / a-la-carte menu is paused
  return (
    <section className="hidden py-6 md:py-12 bg-white">
      <div className="max-w-7xl mx-auto px-3 md:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-5 md:mb-8">
          <h2 className="text-lg md:text-2xl font-bold text-slate-700 tracking-widest uppercase">
            Our Featured Menu
          </h2>
          <Link 
            to="/menu" 
            className="px-4 py-1.5 md:px-6 md:py-2 rounded-full border border-emerald-500 text-emerald-600 font-medium hover:bg-emerald-50 transition-colors text-xs md:text-sm"
          >
            See all
          </Link>
        </div>

        <div className="relative group">
          {/* Scroll Buttons */}
          <button 
            onClick={scrollLeft}
            className="absolute -left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center text-slate-800 hover:text-emerald-600 hover:scale-105 transition-all z-10 hidden md:flex opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button 
            onClick={scrollRight}
            className="absolute -right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center text-slate-800 hover:text-emerald-600 hover:scale-105 transition-all z-10 hidden md:flex opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Carousel Track */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {menuItems.map((item) => (
              <div 
                key={item.id}
                onClick={() => navigate(`/menu/beef/${item.id}`)}
                className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)] flex-shrink-0 snap-start bg-white rounded-xl md:rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer"
              >
                <div className="h-40 md:h-48 w-full bg-slate-100 overflow-hidden relative">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
                <div className="p-4 md:p-5 flex-1 flex flex-col">
                  <h3 className="text-base font-bold text-emerald-700 mb-1.5 line-clamp-1">{item.name}</h3>
                  <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed flex-1 mb-4">
                    {item.description}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-50">
                    <span className="font-bold text-lg text-slate-900">₹{item.price}</span>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toast('Single item purchases coming soon!');
                        }}
                        className="px-3 py-1.5 rounded-full bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm text-center min-w-[70px]"
                      >
                        Buy Now
                      </button>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toast('Single item purchases coming soon!');
                        }} 
                        className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs hover:bg-emerald-600 hover:text-white transition-colors shadow-sm flex items-center justify-center gap-1.5 min-w-[70px]"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
