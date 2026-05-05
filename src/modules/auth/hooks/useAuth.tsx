/**
 * useAuth — Hook de autenticação e RBAC para o Pétala Admin Panel.
 *
 * Verifica a sessão do Supabase e carrega o profile (incluindo role).
 * Roles: SuperAdmin > Admin > Lojista
 */
import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import type { Profile, UserRole } from '@/shared/types'
import type { Session } from '@supabase/supabase-js'

interface AuthState {
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  role: UserRole | null
  hasRole: (minRole: UserRole) => boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const ROLE_HIERARCHY: Record<string, number> = {
  lojista: 1,
  admin: 2,
  superadmin: 3,
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, created_at, updated_at')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('[Auth] Failed to fetch profile:', error.message)
      return null
    }
    return data as Profile
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      if (s?.user) {
        const p = await fetchProfile(s.user.id)
        setProfile(p)
        // Reject users without admin roles
        const userRole = p?.role?.toLowerCase()
        if (!userRole || !['superadmin', 'admin', 'lojista'].includes(userRole)) {
          await supabase.auth.signOut()
          setSession(null)
          setProfile(null)
        }
      }
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s)
        if (s?.user) {
          const p = await fetchProfile(s.user.id)
          setProfile(p)
          // Reject users without admin roles
          const userRole = p?.role?.toLowerCase()
          if (!userRole || !['superadmin', 'admin', 'lojista'].includes(userRole)) {
            await supabase.auth.signOut()
            setSession(null)
            setProfile(null)
            toast.error('Acesso negado: Conta sem privilégios administrativos.')
          }
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const hasRole = useCallback((minRole: UserRole): boolean => {
    if (!profile?.role) return false
    const current = profile.role.toLowerCase()
    const required = minRole.toLowerCase()
    return (ROLE_HIERARCHY[current] || 0) >= (ROLE_HIERARCHY[required] || 0)
  }, [profile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }

    const { data: { session: s } } = await supabase.auth.getSession()
    if (!s?.user) return { error: 'Sessão não iniciada' }

    const p = await fetchProfile(s.user.id)
    const userRole = p?.role?.toLowerCase()
    if (!userRole || !['superadmin', 'admin', 'lojista'].includes(userRole)) {
      await supabase.auth.signOut()
      return { error: 'Acesso negado. Apenas administradores podem acessar o painel.' }
    }

    setProfile(p)
    navigate('/')
    return { error: null }
  }, [fetchProfile, navigate])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    navigate('/login')
  }, [navigate])

  const value: AuthState = {
    session,
    profile,
    isLoading,
    isAuthenticated: !!session && !!profile,
    role: profile?.role ?? null,
    hasRole,
    signIn,
    signInWithGoogle,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
