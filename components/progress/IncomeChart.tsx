'use client'

import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { IncomeEntry } from '@/lib/types'

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-panel rounded-xl px-4 py-3 text-sm">
      <p className="text-xs mb-1" style={{ color: 'var(--cc-muted)' }}>{label}</p>
      <p className="font-bold" style={{ color: 'var(--cc-cyan)' }}>
        ${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
      </p>
    </div>
  )
}

export default function IncomeChart({ income }: { income: IncomeEntry[] }) {
  const data = useMemo(() => {
    const byMonth: Record<string, number> = {}
    income.forEach(e => {
      const d = new globalThis.Date(e.date + 'T00:00:00')
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      byMonth[key] = (byMonth[key] || 0) + Number(e.amount)
    })
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, amount]) => {
        const [yr, mo] = key.split('-')
        const d = new globalThis.Date(Number(yr), Number(mo) - 1)
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        return { label, amount }
      })
  }, [income])

  if (!data.length) {
    return (
      <div className="glass-panel rounded-2xl p-6 flex items-center justify-center" style={{ height: 180 }}>
        <p className="text-sm" style={{ color: 'var(--cc-muted)' }}>
          Income chart appears as you log entries
        </p>
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-2xl p-6">
      <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--cc-text)' }}>Income Over Time</h3>
      <ResponsiveContainer width="100%" height={210}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#00e5ff" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" stroke="rgba(26,48,80,0.45)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#4a6585', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#4a6585', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,229,255,0.15)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#00e5ff"
            strokeWidth={2}
            fill="url(#incomeGrad)"
            dot={{ fill: '#00e5ff', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#00e5ff', style: { filter: 'drop-shadow(0 0 6px rgba(0,229,255,0.8))' } }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
