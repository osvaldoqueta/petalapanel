/**
 * AdminBroadcast — Centro de Transmissão Global para o SuperAdmin.
 * Permite enviar mensagens em massa para o app nativo via tabela admin_broadcasts.
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { adminRepository } from '@/repositories/adminRepository'
import { useAuditLog } from '@/hooks/useAuditLog'
import { toast } from 'sonner'
import { Send, Radio, Users, Truck, Store, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

const broadcastSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').max(120),
  body: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres').max(500),
  target_audience: z.enum(['all', 'sellers', 'couriers']),
  action_url: z.string().optional(),
  channel: z.enum(['in_app', 'email', 'both']),
})

type BroadcastForm = z.infer<typeof broadcastSchema>

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Todos', icon: Globe, color: 'text-accent-blue' },
  { value: 'sellers', label: 'Lojistas', icon: Store, color: 'text-petala-400' },
  { value: 'couriers', label: 'Entregadores', icon: Truck, color: 'text-accent-amber' },
] as const

const CHANNEL_OPTIONS = [
  { value: 'in_app', label: 'In-App' },
  { value: 'email', label: 'E-mail' },
  { value: 'both', label: 'Ambos' },
] as const

export function AdminBroadcast() {
  const { log } = useAuditLog()
  const [estimatedReach, setEstimatedReach] = useState<number | null>(null)
  const [isFetchingReach, setIsFetchingReach] = useState(false)

  const form = useForm<BroadcastForm>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      title: '',
      body: '',
      target_audience: 'all',
      action_url: '',
      channel: 'in_app',
    },
  })

  const selectedAudience = form.watch('target_audience')

  const fetchReach = async (audience: string) => {
    setIsFetchingReach(true)
    try {
      const count = await adminRepository.getEstimatedReach(audience)
      setEstimatedReach(count)
    } catch {
      setEstimatedReach(null)
    } finally {
      setIsFetchingReach(false)
    }
  }

  const onSubmit = async (data: BroadcastForm) => {
    try {
      const broadcast = await adminRepository.createBroadcast(data)

      await log({
        action: 'create_broadcast',
        table_name: 'admin_broadcasts',
        record_key: broadcast.id,
        old_value: null,
        new_value: JSON.stringify({ ...data, estimated_reach: estimatedReach }),
        entity: 'admin_broadcasts',
      })

      toast.success(
        `Broadcast enviado para ${estimatedReach ?? '?'} destinatários!`,
        { duration: 6000 }
      )

      form.reset()
      setEstimatedReach(null)
    } catch (err: any) {
      toast.error(`Erro ao enviar broadcast: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass p-4 rounded-2xl flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent-purple/10 flex items-center justify-center">
          <Radio className="h-5 w-5 text-accent-purple" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Centro de Transmissão</h2>
          <p className="text-xs text-surface-400">Envie mensagens em massa para os usuários do aplicativo</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1-2: Composição */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-surface-300">Título da Mensagem</label>
            <input
              {...form.register('title')}
              placeholder="Ex: Nova promoção de Primavera!"
              className="w-full bg-surface-900 border border-surface-700 rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-surface-600 focus:outline-none focus:border-petala-500 transition-colors"
            />
            {form.formState.errors.title && (
              <p className="text-[10px] text-red-400">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-surface-300">Corpo da Mensagem</label>
            <textarea
              {...form.register('body')}
              rows={4}
              placeholder="Escreva a mensagem que todos receberão..."
              className="w-full bg-surface-900 border border-surface-700 rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-surface-600 focus:outline-none focus:border-petala-500 transition-colors resize-none"
            />
            {form.formState.errors.body && (
              <p className="text-[10px] text-red-400">{form.formState.errors.body.message}</p>
            )}
            <p className="text-[10px] text-surface-500 text-right">{form.watch('body')?.length || 0}/500</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-surface-300">URL de Ação (opcional)</label>
            <input
              {...form.register('action_url')}
              placeholder="petala://marketplace/promo/spring2026"
              className="w-full bg-surface-900 border border-surface-700 rounded-xl py-2.5 px-4 text-sm text-white font-mono placeholder:text-surface-600 focus:outline-none focus:border-petala-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-surface-300">Canal de Envio</label>
            <div className="flex gap-2">
              {CHANNEL_OPTIONS.map(ch => (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => form.setValue('channel', ch.value)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-medium border transition-all',
                    form.watch('channel') === ch.value
                      ? 'bg-petala-500/20 border-petala-500/50 text-petala-400'
                      : 'bg-surface-800 border-surface-700 text-surface-400 hover:border-surface-600'
                  )}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Col 3: Audiência e Envio */}
        <div className="glass rounded-2xl p-6 space-y-5 flex flex-col">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-surface-300">Destinatários</label>
            <div className="space-y-2">
              {AUDIENCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    form.setValue('target_audience', opt.value)
                    fetchReach(opt.value)
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left',
                    selectedAudience === opt.value
                      ? 'bg-surface-800 border-petala-500/50 shadow-sm'
                      : 'bg-surface-900 border-surface-700 hover:border-surface-600'
                  )}
                >
                  <opt.icon className={cn('h-5 w-5', opt.color)} />
                  <span className="text-sm font-medium text-white">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Estimated reach */}
          <div className="glass rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-surface-500 uppercase tracking-wider font-semibold">Alcance Estimado</p>
              {isFetchingReach ? (
                <div className="h-7 w-16 animate-skeleton rounded-lg bg-surface-800/50 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-white mt-0.5">
                  {estimatedReach !== null ? estimatedReach.toLocaleString('pt-BR') : '—'}
                </p>
              )}
            </div>
            <Users className="h-8 w-8 text-surface-700" />
          </div>

          <div className="flex-1" />

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full flex items-center justify-center gap-2 gradient-primary px-6 py-3 rounded-xl text-sm font-bold text-white shadow-glow hover:brightness-110 transition-all disabled:opacity-50"
          >
            {form.formState.isSubmitting ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar Broadcast
          </button>
        </div>
      </form>
    </div>
  )
}
