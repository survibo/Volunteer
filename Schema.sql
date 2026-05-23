-- =============================================================================
-- Database Schema
-- =============================================================================
--
-- 설계 기준:
--   - OAuth 계정 식별자는 auth.users.id를 참조한다.
--   - 앱 사용자는 pending, member, admin 역할 중 하나를 가진다.
--   - 최초 가입 정보 입력 후에는 pending으로 생성된다.
--   - 관리자가 승인하면 member로 전환되고 회원번호가 부여된다.
--   - 관리자는 users.role = 'admin'으로 판별한다.
--   - 탈퇴 사용자는 users에서 hard delete하고 관리자 조회용 스냅샷은
--     withdrawn_users에만 보관한다.
--   - 봉사활동과 교육은 구조가 같지만 화면과 관리 경로가 분리되어 있으므로
--     별도 테이블로 둔다.
--   - 신청 상태는 pending, accepted, rejected, cancelled로 제한한다.
--   - 정원 초과 신청은 허용한다. 정원은 관리자 판단용 값이다.
--
-- Storage:
--   - 이미지 bucket id는 volunteer다.
--   - image_path에는 volunteer bucket 내부 object path만 저장한다.
-- =============================================================================

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('volunteer', 'volunteer', true)
on conflict (id) do update
set public = excluded.public;


-- =============================================================================
-- Enum Types
-- =============================================================================

