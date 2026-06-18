-- Conversation retention (issue #23): Conversations are kept 90 days from their
-- last message, then deleted (cascading to their messages). The delete is a
-- function so it is exercisable from the test seam (Seam D) without a scheduler;
-- the daily pg_cron schedule that calls it is a separate, production-only
-- migration (20260617120400_pg_cron.sql).
create or replace function delete_expired_conversations()
returns void
language sql
as $$
  delete from conversations
  where last_message_at < now() - interval '90 days';
$$;
