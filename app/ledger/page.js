'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function LedgerPage() {
  const [entities, setEntities] = useState([])
  const [partners, setPartners] = useState([])
  const [entries, setEntries] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null) // { id, kind }
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [comment, setComment] = useState('')
  const [credit, setCredit] = useState('')
  const [debit, setDebit] = useState('')
  const [message, setMessage] = useState('')

  async function loadAll() {
    const { data: e } = await supabase.from('entities').select('*').order('name')
    const { data: p } = await supabase.from('partners').select('*').order('name')
    const { data: l } = await supabase.from('ledger').select('*').order('created_at', { ascending: true })
    setEntities(e || [])
    setPartners(p || [])
    setEntries(l || [])
  }

  useEffect(() => { loadAll() }, [])

  const groups = useMemo(() => {
    const entityGroups = entities.map((e) => ({ id: e.id, kind: 'entity', name: e.name }))
    const partnerGroups = partners.map((p) => ({ id: p.id, kind: 'partner', name: p.name }))
    const all = [...entityGroups, ...partnerGroups]
    return all.map((g) => {
      const rows = entries.filter((r) => (g.kind === 'entity' ? r.entity_id === g.id && !r.partner_id : r.partner_id === g.id))
      const balance = rows.length ? parseFloat(rows[rows.length - 1].running_balance) : 0
      return { ...g, balance }
    }).filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
  }, [entities, partners, entries, search])

  const selectedEntries = useMemo(() => {
    if (!selected) return []
    return entries.filter((r) => (selected.kind === 'entity' ? r.entity_id === selected.id && !r.partner_id : r.partner_id === selected.id))
  }, [entries, selected])

  const totals = useMemo(() => {
    let c = 0, d = 0
    selectedEntries.forEach((r) => {
      if (r.entry_type === 'credit') c += parseFloat(r.amount)
      else d += parseFloat(r.amount)
    })
    return { credit: c, debit: d }
  }, [selectedEntries])

  async function saveEntry(e) {
    e.preventDefault()
    if (!selected) { setMessage('Pehle koi group select karo'); return }
    if (!credit && !debit) { setMessage('Credit ya Debit daalo'); return }

    const isCredit = !!credit
    const amt = parseFloat(isCredit ? credit : debit)
    const prevBalance = selectedEntries.length ? parseFloat(selectedEntries[selectedEntries.length - 1].running_balance) : 0
    const newBalance = isCredit ? prevBalance + amt : prevBalance - amt

    const { error } = await supabase.from('ledger').insert({
      entity_id: selected.kind === 'entity' ? selected.id : null,
      partner_id: selected.kind === 'partner' ? selected.id : null,
      entry_date: date,
      description: comment || 'Manual entry',
      amount: amt,
      entry_type: isCredit ? 'credit' : 'debit',
      running_balance: newBalance,
      source: 'manual',
    })
    if (error) { setMessage('Error: ' + error.message); return }
    setCredit('')
    setDebit('')
    setComment('')
    setMessage('')
    loadAll()
  }

  return (
    <main>
      <h1 className="page-title">Ledger</h1>
      <p className="page-subtitle">Har entity/partner ka running balance</p>

      <div className="ledger-shell">
        <div className="ledger-groups">
          <div className="ledger-groups-header">
            <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="ledger-groups-list">
            {groups.map((g) => (
              <div
                key={g.kind + g.id}
                className={`ledger-group-row ${selected?.id === g.id && selected?.kind === g.kind ? 'active' : ''}`}
                onClick={() => setSelected({ id: g.id, kind: g.kind })}
              >
                <span className="ledger-group-name">{g.name}</span>
                <span className={g.balance > 0 ? 'balance-pos' : g.balance < 0 ? 'balance-neg' : 'balance-zero'}>
                  {g.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="ledger-main">
          <div className="ledger-main-header">
            {selected ? groups.find((g) => g.id === selected.id && g.kind === selected.kind)?.name : 'Ek group select karo'}
          </div>

          <div className="ledger-table-wrap">
            {selected && (
              <table className="data">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Comment</th>
                    <th>Credit</th>
                    <th>Debit</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEntries.map((row) => (
                    <tr key={row.id}>
                      <td>{row.entry_date}</td>
                      <td className={row.entry_type === 'credit' ? 'type-rec' : 'type-paid'}>
                        {row.entry_type === 'credit' ? 'REC' : 'PAID'}
                      </td>
                      <td>{row.description}</td>
                      <td>{row.entry_type === 'credit' ? parseFloat(row.amount).toLocaleString('en-IN') : ''}</td>
                      <td>{row.entry_type === 'debit' ? parseFloat(row.amount).toLocaleString('en-IN') : ''}</td>
                      <td>{parseFloat(row.running_balance).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {selectedEntries.length > 0 && (
                    <tr>
                      <td colSpan={3} style={{ fontWeight: 700 }}>Total</td>
                      <td style={{ fontWeight: 700 }}>{totals.credit.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 700 }}>{totals.debit.toLocaleString('en-IN')}</td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {selected && (
            <form className="ledger-entry-form" onSubmit={saveEntry}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <input placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
              <input
                className="credit-input"
                placeholder="Credit"
                type="number"
                step="0.01"
                value={credit}
                onChange={(e) => { setCredit(e.target.value); setDebit('') }}
              />
              <input
                className="debit-input"
                placeholder="Debit"
                type="number"
                step="0.01"
                value={debit}
                onChange={(e) => { setDebit(e.target.value); setCredit('') }}
              />
              <button type="submit" className="btn">Save</button>
            </form>
          )}
          {message && <div className="msg err" style={{ padding: '0 18px 12px' }}>{message}</div>}
        </div>
      </div>
    </main>
  )
}
