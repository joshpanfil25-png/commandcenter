'use client'

import { useState, useCallback } from 'react'
import type { Client, ClientStatus } from '@/lib/types'
import { addClient, updateClient, removeClient } from '@/lib/storage'

interface Props { clients: Client[]; onRefresh: () => void }

interface FormState { name: string; status: ClientStatus; rate: string; notes: string }

const blankForm = (): FormState => ({ name: '', status: 'Active', rate: '', notes: '' })

export default function ClientSection({ clients, onRefresh }: Props) {
  const [form, setForm] = useState<FormState>(blankForm)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(blankForm)

  const submit = useCallback(() => {
    if (!form.name.trim()) return
    setSaving(true)
    addClient({ name: form.name, status: form.status, rate: form.rate || null, notes: form.notes || null })
    setForm(blankForm())
    setShowForm(false)
    setSaving(false)
    onRefresh()
  }, [form, onRefresh])

  const saveEdit = useCallback(() => {
    if (!editId) return
    updateClient(editId, { name: editForm.name, status: editForm.status, rate: editForm.rate || null, notes: editForm.notes || null })
    setEditId(null)
    onRefresh()
  }, [editId, editForm, onRefresh])

  const del = useCallback((id: string) => {
    removeClient(id)
    onRefresh()
  }, [onRefresh])

  const pillClass: Record<ClientStatus, string> = {
    Active: 'pill-active',
    Paused: 'pill-paused',
    Done: 'pill-done',
  }

  const fmt = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })

  const FormFields = ({ val, onChange }: { val: FormState; onChange: (v: FormState) => void }) => (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1.5 col-span-2">
        <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--cc-muted)' }}>Client Name</label>
        <input value={val.name} onChange={e => onChange({ ...val, name: e.target.value })}
          className="cc-input px-3 py-2 rounded-xl text-sm" placeholder="e.g. Northbrook Roofing"
          onKeyDown={e => { if (e.key === 'Enter' && val.name.trim()) submit() }} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--cc-muted)' }}>Status</label>
        <select value={val.status} onChange={e => onChange({ ...val, status: e.target.value as ClientStatus })}
          className="cc-input px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(10,22,40,0.8)' }}>
          <option>Active</option>
          <option>Paused</option>
          <option>Done</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--cc-muted)' }}>Rate / Deal Value</label>
        <input value={val.rate} onChange={e => onChange({ ...val, rate: e.target.value })}
          className="cc-input px-3 py-2 rounded-xl text-sm" placeholder="e.g. $2,500/mo" />
      </div>
      <div className="flex flex-col gap-1.5 col-span-2">
        <label className="text-xs uppercase tracking-widest" style={{ color: 'var(--cc-muted)' }}>Notes</label>
        <textarea value={val.notes} onChange={e => onChange({ ...val, notes: e.target.value })}
          className="cc-input px-3 py-2 rounded-xl text-sm resize-none" rows={2}
          placeholder="Context, next steps, anything important..." />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold" style={{ color: 'var(--cc-text)' }}>Clients</h2>
        <button onClick={() => setShowForm(s => !s)}
          className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Client
        </button>
      </div>

      {showForm && (
        <div className="glass-panel rounded-2xl p-5 animate-slide-up">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--cc-cyan)' }}>New Client</h3>
          <FormFields val={form} onChange={setForm} />
          <div className="flex gap-3 mt-4">
            <button onClick={submit} disabled={saving || !form.name.trim()}
              className="btn-primary px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40">
              {saving ? 'Saving...' : 'Add Client'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost px-5 py-2.5 rounded-xl text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {clients.map(client => (
          <div key={client.id} className="glass-panel rounded-2xl p-5 group transition-all duration-200 hover:border-[rgba(0,229,255,0.12)]">
            {editId === client.id ? (
              <div>
                <FormFields val={editForm} onChange={setEditForm} />
                <div className="flex gap-3 mt-4">
                  <button onClick={saveEdit} className="btn-primary px-5 py-2.5 rounded-xl text-sm">Save</button>
                  <button onClick={() => setEditId(null)} className="btn-ghost px-5 py-2.5 rounded-xl text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold text-base" style={{ color: 'var(--cc-text)' }}>{client.name}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${pillClass[client.status]}`}>
                      {client.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    {client.rate && (
                      <span className="text-sm" style={{ color: 'var(--cc-muted)' }}>{client.rate}</span>
                    )}
                    {(client.total_revenue || 0) > 0 && (
                      <span className="text-sm font-semibold" style={{ color: 'var(--cc-cyan)' }}>
                        {fmt(client.total_revenue || 0)} total
                      </span>
                    )}
                  </div>
                  {client.notes && (
                    <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--cc-muted)' }}>{client.notes}</p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => { setEditId(client.id); setEditForm({ name: client.name, status: client.status, rate: client.rate || '', notes: client.notes || '' }) }}
                    className="p-2 btn-ghost rounded-xl">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button onClick={() => del(client.id)}
                    className="p-2 rounded-xl transition-colors hover:text-red-400"
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
        {clients.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--cc-muted)' }}>
            No clients yet. Add your first one above.
          </div>
        )}
      </div>
    </div>
  )
}