do $$
begin
  create type public.user_role as enum (
    'pending',
    'member',
    'admin'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.application_status as enum (
    'pending',
    'accepted',
    'rejected',
    'cancelled'
  );
exception
  when duplicate_object then null;
end;
$$;


-- =============================================================================
-- users
-- =============================================================================
-- OAuth 로그인 후 가입 정보 입력을 완료한 앱 사용자 프로필이다.
-- Supabase Auth를 인증 원천으로 두고, 앱에서 필요한 가입 정보와 권한을 여기에 저장한다.
--
-- 구현 시 주의:
--   - 회원 승인은 트랜잭션에서 처리한다.
--   - 승인 시 member_number_sequences를 upsert 후 row lock으로 순번을 증가시키고
--     YY-NNNN 형식의 회원번호를 만든다.
--   - 탈퇴 시 withdrawn_users에 스냅샷을 먼저 insert한 뒤 users row를 삭제한다.
--   - 일반 사용자의 프로필 수정은 role/member_number 변경을 막기 위해
--     컬럼 권한 또는 별도 RPC/Edge Function으로 제한한다.
-- =============================================================================

create table if not exists public.users (
  id                  uuid          primary key references auth.users(id) on delete cascade,
  role                public.user_role not null default 'pending',
  member_number       text          unique,                                -- 회원 전환 시 부여되는 YY-NNNN 번호
  name                text          not null,
  phone               text          not null,
  email               text          not null,
  address             text          not null,
  workplace_or_school text          not null,
  license_number      text,
  approved_at         timestamptz,                                         -- 회원 승인 일시
  approved_by         uuid          references public.users(id) on delete set null,
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now(),
  constraint users_member_number_format_check
    check (member_number is null or member_number ~ '^\d{2}-\d{4}$'),
  constraint users_member_number_required_for_member_check
    check (
      (role in ('member', 'admin') and member_number is not null and approved_at is not null)
      or (role = 'pending' and member_number is null)
    ),
  constraint users_approval_metadata_check
    check (
      (role in ('member', 'admin') and approved_at is not null)
      or (role = 'pending' and approved_at is null and approved_by is null)
    )
);

create index if not exists users_role_idx on public.users(role);
create unique index if not exists users_email_unique_idx on public.users(email);


-- =============================================================================
-- member_number_sequences
-- =============================================================================
-- 연도별 회원번호 순번을 안전하게 발급하기 위한 테이블이다.
-- 회원 승인 트랜잭션에서 해당 연도의 last_sequence를 row lock으로 증가시킨다.
-- year는 2자리 연도(예: 26)를 사용한다.
-- =============================================================================

create table if not exists public.member_number_sequences (
  year          smallint    primary key,
  last_sequence integer     not null default 0,
  updated_at    timestamptz not null default now(),
  constraint member_number_sequences_year_check
    check (year between 0 and 99),
  constraint member_number_sequences_last_sequence_check
    check (last_sequence between 0 and 9999)
);

alter table public.users
  drop constraint if exists users_member_number_required_for_member_check,
  drop constraint if exists users_approval_metadata_check;

do $$
declare
  sequence_year smallint := to_char(now(), 'YY')::smallint;
  next_sequence integer;
  issued_member_number text;
  target_user_id uuid;
begin
  insert into public.member_number_sequences(year, last_sequence)
  values (sequence_year, 0)
  on conflict (year) do nothing;

  select greatest(
    mns.last_sequence,
    coalesce(max(substring(u.member_number from 4 for 4)::integer), 0)
  )
  into next_sequence
  from public.member_number_sequences mns
  left join public.users u
    on u.member_number like lpad(sequence_year::text, 2, '0') || '-%'
  where mns.year = sequence_year
  group by mns.last_sequence;

  for target_user_id in
    select id
    from public.users
    where role = 'admin'
      and (member_number is null or approved_at is null)
    order by created_at
  loop
    next_sequence := next_sequence + 1;

    if next_sequence > 9999 then
      raise exception 'member number sequence exhausted for year %', sequence_year;
    end if;

    issued_member_number := lpad(sequence_year::text, 2, '0') || '-' || lpad(next_sequence::text, 4, '0');

    update public.users
    set member_number = coalesce(member_number, issued_member_number),
        approved_at = coalesce(approved_at, now())
    where id = target_user_id;
  end loop;

  update public.member_number_sequences
  set last_sequence = next_sequence
  where year = sequence_year;
end;
$$;

alter table public.users
  add constraint users_member_number_required_for_member_check
    check (
      (role in ('member', 'admin') and member_number is not null and approved_at is not null)
      or (role = 'pending' and member_number is null)
    ),
  add constraint users_approval_metadata_check
    check (
      (role in ('member', 'admin') and approved_at is not null)
      or (role = 'pending' and approved_at is null and approved_by is null)
    );


-- =============================================================================
-- withdrawn_users
-- =============================================================================
-- 탈퇴한 준회원/회원의 관리자 조회용 보관 정보다.
-- 재가입 시 기존 auth.users.id와 연결하지 않는 신규 절차를 허용하기 위해
-- 스냅샷으로 저장한다(외래키 없이 user_id만 기록).
-- =============================================================================

create table if not exists public.withdrawn_users (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid,                    -- 탈퇴 당시 Auth user id (참조 없이 보관)
  role          public.user_role not null,
  member_number text,
  name          text        not null,
  phone         text        not null,
  email         text        not null,
  withdrawn_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  constraint withdrawn_users_role_check
    check (role in ('pending', 'member')),
  constraint withdrawn_users_member_number_format_check
    check (member_number is null or member_number ~ '^\d{2}-\d{4}$')
);

create index if not exists withdrawn_users_withdrawn_at_idx on public.withdrawn_users(withdrawn_at desc);
create index if not exists withdrawn_users_email_idx        on public.withdrawn_users(email);


-- =============================================================================
-- volunteer_activities
-- =============================================================================
-- 관리자가 개설하는 봉사활동이다.
-- 봉사활동과 교육은 구조가 같지만 화면과 관리 경로가 분리되어 있어 별도 테이블로 둔다.
--
-- 이미지 파일은 Supabase Storage volunteer bucket에 저장하고,
-- image_path에는 bucket 내부 object path만 저장한다.
-- =============================================================================

create table if not exists public.volunteer_activities (
  id                   uuid        primary key default gen_random_uuid(),
  title                text        not null,
  description          text,
  image_path           text,
  location             text        not null,
  application_deadline timestamptz not null,
  starts_at            timestamptz not null,
  ends_at              timestamptz not null,
  capacity             integer     not null,    -- 정원 초과 신청 허용; 관리자 판단용 값
  is_closed            boolean     not null default false,
  closed_at            timestamptz,
  created_by           uuid        references public.users(id) on delete set null,
  updated_by           uuid        references public.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint volunteer_activities_capacity_check
    check (capacity > 0),
  constraint volunteer_activities_schedule_check
    check (application_deadline <= starts_at and starts_at < ends_at),
  constraint volunteer_activities_closed_at_check
    check (
      (is_closed = false and closed_at is null)
      or (is_closed = true and closed_at is not null)
    ),
  constraint volunteer_activities_image_path_check
    check (
      image_path is null
      or (
        image_path <> ''
        and image_path !~ '(^|/)\.\.(/|$)'
        and image_path !~ '^/'
      )
    )
);

create index if not exists volunteer_activities_deadline_idx on public.volunteer_activities(application_deadline);
create index if not exists volunteer_activities_starts_at_idx on public.volunteer_activities(starts_at);
create index if not exists volunteer_activities_open_idx
  on public.volunteer_activities(application_deadline)
  where is_closed = false;


-- =============================================================================
-- volunteer_applications
-- =============================================================================
-- 봉사활동 신청 내역이다.
-- 한 사용자는 같은 봉사활동에 하나의 신청 row만 가진다.
--
-- 구현 시 주의:
--   - 사용자의 신청 취소는 마감 전만 허용해야 하므로
--     클라이언트 검증 외에 DB 함수 또는 Edge Function에서 검증하는 편이 안전하다.
--   - 관리자 신청 처리도 상태 전이를 DB 함수 또는 Edge Function에서 검증하는 편이 안전하다.
-- =============================================================================

create table if not exists public.volunteer_applications (
  id                    uuid                    primary key default gen_random_uuid(),
  volunteer_activity_id uuid                    not null references public.volunteer_activities(id) on delete cascade,
  user_id               uuid                    not null references public.users(id) on delete cascade,
  status                public.application_status not null default 'pending',
  decided_at            timestamptz,            -- 수락/거절/관리자 취소 처리 일시
  decided_by            uuid                    references public.users(id) on delete set null,
  cancelled_at          timestamptz,
  cancelled_by          uuid                    references public.users(id) on delete set null,
  cancellation_reason   text,
  created_at            timestamptz             not null default now(),
  updated_at            timestamptz             not null default now(),
  constraint volunteer_applications_unique_user_activity
    unique (volunteer_activity_id, user_id),
  constraint volunteer_applications_pending_check
    check (
      status <> 'pending'
      or (
        decided_at is null
        and decided_by is null
        and cancelled_at is null
        and cancelled_by is null
        and cancellation_reason is null
      )
    ),
  constraint volunteer_applications_decision_check
    check (
      status not in ('accepted', 'rejected')
      or (decided_at is not null and decided_by is not null)
    ),
  constraint volunteer_applications_cancelled_check
    check (
      status <> 'cancelled'
      or cancelled_at is not null
    ),
  constraint volunteer_applications_cancelled_by_check
    check (
      status = 'cancelled'
      or cancelled_by is null
    )
);

create index if not exists volunteer_applications_user_status_idx     on public.volunteer_applications(user_id, status);
create index if not exists volunteer_applications_activity_status_idx on public.volunteer_applications(volunteer_activity_id, status);
create index if not exists volunteer_applications_created_at_idx      on public.volunteer_applications(created_at desc);


-- =============================================================================
-- educations
-- =============================================================================
-- 관리자가 개설하는 교육이다.
-- 봉사활동과 구조가 같지만 화면과 관리 경로가 분리되어 있어 별도 테이블로 둔다.
--
-- 이미지 파일은 Supabase Storage volunteer bucket에 저장하고,
-- image_path에는 bucket 내부 object path만 저장한다.
-- =============================================================================

create table if not exists public.educations (
  id                   uuid        primary key default gen_random_uuid(),
  title                text        not null,
  description          text,
  image_path           text,
  location             text        not null,
  application_deadline timestamptz not null,
  starts_at            timestamptz not null,
  ends_at              timestamptz not null,
  capacity             integer     not null,    -- 정원 초과 신청 허용; 관리자 판단용 값
  is_closed            boolean     not null default false,
  closed_at            timestamptz,
  created_by           uuid        references public.users(id) on delete set null,
  updated_by           uuid        references public.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint educations_capacity_check
    check (capacity > 0),
  constraint educations_schedule_check
    check (application_deadline <= starts_at and starts_at < ends_at),
  constraint educations_closed_at_check
    check (
      (is_closed = false and closed_at is null)
      or (is_closed = true and closed_at is not null)
    ),
  constraint educations_image_path_check
    check (
      image_path is null
      or (
        image_path <> ''
        and image_path !~ '(^|/)\.\.(/|$)'
        and image_path !~ '^/'
      )
    )
);

create index if not exists educations_deadline_idx on public.educations(application_deadline);
create index if not exists educations_starts_at_idx on public.educations(starts_at);
create index if not exists educations_open_idx
  on public.educations(application_deadline)
  where is_closed = false;


-- =============================================================================
-- education_applications
-- =============================================================================
-- 교육 신청 내역이다.
-- 한 사용자는 같은 교육에 하나의 신청 row만 가진다.
--
-- 구현 시 주의:
--   - 사용자의 신청 취소는 마감 전만 허용해야 하므로
--     클라이언트 검증 외에 DB 함수 또는 Edge Function에서 검증하는 편이 안전하다.
--   - 관리자 신청 처리도 상태 전이를 DB 함수 또는 Edge Function에서 검증하는 편이 안전하다.
-- =============================================================================

create table if not exists public.education_applications (
  id                  uuid                    primary key default gen_random_uuid(),
  education_id        uuid                    not null references public.educations(id) on delete cascade,
  user_id             uuid                    not null references public.users(id) on delete cascade,
  status              public.application_status not null default 'pending',
  decided_at          timestamptz,            -- 수락/거절/관리자 취소 처리 일시
  decided_by          uuid                    references public.users(id) on delete set null,
  cancelled_at        timestamptz,
  cancelled_by        uuid                    references public.users(id) on delete set null,
  cancellation_reason text,
  created_at          timestamptz             not null default now(),
  updated_at          timestamptz             not null default now(),
  constraint education_applications_unique_user_education
    unique (education_id, user_id),
  constraint education_applications_pending_check
    check (
      status <> 'pending'
      or (
        decided_at is null
        and decided_by is null
        and cancelled_at is null
        and cancelled_by is null
        and cancellation_reason is null
      )
    ),
  constraint education_applications_decision_check
    check (
      status not in ('accepted', 'rejected')
      or (decided_at is not null and decided_by is not null)
    ),
  constraint education_applications_cancelled_check
    check (
      status <> 'cancelled'
      or cancelled_at is not null
    ),
  constraint education_applications_cancelled_by_check
    check (
      status = 'cancelled'
      or cancelled_by is null
    )
);

create index if not exists education_applications_user_status_idx      on public.education_applications(user_id, status);
create index if not exists education_applications_education_status_idx on public.education_applications(education_id, status);
create index if not exists education_applications_created_at_idx       on public.education_applications(created_at desc);


-- =============================================================================
-- updated_at Trigger
-- =============================================================================
-- 모든 테이블의 updated_at을 자동 갱신하는 공통 함수다.
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists set_member_number_sequences_updated_at on public.member_number_sequences;
create trigger set_member_number_sequences_updated_at
  before update on public.member_number_sequences
  for each row execute function public.set_updated_at();

drop trigger if exists set_volunteer_activities_updated_at on public.volunteer_activities;
create trigger set_volunteer_activities_updated_at
  before update on public.volunteer_activities
  for each row execute function public.set_updated_at();

drop trigger if exists set_volunteer_applications_updated_at on public.volunteer_applications;
create trigger set_volunteer_applications_updated_at
  before update on public.volunteer_applications
  for each row execute function public.set_updated_at();

drop trigger if exists set_educations_updated_at on public.educations;
create trigger set_educations_updated_at
  before update on public.educations
  for each row execute function public.set_updated_at();

drop trigger if exists set_education_applications_updated_at on public.education_applications;
create trigger set_education_applications_updated_at
  before update on public.education_applications
  for each row execute function public.set_updated_at();


-- =============================================================================
-- RLS 활성화
-- =============================================================================

alter table public.users                    enable row level security;
alter table public.member_number_sequences  enable row level security;
alter table public.withdrawn_users          enable row level security;
alter table public.volunteer_activities     enable row level security;
alter table public.volunteer_applications   enable row level security;
alter table public.educations               enable row level security;
alter table public.education_applications   enable row level security;


-- =============================================================================
-- Data API Grants
-- =============================================================================
-- RLS가 row 접근을 제한하고, GRANT는 authenticated 역할이 Data API로 접근할 수
-- 있는 객체 범위를 제한한다. anon은 현재 공개 데이터 접근 요구가 없어 부여하지 않는다.
-- =============================================================================

grant usage on schema public to authenticated;
grant usage on type public.user_role to authenticated;
grant usage on type public.application_status to authenticated;

grant select, insert, update on table public.users to authenticated;
grant select on table public.withdrawn_users to authenticated;
grant select, insert, update, delete on table public.volunteer_activities to authenticated;
grant select, insert, update on table public.volunteer_applications to authenticated;
grant select, insert, update, delete on table public.educations to authenticated;
grant select, insert, update on table public.education_applications to authenticated;


-- =============================================================================
-- 관리자 판별 헬퍼 함수
-- =============================================================================
-- users 테이블 정책에서 재귀가 발생하지 않도록 private 스키마에 둔다.
-- authenticated 역할에만 execute 권한을 부여하고 public에는 노출하지 않는다.
-- =============================================================================

create schema if not exists private;

create or replace function private.is_active_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from users
    where id = (select auth.uid())
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from users
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_active_user() from public;
revoke all on function private.is_admin() from public;
revoke all on function public.set_updated_at() from public;
grant usage  on schema private              to authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.is_admin() to authenticated;


-- =============================================================================
-- RPC Functions
-- =============================================================================
-- 권한이 중요한 상태 전이는 클라이언트의 직접 update 대신 함수로 처리한다.
-- =============================================================================

create or replace function public.approve_member(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  sequence_year smallint := to_char(now(), 'YY')::smallint;
  next_sequence integer;
  issued_member_number text;
  target_profile public.users%rowtype;
begin
  if not private.is_admin() then
    raise exception 'admin permission required';
  end if;

  select *
  into target_profile
  from public.users
  where id = target_user_id
    and role = 'pending'
  for update;

  if not found then
    raise exception 'target user is not an active pending user';
  end if;

  insert into public.member_number_sequences(year, last_sequence)
  values (sequence_year, 0)
  on conflict (year) do nothing;

  select last_sequence + 1
  into next_sequence
  from public.member_number_sequences
  where year = sequence_year
  for update;

  if next_sequence > 9999 then
    raise exception 'member number sequence exhausted for year %', sequence_year;
  end if;

  update public.member_number_sequences
  set last_sequence = next_sequence
  where year = sequence_year;

  issued_member_number := lpad(sequence_year::text, 2, '0') || '-' || lpad(next_sequence::text, 4, '0');

  update public.users
  set role = 'member',
      member_number = issued_member_number,
      approved_at = now(),
      approved_by = (select auth.uid())
  where id = target_user_id
    and role = 'pending';

  if not found then
    raise exception 'target user approval failed';
  end if;

  return issued_member_number;
end;
$$;

create or replace function public.grant_admin(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  sequence_year smallint := to_char(now(), 'YY')::smallint;
  next_sequence integer;
  issued_member_number text;
  target_profile public.users%rowtype;
begin
  if not private.is_admin() then
    raise exception 'admin permission required';
  end if;

  select *
  into target_profile
  from public.users
  where id = target_user_id
    and role in ('pending', 'member')
  for update;

  if not found then
    raise exception 'target user is not an active pending or member user';
  end if;

  if target_profile.role = 'member' then
    update public.users
    set role = 'admin'
    where id = target_user_id
      and role = 'member';

    if not found then
      raise exception 'target user admin grant failed';
    end if;

    return target_profile.member_number;
  end if;

  insert into public.member_number_sequences(year, last_sequence)
  values (sequence_year, 0)
  on conflict (year) do nothing;

  select last_sequence + 1
  into next_sequence
  from public.member_number_sequences
  where year = sequence_year
  for update;

  if next_sequence > 9999 then
    raise exception 'member number sequence exhausted for year %', sequence_year;
  end if;

  update public.member_number_sequences
  set last_sequence = next_sequence
  where year = sequence_year;

  issued_member_number := lpad(sequence_year::text, 2, '0') || '-' || lpad(next_sequence::text, 4, '0');

  update public.users
  set role = 'admin',
      member_number = issued_member_number,
      approved_at = now(),
      approved_by = (select auth.uid())
  where id = target_user_id
    and role = 'pending';

  if not found then
    raise exception 'target user admin grant failed';
  end if;

  return issued_member_number;
end;
$$;

create or replace function public.update_own_profile(
  new_name text,
  new_phone text,
  new_email text,
  new_address text,
  new_workplace_or_school text,
  new_license_number text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_active_user() then
    raise exception 'active user required';
  end if;

  update public.users
  set name = new_name,
      phone = new_phone,
      email = new_email,
      address = new_address,
      workplace_or_school = new_workplace_or_school,
      license_number = new_license_number
  where id = (select auth.uid())
    and role in ('pending', 'member');

  if not found then
    raise exception 'profile cannot be updated';
  end if;
end;
$$;

create or replace function public.cancel_own_volunteer_application(application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_active_user() then
    raise exception 'active user required';
  end if;

  update public.volunteer_applications va
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = (select auth.uid())
  from public.volunteer_activities activity
  where va.id = application_id
    and va.volunteer_activity_id = activity.id
    and va.user_id = (select auth.uid())
    and va.status = 'pending'
    and activity.application_deadline > now();

  if not found then
    raise exception 'volunteer application cannot be cancelled';
  end if;
end;
$$;

create or replace function public.withdraw_current_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.users%rowtype;
begin
  select *
  into current_profile
  from public.users
  where id = (select auth.uid())
    and role in ('pending', 'member')
  for update;

  if not found then
    raise exception 'active withdrawable user required';
  end if;

  insert into public.withdrawn_users (
    user_id,
    role,
    member_number,
    name,
    phone,
    email,
    withdrawn_at
  )
  values (
    current_profile.id,
    current_profile.role,
    current_profile.member_number,
    current_profile.name,
    current_profile.phone,
    current_profile.email,
    now()
  );

  delete from public.users
  where id = current_profile.id;
end;
$$;

create or replace function public.cancel_own_education_application(application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_active_user() then
    raise exception 'active user required';
  end if;

  update public.education_applications ea
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = (select auth.uid())
  from public.educations education
  where ea.id = application_id
    and ea.education_id = education.id
    and ea.user_id = (select auth.uid())
    and ea.status = 'pending'
    and education.application_deadline > now();

  if not found then
    raise exception 'education application cannot be cancelled';
  end if;
end;
$$;

create or replace function public.decide_volunteer_application(
  application_id uuid,
  next_status public.application_status,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then
    raise exception 'admin permission required';
  end if;

  if next_status not in ('accepted', 'rejected', 'cancelled') then
    raise exception 'unsupported application status';
  end if;

  if next_status in ('accepted', 'rejected') then
    update public.volunteer_applications
    set status = next_status,
        decided_at = now(),
        decided_by = (select auth.uid()),
        cancelled_at = null,
        cancelled_by = null,
        cancellation_reason = null
    where id = application_id
      and status in ('pending', 'accepted', 'rejected', 'cancelled');
  else
    update public.volunteer_applications
    set status = 'cancelled',
        cancelled_at = now(),
        cancelled_by = (select auth.uid()),
        cancellation_reason = reason,
        decided_at = null,
        decided_by = null
    where id = application_id
      and status in ('pending', 'accepted', 'rejected', 'cancelled');
  end if;

  if not found then
    raise exception 'volunteer application cannot be decided';
  end if;
end;
$$;

create or replace function public.decide_education_application(
  application_id uuid,
  next_status public.application_status,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then
    raise exception 'admin permission required';
  end if;

  if next_status not in ('accepted', 'rejected', 'cancelled') then
    raise exception 'unsupported application status';
  end if;

  if next_status in ('accepted', 'rejected') then
    update public.education_applications
    set status = next_status,
        decided_at = now(),
        decided_by = (select auth.uid()),
        cancelled_at = null,
        cancelled_by = null,
        cancellation_reason = null
    where id = application_id
      and status in ('pending', 'accepted', 'rejected', 'cancelled');
  else
    update public.education_applications
    set status = 'cancelled',
        cancelled_at = now(),
        cancelled_by = (select auth.uid()),
        cancellation_reason = reason,
        decided_at = null,
        decided_by = null
    where id = application_id
      and status in ('pending', 'accepted', 'rejected', 'cancelled');
  end if;

  if not found then
    raise exception 'education application cannot be decided';
  end if;
end;
$$;

revoke all on function public.approve_member(uuid) from public;
revoke all on function public.grant_admin(uuid) from public;
revoke all on function public.update_own_profile(text, text, text, text, text, text) from public;
revoke all on function public.cancel_own_volunteer_application(uuid) from public;
revoke all on function public.withdraw_current_user() from public;
revoke all on function public.cancel_own_education_application(uuid) from public;
revoke all on function public.decide_volunteer_application(uuid, public.application_status, text) from public;
revoke all on function public.decide_education_application(uuid, public.application_status, text) from public;

grant execute on function public.approve_member(uuid) to authenticated;
grant execute on function public.grant_admin(uuid) to authenticated;
grant execute on function public.update_own_profile(text, text, text, text, text, text) to authenticated;
grant execute on function public.cancel_own_volunteer_application(uuid) to authenticated;
grant execute on function public.withdraw_current_user() to authenticated;
grant execute on function public.cancel_own_education_application(uuid) to authenticated;
grant execute on function public.decide_volunteer_application(uuid, public.application_status, text) to authenticated;
grant execute on function public.decide_education_application(uuid, public.application_status, text) to authenticated;


-- =============================================================================
-- RLS Policies
-- =============================================================================

-- users
-- 일반 사용자의 프로필 수정은 role/member_number 변경을 막기 위해
-- 별도 RPC 또는 컬럼 권한으로 제한한다.
drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
  on public.users for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Admins can read users" on public.users;
create policy "Admins can read users"
  on public.users for select
  to authenticated
  using (private.is_admin());

drop policy if exists "Users can create own profile" on public.users;
create policy "Users can create own profile"
  on public.users for insert
  to authenticated
  with check (
    id = (select auth.uid())
    and role = 'pending'
    and member_number is null
    and approved_at is null
    and approved_by is null
  );

drop policy if exists "Admins can update users" on public.users;
create policy "Admins can update users"
  on public.users for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- volunteer_activities
drop policy if exists "Active users can read open volunteer activities" on public.volunteer_activities;
create policy "Active users can read open volunteer activities"
  on public.volunteer_activities for select
  to authenticated
  using (
    is_closed = false
    and private.is_active_user()
  );

drop policy if exists "Admins can read volunteer activities" on public.volunteer_activities;
create policy "Admins can read volunteer activities"
  on public.volunteer_activities for select
  to authenticated
  using (private.is_admin());

drop policy if exists "Admins can create volunteer activities" on public.volunteer_activities;
create policy "Admins can create volunteer activities"
  on public.volunteer_activities for insert
  to authenticated
  with check (private.is_admin());

drop policy if exists "Admins can update volunteer activities" on public.volunteer_activities;
create policy "Admins can update volunteer activities"
  on public.volunteer_activities for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Admins can delete volunteer activities" on public.volunteer_activities;
create policy "Admins can delete volunteer activities"
  on public.volunteer_activities for delete
  to authenticated
  using (private.is_admin());

-- educations
drop policy if exists "Active users can read open educations" on public.educations;
create policy "Active users can read open educations"
  on public.educations for select
  to authenticated
  using (
    is_closed = false
    and private.is_active_user()
  );

drop policy if exists "Admins can read educations" on public.educations;
create policy "Admins can read educations"
  on public.educations for select
  to authenticated
  using (private.is_admin());

drop policy if exists "Admins can create educations" on public.educations;
create policy "Admins can create educations"
  on public.educations for insert
  to authenticated
  with check (private.is_admin());

drop policy if exists "Admins can update educations" on public.educations;
create policy "Admins can update educations"
  on public.educations for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Admins can delete educations" on public.educations;
create policy "Admins can delete educations"
  on public.educations for delete
  to authenticated
  using (private.is_admin());

-- volunteer_applications
-- 신청 취소와 관리자 상태 처리는 RPC 함수로 상태 전이를 검증한다.
drop policy if exists "Users can read own volunteer applications" on public.volunteer_applications;
create policy "Users can read own volunteer applications"
  on public.volunteer_applications for select
  to authenticated
  using (user_id = (select auth.uid()) and private.is_active_user());

drop policy if exists "Admins can read volunteer applications" on public.volunteer_applications;
create policy "Admins can read volunteer applications"
  on public.volunteer_applications for select
  to authenticated
  using (private.is_admin());

drop policy if exists "Users can apply to volunteer activities" on public.volunteer_applications;
create policy "Users can apply to volunteer activities"
  on public.volunteer_applications for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and private.is_active_user()
    and exists (
      select 1 from public.volunteer_activities
      where id = volunteer_activity_id
        and is_closed = false
        and application_deadline > now()
    )
  );

-- Application state changes are restricted to RPC functions.

-- education_applications
-- 신청 취소와 관리자 상태 처리는 RPC 함수로 상태 전이를 검증한다.
drop policy if exists "Users can read own education applications" on public.education_applications;
create policy "Users can read own education applications"
  on public.education_applications for select
  to authenticated
  using (user_id = (select auth.uid()) and private.is_active_user());

drop policy if exists "Admins can read education applications" on public.education_applications;
create policy "Admins can read education applications"
  on public.education_applications for select
  to authenticated
  using (private.is_admin());

drop policy if exists "Users can apply to educations" on public.education_applications;
create policy "Users can apply to educations"
  on public.education_applications for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and private.is_active_user()
    and exists (
      select 1 from public.educations
      where id = education_id
        and is_closed = false
        and application_deadline > now()
    )
  );

-- Application state changes are restricted to RPC functions.

-- Re-apply after self-cancellation
drop policy if exists "Users can re-apply after cancellation" on public.volunteer_applications;
create policy "Users can re-apply after cancellation"
  on public.volunteer_applications for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'cancelled'
    and private.is_active_user()
  )
  with check (
    status = 'pending'
    and user_id = (select auth.uid())
    and exists (
      select 1 from public.volunteer_activities
      where id = volunteer_activity_id
        and is_closed = false
        and application_deadline > now()
    )
  );

drop policy if exists "Users can re-apply after cancellation" on public.education_applications;
create policy "Users can re-apply after cancellation"
  on public.education_applications for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'cancelled'
    and private.is_active_user()
  )
  with check (
    status = 'pending'
    and user_id = (select auth.uid())
    and exists (
      select 1 from public.educations
      where id = education_id
        and is_closed = false
        and application_deadline > now()
    )
  );

-- withdrawn_users / member_number_sequences
drop policy if exists "Admins can read withdrawn users" on public.withdrawn_users;
create policy "Admins can read withdrawn users"
  on public.withdrawn_users for select
  to authenticated
  using (private.is_admin());

-- =============================================================================
-- Storage Policies
-- =============================================================================
-- Supabase Storage bucket id: volunteer
-- Public bucket으로 생성하고, 파일 조회는 공개 URL을 사용한다.
-- 업로드/교체/삭제는 관리자만 허용한다.
-- =============================================================================

drop policy if exists "Admins can read volunteer bucket objects" on storage.objects;
create policy "Admins can read volunteer bucket objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'volunteer'
    and private.is_admin()
  );

drop policy if exists "Admins can upload volunteer bucket objects" on storage.objects;
create policy "Admins can upload volunteer bucket objects"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'volunteer'
    and private.is_admin()
  );

drop policy if exists "Admins can update volunteer bucket objects" on storage.objects;
create policy "Admins can update volunteer bucket objects"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'volunteer'
    and private.is_admin()
  )
  with check (
    bucket_id = 'volunteer'
    and private.is_admin()
  );

drop policy if exists "Admins can delete volunteer bucket objects" on storage.objects;
create policy "Admins can delete volunteer bucket objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'volunteer'
    and private.is_admin()
  );
