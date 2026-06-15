// lib/types.ts

export interface RegisterPayload {
  email:     string
  password:  string
  full_name: string
}

export interface LoginPayload {
  email:    string
  password: string
}

// Matches Go backend response exactly — snake_case
export interface AuthResponse {
  user:            AuthUser
  access_token:    string
  access_token_id: string
  refresh_token:   string
}

export interface AuthUser {
  id:         string
  email:      string
  full_name:  string
  created_at: string
  updated_at: string
}

export interface SocialAccount {
  id:               string
  user_id:          string
  platform:         'linkedin' | 'instagram' | 'x' | 'facebook'
  platform_user_id: string
  name:             string
  email:            string
  token_expires_at: string
  created_at:       string
  updated_at:       string
}