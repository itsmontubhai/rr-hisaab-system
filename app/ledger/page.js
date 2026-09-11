'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function LedgerPage() {
  const [entities, setEntities] = useState([])
  const [partners, setPartners] = useState([])
  const [entries, setEntries] = useState([])
  const [entityId, setEntityId] = useState('')
  const [amount, setAmount] = useState('')
  const [entryType, setEntryType] = useState('credit')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')

  async function loadAll() {
    const { data: e } = await supabase.from('entities').select('*')
    const { data: p } = await supabase.from('partners').select('*')
    const { data: l } = await supabase.from('ledger').select('*').order('created_at', { ascending: false }).limit(200)
    setEntities(e || [])
    setPartners(p || [])
    setEntries(l || [])
  }

  useEffect(() => { loadAll() }, [])

  function nameFor(row) {
    if (row.partner_id) return partners.find((p) => p.id === row.partner_id)?.name || 'Partner'
    if (row.entity_id) return entities.find((e) => e.id === row.entity_id)?.name || 'Entity'
    return 'Standalone'
  }

  async function addManualEntry(e) {
    e.preventDefault()
    if (!entityId) { setMessage('Entity select karo'); return }
    const { data: last } = await supabase
      .from('ledger')
      .select('running_balance')
      .eq('entity_id', entityId)
      .is('partner_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
    const prevBalance = last && last.length ? parseFloat(last[0].running_balance) : 0
    const newBalance = entryType === 'credit' ? prevBalance + parseFloat(amount) : prevBalance - parseFloat(amount)

    const { error } = await supabase.from('ledger').insert({
      entity_id: entityId,
      entry_date: new Date().toISOString().slice(0, 10),
      description: description || 'Manual entry',
      amount: parseFloat(amount),
      entry_type: entryType,
      running_balance: newBalance,
      source: 'manual',
    })
    if (error) { setMessage('Error: ' + error.message); return }
    setMessage('Entry added')
    setAmount('')
    setDescription('')
    loadAll()
  }

  return (
    <main>
      <h1 className="page-title">Ledger</h1>
      <p className="page-subtitle">Auto aur manual entries, sabka running balance</p>

      <div className="card">
        <div className="card-title">Manual entry daalo (jaise payment received/paid)</div>
        <form onSubmit={addManualEntry}>
          <div className="field">
            <label>Entity</label>
            <select value={entityId} onChange={(e) => setEntityId(e.target.value)}>
              <option value="">Select entity</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Type</label>
            <select value={entryType} onChange={(e) => setEntryType(e.target.value)}>
              <option value="credit">Credit (+)</option>
              <option value="debit">Debit (-)</option>
            </select>
          </div>
          <div className="field">
            <label>Amount</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="field">
            <label>Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Payment received" />
          </div>
          <button type="submit" className="btn">Add Entry</button>
        </form>
        {message && <div className="msg ok">{message}</div>}
      </div>

      <div className="card">
        <div className="card-title">Recent entries</div>
        <table className="data">
          <thead><tr><th>Date</th><th>Entity/Partner</th><th>Description</th><th>Type</th><th>Amount</th><th>Balance</th></tr></thead>
          <tbody>
            {entries.map((row) => (
              <tr key={row.id}>
                <td>{row.entry_date}</td>
                <td>{nameFor(row)}</td>
                <td>{row.description}</td>
                <td>{row.entry_type}</td>
                <td>{row.amount}</td>
                <td>{row.running_balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
