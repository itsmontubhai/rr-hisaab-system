'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import EntityTree from './EntityTree'

export default function EntitiesPage() {
  const [entities, setEntities] = useState([])
  const [name, setName] = useState('')
  const [type, setType] = useState('admin')
  const [idNumber, setIdNumber] = useState('')
  const [parentId, setParentId] = useState('')
  const [percentage, setPercentage] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function loadEntities() {
    const { data, error } = await supabase
      .from('entities')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return

    const { data: history } = await supabase
      .from('entity_percentage_history')
      .select('*')
      .is('effective_to', null)

    const withPercentage = data.map((ent) => {
      const match = history?.find((h) => h.entity_id === ent.id)
      return { ...ent, current_percentage: match ? match.percentage : null }
    })

    setEntities(withPercentage)
  }

  useEffect(() => {
    loadEntities()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('Saving...')
    setIsError(false)

    const { data: newEntity, error } = await supabase
      .from('entities')
      .insert({
        name,
        type,
        id_number: idNumber || null,
        parent_id: parentId || null,
      })
      .select()
      .single()

    if (error) {
      setMessage('Error: ' + error.message)
      setIsError(true)
      return
    }

    if (percentage) {
      await supabase.from('entity_percentage_history').insert({
        entity_id: newEntity.id,
        percentage: parseFloat(percentage),
        effective_from: new Date().toISOString().slice(0, 10),
      })
    }

    setMessage('Saved successfully')
    setIsError(false)
    setName('')
    setType('admin')
    setIdNumber('')
    setParentId('')
    setPercentage('')
    loadEntities()
  }

  const typeLabels = {
    admin: 'Admin',
    master: 'Master',
    broker_group: 'Broker Group',
    trading_id: 'Trading ID',
  }

  return (
    <main>
      <h1 className="page-title">Entities</h1>
      <p className="page-subtitle">Admin, Master, Broker Group aur Trading ID yahan banayein</p>

      <div className="card">
        <div className="card-title">Naya entity banao</div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="field">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="admin">Admin</option>
              <option value="master">Master</option>
              <option value="broker_group">Broker Group</option>
              <option value="trading_id">Trading ID</option>
            </select>
          </div>

          <div className="field">
            <label>ID Number (Trading ID ke liye zaroori)</label>
            <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
          </div>

          <div className="field">
            <label>Parent (kiske andar hai)</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">No parent (top level)</option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>{ent.name} ({typeLabels[ent.type]})</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Percentage (%)</label>
            <input type="number" step="0.01" value={percentage} onChange={(e) => setPercentage(e.target.value)} />
          </div>

          <button type="submit" className="btn">Save</button>
          {message && <div className={`msg ${isError ? 'err' : 'ok'}`}>{message}</div>}
        </form>
      </div>

      <div className="card">
        <div className="card-title">Hierarchy</div>
        <EntityTree entities={entities} />
      </div>
    </main>
  )
}
