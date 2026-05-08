import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HeartPulse, Trash2, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface HeartbeatRow {
  id: string;
  device_id: string;
  platform: string | null;
  model: string | null;
  app_version: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  last_seen: string;
  created_at: string;
}

const HB_PAGE_SIZE = 20;

export function InstallsManagement() {
  const queryClient = useQueryClient();
  const [hbPage, setHbPage] = useState(1);
  const [selectedHeartbeats, setSelectedHeartbeats] = useState<string[]>([]);
  const [isDeletingHeartbeats, setIsDeletingHeartbeats] = useState(false);
  const [totalVisits, setTotalVisits] = useState<number>(0);
  const [activeToday, setActiveToday] = useState<number>(0);

  const toggleHeartbeatSelection = (id: string) => {
    setSelectedHeartbeats(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const deleteSelectedHeartbeats = async (ids: string[]) => {
    if (!ids.length) return;
    if (!confirm(`Tem certeza que deseja excluir ${ids.length} registro(s) de instalação?`)) return;
    setIsDeletingHeartbeats(true);
    try {
      const { error } = await supabase.from('device_heartbeats').delete().in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} registro(s) excluído(s).`);
      setSelectedHeartbeats([]);
      refetchHb();
    } catch (err) {
      toast.error('Erro ao excluir registros.');
    } finally {
      setIsDeletingHeartbeats(false);
    }
  };

  const { data: hbData, isLoading: hbLoading, refetch: refetchHb } = useQuery({
    queryKey: ['admin_heartbeats', hbPage],
    queryFn: async () => {
      const from = (hbPage - 1) * HB_PAGE_SIZE;
      const to = from + HB_PAGE_SIZE - 1;
      const { data, count, error } = await supabase
        .from('device_heartbeats')
        .select('*', { count: 'exact' })
        .order('last_seen', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data || []) as HeartbeatRow[], total: count || 0 };
    },
  });

  useEffect(() => {
    const fetchHeartbeatAnalytics = async () => {
      try {
        const { count: totalCount } = await supabase
          .from('device_heartbeats')
          .select('*', { count: 'exact', head: true });
        if (totalCount !== null) setTotalVisits(totalCount);

        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        const { count: dauCount } = await supabase
          .from('device_heartbeats')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen', yesterday.toISOString());
        if (dauCount !== null) setActiveToday(dauCount);
      } catch (e) {
        console.warn('[Admin] Heartbeat analytics failed', e);
      }
    };
    fetchHeartbeatAnalytics();
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-4 glass p-4 rounded-2xl">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-blue-400" />
        </div>
        <div>
            <h2 className="text-lg font-bold text-white">Instalações / Dispositivos</h2>
            <p className="text-xs text-surface-400">Telemetria de acessos (Heartbeat)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass border border-surface-700 rounded-xl p-5 text-center shadow-sm">
          <p className="text-[10px] text-surface-400 uppercase tracking-widest font-semibold mb-1">Total de Instalações</p>
          <p className="text-3xl font-bold text-white">{hbData?.total ?? totalVisits}</p>
          <p className="text-[10px] text-surface-500 mt-1">Dispositivos únicos acumulados</p>
        </div>
        <div className="glass border border-green-500/30 rounded-xl p-5 text-center shadow-sm">
          <p className="text-[10px] text-green-400/80 uppercase tracking-widest font-semibold mb-1">Ativos (DAU)</p>
          <p className="text-3xl font-bold text-green-400">{activeToday}</p>
          <p className="text-[10px] text-surface-500 mt-1">Acessaram nas últimas 24h</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2 mt-4">
        <div className="flex gap-2">
          {selectedHeartbeats.length > 0 && (
            <button 
              onClick={() => deleteSelectedHeartbeats(selectedHeartbeats)} 
              disabled={isDeletingHeartbeats}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isDeletingHeartbeats ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Excluir ({selectedHeartbeats.length})
            </button>
          )}
        </div>
        <button 
          onClick={() => refetchHb()} 
          disabled={hbLoading}
          className="flex items-center gap-2 bg-surface-800 hover:bg-surface-700 border border-surface-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${hbLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {hbLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-petala-500 border-t-transparent" />
        </div>
      ) : !hbData || hbData.rows.length === 0 ? (
        <div className="text-center py-16 text-surface-400 glass border border-surface-800 rounded-2xl">
          <HeartPulse className="w-12 h-12 mx-auto mb-3 opacity-30 text-surface-600" />
          <p className="font-medium text-surface-300">Nenhum dado de heartbeat registrado ainda.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl border border-surface-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800 bg-surface-900/50">
                  <th className="px-4 py-3.5 text-left w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-surface-600 bg-surface-800 text-petala-500 focus:ring-petala-500 cursor-pointer"
                      checked={hbData.rows.length > 0 && selectedHeartbeats.length === hbData.rows.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedHeartbeats(hbData.rows.map(r => r.id));
                        else setSelectedHeartbeats([]);
                      }}
                    />
                  </th>
                  <th className="text-left text-[10px] font-semibold text-surface-400 uppercase tracking-wider px-3 py-3.5">#</th>
                  <th className="text-left text-[10px] font-semibold text-surface-400 uppercase tracking-wider px-3 py-3.5">Plataforma</th>
                  <th className="text-left text-[10px] font-semibold text-surface-400 uppercase tracking-wider px-3 py-3.5">País</th>
                  <th className="text-left text-[10px] font-semibold text-surface-400 uppercase tracking-wider px-3 py-3.5">Cidade</th>
                  <th className="text-left text-[10px] font-semibold text-surface-400 uppercase tracking-wider px-3 py-3.5">Modelo</th>
                  <th className="text-left text-[10px] font-semibold text-surface-400 uppercase tracking-wider px-3 py-3.5">Versão</th>
                  <th className="text-left text-[10px] font-semibold text-surface-400 uppercase tracking-wider px-3 py-3.5">Visto em</th>
                  <th className="px-3 py-3.5 text-right text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {hbData.rows.map((row, idx) => {
                  const rowNum = (hbPage - 1) * HB_PAGE_SIZE + idx + 1;
                  const platform = (row.platform || 'web').toLowerCase();
                  const platformEmoji = platform === 'android' ? '🤖' : platform === 'ios' ? '🍎' : '🌐';
                  const platformColor = platform === 'android'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : platform === 'ios'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'bg-surface-800 text-surface-400 border-surface-700';
                  const lastSeen = new Date(row.last_seen);
                  const now = new Date();
                  const diffMs = now.getTime() - lastSeen.getTime();
                  const diffH = Math.floor(diffMs / 3600000);
                  const diffD = Math.floor(diffMs / 86400000);
                  const seenLabel = diffH < 1 ? 'agora' : diffH < 24 ? `${diffH}h atrás` : diffD < 7 ? `${diffD}d atrás` : lastSeen.toLocaleDateString('pt-BR');
                  const isRecent = diffH < 24;
                  return (
                    <tr key={row.id} className="hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          className="rounded border-surface-600 bg-surface-800 text-petala-500 focus:ring-petala-500 cursor-pointer w-4 h-4"
                          checked={selectedHeartbeats.includes(row.id)}
                          onChange={() => toggleHeartbeatSelection(row.id)}
                        />
                      </td>
                      <td className="px-3 py-3 text-surface-500 text-xs font-mono">{rowNum}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${platformColor}`}>
                          {platformEmoji} {row.platform ?? 'WEB'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-surface-300 text-xs">{row.country ?? '—'}</td>
                      <td className="px-3 py-3 text-surface-400 text-xs">{row.city ?? row.region ?? '—'}</td>
                      <td className="px-3 py-3 text-surface-400 text-xs truncate max-w-[120px]" title={row.model ?? ''}>{row.model ?? '—'}</td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs bg-surface-800 text-surface-300 px-1.5 py-0.5 rounded border border-surface-700">{row.app_version ?? '—'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-xs font-medium flex items-center ${isRecent ? 'text-green-400' : 'text-surface-500'}`}>
                          {isRecent && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
                          {seenLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button 
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 transition-colors ml-auto" 
                          onClick={() => deleteSelectedHeartbeats([row.id])}
                          title="Excluir Registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {(() => {
            const totalHbPages = Math.ceil((hbData.total || 0) / HB_PAGE_SIZE);
            return totalHbPages > 1 ? (
              <div className="flex items-center justify-between p-4 border-t border-surface-800">
                <span className="text-xs text-surface-400 font-medium">{hbData.total} dispositivos · Página {hbPage} de {totalHbPages}</span>
                <div className="flex gap-2">
                  <button 
                    disabled={hbPage <= 1} 
                    onClick={() => setHbPage(p => p - 1)}
                    className="flex items-center px-3 py-1.5 rounded-lg bg-surface-800 text-sm text-surface-300 disabled:opacity-50 hover:bg-surface-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                  </button>
                  <button 
                    disabled={hbPage >= totalHbPages} 
                    onClick={() => setHbPage(p => p + 1)}
                    className="flex items-center px-3 py-1.5 rounded-lg bg-surface-800 text-sm text-surface-300 disabled:opacity-50 hover:bg-surface-700 transition-colors"
                  >
                    Próxima <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}
