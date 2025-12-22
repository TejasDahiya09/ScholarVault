import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import client from '../../api/client'
import useAuth from '../../store/useAuth'
import DarkModeToggle from '../../components/DarkModeToggle'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  // Load saved credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('sv_remember_email')
    const savedPassword = localStorage.getItem('sv_remember_password')
    if (savedEmail && savedPassword) {
      setEmail(savedEmail)
      setPassword(savedPassword)
      setRememberMe(true)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!email || !password) {
      setErr('Please fill all fields')
      return
    }
    try {
      setLoading(true)
      const res = await client.post('/api/auth/login', { email, password })
      const { token, user } = res.data || {}
      if (!token) throw new Error('Invalid server response')
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('sv_remember_email', email)
        localStorage.setItem('sv_remember_password', password)
      } else {
        localStorage.removeItem('sv_remember_email')
        localStorage.removeItem('sv_remember_password')
      }
      
      login(token, user || { email })
      navigate('/home')
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
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
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200/20 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200/20 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          {/* Left side: Branding & Benefits */}
          <div className="hidden lg:flex flex-col justify-center space-y-6 sm:space-y-8">
            <div>
              <div className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6 border border-indigo-100">
                Welcome to ScholarVault
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-slate-900">
                Sign in to your account
              </h1>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-slate-600">
                Access your notes, get AI-powered summaries, and track your progress.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-5">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 text-xl border border-indigo-100">📚</div>
                <div>
                  <h3 className="font-semibold text-slate-900">Organize Notes</h3>
                  <p className="text-sm text-slate-600">Branches, subjects, and units</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 text-xl border border-blue-100">🤖</div>
                <div>
                  <h3 className="font-semibold text-slate-900">AI Assistance</h3>
                  <p className="text-sm text-slate-600">Summaries, Q&A, instant help</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 text-xl border border-indigo-100">📊</div>
                <div>
                  <h3 className="font-semibold text-slate-900">Track Progress</h3>
                  <p className="text-sm text-slate-600">Analytics and insights</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Login Form */}
          <div className="flex flex-col justify-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 lg:p-10 border border-white/20">
              <h2 className="text-2xl lg:text-3xl font-bold mb-2 text-slate-900">Welcome back</h2>
              <p className="text-slate-600 mb-8 text-sm">Enter your credentials to access your account</p>

              {err && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium flex items-start gap-3">
                  <span className="text-lg">⚠️</span>
                  <span>{err}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none focus-ring hover-scale"
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none focus-ring hover-scale"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer hover-scale">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <a href="#" className="text-primary font-medium hover:underline">Forgot password?</a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gradient w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-muted">Or continue with</span>
                </div>
              </div>

              <button type="button" className="w-full py-2.5 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 hover-lift transition flex items-center justify-center gap-2">
                <span>🔷</span> Google
              </button>

              <p className="text-center text-sm mt-8">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary font-semibold hover:underline">
                  Create one free
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
