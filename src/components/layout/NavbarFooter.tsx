import { Zap, Menu as MenuIcon, X, Facebook, Instagram, Youtube, User, ShoppingCart, Bell, Home, Info, Utensils, Calendar, Phone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
      setUserName(localStorage.getItem('userName') || 'John Doe');
    };
    
    checkAuth();
    window.addEventListener('auth-change', checkAuth);
    return () => window.removeEventListener('auth-change', checkAuth);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex justify-between items-center h-20 relative">
          <Link to="/" className="flex items-center gap-2 z-10">
            <div className="bg-emerald-500 p-1.5 rounded-lg flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800 uppercase">SHIFT<span className="text-emerald-500">24</span></span>
          </Link>
          
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 gap-8 items-center text-sm font-medium">
            <Link to="/" className={`transition-colors ${isActive('/') ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-emerald-600'}`}>Home</Link>
            <Link to="/about" className={`transition-colors ${isActive('/about') ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-emerald-600'}`}>About Us</Link>
            <Link to="/menu" className={`transition-colors ${isActive('/menu') ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-emerald-600'}`}>Menu</Link>
            <Link to="/subscribe" className={`transition-colors ${isActive('/subscribe') ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-emerald-600'}`}>Subscribe</Link>
            <Link to="/contact" className={`transition-colors ${isActive('/contact') ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-emerald-600'}`}>Contact</Link>
          </div>

          <div className="hidden md:flex gap-6 items-center z-10">
            <Link to="/notifications" className="text-slate-500 hover:text-emerald-600 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
            </Link>
            {/* Cart icon - hidden for now as instant delivery is paused */}
            <Link to="/cart" onClick={(e) => { e.preventDefault(); toast('Single item purchases coming soon!'); }} className="hidden text-slate-500 hover:text-emerald-600 transition-colors relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">3</span>
            </Link>
            {isLoggedIn ? (
              <Link to="/profile" className={`flex items-center gap-2 transition-colors ${isActive('/profile') ? 'text-emerald-600' : 'text-slate-600 hover:text-emerald-600'}`}>
                <div className="bg-emerald-100 p-1.5 rounded-full text-emerald-600">
                  <User className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">{userName}</span>
              </Link>
            ) : (
              <Link to="/login" className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm">Log In</Link>
            )}
          </div>

          <div className="md:hidden flex items-center gap-5 z-10">
             <Link to="/notifications" onClick={() => setIsOpen(false)} className="text-slate-500 relative">
               <Bell className="w-5 h-5" />
               <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
             </Link>
             {/* Cart icon - hidden for now as instant delivery is paused */}
             <Link to="/cart" onClick={(e) => { e.preventDefault(); setIsOpen(false); toast('Single item purchases coming soon!'); }} className="hidden text-slate-500 relative">
               <ShoppingCart className="w-5 h-5" />
               <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">3</span>
             </Link>
             <button onClick={() => setIsOpen(true)} className="text-slate-600 ml-1">
                <MenuIcon className="w-6 h-6" />
             </button>
          </div>
        </div>
      </div>
      {/* Mobile Menu Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-[60] md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-[80%] max-w-[360px] bg-slate-50 shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2">
            <div className="bg-emerald-500 p-1.5 rounded-lg flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800 uppercase">SHIFT<span className="text-emerald-500">24</span></span>
          </Link>
          <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-700 bg-slate-50 rounded-full p-2">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-6 overflow-y-auto h-full">
          <Link to="/" onClick={() => setIsOpen(false)} className={`text-base font-medium flex items-center gap-4 ${isActive('/') ? 'text-emerald-600 font-bold' : 'text-slate-600 hover:text-emerald-600'}`}>
            <Home className="w-5 h-5 text-slate-400" /> Home
          </Link>
          <Link to="/about" onClick={() => setIsOpen(false)} className={`text-base font-medium flex items-center gap-4 ${isActive('/about') ? 'text-emerald-600 font-bold' : 'text-slate-600 hover:text-emerald-600'}`}>
            <Info className="w-5 h-5 text-slate-400" /> About Us
          </Link>
          <Link to="/menu" onClick={() => setIsOpen(false)} className={`text-base font-medium flex items-center gap-4 ${isActive('/menu') ? 'text-emerald-600 font-bold' : 'text-slate-600 hover:text-emerald-600'}`}>
            <Utensils className="w-5 h-5 text-slate-400" /> Menu
          </Link>
          <Link to="/subscribe" onClick={() => setIsOpen(false)} className={`text-base font-medium flex items-center gap-4 ${isActive('/subscribe') ? 'text-emerald-600 font-bold' : 'text-slate-600 hover:text-emerald-600'}`}>
            <Calendar className="w-5 h-5 text-slate-400" /> Subscribe
          </Link>
          <Link to="/contact" onClick={() => setIsOpen(false)} className={`text-base font-medium flex items-center gap-4 ${isActive('/contact') ? 'text-emerald-600 font-bold' : 'text-slate-600 hover:text-emerald-600'}`}>
            <Phone className="w-5 h-5 text-slate-400" /> Contact Us
          </Link>
          
          <div className="mt-auto pt-6 border-t border-slate-100">
            {isLoggedIn ? (
              <Link to="/profile" onClick={() => setIsOpen(false)} className={`text-base font-medium flex items-center gap-3 ${isActive('/profile') ? 'text-emerald-600 font-bold' : 'text-emerald-600'}`}>
                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                  <User className="w-4 h-4" />
                </div>
                Profile ({userName})
              </Link>
            ) : (
              <Link to="/login" onClick={() => setIsOpen(false)} className={`w-full text-center bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm`}>
                Log In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="bg-white pt-16 pb-8 border-t border-slate-200 relative mt-auto overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-16 items-start">
          
          {/* Logo Column */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="bg-emerald-500 p-2 rounded-xl">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-800 uppercase">SHIFT<span className="text-emerald-500">24</span></span>
            </Link>
          </div>

          {/* Address Column */}
          <div className="lg:col-span-1">
            <h4 className="font-semibold text-emerald-700 uppercase tracking-wide mb-4 text-[15px]">Address</h4>
            <div className="text-slate-600 leading-relaxed text-[15px]">
              <p>123 Health Ave,</p>
              <p>Wellness City,</p>
              <p>CA 90210</p>
            </div>
          </div>

          {/* Phone & Email Column */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <h4 className="font-semibold text-emerald-700 uppercase tracking-wide mb-4 text-[15px]">Phone</h4>
              <p className="text-slate-600 text-[15px]">1-800-Shift24</p>
            </div>
            <div>
              <h4 className="font-semibold text-emerald-700 uppercase tracking-wide mb-4 text-[15px]">Email</h4>
              <p className="text-slate-600 text-[15px]">hello@Shift24.com</p>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="lg:col-span-1">
            <h4 className="font-semibold text-emerald-700 uppercase tracking-wide mb-4 text-[15px]">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-slate-600 text-[15px] hover:text-emerald-600 transition-colors">About Us</Link></li>
              <li><Link to="/privacy-policy" className="text-slate-600 text-[15px] hover:text-emerald-600 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-and-conditions" className="text-slate-600 text-[15px] hover:text-emerald-600 transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/refund-policy" className="text-slate-600 text-[15px] hover:text-emerald-600 transition-colors">Returns & Refunds</Link></li>
              <li><Link to="/contact" className="text-slate-600 text-[15px] hover:text-emerald-600 transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Follow Us Column */}
          <div className="lg:col-span-1">
            <h4 className="font-semibold text-emerald-700 uppercase tracking-wide mb-4 text-[15px]">Follow Us</h4>
            <div className="flex gap-4">
              <a href="#" className="text-slate-600 hover:text-emerald-600 transition-colors">
                <Facebook className="w-[22px] h-[22px]" strokeWidth={2.5} />
              </a>
              <a href="#" className="text-slate-600 hover:text-emerald-600 transition-colors">
                <Instagram className="w-[22px] h-[22px]" strokeWidth={2.5} />
              </a>
              <a href="#" className="text-slate-600 hover:text-emerald-600 transition-colors flex items-center justify-center">
                <Youtube className="w-[22px] h-[22px]" strokeWidth={2.5} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 text-center">
          <p className="text-slate-600 text-[15px]">Copyright ©2026 Shift24 – All Rights Reserved</p>
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      <a 
        href="https://wa.me/917356890059" 
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#1EBE5A] text-white px-5 py-3 rounded-full flex items-center gap-2 font-bold shadow-lg transition-transform hover:scale-105"
        aria-label="WhatsApp Us"
      >
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
           <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
        WhatsApp us
      </a>
    </footer>
  );
}
