// lib/auth.ts
import { client }      from './client'
import { cookieStore } from './cookie'
import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from './types'

// ─── Register ─────────────────────────────────────────────────────────────────
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>('/auth/register', {
    email:     payload.email.toLowerCase().trim(),
    password:  payload.password,
    full_name: payload.full_name.trim(),
  })
  cookieStore.setAccessToken(data.access_token)
  cookieStore.setRefreshToken(data.refresh_token)
  return data
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>('/auth/login', {
    email:    payload.email.toLowerCase().trim(),
    password: payload.password,
  })
  cookieStore.setAccessToken(data.access_token)
  cookieStore.setRefreshToken(data.refresh_token)
  return data
}

// ─── Refresh ──────────────────────────────────────────────────────────────────
export async function refresh(): Promise<AuthResponse | null> {
  const refreshToken = cookieStore.getRefreshToken()
  if (!refreshToken) return null

  const { data } = await client.post<AuthResponse>('/auth/refresh', {
    refresh_token: refreshToken,
  })
  cookieStore.setAccessToken(data.access_token)
  cookieStore.setRefreshToken(data.refresh_token)
  return data
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  try {
    await client.post('/auth/logout', {
      refresh_token: cookieStore.getRefreshToken() ?? '',
    })
  } finally {
    cookieStore.clearAll()
  }
}

// ─── Me ───────────────────────────────────────────────────────────────────────
export async function getMe(): Promise<AuthUser> {
  const { data } = await client.get<AuthUser>('/auth/me')
  return data
}