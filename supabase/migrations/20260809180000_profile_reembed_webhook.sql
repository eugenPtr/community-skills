create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.invoke_profile_reembed_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  service_role_key text;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets where name = 'project_url';

  select decrypted_secret into service_role_key
  from vault.decrypted_secrets where name = 'service_role_key';

  if project_url is null or service_role_key is null then
    raise warning 'Profile re-embed webhook skipped: Vault secrets project_url and service_role_key are required';
    return new;
  end if;

  perform net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/embed-profile',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
    ),
    timeout_milliseconds := 10000
  );

  return new;
end;
$$;

create or replace function private.clear_stale_profile_context_embedding()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.profile_context_embedding := null;
  new.profile_context_embedding_input := null;
  new.profile_context_embedded_at := null;
  return new;
end;
$$;

create trigger clear_profile_context_embedding_on_update
before update of passions, heart_project_description, heart_project_seeking
on public.profiles
for each row
when (
  old.passions is distinct from new.passions
  or old.heart_project_description is distinct from new.heart_project_description
  or old.heart_project_seeking is distinct from new.heart_project_seeking
)
execute function private.clear_stale_profile_context_embedding();

create trigger reembed_profile_on_insert
after insert on public.profiles
for each row execute function private.invoke_profile_reembed_webhook();

create trigger reembed_profile_on_update
after update of passions, heart_project_description, heart_project_seeking
on public.profiles
for each row
when (
  old.passions is distinct from new.passions
  or old.heart_project_description is distinct from new.heart_project_description
  or old.heart_project_seeking is distinct from new.heart_project_seeking
)
execute function private.invoke_profile_reembed_webhook();
