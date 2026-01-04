-- maintenance mode table
CREATE TABLE IF NOT EXISTS public.maintenance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  title text,
  message text,
  start_at timestamptz NULL,
  end_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS (optional, jika ingin admin-only)
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;

-- Policy: hanya authenticated user dengan role ADMIN yang bisa update
-- (sesuaikan dengan implementasi auth kamu)
CREATE POLICY "Admin full access" ON public.maintenance
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Index untuk performa
CREATE INDEX idx_maintenance_enabled ON public.maintenance(enabled);
CREATE INDEX idx_maintenance_time_range ON public.maintenance(start_at, end_at) WHERE enabled = true;

-- Insert default row (disabled)
INSERT INTO public.maintenance (enabled, title, message)
VALUES (
  false,
  'Sedang Dalam Perbaikan',
  'Sistem sedang dalam pemeliharaan. Silakan kembali beberapa saat lagi.'
)
ON CONFLICT DO NOTHING;
