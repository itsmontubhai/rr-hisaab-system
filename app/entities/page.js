'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function EntitiesPage() {
  const [entities, setEntities] = useState([])
  const [name, setName] = useState('')
  const [type, setType] = useState('admin')
  const [idNumber, setIdNumber] = useState('')
  const [parentId, setParentId] = useState('')
  const [percentage, setPercentage] = useState('')
  const [message, setMessage] = useState('')

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
      return
    }

    if (percentage) {
      await supabase.from('entity_percentage_history').insert({
        entity_id: newEntity.id,
        percentage: parseFloat(percentage),
        effective_from: new Date().toISOString().slice(0, 10),
      })
    }

    setMessage('Saved successfully!')
    setName('')
    setType('admin')
    setIdNumber('')
    setParentId('')
    setPercentage('')
    loadEntities()
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '700px' }}>
      <h1>RR Hisaab System — Entities</h1>
      <p><a href="/">Home</a></p>

      <form onSubmit={handleSubmit} style={{ marginBottom: '40px', border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
        <h2>Naya Entity Banao</h2>

        <div style={{ marginBottom: '12px' }}>
          <label>Name: </label><br />
          <input value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>Type: </label><br />
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '8px' }}>
            <option value="admin">Admin</option>
            <option value="master">Master</option>
            <option value="broker_group">Broker Group</option>
            <option value="trading_id">Trading ID</option>
          </select>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>ID Number (Trading ID ke liye zaroori, baaki optional): </label><br />
          <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} style={{ width: '100%', padding: '8px' }} />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>Parent (kiske andar hai): </label><br />
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} style={{ width: '100%', padding: '8px' }}>
            <option value="">-- Koi Parent Nahi (Top Level) --</option>
            {entities.map((ent) => (
              <option key={ent.id} value={ent.id}>{ent.name} ({ent.type})</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>Percentage (%): </label><br />
          <input type="number" step="0.01" value={percentage} onChange={(e) => setPercentage(e.target.value)} style={{ width: '100%', padding: '8px' }} />
        </div>

        <button type="submit" style={{ padding: '10px 20px' }}>Save</button>
        {message && <p>{message}</p>}
      </form>

      <h2>Saari Entities</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>ID Number</th>
            <th>Parent</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          {entities.map((ent) => {
            const parent = entities.find((p) => p.id === ent.parent_id)
            return (
              <tr key={ent.id}>
                <td>{ent.name}</td>
                <td>{ent.type}</td>
                <td>{ent.id_number || '-'}</td>
                <td>{parent ? parent.name : '-'}</td>
                <td>{ent.current_percentage !== null ? ent.current_percentage + '%' : '-'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </main>
  )
}
