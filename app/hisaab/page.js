'use client'

import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabaseClient'
import { calculateDistribution } from '../../lib/calculate'

function nextSaturday() {
  const d = new Date()
  const day = d.getDay()
  const diff = (6 - day + 7) % 7
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export default function HisaabPage() {
  const [weekDate, setWeekDate] = useState(nextSaturday())
  const [entities, setEntities] = useState([])
  const [percentHistory, setPercentHistory] = useState([])
  const [partnerAllocations, setPartnerAllocations] = useState([])
  const [partners, setPartners] = useState([])
  const [matched, setMatched] = useState([])
  const [unmatched, setUnmatched] = useState([])
  const [drafts, setDrafts] = useState([])
  const [message, setMessage] = useState('')

  async function loadAll() {
    const { data: e } = await supabase.from('entities').select('*')
    const { data: h } = await supabase.from('entity_percentage_history').select('*')
    const { data: pa } = await supabase.from('partner_allocations').select('*')
    const { data: p } = await supabase.from('partners').select('*')
    setEntities(e || [])
    setPercentHistory(h || [])
    setPartnerAllocations(pa || [])
    setPartners(p || [])
    loadDrafts(e || [])
  }

  async function loadDrafts(entityList) {
    const { data } = await supabase.from('weekly_pnl').select('*').eq('week_date', weekDate).order('created_at')
    const list = entityList.length ? entityList : entities
    setDrafts((data || []).map((d) => ({ ...d, entity: list.find((e) => e.id === d.entity_id) })))
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { loadDrafts() }, [weekDate])

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)

      const tradingIds = entities.filter((en) => en.type === 'trading_id')
      const matchedList = []
      const unmatchedList = []

      rows.forEach((row) => {
        const idNumber = String(row['ID Number'] ?? row['id number'] ?? row['ID'] ?? '').trim()
        const idName = String(row['ID Name'] ?? row['id name'] ?? row['Name'] ?? '').trim()
        const amount = parseFloat(row['Amount'] ?? row['amount'] ?? 0)
        const found = tradingIds.find((t) => t.id_number === idNumber)
        if (found) {
          matchedList.push({ entity: found, idNumber, idName, amount })
        } else {
          unmatchedList.push({ idNumber, idName, amount })
        }
      })

      setMatched(matchedList)
      setUnmatched(unmatchedList)
    }
    reader.readAsBinaryString(file)
  }

  async function saveDraft() {
    setMessage('Saving draft...')
    const rows = matched.map((m) => ({
      entity_id: m.entity.id,
      week_date: weekDate,
      amount: m.amount,
      status: 'draft',
    }))
    const { error } = await supabase.from('weekly_pnl').insert(rows)
    if (error) { setMessage('Error: ' + error.message); return }
    setMessage('Draft saved for ' + rows.length + ' Trading IDs')
    setMatched([])
    setUnmatched([])
    loadDrafts()
  }

  async function getLatestBalance(entityId, partnerId) {
    let query = supabase.from('ledger').select('running_balance').order('created_at', { ascending: false }).limit(1)
    if (partnerId) query = query.eq('partner_id', partnerId)
    else query = query.eq('entity_id', entityId).is('partner_id', null)
    const { data } = await query
    return data && data.length ? parseFloat(data[0].running_balance) : 0
  }

  async function addDraftToLedger(draft) {
    if (!draft.entity) return
    const lines = calculateDistribution(draft.entity, parseFloat(draft.amount), entities, percentHistory, partnerAllocations, partners)

    for (const line of lines) {
      let entityId = line.entityId || null
      if (line.role === 'Company') {
        let company = entities.find((en) => en.type === 'company')
        if (!company) {
          const { data: newCompany } = await supabase.from('entities').insert({ name: 'Company', type: 'company' }).select().single()
          company = newCompany
          setEntities((prev) => [...prev, company])
        }
        entityId = company.id
      }

      const prevBalance = await getLatestBalance(entityId, line.partnerId || null)
      const entryType = line.amount >= 0 ? 'credit' : 'debit'
      const newBalance = prevBalance + line.amount

      await supabase.from('ledger').insert({
        entity_id: line.partnerId ? null : entityId,
        partner_id: line.partnerId || null,
        entry_date: weekDate,
        description: `Week ${weekDate} — ${draft.entity.name} (${line.role})`,
        amount: Math.abs(line.amount),
        entry_type: entryType,
        running_balance: newBalance,
        source: 'auto',
        reference_id: draft.id,
      })
    }

    await supabase.from('weekly_pnl').update({ status: 'added_to_ledger' }).eq('id', draft.id)
    setMessage(draft.entity.name + ' added to ledger')
    loadDrafts()
  }

  return (
    <main>
      <h1 className="page-title">Weekly Hisaab</h1>
      <p className="page-subtitle">Excel upload karke week ka P&amp;L daalein</p>

      <div className="card">
        <div className="card-title">Week select karo</div>
        <div className="field">
          <label>Week Date (Saturday)</label>
          <input type="date" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Excel upload karo</div>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>Columns: ID Number / ID Name / Amount</p>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />

        {matched.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="card-title">Matched ({matched.length})</div>
            <table className="data">
              <thead><tr><th>ID Number</th><th>Name</th><th>Amount</th></tr></thead>
              <tbody>
                {matched.map((m, i) => (
                  <tr key={i}><td>{m.idNumber}</td><td>{m.entity.name}</td><td>{m.amount}</td></tr>
                ))}
              </tbody>
            </table>
            <button className="btn" onClick={saveDraft} style={{ marginTop: 12 }}>Save Draft</button>
          </div>
        )}

        {unmatched.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="card-title">New IDs — pehle Entities page se banayein</div>
            <table className="data">
              <thead><tr><th>ID Number</th><th>ID Name</th><th>Amount</th></tr></thead>
              <tbody>
                {unmatched.map((m, i) => (
                  <tr key={i}><td>{m.idNumber}</td><td>{m.idName}</td><td>{m.amount}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {message && <div className="msg ok">{message}</div>}
      </div>

      <div className="card">
        <div className="card-title">Draft — Week of {weekDate}</div>
        <table className="data">
          <thead><tr><th>Trading ID</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {drafts.map((d) => (
              <tr key={d.id}>
                <td>{d.entity?.name || '—'}</td>
                <td>{d.amount}</td>
                <td>{d.status === 'draft' ? 'Draft' : 'Added to Ledger'}</td>
                <td>
                  {d.status === 'draft' && (
                    <button className="btn" onClick={() => addDraftToLedger(d)}>Add to Ledger</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
