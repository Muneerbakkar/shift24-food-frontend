import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, X, Star, ZoomIn, ZoomOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { categoryData } from './CategoryProducts';

function IngredientsContent() {
  return (
    <ul className="list-disc pl-5 space-y-1">
      <li>Paneer</li>
      <li>Millet Pasta</li>
      <li>Mushroom</li>
      <li>Capsicum (Green/Yellow/Red)</li>
      <li>Broccoli</li>
      <li>Butter</li>
      <li>Parsley</li>
      <li>Tomato Concassa</li>
      <li>Parmesen Cheese</li>
      <li>Onion & Garlic & Celery</li>
    </ul>
  );
}

function MacrosContent() {
  return (
    <div className="grid grid-cols-2 gap-y-6 gap-x-4 mt-2">
      <div>
        <p className="text-slate-500 mb-1">Protein</p>
        <p className="text-slate-900 font-medium">7g</p>
      </div>
      <div>
        <p className="text-slate-500 mb-1">Total Fat</p>
        <p className="text-slate-900 font-medium">6g</p>
      </div>
      <div>
        <p className="text-slate-500 mb-1">Carbs</p>
        <p className="text-slate-900 font-medium">21g</p>
      </div>
      <div>
        <p className="text-slate-500 mb-1">Energy</p>
        <p className="text-slate-900 font-medium">0</p>
      </div>
    </div>
  );
}

