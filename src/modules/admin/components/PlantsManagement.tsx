import { useState, useEffect, useTransition } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Leaf, Search, X, RefreshCw, ChevronLeft, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdminPlant {
  id: string;
  name: string;
  species: string;
  health_status: string;
  created_at: string;
  user_id: string;
  user_email: string;
}

interface PlantStats {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
}

const PAGE_SIZE = 20;

export function PlantsManagement() {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<string | null>(null);

  const wrappedStartTransition = (callback: () => void) => {
    startTransition(() => {
      callback();
    });
  };

  // Pagination & filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      wrappedStartTransition(() => {
        setSearch(searchInput);
        if (searchInput.length > 0) setPage(1);
      });
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin_stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-plants', {
        method: 'POST',
        body: { action: 'stats' },
      });
      if (error) throw error;
      if (data?.isError) throw new Error(data.error || 'Unknown Error');
      return data as PlantStats;
    },
  });

  const { data: plantsData, isLoading: isLoadingPlants } = useQuery({
    queryKey: ['admin_plants', page, search, statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-plants', {
        method: 'POST',
        body: {
          action: 'list',
          page,
          pageSize: PAGE_SIZE,
          search,
          statusFilter,
        },
      });
      if (error) throw error;
      if (data?.isError) throw new Error(data.error || 'Unknown Error');

      return {
        plants: (data.data || []) as AdminPlant[],
        totalPages: data.totalPages || 1,
        totalCount: data.total || 0,
      };
    },
    placeholderData: keepPreviousData,
  });

  const plants = plantsData?.plants || [];
  const totalPages = plantsData?.totalPages || 1;
  const totalCount = plantsData?.totalCount || 0;

  const loading = isLoadingStats || isLoadingPlants;

  const handleSearch = () => {
    wrappedStartTransition(() => {
      setPage(1);
      setSearch(searchInput);
    });
  };

  const clearSearch = () => {
    wrappedStartTransition(() => {
      setSearchInput('');
      setSearch('');
      setPage(1);
    });
  };

  const handleStatusFilter = (status: string | null) => {
    wrappedStartTransition(() => {
      setStatusFilter(prev => prev === status ? null : status);
      setPage(1);
    });
  };

  const handleDelete = async (plantId: string, plantName: string) => {
    if (!confirm(`Tem certeza que deseja excluir ${plantName}?`)) return;
    setDeleting(plantId);
    try {
      const { error } = await supabase.functions.invoke('admin-plants', {
        method: 'POST',
        body: { action: 'delete', plantId },
      });
      if (error) throw error;
      toast.success(`${plantName} foi excluída com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['admin_plants'] });
      queryClient.invalidateQueries({ queryKey: ['admin_stats'] });
    } catch (err: any) {
      toast.error(`Erro ao excluir: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-4 glass p-4 rounded-2xl">
        <div className="w-10 h-10 rounded-xl bg-petala-500/10 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-petala-400" />
        </div>
        <div>
            <h2 className="text-lg font-bold text-white">Gestão de Plantas</h2>
            <p className="text-xs text-surface-400">Gerencie todas as plantas dos usuários</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => handleStatusFilter(null)} className={`p-4 rounded-xl border text-center transition-all ${!statusFilter ? 'border-petala-500 bg-petala-500/10' : 'glass border-surface-700 hover:border-petala-500/50'}`}>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-[10px] text-surface-400 font-semibold uppercase tracking-wider mt-1">Total</p>
          </button>
          <button onClick={() => handleStatusFilter('healthy')} className={`p-4 rounded-xl border text-center transition-all ${statusFilter === 'healthy' ? 'border-green-500 bg-green-500/10' : 'glass border-surface-700 hover:border-green-500/50'}`}>
            <p className="text-2xl font-bold text-green-500">{stats.healthy}</p>
            <p className="text-[10px] text-surface-400 font-semibold uppercase tracking-wider mt-1">Saudáveis</p>
          </button>
          <button onClick={() => handleStatusFilter('warning')} className={`p-4 rounded-xl border text-center transition-all ${statusFilter === 'warning' ? 'border-yellow-500 bg-yellow-500/10' : 'glass border-surface-700 hover:border-yellow-500/50'}`}>
            <p className="text-2xl font-bold text-yellow-500">{stats.warning}</p>
            <p className="text-[10px] text-surface-400 font-semibold uppercase tracking-wider mt-1">Atenção</p>
          </button>
          <button onClick={() => handleStatusFilter('critical')} className={`p-4 rounded-xl border text-center transition-all ${statusFilter === 'critical' ? 'border-red-500 bg-red-500/10' : 'glass border-surface-700 hover:border-red-500/50'}`}>
            <p className="text-2xl font-bold text-red-500">{stats.critical}</p>
            <p className="text-[10px] text-surface-400 font-semibold uppercase tracking-wider mt-1">Crítico</p>
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            placeholder="Buscar por planta, espécie ou usuário..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full bg-surface-900/50 border border-surface-700 rounded-xl py-2 pl-9 pr-8 text-sm text-white focus:border-petala-500 outline-none"
          />
          {searchInput && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-surface-400 hover:text-white" />
            </button>
          )}
        </div>
        <button 
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['admin_plants'] });
            queryClient.invalidateQueries({ queryKey: ['admin_stats'] });
          }} 
          disabled={loading}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface-800 border border-surface-700 text-surface-300 hover:text-white hover:bg-surface-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {(search || statusFilter) && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-surface-400">
          <span>Mostrando {totalCount} resultado(s)</span>
          {search && (
            <span className="px-2 py-0.5 rounded-full bg-petala-500/10 text-petala-400 border border-petala-500/20">
              "{search}"
            </span>
          )}
          {statusFilter && (
            <span className={`px-2 py-0.5 rounded-full border ${
              statusFilter === 'healthy' ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : statusFilter === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {statusFilter === 'healthy' ? 'Saudável' : statusFilter === 'warning' ? 'Atenção' : 'Crítico'}
            </span>
          )}
          <button onClick={() => { clearSearch(); setStatusFilter(null); }} className="underline hover:text-white ml-2">
            Limpar filtros
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-petala-500 border-t-transparent" />
        </div>
      ) : plants.length === 0 ? (
        <div className="text-center py-12 glass rounded-2xl border border-surface-800">
          <Leaf className="w-12 h-12 mx-auto mb-3 text-surface-600" />
          <p className="text-surface-400">{search || statusFilter ? 'Nenhum resultado encontrado' : 'Nenhuma planta cadastrada'}</p>
        </div>
      ) : (
        <div className={`transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
          <div className="space-y-2">
            {plants.map((plant) => (
              <div key={plant.id} className="flex items-center justify-between p-4 rounded-xl glass border border-surface-700">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white truncate">{plant.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                      plant.health_status === 'healthy' ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : plant.health_status === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {plant.health_status === 'healthy' ? 'Saudável' : plant.health_status === 'warning' ? 'Atenção' : 'Crítico'}
                    </span>
                  </div>
                  <p className="text-xs text-surface-400 mt-0.5">{plant.species}</p>
                  <p className="text-[10px] text-surface-500 mt-1">
                    Usuário: <span className="text-surface-300">{plant.user_email}</span> · Adicionado em: {new Date(plant.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button 
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 transition-colors ml-2 shrink-0" 
                  onClick={() => handleDelete(plant.id, plant.name)} 
                  disabled={deleting === plant.id}
                  title="Excluir planta"
                >
                  {deleting === plant.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button 
                disabled={page <= 1} 
                onClick={() => wrappedStartTransition(() => setPage(p => p - 1))}
                className="flex items-center px-3 py-1.5 rounded-lg bg-surface-800 text-sm text-surface-300 disabled:opacity-50 hover:bg-surface-700"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </button>
              <span className="text-sm text-surface-400 font-medium">
                Página {page} de {totalPages}
              </span>
              <button 
                disabled={page >= totalPages} 
                onClick={() => wrappedStartTransition(() => setPage(p => p + 1))}
                className="flex items-center px-3 py-1.5 rounded-lg bg-surface-800 text-sm text-surface-300 disabled:opacity-50 hover:bg-surface-700"
              >
                Próxima <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
