import { AlertTriangle, Trash2 } from 'lucide-react'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  isDeleting?: boolean
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  isDeleting = false
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 bg-surface-950/80 backdrop-blur-sm z-[100]" 
        onClick={onCancel}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-[110] p-4">
        <div className="glass rounded-3xl p-6 shadow-2xl bg-surface-900 border border-surface-700/50 flex flex-col items-center text-center animate-slide-up">
          <div className="h-14 w-14 rounded-full bg-accent-rose/10 flex items-center justify-center mb-4">
            <Trash2 className="h-6 w-6 text-accent-rose" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-sm text-surface-400 mb-8">{description}</p>
          
          <div className="flex w-full gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-surface-800 hover:bg-surface-700 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-accent-rose hover:brightness-110 shadow-glow shadow-accent-rose/20 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isDeleting ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Excluir'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
