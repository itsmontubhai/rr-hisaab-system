'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { getDescendantTradingIds } from '../../lib/calculate'
import { postDraftToLedger } from '../../lib/ledgerActions'

export default function SummaryPage() {
  const [entities, setEntities] = useState([])
  const [percentHistory, setPercentHistory] = useState([])
  const [partnerAllocations, setPartnerAllocations] = useState([])
  const [partners, setPartners] = useState([])
  const [weeklyPnl, setWeeklyPnl] = useState([])
  const [weekDate, setWeekDate] = useState(new Date().toISOString().slice(0, 10))
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState('')

  async function loadAll() {
    const { data: e } = await supabase.from('entities').select('*')
    const { data: h } = await supabase.from('entity_percentage_history').select('*')
    const { data: pa } = await supabase.from('partner_allocations').select('*')
    const { data: p } = await supabase.from('partners').select('*')
    const { data: w } = await supabase.from('weekly_pnl').select('*')
    setEntities(e || [])
    setPercentHistory(h || [])
    setPartnerAllocations(pa || [])
    setPartners(p || [])
    setWeeklyPnl(w || [])
  }

  useEffect(() => { loadAll() }, [])

  const groups = useMemo(() => {
    const brokerGroups = entities.filter((e) => e.type === 'broker_group').map((e) => ({ ...e, kind: 'BROKER' }))
    const standaloneIds = entities.filter((e) => {
      if (e.type !== 'trading_id') return false
      const parent = entities.find((p) => p.id === e.parent_id)
      return parent && parent.type === 'master'
    }).map((e) => ({ ...e, kind: 'CLIENT' }))

    return [...brokerGroups, ...standaloneIds].map((g) => {
      const tradingIds = g.type === 'trading_id' ? [g] : getDescendantTradingIds(g.id, entities)
      const rows = tradingIds.map((t) => {
        const pnl = weeklyPnl.find((w) => w.entity_id === t.id && w.week_date === weekDate)
        const amount = pnl ? parseFloat(pnl.amount) : 0
        const pctMatch = percentHistory.find((h) => h.entity_id === t.id && !h.effective_to)
        const pct = pctMatch ? parseFloat(pctMatch.percentage) : 0
        const final = (amount * pct) / 100
        return { entity: t, draft: pnl, amount, pct, final }
      })
      const totalPnl = rows.reduce((s, r) => s + r.amount, 0)
      const net = rows.reduce((s, r) => s + r.final, 0)
      const allAdded = rows.length > 0 && rows.every((r) => r.draft && r.draft.status === 'added_to_ledger')
      return { ...g, tradingIds, rows, totalPnl, net, allAdded }
    })
  }, [entities, weeklyPnl, percentHistory, weekDate])

  async function handleAddToLedger(group) {
    setBusyId(group.id)
    setMessage('')
    for (const row of group.rows) {
      if (row.draft && row.draft.status === 'draft') {
        await postDraftToLedger(supabase, { ...row.draft, entity: row.entity }, weekDate, entities, percentHistory, partnerAllocations, partners)
      }
    }
    setMessage(group.name + ' — sab ledger mein add ho gaya')
    setBusyId(null)
    loadAll()
  }

  function handleView(group) {
    window.open(`/broker-report?group=${group.id}&date=${weekDate}`, '_blank')
  }

  function handlePdf(group) {
    window.open(`/broker-report?group=${group.id}&date=${weekDate}&print=1`, '_blank')
  }

  function handleCopy(group) {
    window.open(`/broker-report?group=${group.id}&date=${weekDate}&copy=1`, '_blank')
  }

  return (
    <main>
      <h1 className="page-title">Broker / Client Summary</h1>
      <p className="page-subtitle">Sab brokers aur single clients ek nazar mein</p>

      <div className="card no-print">
        <div className="field" style={{ maxWidth: 220 }}>
          <label>Date</label>
          <input type="date" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} />
        </div>
        {message && <div className="msg ok">{message}</div>}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {groups.length === 0 && <div className="empty-state" style={{ padding: 18 }}>Koi Broker Group ya Single Client nahi mila.</div>}
        {groups.map((g) => (
          <div className="summary-row" key={g.id}>
            <span className="summary-name">{g.name}</span>
            <span className="summary-type">{g.kind}</span>
            <span className="summary-meta">{g.tradingIds.length} IDs</span>
            <span className="summary-meta">100% P/L: {g.totalPnl.toLocaleString('en-IN')}</span>
            <span className={`summary-net ${g.net >= 0 ? 'amt-pos' : 'amt-neg'}`}>NET: {g.net.toLocaleString('en-IN')}</span>
            <span className="summary-actions">
              <button className="btn-sm" onClick={() => handleView(g)}>VIEW</button>
              <button className="btn-sm" onClick={() => handleCopy(g)}>COPY IMAGE</button>
              <button className="btn-sm" onClick={() => handlePdf(g)}>PDF</button>
              <button
                className="btn-sm primary"
                disabled={busyId === g.id || g.allAdded || g.rows.length === 0}
                onClick={() => handleAddToLedger(g)}
              >
                {g.allAdded ? 'ADDED' : busyId === g.id ? 'ADDING...' : 'ADD TO LEDGER'}
              </button>
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}
