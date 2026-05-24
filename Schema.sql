-- =============================================================================
-- Database Schema
-- =============================================================================
--
-- 설계 기준:
--   - OAuth 계정 식별자는 auth.users.id를 참조한다.
--   - 앱 사용자는 pending, member, admin 역할 중 하나를 가진다.
--   - 최초 가입 정보 입력 후에는 pending으로 생성된다.
--   - 관리자가 승인 시 회원번호(YY-NNNN)를 입력하면 member로 전환된다.
--   - 관리자는 users.role = 'admin'으로 판별한다.
--   - 탈퇴 사용자는 users에서 hard delete하고 관리자 조회용 스냅샷은
--     withdrawn_users에만 보관한다.
--   - 봉사활동과 교육은 구조가 같지만 화면과 관리 경로가 분리되어 있으므로
--     별도 테이블로 둔다.
--   - 신청 상태는 pending, accepted, rejected, cancelled로 제한한다.
--   - 정원 초과 신청은 허용한다. 정원은 관리자 판단용 값이다.
--
-- Storage:
--   - 이미지 bucket id는 volunteer, education, avatars 세 개다.
--   - image_path에는 각 bucket 내부 object path만 저장한다.
-- =============================================================================


-- =============================================================================
-- 1. Extensions
-- =============================================================================

create extension if not exists pgcrypto;


-- =============================================================================
-- 2. Storage Buckets
-- =============================================================================

insert into storage.buckets (id, name, public)
values
  ('volunteer', 'volunteer', true),
  ('education', 'education', true),
  ('avatars', 'avatars', true)
on conflict (id) do update
set public = excluded.public;


-- =============================================================================
-- 3. Enum Types
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

do $$
begin
  create type public.notification_type as enum (
    'new_activity',
    'deadline_approaching',
    'application_accepted',
    'application_rejected',
    'member_approved',
    'new_member_registered',
    'new_admin_granted',
    'activity_capacity_full'
  );
exception
  when duplicate_object then null;
end;
$$;


-- =============================================================================
-- 4. Tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 4.1 users
-- ---------------------------------------------------------------------------
-- OAuth 로그인 후 가입 정보 입력을 완료한 앱 사용자 프로필이다.
-- Supabase Auth를 인증 원천으로 두고, 앱에서 필요한 가입 정보와 권한을 여기에 저장한다.
--
-- 구현 시 주의:
--   - 회원 승인 시 관리자가 회원번호(YY-NNNN 형식)를 직접 입력한다.
--   - 탈퇴 시 withdrawn_users에 스냅샷을 먼저 insert한 뒤 users row를 삭제한다.
--   - 일반 사용자의 프로필 수정은 role/member_number 변경을 막기 위해
--     컬럼 권한 또는 별도 RPC/Edge Function으로 제한한다.
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id                   uuid              primary key references auth.users(id) on delete cascade,
  role                 public.user_role  not null default 'pending',
  member_number        text              unique,
  name                 text              not null,
  phone                text              not null,
  email                text              not null,
  address              text              not null,
  address_detail       text              not null default '',
  workplace_or_school  text              not null,
  license_number       text,
  birthday             date not null,
  volunteer_experience text,
  education_experience text,
  avatar_path          text,
  user_chip            text,
  memo                 text,
  approved_at          timestamptz,
  approved_by          uuid              references public.users(id) on delete set null,
  created_at           timestamptz       not null default now(),
  updated_at           timestamptz       not null default now(),
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
create index if not exists users_approved_by_idx on public.users(approved_by);


-- ---------------------------------------------------------------------------
-- 4.2 withdrawn_users
-- ---------------------------------------------------------------------------
-- 탈퇴한 준회원/회원의 관리자 조회용 보관 정보다.
-- 재가입 시 기존 auth.users.id와 연결하지 않는 신규 절차를 허용하기 위해
-- 스냅샷으로 저장한다(외래키 없이 user_id만 기록).
-- ---------------------------------------------------------------------------

create table if not exists public.withdrawn_users (
  id                   uuid              primary key default gen_random_uuid(),
  user_id              uuid,
  role                 public.user_role  not null,
  member_number        text,
  name                 text              not null,
  phone                text              not null,
  email                text              not null,
  volunteer_experience text,
  education_experience text,
  withdrawn_at         timestamptz       not null default now(),
  created_at           timestamptz       not null default now(),
  constraint withdrawn_users_role_check
    check (role in ('pending', 'member')),
  constraint withdrawn_users_member_number_format_check
    check (member_number is null or member_number ~ '^\d{2}-\d{4}$')
);

create index if not exists withdrawn_users_withdrawn_at_idx on public.withdrawn_users(withdrawn_at desc);
create index if not exists withdrawn_users_email_idx        on public.withdrawn_users(email);


-- ---------------------------------------------------------------------------
-- 4.3 volunteer_activities
-- ---------------------------------------------------------------------------
-- 관리자가 개설하는 봉사활동이다.
-- 봉사활동과 교육은 구조가 같지만 화면과 관리 경로가 분리되어 있어 별도 테이블로 둔다.
--
-- 이미지 파일은 Supabase Storage volunteer bucket에 저장하고,
-- image_path에는 volunteer bucket 내부 object path만 저장한다.
-- ---------------------------------------------------------------------------

