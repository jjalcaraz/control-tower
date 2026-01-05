import { Radio, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-3xl'
  }

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      {/* Logo Icon - Airport Control Tower */}
      <div className="relative">
        {/* Main tower structure */}
        <div className={cn(
          "relative bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-lg",
          sizeClasses[size]
        )}>
          {/* Airport Control Tower icon */}
          <Radio className={cn(
            "text-white",
            size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-6 w-6'
          )} />
        </div>
        
        {/* Power/Activity indicator */}
        <div className="absolute -bottom-0.5 -right-0.5">
          <div className={cn(
            "bg-green-400 rounded-full animate-pulse",
            size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-2.5 w-2.5' : 'h-3 w-3'
          )}></div>
        </div>
      </div>

      {/* Logo Text - Single Line */}
      {showText && (
        <div className={cn(
          "font-bold text-gray-900 leading-none",
          textSizeClasses[size]
        )}>
          <span className="text-blue-600">Control</span>
          <span className="ml-1 text-gray-700">Tower</span>
        </div>
      )}
    </div>
  )
}

// Compact version for mobile/small spaces
export function LogoCompact({ className }: { className?: string }) {
  return <Logo className={className} showText={false} size="sm" />
}

// Large version for landing pages/headers
export function LogoLarge({ className }: { className?: string }) {
  return <Logo className={className} size="lg" />
}