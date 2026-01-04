'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type MaintenanceConfig = {
  id: string
  enabled: boolean
  title: string | null
  message: string | null
  start_at: string | null
  end_at: string | null
  created_at: string
  updated_at: string
}

export default function AdminMaintenancePage() {
  const [config, setConfig] = useState<MaintenanceConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      const { data, error } = await supabase
        .from('maintenance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as any

      if (error) throw error
      setConfig(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenance config')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updateData = {
        enabled: config.enabled,
        title: config.title,
        message: config.message,
        start_at: config.start_at,
        end_at: config.end_at,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase
        .from('maintenance')
        .update(updateData as any)
        .eq('id', config.id)

      if (error) throw error
      setSuccess('Maintenance configuration updated successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update maintenance config')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Maintenance Mode Settings
            </h1>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              {/* Enable/Disable Toggle */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config?.enabled ?? false}
                    onChange={(e) =>
                      setConfig((prev) => (prev ? { ...prev, enabled: e.target.checked } : null))
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Enable Maintenance Mode
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  When enabled, all non-admin and non-API routes will redirect to the maintenance page.
                </p>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={config?.title ?? ''}
                  onChange={(e) =>
                    setConfig((prev) => (prev ? { ...prev, title: e.target.value } : null))
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Sedang Dalam Perbaikan"
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={config?.message ?? ''}
                  onChange={(e) =>
                    setConfig((prev) => (prev ? { ...prev, message: e.target.value } : null))
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Sistem sedang dalam pemeliharaan. Silakan kembali beberapa saat lagi."
                />
              </div>

              {/* Start Time */}
              <div>
                <label htmlFor="start_at" className="block text-sm font-medium text-gray-700">
                  Start Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  id="start_at"
                  value={config?.start_at ? new Date(config.start_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) =>
                    setConfig((prev) =>
                      prev ? { ...prev, start_at: e.target.value ? new Date(e.target.value).toISOString() : null } : null
                    )
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  If set, maintenance mode will only be active after this time.
                </p>
              </div>

              {/* End Time */}
              <div>
                <label htmlFor="end_at" className="block text-sm font-medium text-gray-700">
                  End Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  id="end_at"
                  value={config?.end_at ? new Date(config.end_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) =>
                    setConfig((prev) =>
                      prev ? { ...prev, end_at: e.target.value ? new Date(e.target.value).toISOString() : null } : null
                    )
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  If set, maintenance mode will automatically disable after this time.
                </p>
              </div>

              {/* Save Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>

            {/* Preview Link */}
            {config?.enabled && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  Maintenance mode is currently active. You can preview the maintenance page at:{' '}
                  <a href="/maintenance" className="underline" target="_blank" rel="noopener noreferrer">
                    /maintenance
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
