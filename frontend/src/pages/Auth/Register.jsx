import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import client from '../../api/client'
import useAuth from '../../store/useAuth'
import DarkModeToggle from '../../components/DarkModeToggle'
import OnboardingModal from '../../components/OnboardingModal'

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!name || !email || !password) {
      setErr('Please fill all fields')
      return
    }
    try {
      setLoading(true)
      // Temporary default year; will be updated in onboarding modal after register
      const res = await client.post('/api/auth/register', { name, email, password, selected_year: '1st Year' })
      const { token, user } = res.data || {}
      if (!token) throw new Error('Invalid server response')
      login(token, user || { email })
      // Show onboarding modal to collect branch/year
      setShowOnboarding(true)
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleOnboardingSubmit() {
    try {
      setLoading(true)
      setShowOnboarding(false)
      navigate('/home')
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Failed to save preferences')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F0F4FF 0%, #F7F9FC 100%)' }}>
      {/* Back to Landing Button */}
      <Link 
        to="/" 
        className="fixed top-6 left-4 sm:left-6 z-20 flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/80 backdrop-blur-sm text-slate-700 rounded-lg hover:bg-white transition-all duration-200 shadow-sm hover:shadow-md border border-slate-200 text-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        <span className="text-xs sm:text-sm font-medium hidden sm:inline">Back</span>
      </Link>
      
      {/* Dark Mode Toggle */}
      <div className="fixed top-6 right-4 sm:right-6 z-20">
        <DarkModeToggle variant="compact" />
      </div>

      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-200 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200 rounded-full opacity-10 blur-3xl"></div>
      </div>

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          {/* Left side: Branding & Benefits */}
          <div className="hidden lg:flex flex-col justify-center space-y-6 sm:space-y-8">
            <div>
              <div className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                Join ScholarVault
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight" style={{ color: '#1E1E1E' }}>
                Start your learning journey
              </h1>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-slate-600">
                Get instant AI assistance with your studies. Free account, no credit card needed.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-5">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 text-xl border border-indigo-100">✨</div>
                <div>
                  <h3 className="font-semibold text-slate-900">AI-Powered</h3>
                  <p className="text-sm text-slate-600">Smart summaries & Q&A</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 text-xl border border-blue-100">🎯</div>
                <div>
                  <h3 className="font-semibold text-slate-900">Organize Better</h3>
                  <p className="text-sm text-slate-600">Seamless note management</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 text-xl border border-indigo-100">📈</div>
                <div>
                  <h3 className="font-semibold text-slate-900">Track Growth</h3>
                  <p className="text-sm text-slate-600">Monitor your progress</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Register Form */}
          <div className="flex flex-col justify-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 lg:p-8 border border-white/20">
              <h2 className="text-2xl lg:text-3xl font-bold mb-1 text-slate-900">Create account</h2>
              <p className="text-slate-600 mb-5 text-sm">Join thousands of students using ScholarVault</p>

              {err && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium flex items-start gap-3">
                  <span className="text-lg">⚠️</span>
                  <span>{err}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none focus-ring hover-scale"
                    placeholder="John Doe"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none focus-ring hover-scale"
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none focus-ring hover-scale"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <p className="text-xs mt-1" style={{ color: '#6B7280' }}>At least 8 characters recommended</p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer hover-scale">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 mt-0.5" />
                  <span className="text-xs">
                    I agree to the{' '}
                    <a href="#" className="text-primary font-medium hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-primary font-medium hover:underline">Privacy Policy</a>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gradient w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {loading ? 'Creating account...' : 'Create free account'}
                </button>

                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-muted">Or sign up with</span>
                </div>
              </form>

              <button type="button" className="w-full py-2.5 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 hover-lift transition flex items-center justify-center gap-2">
                <span>🔷</span> Google
              </button>

              <p className="text-center text-sm mt-5">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <OnboardingModal
      open={showOnboarding}
      onClose={() => { setShowOnboarding(false); navigate('/home'); }}
    />
    </>
  );
}
