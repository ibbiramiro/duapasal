import './globals.css'

import type { ReactNode } from 'react'
import SupabaseProvider from '../components/supabase-provider'

export const metadata = {
  title: 'Duapasal',
  description: 'Daily Bible Reading Tracker',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="id">
      <body>
        <SupabaseProvider>
          <div className="min-h-screen">
            
            <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          </div>
        </SupabaseProvider>
      </body>
    </html>
  )
}
