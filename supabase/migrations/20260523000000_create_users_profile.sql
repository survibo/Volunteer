create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  phone text not null check (char_length(btrim(phone)) > 0),
  email text not null check (char_length(btrim(email)) > 0),
  address text not null check (char_length(btrim(address)) > 0),
  organization text not null check (char_length(btrim(organization)) > 0),
  license_number text check (license_number is null or char_length(btrim(license_number)) > 0),
  role text not null default 'associate' check (role in ('associate', 'member', 'admin')),
  member_number text unique,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_member_number_format check (member_number is null or member_number ~ '^[0-9]{2}-[0-9]{4}$'),
  constraint users_member_number_required_for_member check (role <> 'member' or (member_number is not null and approved_at is not null))
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;

create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

alter table public.users enable row level security;

revoke all on public.users from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert on public.users to authenticated;

drop policy if exists "Users can read their own profile" on public.users;

create policy "Users can read their own profile"
on public.users
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can create their own associate profile" on public.users;

create policy "Users can create their own associate profile"
on public.users
for insert
to authenticated
with check (
  (select auth.uid()) = id
  and role = 'associate'
  and member_number is null
  and approved_at is null
);
