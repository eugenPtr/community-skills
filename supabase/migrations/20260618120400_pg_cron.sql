-- Production-only: schedule the daily Conversation retention sweep (issue #23).
-- Not loaded by the PGlite test harness (pg_cron needs the running Postgres);
-- the retention delete itself (delete_expired_conversations) is tested directly.
create extension if not exists pg_cron;

-- Idempotent (re)schedule: drop a prior job of the same name, then create it.
-- Runs daily at 03:00 UTC.
select cron.unschedule('delete-expired-conversations')
where exists (select 1 from cron.job where jobname = 'delete-expired-conversations');

select cron.schedule(
  'delete-expired-conversations',
  '0 3 * * *',
  $$select delete_expired_conversations()$$
);
