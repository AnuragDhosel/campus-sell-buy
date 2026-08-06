import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ShieldCheck, Zap } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#2F6B4F] rounded-xl flex items-center justify-center shadow-sm">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-[#1E293B]">Campus Marketplace</span>
        </div>
        <div className="flex gap-4 items-center">
          <Link
            to="/login"
            className="font-medium text-[#64748B] hover:text-[#1E293B] transition px-4"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="saas-button-primary shadow-sm"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center max-w-5xl mx-auto">
        <div className="inline-block px-4 py-1.5 rounded-full bg-[#84A98C]/10 text-[#2F6B4F] text-sm font-semibold mb-8 border border-[#84A98C]/20">
          Built for Students, by Students
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight text-[#1E293B]">
          Your Campus.<br />
          Your <span className="text-[#2F6B4F]">Marketplace.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-[#64748B] max-w-2xl mx-auto mb-12 leading-relaxed">
          The safest, fastest way to buy and sell second-hand products within your college campus. 
          No scams, no outsiders. Just students.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
          <Link
            to="/signup"
            className="saas-button-primary text-lg px-8 py-4 flex items-center justify-center gap-2 shadow-sm"
          >
            Get Started
            <Zap className="w-5 h-5" />
          </Link>
          <Link
            to="/login"
            className="saas-button-secondary text-lg px-8 py-4 flex items-center justify-center"
          >
            Browse Items
          </Link>
        </div>

        {/* Features / How it works */}
        <div className="grid md:grid-cols-3 gap-8 mt-32 w-full">
          <div className="saas-card p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-[#84A98C]/10 rounded-xl flex items-center justify-center mb-6 text-[#2F6B4F]">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-4 text-[#1E293B]">Verified Students</h3>
            <p className="text-[#64748B] leading-relaxed">Exclusive to your college community. Connect with real peers on campus safely.</p>
          </div>
          
          <div className="saas-card p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-[#84A98C]/10 rounded-xl flex items-center justify-center mb-6 text-[#2F6B4F]">
              <Zap className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-4 text-[#1E293B]">Instant Handshakes</h3>
            <p className="text-[#64748B] leading-relaxed">Privacy-first contact requests. You control who sees your hostel and room details.</p>
          </div>
          
          <div className="saas-card p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-[#84A98C]/10 rounded-xl flex items-center justify-center mb-6 text-[#2F6B4F]">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-4 text-[#1E293B]">Zero Commission</h3>
            <p className="text-[#64748B] leading-relaxed">List items for free. Deal directly with buyers. We don't take a single penny.</p>
          </div>
        </div>
      </main>
      
      <footer className="py-8 text-center text-[#64748B] text-sm border-t border-[#E2E8F0] mt-12 bg-white">
        &copy; {new Date().getFullYear()} Campus Marketplace. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;
