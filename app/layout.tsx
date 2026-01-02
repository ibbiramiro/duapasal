import './globals.css'

import type { ReactNode } from 'react'

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
        <div className="min-h-screen">
          <header className="border-b bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              <div className="font-semibold">Duapasal</div>
              <nav className="flex items-center gap-3 text-sm">
                <a className="rounded px-2 py-1 hover:bg-slate-100" href="/dashboard">
                  Dashboard
                </a>
                <a className="rounded px-2 py-1 hover:bg-slate-100" href="/login">
                  Login
                </a>
                <a className="rounded px-2 py-1 hover:bg-slate-100" href="/register">
                  Register
                </a>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  )
}
