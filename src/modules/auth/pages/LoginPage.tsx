/**
 * LoginPage — Tela de autenticação do Pétala Admin Panel.
 * Design premium escuro com gradiente emerald (brand Pétala).
 */
import { useState } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { cn } from '@/lib/utils'
import { LogIn, Eye, EyeOff, AlertCircle, Leaf } from 'lucide-react'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: err } = await signIn(email, password)
    if (err) setError(err)
    setIsSubmitting(false)
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-surface p-4">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-petala-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-petala-600/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-petala-500/[0.02] blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo & Title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-glow">
            <Leaf className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Pétala <span className="text-gradient">Admin</span>
          </h1>
          <p className="mt-1 text-sm text-surface-400">
            Painel de Governança & BI
          </p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="glass rounded-2xl p-8 shadow-card"
        >
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 animate-slide-up">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Email */}
          <div className="mb-5">
            <label htmlFor="email" className="mb-2 block text-xs font-medium uppercase tracking-wider text-surface-400">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@petala.app"
              required
              className={cn(
                'w-full rounded-xl border bg-surface-950/50 px-4 py-3 text-sm text-white',
                'placeholder:text-surface-500',
                'border-surface-800 focus:border-petala-500/50 focus:ring-1 focus:ring-petala-500/30',
                'outline-none transition-all duration-200'
              )}
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <label htmlFor="password" className="mb-2 block text-xs font-medium uppercase tracking-wider text-surface-400">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={cn(
                  'w-full rounded-xl border bg-surface-950/50 px-4 py-3 pr-12 text-sm text-white',
                  'placeholder:text-surface-500',
                  'border-surface-800 focus:border-petala-500/50 focus:ring-1 focus:ring-petala-500/30',
                  'outline-none transition-all duration-200'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white',
              'gradient-primary hover:shadow-glow transition-all duration-300',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none'
            )}
          >
            {isSubmitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Entrar no Painel
              </>
            )}
          </button>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-surface-500">
            Acesso restrito a administradores autorizados
          </p>
        </form>
      </div>
    </div>
  )
}
