'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
  const [status, setStatus] = useState('Checking connection...')
  const [entityCount, setEntityCount] = useState(null)

  useEffect(() => {
    async function checkConnection() {
      const { count, error } = await supabase
        .from('entities')
        .select('*', { count: 'exact', head: true })

      if (error) {
        setStatus('Connection failed: ' + error.message)
      } else {
        setStatus('Connected to Supabase successfully!')
        setEntityCount(count)
      }
    }
    checkConnection()
  }, [])

  return (
    <main style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>RR Hisaab System</h1>
      <p>{status}</p>
      {entityCount !== null && (
        <p>Total entities in database: {entityCount}</p>
      )}
    </main>
  )
}
