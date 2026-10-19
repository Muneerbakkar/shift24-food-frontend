import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

function LegalLayout({ title, lastUpdated, children }: { title: string, lastUpdated: string, children: React.ReactNode }) {
  return (
    <div className="pt-8 md:pt-16 lg:pt-24 pb-12 lg:pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/profile" className="inline-flex items-center text-emerald-600 font-semibold mb-8 hover:text-emerald-700 transition-colors">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Profile
        </Link>
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">{title}</h1>
          <p className="text-slate-500 mb-8 pb-8 border-b border-slate-100">Last Updated: {lastUpdated}</p>
          <div className="space-y-8 text-slate-700 leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="August 14, 2026">
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4">1. Information We Collect</h3>
        <p className="mb-4">We collect information you provide directly to us when you create an account, subscribe to our meal plans, fill out a form, or communicate with us. This includes:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Name, email address, phone number, and delivery address.</li>
          <li>Dietary preferences, allergies, and health goals to customize your meal plans.</li>
          <li>Payment information (processed securely by our payment partners).</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4">2. How We Use Your Information</h3>
        <p className="mb-4">We use the information we collect to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Prepare and deliver personalized meal plans.</li>
          <li>Communicate with you about your subscription, deliveries, and account updates.</li>
          <li>Improve our recipes, delivery logistics, and overall customer experience.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4">3. Data Security</h3>
        <p>We implement appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.</p>
      </section>
    </LegalLayout>
  );
}

export function TermsAndConditions() {
  return (
    <LegalLayout title="Terms and Conditions" lastUpdated="August 14, 2026">
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h3>
        <p>By accessing and using our service, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4">2. Subscription and Deliveries</h3>
        <p className="mb-4">When you subscribe to our meal plans:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>You agree to provide accurate and complete delivery information.</li>
          <li>Meals are delivered daily. You must pause or skip days at least 48 hours in advance to modify a scheduled delivery.</li>
          <li>We reserve the right to substitute ingredients or meals based on seasonal availability and quality standards.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4">3. Dietary Information</h3>
        <p>While we take extreme care to accommodate allergies and dietary requirements as provided in your profile, our meals are prepared in a facility that also handles nuts, gluten, dairy, and other allergens. We cannot guarantee completely allergen-free environments.</p>
      </section>
    </LegalLayout>
  );
}

export function ReturnRefundPolicy() {
  return (
    <LegalLayout title="Return and Refund Policy" lastUpdated="August 14, 2026">
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4">1. Cancellation and Pausing</h3>
        <p className="mb-4">You may pause or cancel your subscription at any time. However, to avoid being charged for upcoming deliveries, modifications must be made at least <strong>48 hours</strong> prior to your next scheduled delivery window.</p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4">2. Refunds for Perishable Goods</h3>
        <p className="mb-4">Because our products are perishable food items, we cannot accept returns. If you are dissatisfied with a meal for any reason, please contact our support team within 24 hours of delivery. Depending on the circumstances, we may provide a full or partial credit or refund of the purchase price for that item.</p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4">3. Missed Deliveries</h3>
        <p>If a delivery is missed due to incorrect address information provided by the customer or inability to access the drop-off location, refunds will not be issued. Our couriers will attempt to contact you before leaving the premises.</p>
      </section>
    </LegalLayout>
  );
}
