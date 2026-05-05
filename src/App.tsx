import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/modules/auth/hooks/useAuth'
import { ProtectedRoute } from '@/modules/auth/components/ProtectedRoute'
import { DashboardLayout } from '@/components/DashboardLayout'
import { lazy, Suspense } from 'react'

// Lazy imports (code splitting)
const LoginPage = lazy(() => import('@/modules/auth/pages/LoginPage'))
const BiDashboard = lazy(() => import('@/modules/bi/pages/BiDashboard'))
const DesignSystemPage = lazy(() => import('@/modules/design-system/pages/DesignSystemPage'))
const MerchantHubPage = lazy(() => import('@/modules/merchant/pages/MerchantHubPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-petala-500 border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Dashboard */}
              <Route element={<ProtectedRoute minRole="Lojista"><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<ProtectedRoute minRole="Admin"><BiDashboard /></ProtectedRoute>} />
                <Route path="bi" element={<ProtectedRoute minRole="Admin"><BiDashboard /></ProtectedRoute>} />
                <Route path="design-system" element={<ProtectedRoute minRole="SuperAdmin"><DesignSystemPage /></ProtectedRoute>} />
                <Route path="merchant" element={<MerchantHubPage />} />
                <Route path="moderation" element={<ProtectedRoute minRole="Admin"><MerchantHubPage /></ProtectedRoute>} />
              </Route>
            </Routes>
          </Suspense>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a1d28',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#e2e8f0',
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