function MicrosContent() {
  return (
    <div className="grid grid-cols-2 gap-y-6 gap-x-4 mt-2">
      {[
        { label: 'Sodium (mg)', value: '0' },
        { label: 'Potassium (mg)', value: '0' },
        { label: 'Calcium (mg)', value: '0' },
        { label: 'Iron (mg)', value: '0' },
        { label: 'Magnesium (mg)', value: '0' },
        { label: 'Manganese (mg)', value: '0' },
        { label: 'Phosphorus (mg)', value: '0' },
        { label: 'Zinc (mg)', value: '0' },
        { label: 'Selenium (mcg)', value: '0' },
        { label: 'Vitamin A', value: '0' },
        { label: 'Vitamin B2', value: '0' },
        { label: 'Vitamin B6', value: '0' },
      ].map((item, idx) => (
        <div key={idx}>
          <p className="text-slate-500 mb-1">{item.label}</p>
          <p className="text-slate-900 font-medium">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function AccordionItem({ title, defaultOpen = false, children }: { title: string, defaultOpen?: boolean, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-2xl mb-4 overflow-hidden bg-white">
      <button 
        className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-bold text-slate-900 text-[17px]">{title}</span>
        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>
      {isOpen && (
        <div className="px-6 pb-6 text-slate-600 leading-relaxed text-[15px]">
          {children}
        </div>
      )}
    </div>
  );
}

export function ProductDetails() {
  const { categoryId, productId } = useParams();
  const navigate = useNavigate();
  const [modalContent, setModalContent] = useState<'macros' | 'micros' | 'ingredients' | null>(null);
  
  // Image Gallery & Zoom State
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomProps, setZoomProps] = useState({ scale: 1, x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const zoomStateRef = useRef({ scale: 1, x: 50, y: 50 });
  
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;

    let initialDist = 0;
    let initialScale = 1;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const { left, top, width, height } = container.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 100;
      const y = ((e.clientY - top) / height) * 100;

      zoomStateRef.current = {
        ...zoomStateRef.current,
        scale: Math.min(Math.max(1, zoomStateRef.current.scale - e.deltaY * 0.01), 5),
        x,
        y
      };
      
      setZoomProps({ ...zoomStateRef.current });
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        initialScale = zoomStateRef.current.scale;
        
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        const { left, top, width, height } = container.getBoundingClientRect();
        
        zoomStateRef.current = {
          ...zoomStateRef.current,
          x: ((centerX - left) / width) * 100,
          y: ((centerY - top) / height) * 100
        };
        setZoomProps({ ...zoomStateRef.current });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        
        const newScale = Math.min(Math.max(1, initialScale * (dist / initialDist)), 5);
        
        zoomStateRef.current = {
          ...zoomStateRef.current,
          scale: newScale
        };
        setZoomProps({ ...zoomStateRef.current });
      } else if (e.touches.length === 1 && zoomStateRef.current.scale > 1) {
        e.preventDefault(); // Prevent page scroll when zoomed in
        
        // Allow panning with 1 finger
        const touch = e.touches[0];
        const { left, top, width, height } = container.getBoundingClientRect();
        const x = ((touch.clientX - left) / width) * 100;
        const y = ((touch.clientY - top) / height) * 100;
        
        zoomStateRef.current = {
          ...zoomStateRef.current,
          x,
          y
        };
        setZoomProps({ ...zoomStateRef.current });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    
    zoomStateRef.current = { ...zoomStateRef.current, x, y };
    setZoomProps({ ...zoomStateRef.current });
  };

  const handleMouseLeave = () => {
    zoomStateRef.current = { scale: 1, x: 50, y: 50 };
    setZoomProps({ ...zoomStateRef.current });
  };
  
  const [reviews, setReviews] = useState([
    {
      id: '1',
      user: 'Sarah M.',
      rating: 5,
      date: 'August 10, 2026',
      comment: 'Absolutely delicious! The beef was so tender and the spinach added a perfect healthy touch.'
    },
    {
      id: '2',
      user: 'Jason T.',
      rating: 4,
      date: 'August 5, 2026',
      comment: 'Great macros and tasted really fresh. Portion size could be slightly bigger.'
    }
  ]);
  const [newReviewRating, setNewReviewRating] = useState(0);
  const [newReviewText, setNewReviewText] = useState('');

  const submitReview = () => {
    if (!newReviewText.trim() || newReviewRating === 0) return;
    
    const newReview = {
      id: Date.now().toString(),
      user: localStorage.getItem('userName') || 'Guest User',
      rating: newReviewRating,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      comment: newReviewText
    };
    
    setReviews([newReview, ...reviews]);
    setNewReviewRating(0);
    setNewReviewText('');
  };
  
  const category = categoryData[categoryId || 'beef'];
  const productStub = category?.products.find(p => p.id === productId);
  
  const categoryName = category?.title || 'Category';

  const defaultImage = productStub?.imageUrl || 'https://images.unsplash.com/photo-1542826438-bd32f43d626f?auto=format&fit=crop&q=80&w=800';

  const product = {
    id: productId,
    name: productStub?.name || 'Buttercraft Beef with Spinach',
    imageUrl: defaultImage,
    images: [
      defaultImage,
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=800'
    ],
    price: 350,
    options: ['350 g'],
    brand: 'kealthy',
    tags: ['Gluten-free: Yes', 'Keto Friendly: Yes', 'Low GI: Yes', 'Low Sugar: Yes', 'Vegan-Friendly: Yes', 'Eco-Friendly: Sustainable'],
    description: productStub?.description || 'Buttercraft Beef with spinach is a rich, savory meal made with marinated beef tenderloin, sautéed onions, mushrooms, and tricolor capsicums, all brought together with the bold flavors of garlic, celery, and a touch of butter. Finished with fresh parsley, this bowl delivers a delicious blend of lean protein, aromatics, and healthy fats — perfect for a comforting yet wholesome lunch or dinner',
    ingredientsText: 'Marinated Beef Tenderloin, Spinach, Onions, Mushrooms, Capsicum, Garlic, Celery, Butter, Parsley.',
    macrosText: 'Protein (g), Total Fat (g), Carbs (g)...',
    microsText: 'Sodium (mg), Calcium (mg), Iron (mg)...'
  };

  return (
    <div className="pt-8 md:pt-16 lg:pt-24 pb-12 lg:pb-24 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-slate-500 text-sm font-medium">
            <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link> <span className="mx-2">/</span> 
            <Link to="/menu" className="hover:text-emerald-600 transition-colors">Menu</Link> <span className="mx-2">/</span> 
            <Link to={`/menu/${categoryId}`} className="hover:text-emerald-600 transition-colors">{categoryName}</Link> <span className="mx-2">/</span> 
            <span className="text-slate-900">{product.name}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div>
            <div 
              ref={imageContainerRef}
              className={`rounded-[32px] overflow-hidden bg-slate-100 aspect-[4/3] md:aspect-auto md:h-[500px] relative ${zoomProps.scale > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <img 
                src={product.images[activeImageIndex]} 
                alt={product.name} 
                className="w-full h-full object-cover"
                style={{
                  transformOrigin: `${zoomProps.x}% ${zoomProps.y}%`,
                  transform: `scale(${zoomProps.scale})`,
                  transition: zoomProps.scale > 1 ? 'transform 0.1s ease-out' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
            
            {/* Thumbnails Gallery */}
            <div className="flex gap-4 mt-6 overflow-x-auto pb-2 scrollbar-hide">
              {product.images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                    activeImageIndex === idx 
                      ? 'border-emerald-500 shadow-md scale-105' 
                      : 'border-transparent hover:border-emerald-200'
                  }`}
                >
                  <img src={img} alt={`Product thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">{product.name}</h1>
            
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-emerald-700">₹{product.price}/-</span>
              <p className="text-slate-500 text-sm mt-1">(Inclusive of all taxes)</p>
            </div>

            <div className="mb-8">
              <p className="text-slate-800 font-medium mb-3">Options:</p>
              <div className="flex gap-3">
                {product.options.map(opt => (
                  <span key={opt} className="px-4 py-2 rounded-full border border-emerald-500 text-emerald-700 font-medium text-sm bg-emerald-50/30">
                    {opt}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button 
                onClick={() => toast('Single item purchases coming soon!')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                Buy Now
              </button>
              <button 
                onClick={() => toast('Single item purchases coming soon!')}
                className="flex-1 bg-white border-2 border-emerald-600 hover:bg-emerald-50 text-emerald-700 font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                Add to Cart
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-100/50">
                <h4 className="font-bold text-slate-800 mb-2">Macros</h4>
                <p className="text-slate-600 text-sm mb-3 line-clamp-2">{product.macrosText}</p>
                <button onClick={() => setModalContent('macros')} className="text-slate-900 font-semibold text-sm hover:underline">More</button>
              </div>
              <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-100/50">
                <h4 className="font-bold text-slate-800 mb-2">Micros</h4>
                <p className="text-slate-600 text-sm mb-3 line-clamp-2">{product.microsText}</p>
                <button onClick={() => setModalContent('micros')} className="text-slate-900 font-semibold text-sm hover:underline">More</button>
              </div>
              <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-100/50">
                <h4 className="font-bold text-slate-800 mb-2">Ingredients</h4>
                <p className="text-slate-600 text-sm mb-3 line-clamp-2">{product.ingredientsText}</p>
                <button onClick={() => setModalContent('ingredients')} className="text-slate-900 font-semibold text-sm hover:underline">More</button>
              </div>
            </div>
            
            <div>
              <p className="text-slate-700 mb-3"><span className="font-medium text-slate-900">Brand:</span> {product.brand}</p>
              <div className="flex flex-wrap gap-2">
                {product.tags.map(tag => (
                  <span key={tag} className="px-4 py-1.5 rounded-full border border-slate-200 text-slate-600 text-sm bg-white shadow-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl">
          <AccordionItem title="What is it?" defaultOpen={true}>
            <p>{product.description}</p>
          </AccordionItem>
          <AccordionItem title="What is it used for?">
            <p>This product is ideal for individuals looking for a balanced, nutrient-rich meal that supports fitness goals and overall health. It provides essential proteins and vitamins.</p>
          </AccordionItem>
          <AccordionItem title="Other Product Info">
            <div className="space-y-4">
              <p><span className="text-slate-600">EAN Code:</span> <span className="font-medium text-slate-900">9780201651027</span></p>
              <p><span className="text-slate-600">Sourced & Marketed by:</span> <span className="font-medium text-slate-900">COTOLORE ENTERPRISES LLP 15/293-C, Muriyankara - Pinarmunda Road Peringala, Ernakulam - 683565</span></p>
              <p><span className="text-slate-600">Manufacturer Address:</span> <span className="font-medium text-slate-900">COTOLORE ENTERPRISES LLP 15/293-C, Muriyankara - Pinarmunda Road Peringala, Ernakulam - 683565</span></p>
              <p><span className="text-slate-600">Country of Origin:</span> <span className="font-medium text-slate-900">India</span></p>
              <p><span className="text-slate-600">Best Within:</span> <span className="font-medium text-slate-900">Best before 2 hours from the time of packaging</span></p>
              <p className="text-sm text-slate-500 mt-6 pt-4 border-t border-slate-100">
                The image(s) shown are representative of the actual product. While every effort has been made to maintain accurate and up-to-date content, please read product labels, batch/manufacturing/packing details, warnings, and directions before use.
              </p>
            </div>
          </AccordionItem>
        </div>

        <div className="max-w-4xl mt-16 pt-12 border-t border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Customer Reviews</h2>
          
          <div className="bg-slate-50 rounded-3xl p-6 md:p-8 mb-10 border border-slate-100 flex flex-col md:flex-row gap-8 items-center">
            <div className="text-center md:text-left min-w-[120px]">
              <div className="text-5xl font-extrabold text-slate-900 mb-2">4.5</div>
              <div className="flex text-amber-400 mb-2 justify-center md:justify-start">
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current text-slate-300" />
              </div>
              <p className="text-slate-500 text-sm font-medium">Based on {reviews.length} reviews</p>
            </div>
            <div className="hidden md:block w-px h-24 bg-slate-200"></div>
            <div className="flex-1 w-full">
              <h4 className="font-bold text-slate-800 mb-3">Write a Review</h4>
              <div className="flex gap-2 mb-3">
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    key={star} 
                    onClick={() => setNewReviewRating(star)}
                    className={`${newReviewRating >= star ? 'text-amber-400' : 'text-slate-300'} hover:text-amber-400 transition-colors`}
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                ))}
              </div>
              <textarea 
                placeholder="What did you think about this meal?" 
                value={newReviewText}
                onChange={e => setNewReviewText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow mb-3 resize-none h-24 text-sm"
              />
              <button 
                onClick={submitReview}
                disabled={!newReviewText.trim() || newReviewRating === 0}
                className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
              >
                Submit Review
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {reviews.map(review => (
              <div key={review.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      {review.user.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-tight">{review.user}</h4>
                      <p className="text-sm text-slate-500">{review.date}</p>
                    </div>
                  </div>
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-slate-200 fill-current'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-slate-700 leading-relaxed text-[15px]">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {modalContent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setModalContent(null)}>
          <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 max-w-md w-full shadow-xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalContent(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full p-2 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-bold text-slate-900 mb-6 capitalize">{modalContent}</h3>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              {modalContent === 'macros' && <MacrosContent />}
              {modalContent === 'micros' && <MicrosContent />}
              {modalContent === 'ingredients' && <IngredientsContent />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
