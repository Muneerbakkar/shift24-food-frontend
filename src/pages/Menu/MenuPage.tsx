import { Link } from 'react-router-dom';

const menuCategories = [
  { id: 'beef', name: 'Beef', imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800' },
  { id: 'chicken', name: 'Chicken', imageUrl: 'https://images.unsplash.com/photo-1504630083234-14187a9df0f5?auto=format&fit=crop&q=80&w=800' },
  { id: 'expert-recipes', name: 'Expert Recipes', imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800' },
  { id: 'fish', name: 'Fish', imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=800' },
  { id: 'probiotic', name: 'Probiotic', imageUrl: 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&q=80&w=800' },
  { id: 'salads', name: 'Salads', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800' },
  { id: 'smoothies', name: 'Smoothies & Fruit Bowl', imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&q=80&w=800' },
  { id: 'vegetarian', name: 'Vegetarian', imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800' }
];

export function MenuPage() {
  return (
    <div className="pt-8 md:pt-16 lg:pt-24 pb-12 lg:pb-24 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-slate-500 text-sm font-medium">
            <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link> <span className="mx-2">/</span> <span className="text-slate-900">Menu</span>
          </p>
        </div>
        
        <h1 className="text-4xl font-bold text-slate-900 text-center mb-16">Menu</h1>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-center">
          {menuCategories.map((category) => (
            <Link to={`/menu/${category.id}`} key={category.name} className="flex flex-col items-center group cursor-pointer">
              <div className="w-full aspect-[4/3] sm:aspect-square rounded-[24px] overflow-hidden mb-4 bg-slate-100 shadow-sm border border-slate-100">
                <img 
                  src={category.imageUrl} 
                  alt={category.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <h3 className="font-semibold text-slate-800 text-center text-sm md:text-base">{category.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
