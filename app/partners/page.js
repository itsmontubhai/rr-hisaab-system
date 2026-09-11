'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function PartnersPage() {
  const [partners, setPartners] = useState([])
  const [entities, setEntities] = useState([])
  const [allocations, setAllocations] = useState([])
  const [partnerName, setPartnerName] = useState('')
  const [selectedPartner, setSelectedPartner] = useState('')
  const [selectedEntity, setSelectedEntity] = useState('')
  const [pct, setPct] = useState('')
  const [message, setMessage] = useState('')

  async function loadAll() {
    const { data: p } = await supabase.from('partners').select('*').order('name')
    const { data: e } = await supabase.from('entities').select('*').in('type', ['master', 'broker_group', 'trading_id']).order('name')
    const { data: a } = await supabase.from('partner_allocations').select('*').is('effective_to', null)
    setPartners(p || [])
    setEntities(e || [])
    setAllocations(a || [])
  }

  useEffect(() => { loadAll() }, [])

  async function addPartner(e) {
    e.preventDefault()
    const { error } = await supabase.from('partners').insert({ name: partnerName })
    if (error) { setMessage('Error: ' + error.message); return }
    setPartnerName('')
    setMessage('Partner added')
    loadAll()
  }

  async function assignPartner(e) {
    e.preventDefault()
    const { error } = await supabase.from('partner_allocations').insert({
      partner_id: selectedPartner,
      entity_id: selectedEntity,
      percentage: parseFloat(pct),
      effective_from: new Date().toISOString().slice(0, 10),
    })
    if (error) { setMessage('Error: ' + error.message); return }
    setSelectedPartner('')
    setSelectedEntity('')
    setPct('')
    setMessage('Partner assigned')
    loadAll()
  }

  return (
    <main>
      <h1 className="page-title">Partners</h1>
      <p className="page-subtitle">Partner banayein aur Master ya Trading ID pe assign karein</p>

      <div className="card">
        <div className="card-title">Naya partner banao</div>
        <form onSubmit={addPartner}>
          <div className="field">
            <label>Partner Name</label>
            <input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} required />
          </div>
          <button type="submit" className="btn">Save</button>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Partner ko assign karo (Master ya Trading ID pe)</div>
        <form onSubmit={assignPartner}>
          <div className="field">
            <label>Partner</label>
            <select value={selectedPartner} onChange={(e) => setSelectedPartner(e.target.value)} required>
              <option value="">Select partner</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Entity (Master ya Broker Group pe do toh sab niche apply hoga, ya specific Trading ID pe)</label>
            <select value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value)} required>
              <option value="">Select entity</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.type === 'master' ? 'Master' : e.type === 'broker_group' ? 'Broker Group' : 'Trading ID'})</option>)}
            </select>
          </div>
          <div className="field">
            <label>Percentage (%)</label>
            <input type="number" step="0.01" value={pct} onChange={(e) => setPct(e.target.value)} required />
          </div>
          <button type="submit" className="btn">Assign</button>
        </form>
        {message && <div className="msg ok">{message}</div>}
      </div>

      <div className="card">
        <div className="card-title">All partner assignments</div>
        <table className="data">
          <thead>
            <tr><th>Partner</th><th>Entity</th><th>Percentage</th></tr>
          </thead>
          <tbody>
            {allocations.map((a) => {
              const partner = partners.find((p) => p.id === a.partner_id)
              const entity = entities.find((e) => e.id === a.entity_id)
              return (
                <tr key={a.id}>
                  <td>{partner?.name || '—'}</td>
                  <td>{entity?.name || '—'}</td>
                  <td>{a.percentage}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}
