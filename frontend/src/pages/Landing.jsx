import React from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/Layout/NavBar";
import DarkModeToggle from "../components/DarkModeToggle";
import hero from "../assets/hero.svg";
import heroInner from "../assets/hero_inner.svg";
import heroDesigner1 from "../assets/hero_designer_1.svg";
import heroDesigner2 from "../assets/hero_designer_2.svg";
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
    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-indigo-100/30 to-transparent" />
    <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-125 group-hover:rotate-6 transition-all duration-500 shadow-sm group-hover:shadow-lg relative z-10">
      <img src={icon} alt="" style={{ width: 24, height: 24 }} className="sm:w-[28px] sm:h-[28px]" />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      <NavBar />
      
      {/* Dark Mode Toggle - Top Right Corner */}
      <div className="fixed top-6 right-6 z-50">
        <DarkModeToggle variant="compact" />
      </div>

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
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 w-full max-w-md border border-gray-200">
            <div className="relative aspect-square sm:aspect-auto">
              {/* background selection */}
              {bgIndex === 0 && <img src={hero} alt="Hero illustration" className="w-full h-auto" />}
              {bgIndex === 1 && <img src="/src/assets/ai_hero_1.svg" alt="Hero illustration 1" className="w-full h-auto" />}
              {bgIndex === 2 && <img src="/src/assets/ai_hero_2.svg" alt="Hero illustration 2" className="w-full h-auto" />}

              {/* inner illustration selection */}
              {innerIndex === 0 && <img src={heroInner} alt="App screenshot" className="absolute inset-0 w-full h-full object-contain" />}
              {innerIndex === 1 && <img src={heroDesigner1} alt="App screenshot" className="absolute inset-0 w-full h-full object-contain" />}
              {innerIndex === 2 && <img src={heroDesigner2} alt="App screenshot" className="absolute inset-0 w-full h-full object-contain" />}

              {/* lottie (if loaded) */}
              <div ref={lottieContainer} className="absolute inset-0" aria-hidden />
            </div>

            {/* small controls to toggle hero/bg options */}
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Background</span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button onClick={() => setBgIndex(0)} className={`w-2 h-2 rounded-full transition-all ${bgIndex===0? 'bg-gray-900' : 'bg-gray-300'}`} aria-label="Use default background" />
                  <button onClick={() => setBgIndex(1)} className={`w-2 h-2 rounded-full transition-all ${bgIndex===1? 'bg-gray-900' : 'bg-gray-300'}`} aria-label="Use hero option 1" />
                  <button onClick={() => setBgIndex(2)} className={`w-2 h-2 rounded-full transition-all ${bgIndex===2? 'bg-gray-900' : 'bg-gray-300'}`} aria-label="Use hero option 2" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Inner</span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button onClick={() => setInnerIndex(0)} className={`w-2 h-2 rounded-full transition-all ${innerIndex===0? 'bg-gray-900' : 'bg-gray-300'}`} aria-label="Use inner default" />
                  <button onClick={() => setInnerIndex(1)} className={`w-2 h-2 rounded-full transition-all ${innerIndex===1? 'bg-gray-900' : 'bg-gray-300'}`} aria-label="Use inner option 1" />
                  <button onClick={() => setInnerIndex(2)} className={`w-2 h-2 rounded-full transition-all ${innerIndex===2? 'bg-gray-900' : 'bg-gray-300'}`} aria-label="Use inner option 2" />
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
        <div className="rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-12 text-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-600 shadow-xl">
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
