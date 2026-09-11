import './globals.css'
import Sidebar from './Sidebar'

export const metadata = {
  title: 'RR Hisaab System',
  description: 'Trading ID hierarchy and ledger management system',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <Sidebar />
          <div className="content">{children}</div>
        </div>
      </body>
    </html>
  )
}
