// lib/client.ts
import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import { cookieStore } from './cookie'

// ─── Refresh queue ────────────────────────────────────────────────────────────
// Multiple requests can fail with 401 simultaneously.
// We queue them all, do ONE refresh, then replay everything.
let _isRefreshing = false
let _refreshQueue: Array<{
  resolve: (token: string) => void
  reject:  (err: unknown)  => void
}> = []

function drainQueue(token: string) {
  _refreshQueue.forEach((p) => p.resolve(token))
  _refreshQueue = []
}

function rejectQueue(err: unknown) {
  _refreshQueue.forEach((p) => p.reject(err))
  _refreshQueue = []
}

// ─── Normalized error ─────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode:  string,
    message: string,
    public readonly raw?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ─── Axios instance ───────────────────────────────────────────────────────────
function createClient(): AxiosInstance {
  const client = axios.create({
    baseURL:         process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api',
    withCredentials: false,
    timeout:         15_000,
    headers:         { 'Content-Type': 'application/json' },
  })

  // ── Request: inject access token from cookie ───────────────────────────────
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = cookieStore.getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  // ── Response: 401 → refresh → replay ──────────────────────────────────────
  client.interceptors.response.use(
    (res: AxiosResponse) => res,

    async (error) => {
      const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

      if (!error.response) {
        throw new ApiError(0, 'NETWORK_ERROR', 'Network error — check your connection.')
      }

      const { status, data } = error.response as AxiosResponse<{
        error?:   string
        message?: string | string[]
      }>

      const rawMessage =
        Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message ?? data?.error ?? 'An unexpected error occurred.'

      // ── 401 handling ───────────────────────────────────────────────────────
      if (status === 401 && !original._retry) {

        // Never retry the refresh call itself — would cause infinite loop
        if (original.url?.includes('/auth/refresh')) {
          cookieStore.clearAll()
          redirectToLogin()
          throw new ApiError(401, 'SESSION_EXPIRED', 'Session expired. Please sign in again.')
        }

        // Already refreshing — queue this request
        if (_isRefreshing) {
          return new Promise<AxiosResponse>((resolve, reject) => {
            _refreshQueue.push({
              resolve: (newToken) => {
                original.headers.Authorization = `Bearer ${newToken}`
                original._retry = true
                resolve(client(original))
              },
              reject,
            })
          })
        }

        const refreshToken = cookieStore.getRefreshToken()
        if (!refreshToken) {
          cookieStore.clearAll()
          redirectToLogin()
          throw new ApiError(401, 'SESSION_EXPIRED', 'Session expired. Please sign in again.')
        }

        _isRefreshing   = true
        original._retry = true

        try {
          const { data: refreshData } = await client.post<AuthResponse>(
            '/auth/refresh',
            { refresh_token: refreshToken },
          )

          cookieStore.setAccessToken(refreshData.access_token)
          cookieStore.setRefreshToken(refreshData.refresh_token)

          drainQueue(refreshData.access_token)
          original.headers.Authorization = `Bearer ${refreshData.access_token}`
          return client(original)

        } catch (refreshError) {
          rejectQueue(refreshError)
          cookieStore.clearAll()
          redirectToLogin()
          throw new ApiError(401, 'SESSION_EXPIRED', 'Session expired. Please sign in again.')

        } finally {
          _isRefreshing = false
        }
      }

      // ── All other errors ───────────────────────────────────────────────────
      throw new ApiError(
        status,
        deriveErrorCode(status, data?.error),
        rawMessage,
        data,
      )
    },
  )

  return client
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
interface AuthResponse {
  access_token:  string
  refresh_token: string
}

function deriveErrorCode(status: number, serverError?: string): string {
  if (serverError) return serverError.toUpperCase().replace(/\s+/g, '_')
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',   401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',     404: 'NOT_FOUND',
    409: 'CONFLICT',      422: 'UNPROCESSABLE',
    429: 'RATE_LIMITED',  500: 'SERVER_ERROR',
  }
  return map[status] ?? `HTTP_${status}`
}

function redirectToLogin() {
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

export const client: AxiosInstance = createClient()