alter table public.reading_logs
add column if not exists comment text;

alter table public.reading_logs
drop constraint if exists reading_logs_comment_min_words;

alter table public.reading_logs
add constraint reading_logs_comment_min_words
check (
  comment is null
  or array_length(regexp_split_to_array(trim(comment), '\\s+'), 1) >= 10
);
