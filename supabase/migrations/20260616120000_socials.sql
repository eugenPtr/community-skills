-- Social Links: optional ways a Member publishes to be reached, shown on their
-- Profile. One row per Member (one-to-one with profiles). Every field optional.
--
-- `email` here is the public Contact Email -- display-only, distinct from the
-- login email in members/auth. It is never used for authentication or the
-- Member gate.
create table socials (
  member_id uuid primary key references profiles(member_id) on delete cascade,
  phone text,
  email text,
  website text,
  linkedin text,
  facebook text,
  instagram text,
  x text
);

-- Access goes through the service-role client like the rest of the schema:
-- RLS on, no policies (anon/authenticated get nothing directly).
alter table socials enable row level security;
