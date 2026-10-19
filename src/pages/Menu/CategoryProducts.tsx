import { Link, useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

export const categoryData: Record<string, { title: string, description: string, products: any[] }> = {
  'beef': {
    title: 'Beef',
    description: 'Browse Beef items',
    products: [
      {
        id: '1',
        name: 'Buttercraft Beef with Spinach',
        description: 'Buttercraft Beef with spinach is a rich, savory meal made with marinated be...',
        imageUrl: 'https://images.unsplash.com/photo-1542826438-bd32f43d626f?auto=format&fit=crop&q=80&w=800',
        price: 350,
      },
      {
        id: '2',
        name: 'Herbrost Beef Tenderloin Bowl',
        description: 'Herbrost Beef Tenderloin Bowl is a protein-packed, nutrient-rich dish...',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800',
        price: 380,
      },
      {
        id: '3',
        name: 'Buttercraft Beef Tenderloin Bowl',
        description: 'Buttercraft Beef Tenderloin Bowl is a rich, savory meal made with marinat...',
        imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800',
        price: 420,
      },
      {
        id: '4',
        name: 'High Nutri Bowl',
        description: 'The High Nutri Bowl is a balanced, protein-rich meal crafted for fitness...',
        imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=800',
        price: 390,
      }
    ]
  },
  'chicken': {
    title: 'Chicken',
    description: 'Browse Chicken items',
    products: [
      {
        id: '5',
        name: 'Grilled Lemon Herb Chicken',
        description: 'Served with steamed asparagus and quinoa, perfect for a balanced diet.',
        imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800',
        price: 320,
      },
      {
        id: '6',
        name: 'Spicy Chicken Bowl',
        description: 'A fiery mix of chicken, rice, and fresh vegetables.',
        imageUrl: 'https://images.unsplash.com/photo-1504630083234-14187a9df0f5?auto=format&fit=crop&q=80&w=800',
        price: 340,
      }
    ]
  }
};

export function CategoryProducts() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  
  const data = categoryData[categoryId || 'beef'] || {
    title: categoryId ? categoryId.charAt(0).toUpperCase() + categoryId.slice(1) : 'Category',
    description: `Browse ${categoryId} items`,
    products: []
  };

  return (
    <div className="pt-8 md:pt-16 lg:pt-24 pb-12 lg:pb-24 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-slate-500 text-sm font-medium">
            <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link> <span className="mx-2">/</span> 
            <Link to="/menu" className="hover:text-emerald-600 transition-colors">Menu</Link> <span className="mx-2">/</span> 
            <span className="text-slate-900">{data.title}</span>
          </p>
        </div>
        
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">{data.title}</h1>
            <p className="text-slate-500">{data.description}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.products.length > 0 ? data.products.map((product) => (
            <Link to={`/menu/${categoryId || 'beef'}/${product.id}`} key={product.id} className="bg-white border border-slate-100 rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full cursor-pointer">
              <div className="w-full aspect-[4/3] overflow-hidden relative">
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5 flex-grow flex flex-col">
                <h3 className="text-lg font-bold text-emerald-700 mb-2">{product.name}</h3>
                <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-4">{product.description}</p>
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-50">
                  <span className="font-bold text-lg text-slate-900">₹{product.price || 350}</span>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toast('Single item purchases coming soon!');
                      }}
                      className="px-3 py-1.5 rounded-full bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm text-center min-w-[70px]"
                    >
                      Buy Now
                    </button>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        toast('Single item purchases coming soon!');
                      }} 
                      className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs hover:bg-emerald-600 hover:text-white transition-colors shadow-sm flex items-center justify-center gap-1.5 min-w-[70px]"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> Cart
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          )) : (
            <div className="col-span-full py-12 text-center text-slate-500">
              No products found in this category yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
