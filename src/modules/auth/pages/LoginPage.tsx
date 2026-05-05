/**
 * LoginPage — Tela de autenticação do Pétala Admin Panel.
 * Design premium escuro com gradiente emerald (brand Pétala).
 */
import { useState } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { cn } from '@/lib/utils'
import { LogIn, Eye, EyeOff, AlertCircle, Leaf } from 'lucide-react'

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
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

  const handleGoogleLogin = async () => {
    setError(null)
    setIsSubmitting(true)
    const { error: err } = await signInWithGoogle()
    if (err) {
      setError(err)
      setIsSubmitting(false)
    }
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

          {/* Divider */}
          <div className="my-6 flex items-center justify-center gap-3">
            <div className="h-[1px] flex-1 bg-surface-800" />
            <span className="text-xs uppercase tracking-wider text-surface-500 font-medium">Ou</span>
            <div className="h-[1px] flex-1 bg-surface-800" />
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className={cn(
              'w-full flex items-center justify-center gap-3 rounded-xl border border-surface-700 bg-surface-800/50 px-6 py-3 text-sm font-medium text-white',
              'hover:bg-surface-700 hover:border-surface-600 transition-all duration-300',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Entrar com Google
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
