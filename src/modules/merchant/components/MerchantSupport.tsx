/**
 * MerchantSupport — Central de Relacionamento Q&A.
 *
 * Permite ao vendedor visualizar e responder perguntas dos clientes
 * em tempo real, com Supabase Realtime e audit logging.
 */
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { merchantRepository } from '@/repositories/merchantRepository'
import { useStoreContext } from '@/modules/merchant/hooks/useStoreContext'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useAuditLog } from '@/hooks/useAuditLog'
import { supabase } from '@/integrations/supabase/client'
import { QACardSkeleton } from '@/components/Skeleton'
import { toast } from 'sonner'
import { cn, formatRelativeDate } from '@/lib/utils'
import type { ProductQuestion } from '@/shared/types'
import {
  MessageCircleQuestion,
  Send,
  CheckCircle,
  Clock,
  Filter,
  ShieldCheck,
  ThumbsUp,
  Search,
  Inbox,
} from 'lucide-react'

type QAFilter = 'all' | 'pending' | 'answered'

export function MerchantSupport() {
  const { storeId, storeName } = useStoreContext()
  const { profile } = useAuth()
  const { log } = useAuditLog()
  const queryClient = useQueryClient()

  const [filter, setFilter] = useState<QAFilter>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSending, setIsSending] = useState(false)

  // ─── Fetch questions ───────────────────────────────────────────────────
  const { data: questions = [], isLoading } = useQuery<ProductQuestion[]>({
    queryKey: ['merchant-questions', storeId, filter],
    queryFn: () => merchantRepository.getQuestions(storeId, filter),
    enabled: !!storeId,
    staleTime: 30_000,
  })

  // ─── Realtime subscription ─────────────────────────────────────────────
  useEffect(() => {
    if (!storeId) return

    const channel = supabase
      .channel(`qa-merchant-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_questions',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          // Invalidate all Q&A queries on any change
          queryClient.invalidateQueries({ queryKey: ['merchant-questions'] })
          queryClient.invalidateQueries({ queryKey: ['merchant-unanswered-count'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId, queryClient])

  // ─── Local search filter ───────────────────────────────────────────────
  const filteredQuestions = useMemo(() => {
    if (!searchTerm) return questions
    const lower = searchTerm.toLowerCase()
    return questions.filter(
      (q) =>
        q.question.toLowerCase().includes(lower) ||
        q.product_name?.toLowerCase().includes(lower) ||
        q.asker_name?.toLowerCase().includes(lower)
    )
  }, [questions, searchTerm])

  // ─── Answer handler ────────────────────────────────────────────────────
  const handleAnswer = async (questionId: string) => {
    if (!storeId || !replyText.trim()) return

    setIsSending(true)
    try {
      const answererName = storeName || profile?.full_name || 'Loja'
      await merchantRepository.answerQuestion(storeId, questionId, replyText.trim(), answererName)

      // Audit log
      await log({
        action: 'qa_answer',
        table_name: 'product_questions',
        record_key: questionId,
        old_value: null,
        new_value: replyText.trim(),
        entity: 'product_questions',
        store_id: storeId,
      })

      toast.success('Resposta enviada com sucesso!')
      setReplyingTo(null)
      setReplyText('')
      queryClient.invalidateQueries({ queryKey: ['merchant-questions'] })
      queryClient.invalidateQueries({ queryKey: ['merchant-unanswered-count'] })
    } catch (err: any) {
      console.error(err)
      toast.error(`Erro ao responder: ${err?.message || 'Desconhecido'}`)
    } finally {
      setIsSending(false)
    }
  }

  // ─── Stats ─────────────────────────────────────────────────────────────
  const pendingCount = questions.filter((q) => !q.answer).length
  const answeredCount = questions.filter((q) => !!q.answer).length

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass p-4 rounded-2xl min-h-[72px]">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Buscar pergunta, produto ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-900/50 border border-surface-700 rounded-xl py-2 px-4 pl-10 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-petala-500 transition-all"
          />
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-surface-500" />
        </div>

        <div className="flex items-center gap-1 bg-surface-800/50 p-1 rounded-xl">
          {([
            { key: 'pending', label: 'Pendentes', count: pendingCount },
            { key: 'answered', label: 'Respondidas', count: answeredCount },
            { key: 'all', label: 'Todas', count: questions.length },
          ] as { key: QAFilter; label: string; count: number }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                filter === tab.key
                  ? 'bg-surface-800 text-white shadow-sm'
                  : 'text-surface-400 hover:text-white'
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    filter === tab.key && tab.key === 'pending'
                      ? 'bg-accent-amber/20 text-accent-amber'
                      : 'bg-surface-700/50 text-surface-400'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <QACardSkeleton key={i} />
          ))}
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center animate-fade-in">
          <div className="h-16 w-16 rounded-2xl bg-surface-800/50 flex items-center justify-center mb-4">
            <Inbox className="h-8 w-8 text-surface-500" />
          </div>
          <p className="text-lg font-bold text-white">
            {filter === 'pending' ? 'Nenhuma pergunta pendente' : 'Nenhuma pergunta encontrada'}
          </p>
          <p className="text-sm text-surface-400 mt-1">
            {filter === 'pending'
              ? 'Todas as perguntas dos clientes foram respondidas 🎉'
              : 'Tente ajustar o filtro ou a busca'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {filteredQuestions.map((q) => (
            <div
              key={q.id}
              className={cn(
                'glass rounded-2xl overflow-hidden transition-all',
                !q.answer && 'ring-1 ring-accent-amber/20'
              )}
            >
              {/* Question Header */}
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Product image */}
                  <div className="flex-shrink-0">
                    {q.product_image ? (
                      <img
                        src={q.product_image}
                        alt=""
                        className="h-12 w-12 rounded-xl object-cover border border-surface-700"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-surface-800 border border-surface-700 flex items-center justify-center">
                        <MessageCircleQuestion className="h-5 w-5 text-surface-500" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold text-surface-300 uppercase tracking-wider truncate max-w-[200px]">
                        {q.product_name}
                      </span>
                      {!q.answer && (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-accent-amber/10 text-accent-amber px-2 py-0.5 rounded-full">
                          <Clock className="h-3 w-3" />
                          Pendente
                        </span>
                      )}
                      {q.answer && (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-petala-500/10 text-petala-400 px-2 py-0.5 rounded-full">
                          <CheckCircle className="h-3 w-3" />
                          Respondida
                        </span>
                      )}
                    </div>

                    {/* Asker info */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-full bg-accent-blue/20 flex items-center justify-center text-[10px] font-bold text-accent-blue">
                        {q.asker_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="text-sm font-medium text-white">
                        {q.asker_name || 'Comprador'}
                      </span>
                      {q.is_verified_buyer && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-petala-400 bg-petala-500/10 rounded-full px-1.5 py-0.5">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          Verificado
                        </span>
                      )}
                      <span className="text-[10px] text-surface-500 ml-auto">
                        {formatRelativeDate(q.created_at)}
                      </span>
                    </div>

                    {/* Question text */}
                    <p className="text-sm text-surface-200 leading-relaxed">{q.question}</p>

                    {/* Votes */}
                    {q.votes > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-[11px] text-surface-400">
                        <ThumbsUp className="h-3 w-3" />
                        {q.votes} {q.votes === 1 ? 'pessoa achou útil' : 'pessoas acharam útil'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Answer section */}
              {q.answer ? (
                <div className="px-5 pb-5">
                  <div className="bg-petala-500/5 border border-petala-500/15 rounded-xl p-4 ml-16">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-5 w-5 rounded-full gradient-primary flex items-center justify-center">
                        <span className="text-[8px] font-black text-white">🌿</span>
                      </div>
                      <span className="text-xs font-bold text-petala-400">
                        {q.answerer_name || storeName || 'Loja'}
                      </span>
                      {q.answered_at && (
                        <span className="text-[10px] text-surface-500 ml-auto">
                          {formatRelativeDate(q.answered_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-surface-200 leading-relaxed pl-7">
                      {q.answer}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="px-5 pb-5">
                  {replyingTo === q.id ? (
                    <div className="ml-16 space-y-3 animate-fade-in">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Digite sua resposta para o cliente..."
                        rows={3}
                        autoFocus
                        maxLength={500}
                        className="w-full bg-surface-900 border border-surface-700 rounded-xl py-3 px-4 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-petala-500 focus:ring-1 focus:ring-petala-500 transition-all resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-surface-500">
                          {replyText.length}/500
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setReplyingTo(null)
                              setReplyText('')
                            }}
                            className="text-xs font-medium text-surface-400 hover:text-white transition-colors px-3 py-1.5"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleAnswer(q.id)}
                            disabled={isSending || !replyText.trim()}
                            className="flex items-center gap-1.5 gradient-primary px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-glow hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSending ? (
                              <div className="h-3.5 w-3.5 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            Enviar Resposta
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(q.id)}
                      className="ml-16 flex items-center gap-2 text-xs font-semibold text-petala-400 hover:text-petala-300 bg-petala-500/5 hover:bg-petala-500/10 border border-petala-500/20 rounded-xl px-4 py-2 transition-all"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Responder
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
