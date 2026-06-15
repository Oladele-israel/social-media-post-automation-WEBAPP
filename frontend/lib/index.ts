// lib/index.ts
export { ApiError }    from './client'
export { cookieStore } from './cookie'
export * as authApi    from './auth'
export { AuthProvider, useAuth } from './auth-context'

export type {
  RegisterPayload,
  LoginPayload,
  AuthResponse,
  AuthUser,
  SocialAccount,
} from './types'