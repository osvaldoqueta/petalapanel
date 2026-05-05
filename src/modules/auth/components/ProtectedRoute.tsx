/**
 * ProtectedRoute — Wrapper que exige autenticação e role mínima.
 *
 * Uso:
 *   <ProtectedRoute minRole="SuperAdmin">
 *     <DesignSystemPage />
 *   </ProtectedRoute>
 */
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import type { UserRole } from '@/shared/types'

interface Props {
  children: React.ReactNode
  minRole?: UserRole
}

export function ProtectedRoute({ children, minRole = 'Seller' }: Props) {
  const { isLoading, isAuthenticated, hasRole } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-petala-500 border-t-transparent" />
          <span className="text-sm text-surface-400">Verificando acesso…</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!hasRole(minRole)) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-surface">
        <div className="rounded-2xl glass p-8 text-center max-w-sm">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-white mb-2">Acesso Restrito</h2>
          <p className="text-surface-400 text-sm">
            Você não possui permissão para acessar esta área.
            Nível mínimo necessário: <strong className="text-petala-400">{minRole}</strong>
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
