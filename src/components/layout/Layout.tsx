import React from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar, Footer } from './NavbarFooter';
import { ScrollToHashElement } from '../utils/ScrollToHashElement';

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isDriver = location.pathname.startsWith('/driver');

  if (isAdmin || isDriver) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-emerald-200 selection:text-emerald-900 w-full overflow-x-hidden">
      <ScrollToHashElement />
      <Navbar />
      <main className="flex-grow w-full overflow-x-hidden">
        {children}
      </main>
      <Footer />
    </div>
  );
}
