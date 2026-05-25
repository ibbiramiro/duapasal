alter table public.reading_logs
drop constraint if exists reading_logs_comment_min_words;

-- We rely on the application backend (API) to strictly validate the 10-word minimum count,
-- as Postgres regex can have inconsistencies with Unicode spaces or specific edge cases.
