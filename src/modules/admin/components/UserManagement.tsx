/**
 * UserManagement — Gestão de usuários com edição de roles via admin client.
 * SuperAdmin only. Inclui busca, tabela paginada e dropdown de roles.
 */
import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminRepository } from '@/repositories/adminRepository'
import { useAuditLog } from '@/hooks/useAuditLog'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { UserTableSkeleton } from '@/components/Skeleton'
import { formatRelativeDate, cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { AdminUser, RoleOption } from '@/shared/types'
import {
  Search,
  Users,
  ChevronDown,
  Shield,
  Check,
  X,
} from 'lucide-react'

export function UserManagement() {
  const { profile } = useAuth()
  const { log } = useAuditLog()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: adminRepository.getUsers,
    staleTime: 60_000,
  })

  const { data: roles = [] } = useQuery<RoleOption[]>({
    queryKey: ['admin-roles'],
    queryFn: adminRepository.getRoles,
    staleTime: 5 * 60_000,
  })

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users
    const lower = searchTerm.toLowerCase()
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(lower) ||
        u.email?.toLowerCase().includes(lower) ||
        u.role_name?.toLowerCase().includes(lower)
    )
  }, [users, searchTerm])

  const handleRoleChange = async (user: AdminUser, newRoleId: string, newRoleName: string) => {
    setUpdatingUserId(user.user_id)
    try {
      await adminRepository.updateUserRole(user.user_id, newRoleId)

      await log({
        action: 'role_change',
        table_name: 'profiles',
        record_key: user.user_id,
        old_value: user.role_name || 'null',
        new_value: newRoleName,
        entity: 'profiles',
      })

      toast.success(`Role de ${user.full_name || 'Usuário'} alterada para ${newRoleName}`)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setEditingUserId(null)
    } catch (err: any) {
      toast.error(`Erro ao alterar role: ${err?.message || 'Desconhecido'}`)
    } finally {
      setUpdatingUserId(null)
    }
  }

  const ROLE_COLORS: Record<string, string> = {
    'super user': 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
    'regional manager': 'bg-accent-purple/10 text-accent-purple border-accent-purple/20',
    'support': 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
    'seller': 'bg-petala-500/10 text-petala-400 border-petala-500/20',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent-purple/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-accent-purple" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Gestão de Usuários</h2>
            <p className="text-xs text-surface-400">{users.length} usuários registrados</p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-900/50 border border-surface-700 rounded-xl py-2 px-4 pl-10 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-petala-500 transition-all"
          />
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-surface-500" />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <UserTableSkeleton />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Usuário</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Cadastro</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/30">
                {filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-surface-800/20 transition-colors">
                    {/* Avatar + Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-surface-700 flex items-center justify-center flex-shrink-0 ring-1 ring-surface-600">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-surface-400">
                              {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-white truncate max-w-[180px]">
                          {user.full_name || '(Sem nome)'}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3.5 text-surface-300 truncate max-w-[200px]">
                      {user.email || '—'}
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider',
                        ROLE_COLORS[user.role_name?.toLowerCase() || ''] || 'bg-surface-800 text-surface-400 border-surface-700'
                      )}>
                        <Shield className="h-3 w-3" />
                        {user.role_name || 'Sem role'}
                      </span>
                    </td>

                    {/* Created at */}
                    <td className="px-5 py-3.5 text-surface-400 text-xs">
                      {formatRelativeDate(user.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setEditingUserId(editingUserId === user.user_id ? null : user.user_id)}
                          disabled={updatingUserId === user.user_id}
                          className="flex items-center gap-1.5 text-xs font-medium text-surface-300 hover:text-white bg-surface-800/50 hover:bg-surface-800 border border-surface-700 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50"
                        >
                          {updatingUserId === user.user_id ? (
                            <div className="h-3 w-3 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                          Editar Role
                        </button>

                        {/* Dropdown */}
                        {editingUserId === user.user_id && (
                          <div className="absolute right-0 top-full mt-1 z-50 w-48 glass rounded-xl border border-surface-700 shadow-2xl overflow-hidden animate-fade-in">
                            {roles.map((role) => (
                              <button
                                key={role.id}
                                onClick={() => handleRoleChange(user, role.id, role.name)}
                                className={cn(
                                  'flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-surface-800/50 transition-colors',
                                  user.role_name?.toLowerCase() === role.name.toLowerCase()
                                    ? 'text-petala-400 bg-petala-500/5'
                                    : 'text-surface-300'
                                )}
                              >
                                <span className="capitalize">{role.name}</span>
                                {user.role_name?.toLowerCase() === role.name.toLowerCase() && (
                                  <Check className="h-4 w-4 text-petala-400" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && !isLoading && (
            <div className="py-12 text-center">
              <Users className="h-8 w-8 text-surface-500 mx-auto mb-2" />
              <p className="text-sm text-surface-400">Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
