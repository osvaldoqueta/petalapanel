/**
 * VideoEngagementChart — Gráfico de engajamento de vídeo.
 * Consome a RPC get_top_marketplace_videos para ranking de engajamento.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { ChartSkeleton } from '@/components/Skeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

import type { BiFilterState } from '@/shared/types'

interface VideoData {
  name: string
  views: number
  likes: number
  score: number
  category?: string
}

const COLORS = ['#1eb740', '#15803d', '#22c55e', '#4ade80', '#86efac', '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0']

interface VideoEngagementChartProps {
  filters: BiFilterState
}

export function VideoEngagementChart({ filters }: VideoEngagementChartProps) {
  const { data, isLoading } = useQuery<VideoData[]>({
    queryKey: ['bi-video-engagement', filters],
    queryFn: async () => {
      // Nota: a RPC atual não suporta filtro de categoria nativo. 
      // Em uma versão futura do Np1, a RPC pode ser atualizada para receber category_filter.
      const { data: videos, error } = await supabase
        .rpc('get_top_marketplace_videos', { limit_count: 50 }) // Pega mais para filtrar localmente

      if (error) throw error

      let parsed = (videos || []).map((v: Record<string, unknown>) => ({
        name: String(v.name || 'Sem nome').substring(0, 20),
        views: Number(v.video_views) || 0,
        likes: Number(v.video_likes) || 0,
        score: (Number(v.video_views) || 0) + (Number(v.video_likes) || 0) * 5,
        category: v.category ? String(v.category) : undefined
      }))

      // Filtro local O(n)
      if (filters.category) {
        parsed = parsed.filter((v: VideoData) => v.category === filters.category)
      }

      // Ordena por score e pega o top 10
      return parsed.sort((a: VideoData, b: VideoData) => b.score - a.score).slice(0, 10)
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  if (isLoading) return <ChartSkeleton />

  const hasData = data && data.length > 0

  return (
    <div className="glass rounded-2xl p-6 animate-fade-in">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-white">Top 10 Vídeos — Engajamento</h3>
        <p className="text-xs text-surface-500 mt-0.5">
          Score = views + (likes × 5) — via RPC <code className="text-petala-400/60">get_top_marketplace_videos</code>
        </p>
      </div>

      {!hasData ? (
        <div className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-surface-500">Nenhum dado de vídeo disponível</p>
        </div>
      ) : (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#667291', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#8590ab', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1d28',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Score']}
              />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={20}>
                {data.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
