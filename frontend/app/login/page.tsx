// app/(auth)/login/page.tsx
'use client'

import { useState }        from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link                from 'next/link'
import { useAuth }         from '@/lib/auth-context'
import { ApiError }        from '@/lib'

interface FormErrors {
  email?:    string
  password?: string
  global?:   string
}

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1.5">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
        <circle cx="6" cy="6" r="5" stroke="#EF4444" strokeWidth="1.2"/>
        <path d="M6 4v2.5M6 8h.01" stroke="#EF4444" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
      {msg}
    </p>
  )
}

function ToggleVisibilityBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
      {show ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.20455C17.64 8.56637 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8196H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
      <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8196L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
      <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
      <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

export default function LoginPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { login }    = useAuth()

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors,       setErrors]       = useState<FormErrors>({})
  const [loading,      setLoading]      = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'linkedin' | null>(null)

  const validate = (): FormErrors => {
    const e: FormErrors = {}
    if (!email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address'
    if (!password) e.password = 'Password is required'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setErrors({})

    try {
      // login() sets user in AuthContext + saves tokens to cookies
      await login(email, password)

      // Redirect back to where the user was trying to go
      // Falls back to /dashboard if they came directly to /login
      const from = searchParams.get('from') ?? '/dashboard'
      router.push(from)
    } catch (err) {
      if (err instanceof ApiError) {
        if      (err.statusCode === 401) setErrors({ global: 'Incorrect email or password.' })
        else if (err.statusCode === 422) setErrors({ global: 'Please check your input and try again.' })
        else if (err.statusCode === 429) setErrors({ global: 'Too many attempts. Please wait and try again.' })
        else                             setErrors({ global: err.message })
      } else {
        setErrors({ global: 'Something went wrong. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  // OAuth — redirects browser to Go backend which redirects to provider
  const handleOAuth = (provider: 'google' | 'linkedin') => {
    setOauthLoading(provider)
    window.location.href = `${
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api'
    }/auth/social/${provider}/connect`
  }

  const busy = loading || !!oauthLoading

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #fafbff 40%, #eff6ff 70%, #f5f3ff 100%)' }}
    >
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8L6.5 11.5L13 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-gray-900 font-semibold text-[15px] tracking-tight">LinkedUp</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8"
          style={{ border: '1px solid #bfdbfe', boxShadow: '0 1px 3px rgba(59,130,246,0.06), 0 8px 32px rgba(59,130,246,0.08)' }}>

          <div className="mb-7">
            <h1 className="text-gray-900 text-2xl font-semibold tracking-tight mb-1">Sign in</h1>
            <p className="text-gray-500 text-sm">Welcome back — good to see you again.</p>
          </div>

          {/* Global error */}
          {errors.global && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                <circle cx="7" cy="7" r="6" stroke="#EF4444" strokeWidth="1.3"/>
                <path d="M7 4.5v3M7 9.5h.01" stroke="#EF4444" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <p className="text-red-600 text-sm">{errors.global}</p>
            </div>
          )}

          {/* OAuth buttons */}
          <div className="space-y-2.5 mb-6">
            <button type="button" onClick={() => handleOAuth('google')} disabled={busy}
              className="w-full h-10 flex items-center justify-center gap-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed">
              {oauthLoading === 'google'
                ? <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                : <GoogleIcon />}
              Continue with Google
            </button>
            <button type="button" onClick={() => handleOAuth('linkedin')} disabled={busy}
              className="w-full h-10 flex items-center justify-center gap-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed">
              {oauthLoading === 'linkedin'
                ? <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                : <LinkedInIcon />}
              Continue with LinkedIn
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="px-3 text-gray-400 text-xs">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email" autoComplete="email" placeholder="name@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })) }}
                className={`w-full h-10 rounded-lg px-3 text-sm text-gray-900 placeholder-gray-400 outline-none border transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 ${
                  errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              />
              {errors.email && <FieldError msg={errors.email} />}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-gray-500 hover:text-blue-600 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })) }}
                  className={`w-full h-10 rounded-lg px-3 pr-10 text-sm text-gray-900 placeholder-gray-400 outline-none border transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 ${
                    errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                />
                <ToggleVisibilityBtn show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
              </div>
              {errors.password && <FieldError msg={errors.password} />}
            </div>

            {/* Submit */}
            <button type="submit" disabled={busy}
              className="w-full h-10 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1">
              {loading ? <><Spinner />Signing in…</> : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-600 font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}