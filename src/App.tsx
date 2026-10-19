import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';

// Pages
import { Home } from './pages/Home/Home';
import { LoginPage } from './pages/Auth/LoginPage';
import { SubscribePage } from './pages/Subscribe/SubscribePage';
import { CartPage } from './pages/Cart/CartPage';
import { CartCheckout } from './pages/Cart/CartCheckout';
import { MenuPage } from './pages/Menu/MenuPage';
import { CategoryProducts } from './pages/Menu/CategoryProducts';
import { ProductDetails } from './pages/Menu/ProductDetails';
import { ProfilePage } from './pages/Profile/Profile';
import { NotificationsPage } from './pages/Profile/NotificationsPage';
import { CheckoutDetails } from './pages/Subscribe/Checkout';
import { PrivacyPolicy, TermsAndConditions, ReturnRefundPolicy } from './pages/Legal/Legal';

// Other components acting as pages
import { AboutUs, ContactUs } from './components/sections/Sections';
import { SubscriptionPlan, PlanMenu, MealDetails, MenuExplorer } from './components/subscription/Subscription';

// Admin Portal Components
import { AdminLayout } from './pages/Admin/AdminLayout';
import { AdminLoginPage } from './pages/Admin/AdminLoginPage';
import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { AdminSubscriptions } from './pages/Admin/AdminSubscriptions';
import { AdminOrders } from './pages/Admin/AdminOrders';
import { AdminKitchen } from './pages/Admin/AdminKitchen';
import { AdminMenu } from './pages/Admin/AdminMenu';
import { AdminCustomers } from './pages/Admin/AdminCustomers';
import { AdminProfile } from './pages/Admin/AdminProfile';
import { AdminPurchases } from './pages/Admin/AdminPurchases';
import { AdminExpenses } from './pages/Admin/AdminExpenses';
import { AdminSales } from './pages/Admin/AdminSales';
import { AdminUsers } from './pages/Admin/AdminUsers';

// Set to true to re-enable instant delivery / a-la-carte menu and cart
const ENABLE_CART = false;
const ENABLE_MENU = false;

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          {/* Menu Explorer page displays all plans and their daily chef menus */}
          <Route path="/menu" element={<MenuExplorer />} />
          <Route path="/menu/category/:category" element={ENABLE_MENU ? <CategoryProducts /> : <Navigate to="/menu" replace />} />
          <Route path="/menu/product/:id" element={ENABLE_MENU ? <ProductDetails /> : <Navigate to="/menu" replace />} />
          <Route path="/subscribe" element={<SubscribePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          {/* Cart pages hidden while instant delivery is paused */}
          <Route path="/cart" element={ENABLE_CART ? <CartPage /> : <Navigate to="/" replace />} />
          <Route path="/cart/checkout" element={ENABLE_CART ? <CartCheckout /> : <Navigate to="/" replace />} />
          <Route path="/checkout" element={<CheckoutDetails />} />
          <Route path="/checkout/:planId" element={<CheckoutDetails />} />
          <Route path="/checkout/:planId/:durationId" element={<CheckoutDetails />} />
          <Route path="/plan/:planId" element={<SubscriptionPlan />} />
          <Route path="/plan/:planId/menu/:durationId" element={<PlanMenu />} />
          <Route path="/plan/:planId/menu/:durationId/meal/:dayId/:mealType" element={<MealDetails />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/refund-policy" element={<ReturnRefundPolicy />} />

          {/* Admin Portal Routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
          <Route path="/admin/sales" element={<AdminLayout><AdminSales /></AdminLayout>} />
          <Route path="/admin/subscriptions" element={<AdminLayout><AdminSubscriptions /></AdminLayout>} />
          <Route path="/admin/orders" element={<AdminLayout><AdminOrders /></AdminLayout>} />
          <Route path="/admin/kitchen" element={<AdminLayout><AdminKitchen /></AdminLayout>} />
          <Route path="/admin/menu" element={<AdminLayout><AdminMenu /></AdminLayout>} />
          <Route path="/admin/customers" element={<AdminLayout><AdminCustomers /></AdminLayout>} />
          <Route path="/admin/purchases" element={<AdminLayout><AdminPurchases /></AdminLayout>} />
          <Route path="/admin/expenses" element={<AdminLayout><AdminExpenses /></AdminLayout>} />
          <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
          <Route path="/admin/profile" element={<AdminLayout><AdminProfile /></AdminLayout>} />
        </Routes>
      </Layout>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#059669',
            color: '#fff',
            fontWeight: 'bold',
          },
          success: {
            iconTheme: {
              primary: '#fff',
              secondary: '#059669',
            },
          },
        }}
      />
    </BrowserRouter>
  );
}
