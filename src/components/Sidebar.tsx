/**
 * Sidebar — Navegação principal do Pétala Admin Panel.
 * Design premium com glassmorphism e gradientes emerald.
 */
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import type { UserRole } from '@/shared/types'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Palette,
  BarChart3,
  Store,
  Shield,
  LogOut,
  Leaf,
  ChevronLeft,
  Menu,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  minRole?: UserRole
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard BI',
    path: '/',
    icon: <LayoutDashboard className="h-5 w-5" />,
    minRole: 'Support',
  },
  {
    label: 'Design System',
    path: '/design-system',
    icon: <Palette className="h-5 w-5" />,
    minRole: 'Super User',
  },
  {
    label: 'Vendas & Métricas',
    path: '/bi',
    icon: <BarChart3 className="h-5 w-5" />,
    minRole: 'Support',
  },
  {
    label: 'Merchant Hub',
    path: '/merchant',
    icon: <Store className="h-5 w-5" />,
    minRole: 'Seller',
  },
  {
    label: 'Administração',
    path: '/admin',
    icon: <Shield className="h-5 w-5" />,
    minRole: 'Support',
  },
]

export function Sidebar() {
  const { profile, signOut, hasRole } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const filteredNav = NAV_ITEMS.filter(
    (item) => !item.minRole || hasRole(item.minRole)
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-4 left-4 z-50 lg:hidden glass rounded-xl p-2 text-surface-400 hover:text-white transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-surface-800/50',
          'bg-surface-950/95 backdrop-blur-xl transition-all duration-300',
          'lg:relative lg:translate-x-0',
          collapsed ? '-translate-x-full lg:w-20' : 'w-[260px]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-800/30">
          <div className={cn('flex items-center gap-3', collapsed && 'lg:justify-center')}>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl gradient-primary shadow-glow-sm">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="animate-fade-in">
                <h1 className="text-sm font-bold text-white tracking-tight">Pétala Admin</h1>
                <p className="text-[10px] text-surface-500 uppercase tracking-widest">Governance Panel</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-surface-500 hover:text-white hover:bg-surface-800/50 transition-all"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path))

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && setCollapsed(true)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  collapsed && 'lg:justify-center lg:px-2',
                  isActive
                    ? 'bg-petala-500/10 text-petala-400 shadow-glow-sm'
                    : 'text-surface-400 hover:text-white hover:bg-surface-800/40'
                )}
              >
                <span className={cn(
                  'flex-shrink-0 transition-colors',
                  isActive && 'text-petala-400'
                )}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="animate-fade-in truncate">{item.label}</span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-surface-800/30 p-4">
          <div className={cn(
            'flex items-center gap-3 mb-3',
            collapsed && 'lg:justify-center'
          )}>
            <div className="h-9 w-9 flex-shrink-0 rounded-full bg-petala-500/20 flex items-center justify-center ring-2 ring-petala-500/30">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || 'Admin'}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-petala-400">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              )}
            </div>
            {!collapsed && (
              <div className="animate-fade-in min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {profile?.full_name || 'Admin'}
                </p>
                <p className="text-[10px] text-petala-400 uppercase tracking-wider font-semibold">
                  {profile?.role || 'Unknown'}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={signOut}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-surface-500',
              'hover:text-red-400 hover:bg-red-500/10 transition-all',
              collapsed && 'lg:justify-center'
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