create table if not exists public.volunteer_activities (
  id                   uuid          primary key default gen_random_uuid(),
  title                text          not null,
  description          text,
  image_path           text,
  location             text          not null,
  application_deadline timestamptz   not null,
  starts_at            date          not null,
  ends_at              date          not null,
  capacity             integer       not null,
  chat_link            text,
  created_by           uuid          references public.users(id) on delete set null,
  updated_by           uuid          references public.users(id) on delete set null,
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now(),
  constraint volunteer_activities_capacity_check
    check (capacity > 0),
  constraint volunteer_activities_schedule_check
    check (application_deadline::date <= starts_at and starts_at <= ends_at),
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

create index if not exists volunteer_activities_deadline_idx  on public.volunteer_activities(application_deadline);
create index if not exists volunteer_activities_starts_at_idx on public.volunteer_activities(starts_at);
create index if not exists volunteer_activities_created_by_idx on public.volunteer_activities(created_by);
create index if not exists volunteer_activities_updated_by_idx on public.volunteer_activities(updated_by);


-- ---------------------------------------------------------------------------
-- 4.4 volunteer_applications
-- ---------------------------------------------------------------------------
-- 봉사활동 신청 내역이다.
-- 한 사용자는 같은 봉사활동에 하나의 신청 row만 가진다.
--
-- 구현 시 주의:
--   - 사용자의 신청 취소는 마감 전만 허용해야 하므로
--     클라이언트 검증 외에 DB 함수 또는 Edge Function에서 검증하는 편이 안전하다.
--   - 관리자 신청 처리도 상태 전이를 DB 함수 또는 Edge Function에서 검증하는 편이 안전하다.
-- ---------------------------------------------------------------------------

create table if not exists public.volunteer_applications (
  id                    uuid                      primary key default gen_random_uuid(),
  volunteer_activity_id uuid                      not null references public.volunteer_activities(id) on delete cascade,
  user_id               uuid                      not null references public.users(id) on delete cascade,
  status                public.application_status not null default 'pending',
  decided_at            timestamptz,
  decided_by            uuid                      references public.users(id) on delete set null,
  cancelled_at          timestamptz,
  cancelled_by          uuid                      references public.users(id) on delete set null,
  cancellation_reason   text,
  created_at            timestamptz               not null default now(),
  updated_at            timestamptz               not null default now(),
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
create index if not exists volunteer_applications_decided_by_idx      on public.volunteer_applications(decided_by);
create index if not exists volunteer_applications_cancelled_by_idx    on public.volunteer_applications(cancelled_by);


-- ---------------------------------------------------------------------------
-- 4.5 educations
-- ---------------------------------------------------------------------------
-- 관리자가 개설하는 교육이다.
-- 봉사활동과 구조가 같지만 화면과 관리 경로가 분리되어 있어 별도 테이블로 둔다.
--
-- 이미지 파일은 Supabase Storage education bucket에 저장하고,
-- image_path에는 education bucket 내부 object path만 저장한다.
-- ---------------------------------------------------------------------------

create table if not exists public.educations (
  id                   uuid          primary key default gen_random_uuid(),
  title                text          not null,
  description          text,
  image_path           text,
  location             text          not null,
  application_deadline timestamptz   not null,
  starts_at            date          not null,
  ends_at              date          not null,
  capacity             integer       not null,
  chat_link            text,
  created_by           uuid          references public.users(id) on delete set null,
  updated_by           uuid          references public.users(id) on delete set null,
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now(),
  constraint educations_capacity_check
    check (capacity > 0),
  constraint educations_schedule_check
    check (application_deadline::date <= starts_at and starts_at <= ends_at),
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

create index if not exists educations_deadline_idx  on public.educations(application_deadline);
create index if not exists educations_starts_at_idx on public.educations(starts_at);
create index if not exists educations_created_by_idx on public.educations(created_by);
create index if not exists educations_updated_by_idx on public.educations(updated_by);


-- ---------------------------------------------------------------------------
-- 4.6 education_applications
-- ---------------------------------------------------------------------------
-- 교육 신청 내역이다.
-- 한 사용자는 같은 교육에 하나의 신청 row만 가진다.
--
-- 구현 시 주의:
--   - 사용자의 신청 취소는 마감 전만 허용해야 하므로
--     클라이언트 검증 외에 DB 함수 또는 Edge Function에서 검증하는 편이 안전하다.
--   - 관리자 신청 처리도 상태 전이를 DB 함수 또는 Edge Function에서 검증하는 편이 안전하다.
-- ---------------------------------------------------------------------------

create table if not exists public.education_applications (
  id                    uuid                      primary key default gen_random_uuid(),
  education_id          uuid                      not null references public.educations(id) on delete cascade,
  user_id               uuid                      not null references public.users(id) on delete cascade,
  status                public.application_status not null default 'pending',
  decided_at            timestamptz,
  decided_by            uuid                      references public.users(id) on delete set null,
  cancelled_at          timestamptz,
  cancelled_by          uuid                      references public.users(id) on delete set null,
  cancellation_reason   text,
  created_at            timestamptz               not null default now(),
  updated_at            timestamptz               not null default now(),
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
create index if not exists education_applications_decided_by_idx       on public.education_applications(decided_by);
create index if not exists education_applications_cancelled_by_idx     on public.education_applications(cancelled_by);


-- ---------------------------------------------------------------------------
-- 4.7 notifications
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id         uuid                    primary key default gen_random_uuid(),
  user_id    uuid                    not null references public.users(id) on delete cascade,
  type       public.notification_type not null,
  title      text                    not null,
  body       text,
  data       jsonb,
  is_read    boolean                 not null default false,
  created_at timestamptz             not null default now(),
  read_at    timestamptz
);

create index if not exists idx_notifications_user
  on public.notifications(user_id, created_at desc);

create index if not exists idx_notifications_unread
  on public.notifications(user_id) where not is_read;

create index if not exists idx_notifications_type
  on public.notifications(type);

create index if not exists idx_notifications_deadline_dedup
  on public.notifications(type, (data->>'activity_id'), (data->>'hours'));


-- ---------------------------------------------------------------------------
-- 4.8 device_tokens
-- ---------------------------------------------------------------------------
-- Web Push 알림용 디바이스 토큰 저장.
-- endpoint는 고유 식별자로 사용되며(user_id + endpoint unique),
-- token은 Web Push 인증 정보(jsonb)를 저장한다.
-- ---------------------------------------------------------------------------

create table if not exists public.device_tokens (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  endpoint   text        not null,
  token      jsonb       not null,
  platform   text        not null check (platform in ('web', 'ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists idx_device_tokens_user on public.device_tokens(user_id);


-- ---------------------------------------------------------------------------
-- 4.9 push_config
-- ---------------------------------------------------------------------------
-- Push 알림에 필요한 설정값(key-value 저장).
-- send-push Edge Function URL과 VAPID 키를 보관한다.
-- ---------------------------------------------------------------------------

create table if not exists public.push_config (
  key        text        primary key,
  value      text        not null,
  updated_at timestamptz not null default now()
);


-- =============================================================================
-- 5. updated_at Trigger
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

drop trigger if exists set_device_tokens_updated_at on public.device_tokens;
create trigger set_device_tokens_updated_at
  before update on public.device_tokens
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 6. Row Level Security
-- =============================================================================

alter table public.users                    enable row level security;
alter table public.withdrawn_users          enable row level security;
alter table public.volunteer_activities     enable row level security;
alter table public.volunteer_applications   enable row level security;
alter table public.educations               enable row level security;
alter table public.education_applications   enable row level security;
alter table public.notifications            enable row level security;
alter table public.device_tokens            enable row level security;
alter table public.push_config              enable row level security;


-- =============================================================================
-- 7. Data API Grants
-- =============================================================================
-- RLS가 row 접근을 제한하고, GRANT는 authenticated 역할이 Data API로 접근할 수
-- 있는 객체 범위를 제한한다. anon은 현재 공개 데이터 접근 요구가 없어 부여하지 않는다.
-- =============================================================================

grant usage on schema public to authenticated;
grant usage on type public.user_role to authenticated;
grant usage on type public.application_status to authenticated;
grant usage on type public.notification_type to authenticated;

grant select, insert on table public.users                        to authenticated;
grant select on table public.withdrawn_users                      to authenticated;
grant select, insert, update, delete on table public.volunteer_activities   to anon, authenticated;
grant select, insert, update on table public.volunteer_applications         to authenticated;
grant select, insert, update, delete on table public.educations             to anon, authenticated;
grant select, insert, update on table public.education_applications         to authenticated;
grant select, update on table public.notifications                to authenticated;
grant select, insert, update, delete on table public.device_tokens          to authenticated;
grant select on table public.push_config                          to anon, authenticated;


-- =============================================================================
-- 8. Helper Functions (private schema)
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
-- 9. RPC Functions
-- =============================================================================
-- 권한이 중요한 상태 전이는 클라이언트의 직접 update 대신 함수로 처리한다.
-- =============================================================================

drop function if exists public.approve_member(uuid, text);
create function public.approve_member(target_user_id uuid, new_member_number text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.users%rowtype;
begin
  if not private.is_admin() then
    raise exception 'admin permission required';
  end if;

  if new_member_number is null or new_member_number = '' then
    raise exception 'member_number is required';
  end if;

  if new_member_number !~ '^\d{2}-\d{4}$' then
    raise exception 'member_number must be in YY-NNNN format';
  end if;

  if exists (select 1 from public.users where member_number = new_member_number and id != target_user_id) then
    raise exception 'member number already in use';
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

  update public.users
  set role = 'member',
      member_number = new_member_number,
      approved_at = now(),
      approved_by = (select auth.uid())
  where id = target_user_id
    and role = 'pending';

  if not found then
    raise exception 'target user approval failed';
  end if;

  return new_member_number;
end;
$$;

drop function if exists public.grant_admin(uuid, text);
create function public.grant_admin(target_user_id uuid, new_member_number text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
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

  if new_member_number is null or new_member_number = '' then
    raise exception 'member_number is required for pending users';
  end if;

  if new_member_number !~ '^\d{2}-\d{4}$' then
    raise exception 'member_number must be in YY-NNNN format';
  end if;

  if exists (select 1 from public.users where users.member_number = new_member_number and id != target_user_id) then
    raise exception 'member number already in use';
  end if;

  update public.users
  set role = 'admin',
      member_number = new_member_number,
      approved_at = now(),
      approved_by = (select auth.uid())
  where id = target_user_id
    and role = 'pending';

  if not found then
    raise exception 'target user admin grant failed';
  end if;

  return new_member_number;
end;
$$;

drop function if exists public.update_own_profile(text, text, text, text, text, date, text, text, text, text, text);
create function public.update_own_profile(
  new_name                  text,
  new_phone                 text,
  new_email                 text,
  new_address               text,
  new_workplace_or_school   text,
  new_birthday              date,
  new_address_detail        text default '',
  new_license_number        text default null,
  new_volunteer_experience  text default null,
  new_education_experience  text default null,
  new_avatar_path           text default null
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
      address_detail = new_address_detail,
      workplace_or_school = new_workplace_or_school,
      license_number = new_license_number,
      birthday = new_birthday,
      volunteer_experience = new_volunteer_experience,
      education_experience = new_education_experience,
      avatar_path = new_avatar_path
  where id = (select auth.uid())
    and role in ('pending', 'member', 'admin');

  if not found then
    raise exception 'profile cannot be updated';
  end if;
end;
$$;

create or replace function public.cancel_registration()
returns void
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  delete from auth.users where id = (select auth.uid());
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
    user_id, role, member_number, name, phone, email,
    volunteer_experience, education_experience, withdrawn_at
  )
  values (
    current_profile.id,
    current_profile.role,
    current_profile.member_number,
    current_profile.name,
    current_profile.phone,
    current_profile.email,
    current_profile.volunteer_experience,
    current_profile.education_experience,
    now()
  );

  delete from public.users
  where id = current_profile.id;
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
declare
  v_activity_id uuid;
  v_capacity    integer;
  v_accepted    integer;
begin
  if not private.is_admin() then
    raise exception 'admin permission required';
  end if;

  if next_status not in ('accepted', 'rejected', 'cancelled') then
    raise exception 'unsupported application status';
  end if;

  if next_status = 'accepted' then
    select volunteer_activity_id into v_activity_id
    from public.volunteer_applications
    where id = application_id;

    if v_activity_id is null then
      raise exception 'volunteer application not found';
    end if;

    select capacity into v_capacity
    from public.volunteer_activities
    where id = v_activity_id;

    select count(*) into v_accepted
    from public.volunteer_applications
    where volunteer_activity_id = v_activity_id and status = 'accepted';

    if v_accepted >= v_capacity then
      raise exception '정원이 모두 찼습니다. (%/%)', v_accepted, v_capacity;
    end if;
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
declare
  v_activity_id uuid;
  v_capacity    integer;
  v_accepted    integer;
begin
  if not private.is_admin() then
    raise exception 'admin permission required';
  end if;

  if next_status not in ('accepted', 'rejected', 'cancelled') then
    raise exception 'unsupported application status';
  end if;

  if next_status = 'accepted' then
    select education_id into v_activity_id
    from public.education_applications
    where id = application_id;

    if v_activity_id is null then
      raise exception 'education application not found';
    end if;

    select capacity into v_capacity
    from public.educations
    where id = v_activity_id;

    select count(*) into v_accepted
    from public.education_applications
    where education_id = v_activity_id and status = 'accepted';

    if v_accepted >= v_capacity then
      raise exception '정원이 모두 찼습니다. (%/%)', v_accepted, v_capacity;
    end if;
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

drop function if exists public.cancel_member_approval(uuid);
create function public.cancel_member_approval(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then
    raise exception 'admin permission required';
  end if;

  update public.users
  set role = 'pending',
      member_number = null,
      approved_at = null,
      approved_by = null
  where id = target_user_id
    and role = 'member';

  if not found then
    raise exception 'target user is not an approved member';
  end if;
end;
$$;

drop function if exists public.set_user_chip(uuid, text, text);
create function public.set_user_chip(target_user_id uuid, color text, label text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  chip_json text;
begin
  if not private.is_admin() then
    raise exception 'admin permission required';
  end if;

  chip_json := case
    when color is not null and color != '' and label is not null and label != ''
    then json_build_object('color', color, 'label', label)::text
    else null
  end;

  update public.users
  set user_chip = chip_json
  where id = target_user_id;

  if not found then
    raise exception 'target user not found';
  end if;
end;
$$;

drop function if exists public.set_user_memo(uuid, text);
create function public.set_user_memo(target_user_id uuid, memo_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then
    raise exception 'admin permission required';
  end if;

  update public.users
  set memo = nullif(memo_text, '')
  where id = target_user_id;

  if not found then
    raise exception 'target user not found';
  end if;
end;
$$;

revoke all on function public.cancel_registration() from public;
revoke all on function public.approve_member(uuid, text) from public;
revoke all on function public.grant_admin(uuid, text) from public;
revoke all on function public.cancel_member_approval(uuid) from public;
revoke all on function public.update_own_profile(text, text, text, text, text, date, text, text, text, text, text) from public;
revoke all on function public.cancel_own_volunteer_application(uuid) from public;
revoke all on function public.withdraw_current_user() from public;
revoke all on function public.cancel_own_education_application(uuid) from public;
revoke all on function public.decide_volunteer_application(uuid, public.application_status, text) from public;
revoke all on function public.decide_education_application(uuid, public.application_status, text) from public;
revoke all on function public.set_user_chip(uuid, text, text) from public;
revoke all on function public.set_user_memo(uuid, text) from public;

grant execute on function public.cancel_registration() to authenticated;
grant execute on function public.approve_member(uuid, text) to authenticated;
grant execute on function public.grant_admin(uuid, text) to authenticated;
grant execute on function public.cancel_member_approval(uuid) to authenticated;
grant execute on function public.update_own_profile(text, text, text, text, text, date, text, text, text, text, text) to authenticated;
grant execute on function public.cancel_own_volunteer_application(uuid) to authenticated;
grant execute on function public.withdraw_current_user() to authenticated;
grant execute on function public.cancel_own_education_application(uuid) to authenticated;
grant execute on function public.decide_volunteer_application(uuid, public.application_status, text) to authenticated;
grant execute on function public.decide_education_application(uuid, public.application_status, text) to authenticated;
grant execute on function public.set_user_chip(uuid, text, text) to authenticated;
grant execute on function public.set_user_memo(uuid, text) to authenticated;


-- =============================================================================
-- 10. Notification Helpers & Triggers
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 10.1 Helper: 단일 알림 생성
-- ---------------------------------------------------------------------------

create or replace function public.create_notification(
  p_user_id  uuid,
  p_type     public.notification_type,
  p_title    text,
  p_body     text default null,
  p_data     jsonb default null
)
returns public.notifications
language plpgsql
security definer
as $$
declare
  v_notification public.notifications;
begin
  insert into public.notifications (user_id, type, title, body, data)
  values (p_user_id, p_type, p_title, p_body, p_data)
  returning * into v_notification;

  return v_notification;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10.2 Helper: 조건에 맞는 사용자(준회원+정회원) 전체에게 알림 생성
-- ---------------------------------------------------------------------------

create or replace function public.notify_all_members(
  p_type  public.notification_type,
  p_title text,
  p_body  text default null,
  p_data  jsonb default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  select u.id, p_type, p_title, p_body, p_data
  from public.users u
  where u.role in ('pending', 'member');
end;
$$;

-- ---------------------------------------------------------------------------
-- 10.3 Helper: 전체 관리자에게 알림 생성
-- ---------------------------------------------------------------------------

create or replace function public.notify_all_admins(
  p_type  public.notification_type,
  p_title text,
  p_body  text default null,
  p_data  jsonb default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  select u.id, p_type, p_title, p_body, p_data
  from public.users u
  where u.role = 'admin';
end;
$$;

-- ---------------------------------------------------------------------------
-- 10.4 Trigger: 새 봉사활동/교육 생성 → 전체 준회원/정회원 알림
-- ---------------------------------------------------------------------------

create or replace function public.on_activity_created()
returns trigger
language plpgsql
security definer
as $$
declare
  v_kind text;
begin
  if tg_table_name = 'volunteer_activities' then
    v_kind := 'volunteer';
  elsif tg_table_name = 'educations' then
    v_kind := 'education';
  else
    return new;
  end if;

  perform public.notify_all_members(
    'new_activity',
    '새 ' || case when v_kind = 'volunteer' then '봉사활동' else '교육' end || '이 개설되었습니다',
    new.title,
    jsonb_build_object('activity_id', new.id, 'kind', v_kind)
  );

  return new;
end;
$$;

drop trigger if exists trg_volunteer_activity_created_notify on public.volunteer_activities;
create trigger trg_volunteer_activity_created_notify
  after insert on public.volunteer_activities
  for each row
  execute function public.on_activity_created();

drop trigger if exists trg_education_created_notify on public.educations;
create trigger trg_education_created_notify
  after insert on public.educations
  for each row
  execute function public.on_activity_created();

-- ---------------------------------------------------------------------------
-- 10.5 Trigger: 신청 수락/거절 → 신청자 알림
-- ---------------------------------------------------------------------------

create or replace function public.on_application_decided()
returns trigger
language plpgsql
security definer
as $$
declare
  v_activity_title text;
  v_kind           text;
  v_type           public.notification_type;
  v_title          text;
  v_body           text;
  v_data           jsonb;
begin
  if old.status = new.status then
    return new;
  end if;

  if tg_table_name = 'volunteer_applications' then
    select title into v_activity_title
    from public.volunteer_activities
    where id = new.volunteer_activity_id;
    v_kind := 'volunteer';
    v_data := jsonb_build_object(
      'activity_id', new.volunteer_activity_id,
      'application_id', new.id,
      'kind', v_kind
    );
  elsif tg_table_name = 'education_applications' then
    select title into v_activity_title
    from public.educations
    where id = new.education_id;
    v_kind := 'education';
    v_data := jsonb_build_object(
      'activity_id', new.education_id,
      'application_id', new.id,
      'kind', v_kind
    );
  else
    return new;
  end if;

  case new.status
    when 'accepted' then
      v_type := 'application_accepted';
      v_title := '신청이 수락되었습니다';
      v_body := '"' || v_activity_title || '" 활동의 신청이 수락되었습니다.';
    when 'rejected' then
      v_type := 'application_rejected';
      v_title := '신청이 거절되었습니다';
      v_body := '"' || v_activity_title || '" 활동의 신청이 거절되었습니다.';
    else
      return new;
  end case;

  perform public.create_notification(new.user_id, v_type, v_title, v_body, v_data);

  return new;
end;
$$;

drop trigger if exists trg_volunteer_application_decided_notify on public.volunteer_applications;
create trigger trg_volunteer_application_decided_notify
  after update of status on public.volunteer_applications
  for each row
  when (old.status is distinct from new.status
    and new.status in ('accepted', 'rejected'))
  execute function public.on_application_decided();

drop trigger if exists trg_education_application_decided_notify on public.education_applications;
create trigger trg_education_application_decided_notify
  after update of status on public.education_applications
  for each row
  when (old.status is distinct from new.status
    and new.status in ('accepted', 'rejected'))
  execute function public.on_application_decided();

-- ---------------------------------------------------------------------------
-- 10.6 Trigger: 정회원 승급 → 본인 알림
-- ---------------------------------------------------------------------------

create or replace function public.on_member_approved()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.role = 'member' and (old.role is distinct from 'member') then
    perform public.create_notification(
      new.id,
      'member_approved',
      '정회원 승급이 완료되었습니다',
      '회원번호 ' || new.member_number || '로 승급되었습니다. 이제 모든 활동에 신청할 수 있습니다.',
      jsonb_build_object('member_number', new.member_number)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_member_approved_notify on public.users;
create trigger trg_member_approved_notify
  after update of role on public.users
  for each row
  when (new.role = 'member' and old.role is distinct from 'member')
  execute function public.on_member_approved();

-- ---------------------------------------------------------------------------
-- 10.7 Trigger: 새 회원 가입 → 전체 관리자 알림
-- ---------------------------------------------------------------------------

create or replace function public.on_user_registered()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.role = 'pending' then
    perform public.notify_all_admins(
      'new_member_registered',
      '새 회원이 가입했습니다',
      new.name || '님이 가입했습니다. 승인을 진행해 주세요.',
      jsonb_build_object('user_id', new.id, 'user_name', new.name)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_registered_notify on public.users;
create trigger trg_user_registered_notify
  after insert on public.users
  for each row
  when (new.role = 'pending')
  execute function public.on_user_registered();

-- ---------------------------------------------------------------------------
-- 10.8 Trigger: 새 관리자 발생 → 기존 관리자 알림
-- ---------------------------------------------------------------------------

create or replace function public.on_admin_granted()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.role = 'admin' and (old.role is distinct from 'admin') then
    perform public.notify_all_admins(
      'new_admin_granted',
      '새 관리자가 생겼습니다',
      old.name || '님(' || old.member_number || ')이 관리자로 부여되었습니다.',
      jsonb_build_object('user_id', new.id, 'user_name', old.name)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_admin_granted_notify on public.users;
create trigger trg_admin_granted_notify
  after update of role on public.users
  for each row
  when (new.role = 'admin' and old.role is distinct from 'admin')
  execute function public.on_admin_granted();

-- ---------------------------------------------------------------------------
-- 10.9 Trigger: 신청 수락 시 정원 도달 확인 → 관리자 알림
-- ---------------------------------------------------------------------------

create or replace function public.on_application_capacity_check()
returns trigger
language plpgsql
security definer
as $$
declare
  v_activity_id    uuid;
  v_capacity       integer;
  v_accepted_count integer;
  v_activity_title text;
  v_kind           text;
begin
  if new.status != 'accepted' or old.status = 'accepted' then
    return new;
  end if;

  if tg_table_name = 'volunteer_applications' then
    v_kind := 'volunteer';
    v_activity_id := new.volunteer_activity_id;

    select capacity, title into v_capacity, v_activity_title
    from public.volunteer_activities
    where id = v_activity_id;

    select count(*) into v_accepted_count
    from public.volunteer_applications
    where volunteer_activity_id = v_activity_id and status = 'accepted';
  elsif tg_table_name = 'education_applications' then
    v_kind := 'education';
    v_activity_id := new.education_id;

    select capacity, title into v_capacity, v_activity_title
    from public.educations
    where id = v_activity_id;

    select count(*) into v_accepted_count
    from public.education_applications
    where education_id = v_activity_id and status = 'accepted';
  else
    return new;
  end if;

  if v_accepted_count >= v_capacity then
    perform public.notify_all_admins(
      'activity_capacity_full',
      '정원이 모두 채워졌습니다',
      '"' || v_activity_title || '" ' || case when v_kind = 'volunteer' then '봉사활동' else '교육' end || '의 정원이 모두 채워졌습니다.',
      jsonb_build_object('activity_id', v_activity_id, 'kind', v_kind, 'capacity', v_capacity)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_volunteer_capacity_check on public.volunteer_applications;
create trigger trg_volunteer_capacity_check
  after update of status on public.volunteer_applications
  for each row
  when (new.status = 'accepted' and old.status is distinct from 'accepted')
  execute function public.on_application_capacity_check();

drop trigger if exists trg_education_capacity_check on public.education_applications;
create trigger trg_education_capacity_check
  after update of status on public.education_applications
  for each row
  when (new.status = 'accepted' and old.status is distinct from 'accepted')
  execute function public.on_application_capacity_check();


-- =============================================================================
-- 11. 마감 임박 알림 (deadline_approaching)
-- =============================================================================
-- 시간 기반 알림은 DB 트리거로 처리 불가.
-- 아래 함수를 pg_cron이 매시간 실행함.
-- =============================================================================

create or replace function public.process_deadline_approaching(p_hours integer)
returns void
language plpgsql
security definer
as $$
declare
  v_target timestamptz;
  r record;
begin
  v_target := date_trunc('hour', now()) + make_time(0, 0, 0) + (p_hours || ' hours')::interval;

  for r in
    select id, title, 'volunteer' as kind from public.volunteer_activities
    where application_deadline > now()
      and application_deadline <= v_target + interval '1 hour'
      and application_deadline > v_target - interval '1 hour'
      and not exists (
        select 1 from public.notifications
        where type = 'deadline_approaching'
          and data->>'activity_id' = id::text
          and data->>'hours' = p_hours::text
      )
    union all
    select id, title, 'education' as kind from public.educations
    where application_deadline > now()
      and application_deadline <= v_target + interval '1 hour'
      and application_deadline > v_target - interval '1 hour'
      and not exists (
        select 1 from public.notifications
        where type = 'deadline_approaching'
          and data->>'activity_id' = id::text
          and data->>'hours' = p_hours::text
      )
  loop
    perform public.notify_all_members(
      'deadline_approaching',
      '마감이 ' || p_hours || '시간 남았습니다',
      '"' || r.title || '" ' || case when r.kind = 'volunteer' then '봉사활동' else '교육' end || '의 신청 마감이 ' || p_hours || '시간 남았습니다.',
      jsonb_build_object('activity_id', r.id, 'kind', r.kind, 'hours', p_hours)
    );

    perform public.notify_all_admins(
      'deadline_approaching',
      '마감이 ' || p_hours || '시간 남았습니다',
      '"' || r.title || '" ' || case when r.kind = 'volunteer' then '봉사활동' else '교육' end || '의 신청 마감이 ' || p_hours || '시간 남았습니다.',
      jsonb_build_object('activity_id', r.id, 'kind', r.kind, 'hours', p_hours)
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Push Webhook: notifications INSERT → Supabase Edge Function(send-push)
-- ---------------------------------------------------------------------------
-- 최초 설정 (VAPID 키는 web-push generateVAPIDKeys()로 생성):
--   insert into public.push_config(key, value) values
--     ('send_push_url',   'https://lxjtnvspnrwkuldjidla.supabase.co/functions/v1/send-push'),
--     ('vapid_public_key', 'BNLyoeMxYnFD3OQBOkv-LdPAkzElOxDvhe8YBjyM6VKISN9mqzv0ZziTu-eBwxragkp0Ot2H3byXgmtMxT5ChiE'),
--     ('vapid_private_key',''),
--     ('vapid_subject',    'mailto:admin@volunteer-app.com')
--   on conflict (key) do update set value = excluded.value, updated_at = now();
-- ---------------------------------------------------------------------------

create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_send_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
begin
  select value into v_url
  from public.push_config
  where key = 'send_push_url';

  if nullif(v_url, '') is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', to_jsonb(new),
      'old_record', null
    ),
    timeout_milliseconds := 1000
  );

  return new;
end;
$$;

drop trigger if exists trg_notifications_send_push on public.notifications;
create trigger trg_notifications_send_push
  after insert on public.notifications
  for each row
  execute function public.invoke_send_push();


-- =============================================================================
-- 12. RLS Policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 12.1 users
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 12.2 volunteer_activities
-- ---------------------------------------------------------------------------

drop policy if exists "Active users can read volunteer activities" on public.volunteer_activities;
create policy "Active users can read volunteer activities"
  on public.volunteer_activities for select
  to authenticated
  using (private.is_active_user());

drop policy if exists "Anyone can read volunteer_activities" on public.volunteer_activities;
create policy "Anyone can read volunteer_activities"
  on public.volunteer_activities for select
  to public
  using (true);

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

-- ---------------------------------------------------------------------------
-- 12.3 educations
-- ---------------------------------------------------------------------------

drop policy if exists "Active users can read educations" on public.educations;
create policy "Active users can read educations"
  on public.educations for select
  to authenticated
  using (private.is_active_user());

drop policy if exists "Anyone can read educations" on public.educations;
create policy "Anyone can read educations"
  on public.educations for select
  to public
  using (true);

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

-- ---------------------------------------------------------------------------
-- 12.4 volunteer_applications
-- ---------------------------------------------------------------------------

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
        and application_deadline > now()
    )
  );

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
        and application_deadline > now()
    )
  );

-- ---------------------------------------------------------------------------
-- 12.5 education_applications
-- ---------------------------------------------------------------------------

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
        and application_deadline > now()
    )
  );

-- ---------------------------------------------------------------------------
-- 12.6 withdrawn_users
-- ---------------------------------------------------------------------------

drop policy if exists "Admins can read withdrawn users" on public.withdrawn_users;
create policy "Admins can read withdrawn users"
  on public.withdrawn_users for select
  to authenticated
  using (private.is_admin());

-- ---------------------------------------------------------------------------
-- 12.7 notifications
-- ---------------------------------------------------------------------------

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notifications_insert_service" on public.notifications;
create policy "notifications_insert_service"
  on public.notifications for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 12.8 device_tokens
-- ---------------------------------------------------------------------------

drop policy if exists "device_tokens_select_own" on public.device_tokens;
create policy "device_tokens_select_own"
  on public.device_tokens for select
  using (auth.uid() = user_id);

drop policy if exists "device_tokens_insert_own" on public.device_tokens;
create policy "device_tokens_insert_own"
  on public.device_tokens for insert
  with check (auth.uid() = user_id);

drop policy if exists "device_tokens_update_own" on public.device_tokens;
create policy "device_tokens_update_own"
  on public.device_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "device_tokens_delete_own" on public.device_tokens;
create policy "device_tokens_delete_own"
  on public.device_tokens for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 12.9 push_config
-- ---------------------------------------------------------------------------

drop policy if exists "push_config_select_public_key" on public.push_config;
create policy "push_config_select_public_key"
  on public.push_config for select
  using (key = 'vapid_public_key');


-- =============================================================================
-- 13. Storage Policies
-- =============================================================================
-- Supabase Storage buckets: volunteer, education, avatars
-- Public bucket으로 생성하고, 파일 조회는 공개 URL을 사용한다.
-- 업로드/교체/삭제는 관리자만 허용한다(avatars는 모든 인증 사용자 허용).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 13.1 volunteer bucket
-- ---------------------------------------------------------------------------

drop policy if exists "Anyone can read volunteer bucket objects" on storage.objects;
create policy "Anyone can read volunteer bucket objects"
  on storage.objects for select
  using (bucket_id = 'volunteer');

drop policy if exists "Admins can upload volunteer bucket objects" on storage.objects;
create policy "Admins can upload volunteer bucket objects"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'volunteer' and private.is_admin());

drop policy if exists "Admins can update volunteer bucket objects" on storage.objects;
create policy "Admins can update volunteer bucket objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'volunteer' and private.is_admin())
  with check (bucket_id = 'volunteer' and private.is_admin());

drop policy if exists "Admins can delete volunteer bucket objects" on storage.objects;
create policy "Admins can delete volunteer bucket objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'volunteer' and private.is_admin());

-- ---------------------------------------------------------------------------
-- 13.2 education bucket
-- ---------------------------------------------------------------------------

drop policy if exists "Anyone can read education bucket objects" on storage.objects;
create policy "Anyone can read education bucket objects"
  on storage.objects for select
  using (bucket_id = 'education');

drop policy if exists "Admins can upload education bucket objects" on storage.objects;
create policy "Admins can upload education bucket objects"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'education' and private.is_admin());

drop policy if exists "Admins can update education bucket objects" on storage.objects;
create policy "Admins can update education bucket objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'education' and private.is_admin())
  with check (bucket_id = 'education' and private.is_admin());

drop policy if exists "Admins can delete education bucket objects" on storage.objects;
create policy "Admins can delete education bucket objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'education' and private.is_admin());

-- ---------------------------------------------------------------------------
-- 13.3 avatars bucket
-- ---------------------------------------------------------------------------

drop policy if exists "Anyone can read avatars bucket objects" on storage.objects;
create policy "Anyone can read avatars bucket objects"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Authenticated users can upload avatars bucket objects" on storage.objects;
create policy "Authenticated users can upload avatars bucket objects"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );

drop policy if exists "Authenticated users can update avatars bucket objects" on storage.objects;
create policy "Authenticated users can update avatars bucket objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and auth.role() = 'authenticated')
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete avatars bucket objects" on storage.objects;
create policy "Authenticated users can delete avatars bucket objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');


-- =============================================================================
-- 14. Realtime & Cron
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 14.1 Realtime: notifications
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------------
-- 14.2 pg_cron: 마감 임박 알림 스케줄 (매시간 정각 실행)
-- ---------------------------------------------------------------------------

do $$
begin
  perform cron.unschedule('deadline-24h');
  perform cron.schedule('deadline-24h', '0 * * * *', $sql$
    select public.process_deadline_approaching(24);
  $sql$);
exception
  when others then null;
end;
$$;

do $$
begin
  perform cron.unschedule('deadline-6h');
  perform cron.schedule('deadline-6h', '0 * * * *', $sql$
    select public.process_deadline_approaching(6);
  $sql$);
exception
  when others then null;
end;
$$;
