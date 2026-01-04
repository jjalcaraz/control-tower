import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface AuthUser {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: string
}

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterData {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  setupTwoFactor: () => Promise<any>
  verifyTwoFactor: (token: string) => Promise<void>
  disableTwoFactor: (token: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Mock user login on mount for testing
  useEffect(() => {
    // Simulate initial loading
    setTimeout(() => {
      setUser({
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      })
      setIsLoading(false)
    }, 1000)
  }, [])

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true)
    // Mock login
    setTimeout(() => {
      setUser({
        id: '1',
        username: credentials.email.split('@')[0],
        email: credentials.email,
        firstName: 'Test',
        lastName: 'User',
        role: 'admin'
      })
      setIsLoading(false)
    }, 1000)
  }

  const register = async (data: RegisterData) => {
    setIsLoading(true)
    // Mock registration
    setTimeout(() => {
      setUser({
        id: '1',
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'user'
      })
      setIsLoading(false)
    }, 1000)
  }

  const logout = async () => {
    setUser(null)
  }

  const setupTwoFactor = async () => {
    return { qrCode: 'mock-qr-code', secret: 'mock-secret' }
  }

  const verifyTwoFactor = async (token: string) => {
    // Mock verification
    return Promise.resolve()
  }

  const disableTwoFactor = async (token: string) => {
    // Mock disable
    return Promise.resolve()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        setupTwoFactor,
        verifyTwoFactor,
        disableTwoFactor,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}