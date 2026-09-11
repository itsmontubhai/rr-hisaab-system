'use client'

import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/entities', label: 'Entities' },
  { href: '/partners', label: 'Partners' },
  { href: '/hisaab', label: 'Weekly Hisaab' },
  { href: '/ledger', label: 'Ledger' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="sidebar">
      <div className="sidebar-title">
        RR Hisaab System
        <span>Trading Ledger</span>
      </div>
      {links.map((l) => (
        <a key={l.href} href={l.href} className={`nav-link ${pathname === l.href ? 'active' : ''}`}>
          {l.label}
        </a>
      ))}
    </div>
  )
}
