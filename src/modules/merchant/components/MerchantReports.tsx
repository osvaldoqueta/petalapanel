/**
 * MerchantReports — Central de relatórios para lojistas.
 * Agendamento de PDFs semanais e geração de PDF de Vendas do Dia sob demanda.
 */
import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { merchantRepository } from '@/repositories/merchantRepository'
import { useStoreContext } from '@/modules/merchant/context/StoreContext'
import { useAuditLog } from '@/hooks/useAuditLog'
import { formatCurrency } from '@/lib/utils'
import { ReportSkeleton } from '@/components/Skeleton'
import { toast } from 'sonner'
import { FileText, Calendar, Clock, Download, CheckCircle, Save } from 'lucide-react'

// Schema para o formulário de agendamento
const scheduleSchema = z.object({
  days_of_week: z.array(z.string()).min(1, 'Selecione pelo menos um dia da semana'),
  time_of_day: z.string().min(1, 'Selecione um horário'),
  is_active: z.boolean(),
})

type ScheduleFormValues = z.infer<typeof scheduleSchema>

const DAYS_OPTIONS = [
  { value: '1', label: 'Segunda' },
  { value: '2', label: 'Terça' },
  { value: '3', label: 'Quarta' },
  { value: '4', label: 'Quinta' },
  { value: '5', label: 'Sexta' },
  { value: '6', label: 'Sábado' },
  { value: '0', label: 'Domingo' },
]

