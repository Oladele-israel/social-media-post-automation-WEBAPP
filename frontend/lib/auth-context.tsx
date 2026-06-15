// lib/auth-context.tsx
'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import * as authApi    from './auth'
import { cookieStore } from './cookie'
import type { AuthUser } from './types'

interface AuthContextValue {
  user:     AuthUser | null
  loading:  boolean
  isAuthed: boolean
  login:    (email: string, password: string) => Promise<void>
  logout:   () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function boot() {
      // No cookie = definitely logged out, skip network call entirely
      if (!cookieStore.getRefreshToken()) {
        setLoading(false)
        return
      }

      try {
        const result = await authApi.refresh()
        setUser(result?.user ?? null)
      } catch {
        // Token invalid/expired — clear cookies silently
        // Do NOT redirect here — let middleware handle routing
        cookieStore.clearAll()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    boot()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login({ email, password })
    setUser(result.user)
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
    // Redirect after logout — hard navigate clears all state
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthed: !!user,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}