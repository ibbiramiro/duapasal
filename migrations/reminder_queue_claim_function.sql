-- Required additions for reminder_queue to support dedupe + anti double-send claiming.
-- Run this in Supabase SQL editor.

-- 1) Add columns used for dedupe & locking
alter table public.reminder_queue
  add column if not exists recipient_email text,
  add column if not exists reminder_date date,
  add column if not exists locked_at timestamptz,
  add column if not exists processing_started_at timestamptz;

-- 2) Ensure scheduled_for exists (your schema already has it)
-- alter table public.reminder_queue add column if not exists scheduled_for timestamptz default now();

-- 3) Helpful indexes
create index if not exists idx_reminder_queue_pending_due
  on public.reminder_queue (scheduled_for)
  where status = 'pending';

create index if not exists idx_reminder_queue_locked_at
  on public.reminder_queue (locked_at);

-- 4) Dedupe per user/date/session (prevents spam)
create unique index if not exists uq_reminder_queue_user_date_session
  on public.reminder_queue (user_id, reminder_date, session_type);

-- 5) Claim function: atomically claim a batch of pending rows due now.
-- Uses SKIP LOCKED so multiple workers won't double-send.
create or replace function public.claim_reminder_queue(batch_size int default 10)
returns setof public.reminder_queue
language plpgsql
security definer
as $$
declare
begin
  return query
  with cte as (
    select rq.id
    from public.reminder_queue rq
    where rq.status = 'pending'
      and (rq.scheduled_for is null or rq.scheduled_for <= now())
      and rq.locked_at is null
    order by rq.scheduled_for asc nulls first, rq.created_at asc
    limit batch_size
    for update skip locked
  )
  update public.reminder_queue rq
  set status = 'processing',
      locked_at = now(),
      processing_started_at = now(),
      error_message = null
  from cte
  where rq.id = cte.id
  returning rq.*;
end;
$$;

-- Optional: allow the service role to execute it (usually already can).
-- grant execute on function public.claim_reminder_queue(int) to service_role;