export function MerchantReports() {
  const { storeId } = useStoreContext()
  const { log } = useAuditLog()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])

  // Busca agendamento existente
  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['merchant-report-schedule', storeId],
    queryFn: () => merchantRepository.getReportSchedule(storeId!),
    enabled: !!storeId,
  })

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      days_of_week: [],
      time_of_day: '08:00',
      is_active: true,
    },
    values: schedule ? {
      days_of_week: schedule.days_of_week,
      time_of_day: schedule.time_of_day?.substring(0, 5) || '08:00',
      is_active: schedule.is_active,
    } : undefined
  })

  const onSaveSchedule = async (data: ScheduleFormValues) => {
    if (!storeId) return
    try {
      await merchantRepository.upsertReportSchedule(storeId, data)
      await log({
        action: 'upsert_schedule',
        table_name: 'report_schedules',
        record_key: storeId,
        old_value: schedule ? JSON.stringify(schedule) : null,
        new_value: JSON.stringify(data),
        entity: 'report_schedules',
        store_id: storeId
      })
      toast.success('Agendamento salvo com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['merchant-report-schedule', storeId] })
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar agendamento')
    }
  }

  const generatePDF = async () => {
    if (!storeId) return
    setIsGenerating(true)

    try {
      // 1. Fetch data
      const orders = await merchantRepository.getOrdersForReport(storeId, reportDate)
      
      if (orders.length === 0) {
        toast.error(`Nenhuma venda paga encontrada para o dia ${reportDate.split('-').reverse().join('/')}.`)
        setIsGenerating(false)
        return
      }

      const gtv = orders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0)
      const ticketMedio = gtv / orders.length

      // 2. Generate PDF via transition (Zero INP)
      startTransition(() => {
        const doc = new jsPDF()
        const dataFormatada = reportDate.split('-').reverse().join('/')
        
        // Header
        doc.setFontSize(22)
        doc.setTextColor(16, 185, 129) // Emerald-500
        doc.text('Pétala Marketplace', 14, 20)
        
        doc.setFontSize(16)
        doc.setTextColor(40)
        doc.text(`Relatório de Vendas do Dia`, 14, 30)
        
        doc.setFontSize(11)
        doc.setTextColor(100)
        doc.text(`Data: ${dataFormatada}`, 14, 38)
        doc.text(`Total de Pedidos: ${orders.length}`, 14, 44)
        doc.text(`GTV Bruto: ${formatCurrency(gtv)}`, 14, 50)
        doc.text(`Ticket Médio: ${formatCurrency(ticketMedio)}`, 14, 56)

        // Tabela de Pedidos
        const tableColumn = ["ID do Pedido", "Horário", "Status", "Valor (R$)"]
        const tableRows = orders.map(order => [
          order.id.split('-')[0], // Short ID
          new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          order.status,
          Number(order.total_amount).toFixed(2)
        ])

        // @ts-ignore - jspdf-autotable plugin augmentation
        doc.autoTable({
          startY: 65,
          head: [tableColumn],
          body: tableRows,
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] },
          styles: { fontSize: 9 }
        })

        // Download
        doc.save(`Relatorio_Vendas_${reportDate}.pdf`)
        
        toast.success('Relatório gerado e baixado com sucesso!')
        
        // Audit log
        log({
          action: 'generate_pdf',
          table_name: 'orders',
          record_key: `date:${reportDate}`,
          old_value: null,
          new_value: `Pedidos exportados: ${orders.length}, GTV: ${gtv}`,
          entity: 'report_pdf',
          store_id: storeId
        })
      })
    } catch (err: any) {
      toast.error('Erro ao gerar relatório: ' + err.message)
    } finally {
      // Small delay to let transition finish
      setTimeout(() => setIsGenerating(false), 500)
    }
  }

  if (scheduleLoading) {
    return <ReportSkeleton />
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Col 1: Configuração de Agendamento */}
      <div className="glass rounded-2xl p-6 space-y-6 flex flex-col">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-petala-500/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-petala-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Agendamento</h3>
            <p className="text-xs text-surface-400 mt-0.5">Receba relatórios consolidados por email</p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSaveSchedule)} className="space-y-5 flex-1">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-surface-300">Dias da Semana</label>
            <Controller
              control={form.control}
              name="days_of_week"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {DAYS_OPTIONS.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        const cur = field.value || []
                        const next = cur.includes(day.value)
                          ? cur.filter(d => d !== day.value)
                          : [...cur, day.value]
                        field.onChange(next)
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        field.value?.includes(day.value)
                          ? 'bg-petala-500/20 border-petala-500/50 text-petala-400'
                          : 'bg-surface-800 border-surface-700 text-surface-400 hover:border-surface-600'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              )}
            />
            {form.formState.errors.days_of_week && (
              <p className="text-[10px] text-red-400 mt-1">{form.formState.errors.days_of_week.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-surface-300">Horário de Envio</label>
            <div className="relative max-w-xs">
              <Clock className="absolute left-3 top-2.5 h-4 w-4 text-surface-500" />
              <input
                type="time"
                {...form.register('time_of_day')}
                className="w-full bg-surface-900 border border-surface-700 rounded-xl py-2 px-4 pl-10 text-sm text-white focus:outline-none focus:border-petala-500"
              />
            </div>
            {form.formState.errors.time_of_day && (
              <p className="text-[10px] text-red-400 mt-1">{form.formState.errors.time_of_day.message}</p>
            )}
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-surface-800/50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...form.register('is_active')} className="accent-petala-500" />
              <span className="text-sm text-surface-300">Agendamento Ativo</span>
            </label>
            
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="flex items-center gap-2 gradient-primary px-5 py-2 rounded-xl text-sm font-bold text-white shadow-glow hover:brightness-110 transition-all disabled:opacity-50"
            >
              {form.formState.isSubmitting ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar
            </button>
          </div>
        </form>
      </div>

      {/* Col 2: Exportação sob demanda */}
      <div className="glass rounded-2xl p-6 space-y-6 flex flex-col">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-accent-blue" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Vendas do Dia</h3>
            <p className="text-xs text-surface-400 mt-0.5">Gerar relatório consolidado em PDF</p>
          </div>
        </div>

        <div className="space-y-4 flex-1 flex flex-col justify-center">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-surface-300">Data Base</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full bg-surface-900 border border-surface-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-petala-500"
            />
          </div>

          <div className="p-4 bg-accent-blue/5 border border-accent-blue/10 rounded-xl">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-accent-blue" />
              O que está incluído?
            </h4>
            <ul className="text-xs text-surface-400 space-y-1 ml-6 list-disc">
              <li>GTV Bruto do período selecionado</li>
              <li>Cálculo de Ticket Médio</li>
              <li>Lista detalhada de pedidos pagos (`payment_status = 'paid'`)</li>
              <li>Total e Status individual</li>
            </ul>
          </div>
        </div>

        <div className="pt-4 flex justify-end border-t border-surface-800/50">
          <button
            onClick={generatePDF}
            disabled={isGenerating || isPending}
            className="flex items-center gap-2 bg-surface-800 hover:bg-surface-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            {isGenerating || isPending ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="h-4 w-4 text-accent-blue" />
            )}
            Gerar Agora
          </button>
        </div>
      </div>

    </div>
  )
}
