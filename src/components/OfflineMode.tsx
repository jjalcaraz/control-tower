import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { WifiOff, RefreshCw } from 'lucide-react'
import { useState } from 'react'

export function OfflineMode() {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = () => {
    setIsRetrying(true)
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <Alert className="border-orange-200 bg-orange-50">
          <WifiOff className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Backend Connection Unavailable</AlertTitle>
          <AlertDescription className="text-orange-700">
            The SMS Marketing System is running in demonstration mode. Some features require a backend connection to function properly.
          </AlertDescription>
        </Alert>

        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Demo Mode Active</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>✅ Frontend Interface: <span className="text-green-600 font-medium">Working</span></p>
            <p>✅ UI Components: <span className="text-green-600 font-medium">Functional</span></p>
            <p>✅ Navigation: <span className="text-green-600 font-medium">Available</span></p>
            <p>❌ Backend API: <span className="text-red-600 font-medium">Disconnected</span></p>
            <p>❌ Real-time Updates: <span className="text-red-600 font-medium">Disabled</span></p>
            <p>❌ Data Persistence: <span className="text-red-600 font-medium">Unavailable</span></p>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium text-gray-900 mb-2">What you can do:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Browse all pages and interfaces</li>
              <li>• Test responsive design</li>
              <li>• Review UI components</li>
              <li>• Plan backend integration</li>
            </ul>
          </div>

          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Connection
              </>
            )}
          </Button>
        </div>

        <div className="text-center text-xs text-gray-500">
          <p>To enable full functionality, start the backend server on port 8000</p>
        </div>
      </div>
    </div>
  )
}