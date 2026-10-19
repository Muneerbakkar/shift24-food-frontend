import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';

export function CartPage() {
  const [cartItems, setCartItems] = useState([
    {
      id: '1',
      name: 'Buttercraft Beef with Spinach',
      price: 350,
      quantity: 2,
      imageUrl: 'https://images.unsplash.com/photo-1542826438-bd32f43d626f?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: '5',
      name: 'Grilled Lemon Herb Chicken',
      price: 320,
      quantity: 1,
      imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&q=80&w=800'
    }
  ]);

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(items => items.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const delivery = subtotal > 0 ? 50 : 0;
  const taxes = Math.round(subtotal * 0.05); // 5% GST estimate
  const total = subtotal + delivery + taxes;

  return (
    <div className="pt-8 md:pt-16 lg:pt-24 pb-12 lg:pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-slate-500 text-sm font-medium">
            <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link> <span className="mx-2">/</span> 
            <span className="text-slate-900">Your Cart</span>
          </p>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 md:mb-10">Your Cart</h1>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Your cart is empty</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">Looks like you haven't added any meals to your cart yet. Explore our delicious menu to get started!</p>
            <Link to="/menu" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
              Browse Menu <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Cart Items List */}
            <div className="flex-1 space-y-6">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 flex gap-4 sm:gap-6">
                  <div className="w-20 sm:w-32 h-20 sm:h-32 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 bg-slate-100">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-2 mb-2 sm:mb-4">
                      <div>
                        <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1 leading-tight">{item.name}</h3>
                        <p className="text-sm sm:text-base text-slate-500 font-medium">₹{item.price}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-sm text-slate-500 mb-1">Total</p>
                        <p className="text-2xl font-bold text-emerald-700">₹{item.price * item.quantity}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-slate-200 rounded-full bg-slate-50 p-1">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-white hover:text-emerald-600 hover:shadow-sm transition-all"
                        >
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <span className="w-8 sm:w-10 text-center font-bold text-slate-900 text-sm sm:text-base">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-white hover:text-emerald-600 hover:shadow-sm transition-all"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="sm:hidden text-right">
                          <p className="text-lg font-bold text-emerald-700">₹{item.price * item.quantity}</p>
                        </div>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 sm:p-2"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:w-[400px]">
              <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-100 sticky top-32">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Order Summary</h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal ({cartItems.reduce((acc, item) => acc + item.quantity, 0)} items)</span>
                    <span className="font-medium text-slate-900">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee</span>
                    <span className="font-medium text-slate-900">₹{delivery}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Taxes (5%)</span>
                    <span className="font-medium text-slate-900">₹{taxes}</span>
                  </div>
                </div>
                
                <div className="border-t border-slate-100 pt-5 sm:pt-6 mb-6 sm:mb-8">
                  <div className="flex justify-between items-center">
                    <span className="text-base sm:text-lg font-bold text-slate-900">Total</span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-700">₹{total}</span>
                  </div>
                </div>
                
                <Link 
                  to="/cart/checkout"
                  className="block text-center w-full bg-emerald-600 text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Proceed to Checkout
                </Link>
                
                <p className="text-center text-sm text-slate-500 mt-4">
                  Secure checkout powered by Stripe
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
