'use client'

import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { getDescendantTradingIds } from '../../lib/calculate'

function BrokerReportInner() {
  const searchParams = useSearchParams()
  const reportRef = useRef(null)

  const [entities, setEntities] = useState([])
  const [percentHistory, setPercentHistory] = useState([])
  const [weeklyPnl, setWeeklyPnl] = useState([])
  const [groupId, setGroupId] = useState(searchParams.get('group') || '')
  const [weekDate, setWeekDate] = useState(searchParams.get('date') || new Date().toISOString().slice(0, 10))
  const [copyStatus, setCopyStatus] = useState('')

  useEffect(() => {
    async function load() {
      const { data: e } = await supabase.from('entities').select('*')
      const { data: h } = await supabase.from('entity_percentage_history').select('*')
      const { data: w } = await supabase.from('weekly_pnl').select('*')
      setEntities(e || [])
      setPercentHistory(h || [])
      setWeeklyPnl(w || [])
    }
    load()
  }, [])

  const groupOptions = entities.filter((e) => e.type === 'master' || e.type === 'broker_group')

  const rows = useMemo(() => {
    if (!groupId) return []
    const entity = entities.find((e) => e.id === groupId)
    const tradingIds = entity?.type === 'trading_id' ? [entity] : getDescendantTradingIds(groupId, entities)
    return tradingIds.map((t, i) => {
      const pnlRow = weeklyPnl.find((w) => w.entity_id === t.id && w.week_date === weekDate)
      const amount = pnlRow ? parseFloat(pnlRow.amount) : 0
      const pctMatch = percentHistory.find((h) => h.entity_id === t.id && !h.effective_to)
      const pct = pctMatch ? parseFloat(pctMatch.percentage) : 0
      const finalAmount = (amount * pct) / 100
      return { sr: i + 1, idNumber: t.id_number, idName: t.name, amount, pct, finalAmount }
    })
  }, [groupId, weekDate, entities, weeklyPnl, percentHistory])

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0)
  const netTotal = rows.reduce((s, r) => s + r.finalAmount, 0)
  const groupName = entities.find((e) => e.id === groupId)?.name || ''

  async function copyAsImage() {
    if (!reportRef.current) return
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(reportRef.current)
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setCopyStatus('Image copied — paste kahin bhi (Ctrl+V)')
      } catch (err) {
        setCopyStatus('Copy nahi hua, browser support nahi karta')
      }
    })
  }

  useEffect(() => {
    if (!groupId || rows.length === 0) return
    if (searchParams.get('print') === '1') {
      setTimeout(() => window.print(), 400)
    }
    if (searchParams.get('copy') === '1') {
      setTimeout(() => copyAsImage(), 400)
    }
  }, [groupId, rows.length])

  return (
    <main>
      <h1 className="page-title">Broker Report</h1>
      <p className="page-subtitle">Broker ko bhejne wala professional report</p>

      <div className="card no-print">
        <div className="field">
          <label>Master / Broker Group</label>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">Select group</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>{g.name} ({g.type === 'master' ? 'Master' : 'Broker Group'})</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Date</label>
          <input type="date" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} />
        </div>
        {groupId && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => window.print()}>Print / Save as PDF</button>
            <button className="btn" onClick={copyAsImage}>Copy as Image</button>
          </div>
        )}
        {copyStatus && <div className="msg ok">{copyStatus}</div>}
      </div>

      {groupId && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }} ref={reportRef}>
          <div className="report-header">
            <span>GROUP NAME: {groupName}</span>
            <span>DATE: {weekDate}</span>
          </div>
          <table className="report">
            <thead>
              <tr>
                <th>SR NO</th>
                <th>ID NO</th>
                <th>ID NAME</th>
                <th>AMOUNT</th>
                <th>ID %</th>
                <th>FINAL AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sr}>
                  <td>{r.sr}</td>
                  <td>{r.idNumber}</td>
                  <td>{r.idName}</td>
                  <td className={r.amount >= 0 ? 'amt-pos' : 'amt-neg'}>{r.amount.toLocaleString('en-IN')}</td>
                  <td>{r.pct}</td>
                  <td className={r.finalAmount >= 0 ? 'amt-pos' : 'amt-neg'}>{r.finalAmount.toLocaleString('en-IN')}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td colSpan={3}>TOTAL AMOUNT</td>
                <td>{totalAmount.toLocaleString('en-IN')}</td>
                <td></td>
                <td>NET TOTAL: {netTotal.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

export default function BrokerReportPage() {
  return (
    <Suspense fallback={<main><p className="page-subtitle">Loading...</p></main>}>
      <BrokerReportInner />
    </Suspense>
  )
}
