-- People Search Conversations (issue #23). A Conversation is one People Search
-- thread; messages are its ordered exchange. Capped at 10 Member messages and
-- retained 90 days -- both enforced in application code / a cron job, not here
-- (the cap is server-side in lib, the retention delete in 20260617120400).
--
-- messages.id is a bigint identity column: replay orders by `id asc`, which is
-- monotonic by insertion and clock-independent (never order by created_at).
create table conversations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index conversations_member_idx on conversations (member_id, last_message_at desc);

create table messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, id);

alter table conversations enable row level security;
alter table messages enable row level security;

-- A Member reads and writes only their own Conversations, and only messages in
-- those Conversations. Enforced for the cookie-bound `authenticated` client;
-- the server persists through that same client so the gate holds in the DB.
create policy "own conversations" on conversations
  for all
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

create policy "own messages" on messages
  for all
  using (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id and c.member_id = auth.uid()
  ))
  with check (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id and c.member_id = auth.uid()
  ));
