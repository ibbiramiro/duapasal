export async function logEmail(
  email: string,
  type: 'login' | 'register',
  status: 'sending' | 'sent' | 'error',
  error?: any,
  metadata?: any,
) {
  try {
    await fetch('/api/log-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        type,
        status,
        error: error ? (error instanceof Error ? error.message : JSON.stringify(error)) : null,
        metadata,
      }),
    })
  } catch (e) {
    // Log to console if the logging API itself fails
    console.error('Failed to log email to API:', e)
  }
}
