'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
  const [counts, setCounts] = useState({ admin: 0, master: 0, broker_group: 0, trading_id: 0 })
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('entities').select('type')
      if (error) {
        setStatus('error')
        return
      }
      setStatus('ok')
      const next = { admin: 0, master: 0, broker_group: 0, trading_id: 0 }
      data.forEach((e) => { next[e.type] = (next[e.type] || 0) + 1 })
      setCounts(next)
    }
    load()
  }, [])

  return (
    <main>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">
        {status === 'ok' && 'Database connected'}
        {status === 'checking' && 'Connecting...'}
        {status === 'error' && 'Connection failed'}
      </p>

      <div className="stats-row">
        <div className="stat">
          <div className="stat-label">Admins</div>
          <div className="stat-value">{counts.admin}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Masters</div>
          <div className="stat-value">{counts.master}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Broker Groups</div>
          <div className="stat-value">{counts.broker_group}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Trading IDs</div>
          <div className="stat-value">{counts.trading_id}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Getting started</div>
        <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
          Entities (Admin, Master, Broker Group, Trading ID) yahan se manage karein — sidebar mein "Entities" pe click karein.
        </p>
      </div>
    </main>
  )
}
