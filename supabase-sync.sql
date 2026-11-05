
begin;

create table if not exists public.kalori_diaries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null check (revision > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object')
);

alter table public.kalori_diaries enable row level security;
revoke all on public.kalori_diaries from public, anon, authenticated;
grant select on public.kalori_diaries to authenticated;
drop policy if exists kalori_read_own on public.kalori_diaries;
create policy kalori_read_own on public.kalori_diaries
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.kalori_save_diary(expected_revision bigint, payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  owner_id uuid := auth.uid();
  next_revision bigint;
begin
  if owner_id is null then
    raise exception 'Login required' using errcode = '28000';
  end if;
  if expected_revision is null or expected_revision < 0
      or payload is null or payload->>'version' is distinct from '1'
      or jsonb_typeof(payload->'days') is distinct from 'object'
      or octet_length(payload::text) > 5000000 then
    raise exception 'Invalid diary' using errcode = '22023';
  end if;
  if expected_revision = 0 then
    insert into public.kalori_diaries (user_id, revision, payload)
      values (owner_id, 1, kalori_save_diary.payload)
      on conflict (user_id) do nothing
      returning revision into next_revision;
  else
    update public.kalori_diaries as diary
      set revision = diary.revision + 1, payload = kalori_save_diary.payload
      where diary.user_id = owner_id and diary.revision = expected_revision
      returning diary.revision into next_revision;
  end if;
  return next_revision;
end;
$function$;

revoke all on function public.kalori_save_diary(bigint,jsonb) from public, anon;
grant execute on function public.kalori_save_diary(bigint,jsonb) to authenticated;
commit;

