'use client'

import { useState, useCallback } from 'react'
import type { IncomeEntry, Client } from '@/lib/types'
import { addIncomeEntry, updateIncomeEntry, removeIncomeEntry } from '@/lib/storage'
import IncomeChart from './IncomeChart'

interface Props {
  income: IncomeEntry[]
  clients: Client[]
  onRefresh: () => void
}

interface FormState {
  amount: string
  client: string
  date: string
  note: string
}

function blankForm(): FormState {
  const today = new Intl.DateTimeFormat('sv').format(new globalThis.Date())
  return { amount: '', client: '', date: today, note: '' }
}

export default function IncomeSection({ income, clients, onRefresh }: Props) {
  const [form, setForm] = useState<FormState>(blankForm)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(blankForm)
  const [showForm, setShowForm] = useState(false)

  const submit = useCallback(() => {
    if (!form.amount || !form.date) return
    setSaving(true)
    addIncomeEntry({
      amount: parseFloat(form.amount),
      client: form.client || null,
      date: form.date,
      note: form.note || null,
    })
    setForm(blankForm())
    setShowForm(false)
    setSaving(false)
    onRefresh()
  }, [form, onRefresh])

  const saveEdit = useCallback(() => {
    if (!editId) return
    updateIncomeEntry(editId, {
      amount: parseFloat(editForm.amount),
      client: editForm.client || null,
      date: editForm.date,
      note: editForm.note || null,
    })
    setEditId(null)
    onRefresh()
  }, [editId, editForm, onRefresh])

  const del = useCallback((id: string) => {
    removeIncomeEntry(id)
    onRefresh()
  }, [onRefresh])

  const fmt = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const fmtDate = (d: string) =>
    new globalThis.Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--cc-muted)' }}>{label}</label>
      {children}
    </div>
  )

  const FormFields = ({ val, onChange }: { val: FormState; onChange: (v: FormState) => void }) => (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Amount ($)">
        <input type="number" step="0.01" placeholder="0.00" value={val.amount}
          onChange={e => onChange({ ...val, amount: e.target.value })}
          className="cc-input px-3 py-2 rounded-xl text-sm w-full" />
      </Field>
      <Field label="Date">
        <input type="date" value={val.date} onChange={e => onChange({ ...val, date: e.target.value })}
          className="cc-input px-3 py-2 rounded-xl text-sm w-full" />
      </Field>
      <Field label="Client">
        <select
          value={val.client}
          onChange={e => onChange({ ...val, client: e.target.value })}
          className="cc-input px-3 py-2 rounded-xl text-sm w-full"
          style={{ background: 'rgba(10,22,40,0.8)' }}
        >
          <option value="">— No client —</option>
          {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Note">
        <input type="text" placeholder="Optional note" value={val.note}
          onChange={e => onChange({ ...val, note: e.target.value })}
          className="cc-input px-3 py-2 rounded-xl text-sm w-full" />
      </Field>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <IncomeChart income={income} />

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold" style={{ color: 'var(--cc-text)' }}>Income Entries</h2>
        <button onClick={() => setShowForm(s => !s)}
          className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Log Income
        </button>
      </div>

      {showForm && (
        <div className="glass-panel rounded-2xl p-5 animate-slide-up">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--cc-cyan)' }}>New Income Entry</h3>
          <FormFields val={form} onChange={setForm} />
          <div className="flex gap-3 mt-4">
            <button onClick={submit} disabled={saving || !form.amount}
              className="btn-primary px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40">
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost px-5 py-2.5 rounded-xl text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {income.map(entry => (
          <div key={entry.id} className="glass-panel-light rounded-xl p-4 group">
            {editId === entry.id ? (
              <div>
                <FormFields val={editForm} onChange={setEditForm} />
                <div className="flex gap-3 mt-4">
                  <button onClick={saveEdit} className="btn-primary px-4 py-2 rounded-xl text-sm">Save</button>
                  <button onClick={() => setEditId(null)} className="btn-ghost px-4 py-2 rounded-xl text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-xl font-bold" style={{ color: 'var(--cc-cyan)', textShadow: '0 0 12px rgba(0,229,255,0.3)' }}>
                    {fmt(Number(entry.amount))}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.client && (
                      <span className="pill-tag text-xs px-2.5 py-0.5 rounded-full">{entry.client}</span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--cc-muted)' }}>{fmtDate(entry.date)}</span>
                    {entry.note && (
                      <span className="text-xs" style={{ color: 'var(--cc-muted)' }}>· {entry.note}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => {
                      setEditId(entry.id)
                      setEditForm({ amount: String(entry.amount), client: entry.client || '', date: entry.date, note: entry.note || '' })
                    }}
                    className="p-1.5 btn-ghost rounded-lg">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button onClick={() => del(entry.id)}
                    className="p-1.5 rounded-lg transition-colors hover:text-red-400"
                    style={{ color: 'var(--cc-muted)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {income.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--cc-muted)' }}>
            No income entries yet. Log your first one above.
          </div>
        )}
      </div>
    </div>
  )
}
