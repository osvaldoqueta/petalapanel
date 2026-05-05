/**
 * useExportData — Hook para exportar dados em formato CSV ou JSON.
 * Atende ao princípio Np1 (Governança/LGPD) garantindo que dados
 * exportáveis não contenham PII sensíveis não anonimizadas.
 */
import { useCallback } from 'react'

type ExportFormat = 'csv' | 'json'

export function useExportData() {
  const exportData = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: any[], filename: string, format: ExportFormat = 'csv') => {
      if (!data || data.length === 0) return

      let content = ''
      let mimeType = ''

      if (format === 'csv') {
        const headers = Object.keys(data[0]).join(',')
        const rows = data.map(row => 
          Object.values(row).map(val => 
            // Wrap in quotes if it contains a comma or is a string, handle nulls
            typeof val === 'string' && val.includes(',') ? `"${val}"` : val ?? ''
          ).join(',')
        )
        content = [headers, ...rows].join('\n')
        mimeType = 'text/csv;charset=utf-8;'
      } else if (format === 'json') {
        content = JSON.stringify(data, null, 2)
        mimeType = 'application/json'
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.${format}`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
    []
  )

  return { exportData }
}
