import React, { useState } from "react";

export default function LogoShowcase() {
  const [selectedLogo, setSelectedLogo] = useState("option2");

  const logos = [
    {
      id: "option1",
      name: "Ascending Knowledge Vault",
      description: "Geometric stacked elements showing organized growth and progress tracking. Features a keyhole symbol representing security. Perfect for conveying structured learning and data organization.",
      path: "/assets/logos/option1_ascending_vault.svg",
      colors: ["#2C3E50", "#34495E", "#3498DB"],
      strengths: ["Architectural", "Organized", "Progress-focused", "Professional"],
    },
    {
      id: "option2",
      name: "Neural Nexus Book",
      description: "Open book with circuit lines and data nodes representing AI-powered learning. Shows the technology stack (AI, Database, Cloud) powering the platform. Emphasizes smart, connected learning.",
      path: "/assets/logos/option2_neural_nexus.svg",
      colors: ["#0F766E", "#14B8A6", "#0D9488"],
      strengths: ["Tech-forward", "AI-focused", "Modern", "Interconnected"],
    },
    {
      id: "option3",
      name: "Monogram Shield",
      description: "Minimalist SV monogram forming a shield. Emphasizes security, privacy, and engineering precision. Highly scalable and elegant, perfect for luxury-tech positioning.",
      path: "/assets/logos/option3_monogram_shield.svg",
      colors: ["#1E3A8A", "#3B82F6"],
      strengths: ["Minimalist", "Luxury-tech", "Secure", "Scalable"],
    },
  ];

  const handleSelectLogo = (logoId) => {
    setSelectedLogo(logoId);
    console.log(`Selected logo: ${logoId}`);
    // You can add logic here to save the selection or update the app
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 py-12 px-4 sm:px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            ScholarVault Logo Showcase
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Three modern logo options reflecting ScholarVault's core identity: Smart, Secure, and organized learning platform for engineering students.
          </p>
        </div>

        {/* Logo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {logos.map((logo) => (
            <div
              key={logo.id}
              onClick={() => handleSelectLogo(logo.id)}
              className={`cursor-pointer rounded-2xl border-2 transition-all duration-300 p-8 group ${
                selectedLogo === logo.id
                  ? "border-indigo-600 bg-white shadow-xl scale-105"
                  : "border-gray-200 bg-white/60 hover:border-gray-300 hover:shadow-lg hover:scale-102"
              }`}
            >
              {/* Logo Display */}
              <div className="flex items-center justify-center h-64 mb-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden">
                <img
                  src={logo.path}
                  alt={logo.name}
                  className="w-40 h-40 object-contain group-hover:scale-110 transition-transform duration-300"
                />
              </div>

              {/* Logo Info */}
              <h2 className="text-xl font-bold text-slate-900 mb-2">{logo.name}</h2>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                {logo.description}
              </p>

              {/* Color Palette */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">Color Palette</p>
                <div className="flex gap-2">
                  {logo.colors.map((color) => (
                    <div
                      key={color}
                      className="w-8 h-8 rounded-lg border border-gray-300 shadow-sm"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Strengths */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">Key Strengths</p>
                <div className="flex flex-wrap gap-1">
                  {logo.strengths.map((strength) => (
                    <span
                      key={strength}
                      className="inline-block text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium"
                    >
                      {strength}
                    </span>
                  ))}
                </div>
              </div>

              {/* Selection Button */}
              <button
                className={`w-full mt-4 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${
                  selectedLogo === logo.id
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {selectedLogo === logo.id ? "✓ Selected" : "Select this logo"}
              </button>
            </div>
          ))}
        </div>

        {/* Selection Info */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Selected Logo</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-center justify-center h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden">
              <img
                src={logos.find((l) => l.id === selectedLogo).path}
                alt="Selected Logo"
                className="w-64 h-64 object-contain"
              />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">
                {logos.find((l) => l.id === selectedLogo).name}
              </h4>
              <p className="text-slate-600 mb-6 leading-relaxed">
                {logos.find((l) => l.id === selectedLogo).description}
              </p>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-sm text-indigo-900">
                  <span className="font-semibold">Implementation Status:</span> All three logos are ready to use. To set the primary logo, update the NavBar component to use the selected SVG path.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="mt-12 text-center text-sm text-slate-600">
          <p>
            All logos are available in <code className="bg-gray-100 px-2 py-1 rounded">frontend/public/assets/logos/</code>
          </p>
          <p className="mt-2">
            Click on any logo to preview and select it as the primary ScholarVault logo.
          </p>
        </div>
      </div>
    </div>
  );
}
