// lib/cookies.ts
import Cookies from 'js-cookie'

const ACCESS_TOKEN_KEY  = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

const base: Cookies.CookieAttributes = {
  sameSite: 'Strict',
  secure:   process.env.NODE_ENV === 'production',
  path:     '/',
}

export const cookieStore = {
  getAccessToken:  ()             => Cookies.get(ACCESS_TOKEN_KEY)  ?? null,
  getRefreshToken: ()             => Cookies.get(REFRESH_TOKEN_KEY) ?? null,

  setAccessToken:  (token: string) =>
    Cookies.set(ACCESS_TOKEN_KEY, token,  { ...base, expires: 1 }),   // 1 day

  setRefreshToken: (token: string) =>
    Cookies.set(REFRESH_TOKEN_KEY, token, { ...base, expires: 7 }),   // 7 days

  clearAll: () => {
    Cookies.remove(ACCESS_TOKEN_KEY,  { path: '/' })
    Cookies.remove(REFRESH_TOKEN_KEY, { path: '/' })
  },
}