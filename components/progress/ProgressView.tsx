'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { IncomeEntry, Client } from '@/lib/types'
import { getIncomeEntries, getClients, exportAllData, importAllData } from '@/lib/storage'
import IncomeSection from './IncomeSection'
import ClientSection from './ClientSection'

export default function ProgressView() {
  const [income, setIncome] = useState<IncomeEntry[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'money' | 'clients'>('money')
  const [importMsg, setImportMsg] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(() => {
    setIncome(getIncomeEntries())
    setClients(getClients())
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Compute per-client revenue client-side (no DB join needed)
  const enrichedClients: Client[] = clients.map(c => ({
    ...c,
    total_revenue: income
      .filter(e => e.client === c.name)
      .reduce((sum, e) => sum + Number(e.amount), 0),
  }))

  const totalRevenue = income.reduce((s, e) => s + Number(e.amount), 0)
  const thisMonth = income.filter(e => {
    const d = new globalThis.Date(e.date + 'T00:00:00')
    const n = new globalThis.Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).reduce((s, e) => s + Number(e.amount), 0)
  const activeClients = clients.filter(c => c.status === 'Active').length

  const fmt = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })

  const handleExport = () => {
    exportAllData()
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const result = importAllData(ev.target?.result as string)
        refresh()
        const msg = `Imported — ${result.tasks} tasks, ${result.income} income entries, ${result.clients} clients`
        setImportMsg(msg)
        if (msgTimer.current) clearTimeout(msgTimer.current)
        msgTimer.current = setTimeout(() => setImportMsg(''), 5000)
      } catch {
        setImportMsg('Import failed — invalid file format')
        if (msgTimer.current) clearTimeout(msgTimer.current)
        msgTimer.current = setTimeout(() => setImportMsg(''), 4000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3" style={{ color: 'var(--cc-muted)' }}>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto w-full animate-fade-in">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--cc-text)' }}>Business Command</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--cc-muted)' }}>Revenue tracking and client relationships</p>
        </div>
        {/* Export / Import — unobtrusive data backup controls */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <button
            onClick={handleExport}
            className="btn-ghost px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all duration-200"
            title="Export all data as JSON"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
          <label
            className="btn-ghost px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all duration-200"
            title="Import data from JSON backup"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import
            <input
              ref={importRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {importMsg && (
        <div
          className="mb-6 px-4 py-2.5 rounded-xl text-sm animate-fade-in flex items-center gap-2"
          style={{
            background: importMsg.includes('failed') ? 'rgba(239,68,68,0.07)' : 'rgba(0,229,255,0.07)',
            border: `1px solid ${importMsg.includes('failed') ? 'rgba(239,68,68,0.18)' : 'rgba(0,229,255,0.18)'}`,
            color: importMsg.includes('failed') ? '#f87171' : 'var(--cc-cyan)',
          }}
        >
          <span>{importMsg.includes('failed') ? '⚠' : '✦'}</span>
          {importMsg}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Lifetime Revenue', value: fmt(totalRevenue), color: 'var(--cc-cyan)', rgb: '0,229,255' },
          { label: 'This Month', value: fmt(thisMonth), color: '#60a5fa', rgb: '96,165,250' },
          { label: 'Active Clients', value: String(activeClients), color: '#a78bfa', rgb: '167,139,250' },
        ].map(stat => (
          <div key={stat.label} className="glass-panel rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--cc-muted)' }}>
              {stat.label}
            </p>
            <p className="text-3xl font-bold leading-none"
              style={{ color: stat.color, textShadow: `0 0 24px rgba(${stat.rgb},0.35)` }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 glass-panel rounded-xl p-1 w-fit mb-6">
        {(['money', 'clients'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              background: tab === t ? 'rgba(0,229,255,0.1)' : 'transparent',
              color: tab === t ? 'var(--cc-cyan)' : 'var(--cc-muted)',
              border: tab === t ? '1px solid rgba(0,229,255,0.18)' : '1px solid transparent',
            }}
          >
            {t === 'money' ? 'Income' : 'Clients'}
          </button>
        ))}
      </div>

      {tab === 'money'
        ? <IncomeSection income={income} clients={enrichedClients} onRefresh={refresh} />
        : <ClientSection clients={enrichedClients} onRefresh={refresh} />
      }
    </div>
  )
}
