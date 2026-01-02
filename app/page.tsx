export default function HomePage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Selamat datang di Duapasal</h1>
      <p className="text-slate-600">Silakan login untuk mulai membaca dan mencatat progres.</p>
      <div className="flex gap-2 pt-2">
        <a className="rounded bg-indigo-600 px-4 py-2 text-white" href="/login">
          Login
        </a>
        <a className="rounded border border-slate-200 bg-white px-4 py-2" href="/register">
          Register
        </a>
      </div>
    </div>
  )
}
