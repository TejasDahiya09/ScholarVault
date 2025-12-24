import React from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/Layout/NavBar";
import DarkModeToggle from "../components/DarkModeToggle";
import { useEffect, useRef, useState } from "react";

// use public icons for static serving
const notesIcon = "/assets/icons/notes.svg";
const ocrIcon = "/assets/icons/ocr.svg";
const aiIcon = "/assets/icons/ai.svg";
const ragIcon = "/assets/icons/rag.svg";
const progressIcon = "/assets/icons/progress.svg";
const powerIcon = "/assets/icons/power.svg";

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
  const [bgIndex, setBgIndex] = useState(0); // 0 = original hero, 1 = ai_hero_1, 2 = ai_hero_2
  const [innerIndex, setInnerIndex] = useState(0); // 0 = heroInner, 1 = designer1, 2 = designer2
  const lottieContainer = useRef(null);

  // attempt to dynamically load lottie and a sample animation (fallback to static svg)
  useEffect(() => {
    let mounted = true;
    async function loadLottie() {
      try {
        const lottie = await import('https://unpkg.com/lottie-web/build/player/lottie.min.js');
        if (!mounted || !lottieContainer.current) return;
        // load a sample animation from lottiefiles (public url)
        const anim = lottie.loadAnimation({
          container: lottieContainer.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: 'https://assets7.lottiefiles.com/packages/lf20_tfb3estd.json',
        });
        return () => anim.destroy();
      } catch (err) {
        // silent fallback
        return;
      }
    }
    loadLottie();
    return () => { mounted = false; };
  }, []);
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

        <div className="flex-1 flex justify-center w-full px-2 sm:px-0">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 w-full max-w-md border border-gray-200 overflow-hidden">
            {/* Hero Container */}
            <div className="relative w-full bg-linear-to-br from-indigo-50 to-blue-50 rounded-lg sm:rounded-xl overflow-hidden">
              <div className="relative aspect-square sm:aspect-auto h-64 sm:h-80 lg:h-96 flex items-center justify-center">
                {/* Background illustrations */}
                {bgIndex === 0 && (
                  <svg className="w-full h-full" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="lg" x1="0" x2="1">
                        <stop offset="0%" stopColor="#4F46E5"/>
                        <stop offset="100%" stopColor="#3B82F6"/>
                      </linearGradient>
                    </defs>
                    <rect x="0" y="0" width="800" height="600" fill="#F0F9FF"/>
                    <rect x="40" y="80" width="720" height="440" rx="28" fill="#fff" stroke="#E0E7FF" strokeWidth="2"/>
                    <circle cx="200" cy="150" r="60" fill="url(#lg)" opacity="0.1"/>
                    <circle cx="600" cy="400" r="80" fill="url(#lg)" opacity="0.1"/>
                  </svg>
                )}
                {bgIndex === 1 && (
                  <svg className="w-full h-full" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="800" height="600" fill="#FAFAFA"/>
                    <rect x="80" y="100" width="640" height="400" rx="24" fill="#fff" stroke="#F3F4F6" strokeWidth="2"/>
                    <path d="M 150 200 Q 250 150 350 200 T 650 200" stroke="#4F46E5" strokeWidth="3" fill="none"/>
                    <circle cx="300" cy="250" r="40" fill="#EFF6FF"/>
                    <circle cx="500" cy="350" r="35" fill="#F0F9FF"/>
                  </svg>
                )}
                {bgIndex === 2 && (
                  <svg className="w-full h-full" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="800" height="600" fill="#F9FAFB"/>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#818CF8"/>
                        <stop offset="100%" stopColor="#60A5FA"/>
                      </linearGradient>
                    </defs>
                    <rect x="100" y="120" width="600" height="360" rx="20" fill="url(#grad)" opacity="0.1"/>
                    <rect x="120" y="140" width="560" height="320" rx="16" fill="#fff"/>
                    <line x1="140" y1="170" x2="640" y2="170" stroke="#E5E7EB" strokeWidth="2"/>
                    <line x1="140" y1="220" x2="640" y2="220" stroke="#E5E7EB" strokeWidth="2"/>
                  </svg>
                )}

                {/* Inner illustration overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {innerIndex === 0 && (
                    <svg className="w-4/5 h-4/5" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="20" y="40" width="360" height="240" rx="16" fill="#fff" stroke="#E5E7EB" strokeWidth="2"/>
                      <rect x="30" y="50" width="340" height="30" rx="6" fill="#F3F4F6"/>
                      <circle cx="50" cy="65" r="6" fill="#4F46E5"/>
                      <line x1="30" y1="100" x2="370" y2="100" stroke="#E5E7EB" strokeWidth="1"/>
                      <line x1="30" y1="130" x2="370" y2="130" stroke="#D1D5DB" strokeWidth="2"/>
                      <line x1="30" y1="150" x2="370" y2="150" stroke="#E5E7EB" strokeWidth="1"/>
                      <line x1="30" y1="180" x2="370" y2="180" stroke="#D1D5DB" strokeWidth="2"/>
                      <path d="M 50 230 L 70 210 L 90 220 L 110 190 L 130 210 L 150 180" stroke="#4F46E5" strokeWidth="2" fill="none"/>
                    </svg>
                  )}
                  {innerIndex === 1 && (
                    <svg className="w-4/5 h-4/5" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="igrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#4F46E5"/>
                          <stop offset="100%" stopColor="#3B82F6"/>
                        </linearGradient>
                      </defs>
                      <rect x="20" y="20" width="360" height="260" rx="16" fill="url(#igrad)" opacity="0.05"/>
                      <circle cx="120" cy="100" r="45" fill="#EFF6FF"/>
                      <circle cx="280" cy="150" r="50" fill="#F0F9FF"/>
                      <rect x="40" y="220" width="320" height="40" rx="8" fill="#F3F4F6"/>
                      <line x1="60" y1="240" x2="360" y2="240" stroke="#D1D5DB" strokeWidth="2"/>
                    </svg>
                  )}
                  {innerIndex === 2 && (
                    <svg className="w-4/5 h-4/5" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="30" y="30" width="340" height="240" rx="12" fill="#fff" stroke="#E5E7EB" strokeWidth="1.5"/>
                      <rect x="40" y="40" width="320" height="50" rx="8" fill="linear-gradient(to right, #4F46E5, #3B82F6)" opacity="0.1"/>
                      <circle cx="380" cy="65" r="12" fill="#4F46E5"/>
                      <rect x="40" y="110" width="320" height="100" rx="6" fill="#F9FAFB"/>
                      <line x1="50" y1="130" x2="350" y2="130" stroke="#E5E7EB" strokeWidth="1.5"/>
                      <line x1="50" y1="150" x2="350" y2="150" stroke="#E5E7EB" strokeWidth="1.5"/>
                      <line x1="50" y1="170" x2="320" y2="170" stroke="#E5E7EB" strokeWidth="1.5"/>
                      <rect x="40" y="230" width="320" height="30" rx="6" fill="#4F46E5" opacity="0.1"/>
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 px-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 font-semibold whitespace-nowrap">Background</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setBgIndex(0)} 
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${bgIndex===0? 'bg-indigo-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'}`} 
                    aria-label="Use default background"
                  />
                  <button 
                    onClick={() => setBgIndex(1)} 
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${bgIndex===1? 'bg-indigo-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'}`} 
                    aria-label="Use hero option 1"
                  />
                  <button 
                    onClick={() => setBgIndex(2)} 
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${bgIndex===2? 'bg-indigo-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'}`} 
                    aria-label="Use hero option 2"
                  />
                </div>
              </div>

              <div className="hidden sm:block w-px h-6 bg-gray-300"></div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 font-semibold whitespace-nowrap">Inner</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setInnerIndex(0)} 
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${innerIndex===0? 'bg-indigo-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'}`} 
                    aria-label="Use inner default"
                  />
                  <button 
                    onClick={() => setInnerIndex(1)} 
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${innerIndex===1? 'bg-indigo-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'}`} 
                    aria-label="Use inner option 1"
                  />
                  <button 
                    onClick={() => setInnerIndex(2)} 
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${innerIndex===2? 'bg-indigo-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'}`} 
                    aria-label="Use inner option 2"
                  />
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
