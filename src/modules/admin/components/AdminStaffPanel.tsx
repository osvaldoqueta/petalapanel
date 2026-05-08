import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, Mail, UserPlus, Loader2, Key } from 'lucide-react';
import { toast } from 'sonner';

export function AdminStaffPanel() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [roleName, setRoleName] = useState('Seller');
  
  // Hardcoded UI check (even though backend triggers protect it too)
  const isUltimateSuperUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email === 'quetaosvaldo@gmail.com';
  };

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['admin_roles'],
    queryFn: async () => {
       const { data, error } = await supabase.from('roles').select('*');
       if (error) throw error;
       return data;
    }
  });

  const { data: staffProfiles, isLoading: staffLoading } = useQuery({
    queryKey: ['admin_staff_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, roles(name)')
        .not('role_id', 'is', null);
        
      if (error) throw error;
      return data;
    }
  });

  const assignRoleMutation = useMutation({
    mutationFn: async () => {
      const isOk = await isUltimateSuperUser();
      if (!isOk) throw new Error('Apenas quetaosvaldo@gmail.com pode gerenciar staff.');

      if (!email || !email.includes('@')) throw new Error('Email inválido');
      
      const roleId = roles?.find((r: any) => r.name === roleName)?.id;
      if (!roleId) throw new Error('Role não encontrada no banco.');

      const { data, error } = await supabase.functions.invoke('admin-users', {
         body: { action: 'assign_role', email, roleId }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      toast.success(`Role ${roleName} atribuída com sucesso!`);
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['admin_staff_profiles'] });
    },
    onError: (err: any) => {
      toast.error('Falha ao adicionar: ' + err.message);
    }
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6 glass p-4 rounded-2xl">
        <div className="w-10 h-10 rounded-xl bg-petala-500/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-petala-400" />
        </div>
        <div>
            <h2 className="text-lg font-bold text-white">Gestão de Colaboradores</h2>
            <p className="text-xs text-surface-400">Adicione gerentes e parceiros restritos.</p>
        </div>
      </div>

      <div className="glass p-5 rounded-2xl border border-surface-700 space-y-4">
        <h3 className="text-sm font-semibold text-white">Atribuir Cargo</h3>
        
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="E-mail do usuário..."
                    className="w-full bg-surface-900/50 border border-surface-700 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:border-petala-500 outline-none"
                    type="email"
                />
            </div>
            
            <div className="relative w-full sm:w-[180px]">
              <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <select 
                value={roleName} 
                onChange={e => setRoleName(e.target.value)}
                className="w-full bg-surface-900/50 border border-surface-700 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:border-petala-500 outline-none appearance-none"
              >
                  {(roles || []).map((r: any) => (
                      <option key={r.id} value={r.name} className="bg-surface-900">{r.name}</option>
                  ))}
              </select>
            </div>
            
            <button 
                onClick={() => assignRoleMutation.mutate()} 
                disabled={assignRoleMutation.isPending || rolesLoading}
                className="flex items-center justify-center bg-petala-500 hover:bg-petala-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
                {assignRoleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Convidar
            </button>
        </div>
      </div>

      <div className="space-y-3 mt-6">
         <h3 className="text-sm font-semibold text-white">Equipe Ativa</h3>
         {staffLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-petala-500 border-t-transparent" />
            </div>
         ) : staffProfiles?.length ? (
            staffProfiles.map((profile: any) => (
              <div key={profile.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 glass rounded-xl border border-surface-700 gap-3">
                 <div>
                    <p className="font-semibold text-sm font-mono text-white break-all">{profile.id}</p>
                    <p className="text-xs text-surface-400 truncate max-w-[200px]">ID do Usuário Ativo</p>
                 </div>
                 <div>
                    <span className="px-3 py-1 bg-petala-500/10 border border-petala-500/20 text-petala-400 text-xs font-bold rounded-lg uppercase tracking-wider">
                       {profile.roles?.name || 'Unknown'}
                    </span>
                 </div>
              </div>
            ))
         ) : (
             <p className="text-sm text-surface-400 text-center py-8 glass rounded-xl">Nenhum privilégio administrativo encontrado nos perfis.</p>
         )}
      </div>
    </div>
  );
}
