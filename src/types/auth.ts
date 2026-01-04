export interface AuthUser {
  id: number
  username: string
  email: string
  role: 'admin' | 'campaign_manager' | 'operator' | 'viewer'
  twoFactorEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface AuthResponse {
  user: AuthUser
  token: string
  refreshToken: string
}

export interface TwoFactorSetup {
  secret: string
  qrCode: string
  backupCodes: string[]
}

export interface TwoFactorVerification {
  token: string
}