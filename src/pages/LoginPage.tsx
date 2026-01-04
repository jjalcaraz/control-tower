import { LoginForm } from '@/components/auth/LoginForm'

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">SMS Marketing</h1>
          <p className="text-gray-600 mt-2">TCPA-compliant messaging platform</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}