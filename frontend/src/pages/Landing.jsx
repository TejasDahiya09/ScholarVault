import React from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/Layout/NavBar";
import DarkModeToggle from "../components/DarkModeToggle";

// use public icons for static serving
const notesIcon = "/assets/icons/notes.svg";
const ocrIcon = "/assets/icons/ocr.svg";
const aiIcon = "/assets/icons/ai.svg";
const ragIcon = "/assets/icons/rag.svg";
const progressIcon = "/assets/icons/progress.svg";
const powerIcon = "/assets/icons/power.svg";
const logoImg = "/assets/logo.png?v=5";

const FeatureCard = ({ icon, title, desc, delay = 0 }) => (
  <div
    className="bg-white rounded-lg sm:rounded-2xl p-4 sm:p-6 shadow-md hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 sm:hover:-translate-y-3 hover:scale-105 border border-gray-100 group relative overflow-hidden"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Shimmer effect */}
    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-linear-to-r from-transparent via-indigo-100/30 to-transparent" />
    <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-lg sm:rounded-xl bg-linear-to-br from-indigo-100 to-blue-100 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-125 group-hover:rotate-6 transition-all duration-500 shadow-sm group-hover:shadow-lg relative z-10">
      <img src={icon} alt="" style={{ width: 24, height: 24 }} className="sm:w-7 sm:h-7" />
    </div>

    <h3 className="font-bold text-base sm:text-xl text-gray-900 mb-1.5 sm:mb-2 group-hover:text-indigo-600 transition-colors duration-300 relative z-10">{title}</h3>
    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{desc}</p>

    <div className="mt-3 sm:mt-4 flex items-center text-indigo-600 font-medium text-xs sm:text-sm group-hover:gap-2 transition-all">
      <span>Learn more</span>
      <span className="group-hover:translate-x-1 transition-transform">→</span>
    </div>
  </div>
);

export default function Landing() {
  const features = [
      { icon: notesIcon, title: "Smart Notes", desc: "Organize and manage study materials efficiently" },
      { icon: ocrIcon, title: "OCR Summaries", desc: "Extract text & generate summaries automatically" },
      { icon: aiIcon, title: "Ask AI", desc: "Ask intelligent answers to your questions" },
      { icon: ragIcon, title: "RAG Search", desc: "Semantic AI-powered search across notes" },
      { icon: progressIcon, title: "Progress Tracking", desc: "Monitor study habits & performance" },
      { icon: powerIcon, title: "AI Powered", desc: "Cutting-edge AI for better learning" },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      <NavBar />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-16 lg:py-24 flex flex-col lg:flex-row items-center gap-8 sm:gap-12 lg:gap-16">
        <div className="flex-1 w-full">
          <span className="inline-block px-3 py-1.5 text-xs sm:text-sm font-medium text-indigo-700 bg-indigo-50 rounded-full mb-4 sm:mb-6 border border-indigo-100">
            AI Powered Learning Platform
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight text-slate-900 tracking-tight">
            Your AI-Powered Study <br className="hidden sm:block" /> Companion
          </h1>

          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
            Transform the way you study with ScholarVault. Organize notes, get instant AI
            assistance, track progress, and ace your exams with intelligent study tools
            designed for university students.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            <Link 
              to="/register" 
              className="px-6 sm:px-8 py-3 sm:py-4 bg-indigo-600 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-indigo-500 transition-all duration-200 shadow-sm hover:shadow-md text-center"
            >
              Get Started Free
            </Link>
            <Link 
              to="/login" 
              className="px-6 sm:px-8 py-3 sm:py-4 border-2 border-slate-200 text-slate-700 text-sm sm:text-base font-medium rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 text-center"
            >
              Sign In
            </Link>
          </div>

          <div className="flex flex-wrap gap-4 sm:gap-6 mt-6 sm:mt-8 text-gray-500 text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2">⚡ <span className="hidden sm:inline">Lightning Fast</span></div>
            <div className="flex items-center gap-2">🔒 <span className="hidden sm:inline">Secure</span></div>
            <div className="flex items-center gap-2">🤖 <span className="hidden sm:inline">Smart AI</span></div>
          </div>
        </div>

        <div className="flex-1 flex justify-center w-full">
          <div className="relative w-full max-w-md">
            {/* Main container with glass effect */}
            <div className="relative h-[420px] bg-white/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/50 via-blue-50/30 to-purple-100/50"></div>
              
              {/* Animated background elements */}
              <div className="absolute inset-0 overflow-hidden opacity-40">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-indigo-300 to-blue-300 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-blue-300 to-purple-300 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-purple-200 to-indigo-200 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
              </div>
              
              {/* Content container */}
              <div className="relative h-full flex flex-col items-center justify-center p-6">
                {/* Logo with solid background circle */}
                <div className="relative mb-5">
                  {/* White circle background for logo */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-80 h-80 bg-white rounded-full shadow-xl"></div>
                  </div>
                  
                  {/* Logo */}
                  <div className="relative z-10 flex items-center justify-center">
                    <img 
                      src={logoImg} 
                      alt="ScholarVault Logo" 
                      className="w-80 h-80 object-contain filter drop-shadow-2xl"
                      loading="eager"
                    />
                  </div>
                  
                  {/* Glow effect behind logo */}
                  <div className="absolute inset-0 flex items-center justify-center -z-10">
                    <div className="w-72 h-72 bg-gradient-to-br from-indigo-400/20 to-blue-400/20 rounded-full blur-2xl"></div>
                  </div>
                </div>
                
                {/* Text below logo */}
                <div className="text-center space-y-1.5">
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                    ScholarVault
                  </h3>
                  <p className="text-sm text-gray-600 font-medium">
                    AI-Powered Learning Platform
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-16 lg:py-20 bg-white/60 backdrop-blur-sm">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2 sm:mb-3">
            Powerful Features
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">Everything you need to excel in your studies</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {features.map((f, i) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} delay={i * 100} />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-16">
        <div className="rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-12 text-center bg-linear-to-br from-indigo-600 via-indigo-700 to-blue-600 shadow-xl">
          <h2 className="text-white text-2xl sm:text-3xl lg:text-4xl font-semibold mb-2 sm:mb-3">
            Ready to Transform Your Study Experience?
          </h2>
          <p className="text-indigo-100 text-sm sm:text-base mb-6 sm:mb-8">
            Join thousands of students already using ScholarVault
          </p>
          <Link 
            to="/register" 
            className="inline-block bg-white text-indigo-600 px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-medium text-sm sm:text-base hover:bg-indigo-50 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Start Learning Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 text-center border-t border-slate-200 bg-white/50 px-4 sm:px-6">
        <div className="flex justify-center mb-4">
          <div className="text-xl sm:text-2xl font-semibold text-slate-900">
            ⚡ ScholarVault
          </div>
        </div>
        <p className="text-slate-600 font-medium text-xs sm:text-sm">AI Powered Study Platform for University Students</p>
        <p className="mt-2 text-slate-500 text-xs">© 2025 ScholarVault. All rights reserved.</p>
      </footer>
    </div>
  );
}
