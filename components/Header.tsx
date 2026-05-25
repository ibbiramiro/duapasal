'use client'

import { useRouter } from 'next/navigation'

interface HeaderProps {
  title?: string
  subtitle?: string
  showBackButton?: boolean
  backHref?: string
}

export default function Header({ title = "Dashboard", subtitle, showBackButton = false, backHref = "/dashboard" }: HeaderProps) {
  const router = useRouter()

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Left Side - Title */}
          <div className="flex items-center flex-1">
            {showBackButton && (
              <button
                onClick={() => router.push(backHref)}
                className="mr-4 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Kembali"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-slate-600">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
