-- Local dev seed: a handful of unclaimed invite codes a developer can use
-- to walk through the magic-link → claim flow. Admins are added by editing
-- members.role directly here.
insert into invites (code) values
  ('DEV-AAAA-0001'),
  ('DEV-AAAA-0002'),
  ('DEV-AAAA-0003')
on conflict (code) do nothing;
