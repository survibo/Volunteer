-- =============================================================================
-- Notification Schema (전체 복붙용)
-- =============================================================================
--
-- 한 번에 실행하면 아래가 모두 적용됨:
--   1. notification_type enum
--   2. notifications 테이블 + RLS
--   3. device_tokens 테이블 (푸시 알림용)
--   4. 알림 생성 helper 함수
--   5. DB 이벤트 트리거 7개 (활동 생성, 신청 수락/거절, 정회원 승급,
--      회원 가입, 관리자 부여, 정원 도달)
--   6. 마감 임박 처리 함수
--   7. pg_cron 스케줄 등록 (24시간/6시간 전)
--   8. Realtime 활성화
--
-- ※ pg_cron 확장이 활성화되어 있어야 함 (Supabase 기본 포함)
-- =============================================================================


-- =============================================================================
-- Notification Types
-- =============================================================================

do $$
begin
  create type public.notification_type as enum (
    'new_activity',                  -- 새 봉사활동/교육 생성
    'deadline_approaching',          -- 마감 임박 (data.hours: 24 | 6)
    'application_accepted',          -- 신청 수락
    'application_rejected',          -- 신청 거절
    'member_approved',               -- 정회원 승급
    'new_member_registered',         -- 새 회원 가입 (관리자용)
    'new_admin_granted',             -- 새 관리자 발생 (관리자용)
    'activity_capacity_full'         -- 정원 도달 (관리자용)
  );
exception
  when duplicate_object then null;
end;
$$;


-- =============================================================================
-- notifications
-- =============================================================================

create table if not exists public.notifications (
  id                uuid                primary key default gen_random_uuid(),
  user_id           uuid                not null references public.users(id) on delete cascade,
  type              public.notification_type not null,
  title             text                not null,
  body              text,
  data              jsonb,
  is_read           boolean             not null default false,
  created_at        timestamptz         not null default now(),
  read_at           timestamptz
);

create index if not exists idx_notifications_user
  on public.notifications(user_id, created_at desc);

create index if not exists idx_notifications_unread
  on public.notifications(user_id) where not is_read;


-- =============================================================================
-- RLS
-- =============================================================================

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notifications_insert_service"
  on public.notifications for insert
  with check (true);

grant select, update on table public.notifications to authenticated;


-- =============================================================================
-- Helper: 단일 알림 생성
-- =============================================================================

create or replace function public.create_notification(
  p_user_id    uuid,
  p_type       public.notification_type,
  p_title      text,
  p_body       text default null,
  p_data       jsonb default null
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


-- =============================================================================
-- Helper: 조건에 맞는 사용자(준회원+정회원) 전체에게 알림 생성
-- =============================================================================

create or replace function public.notify_all_members(
  p_type       public.notification_type,
  p_title      text,
  p_body       text default null,
  p_data       jsonb default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  select
    u.id,
    p_type,
    p_title,
    p_body,
    p_data
  from public.users u
  where u.role in ('pending', 'member');
end;
$$;


-- =============================================================================
-- Helper: 전체 관리자에게 알림 생성
-- =============================================================================

create or replace function public.notify_all_admins(
  p_type       public.notification_type,
  p_title      text,
  p_body       text default null,
  p_data       jsonb default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  select
    u.id,
    p_type,
    p_title,
    p_body,
    p_data
  from public.users u
  where u.role = 'admin';
end;
$$;


-- =============================================================================
-- Trigger: 새 봉사활동/교육 생성 → 전체 준회원/정회원 알림
-- =============================================================================

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
    jsonb_build_object(
      'activity_id', new.id,
      'kind', v_kind
    )
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


-- =============================================================================
-- Trigger: 신청 수락/거절 → 신청자 알림
-- =============================================================================

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


-- =============================================================================
-- Trigger: 정회원 승급 → 본인 알림
-- =============================================================================

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


-- =============================================================================
-- Trigger: 새 회원 가입 → 전체 관리자 알림
-- =============================================================================

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


-- =============================================================================
-- Trigger: 새 관리자 발생 → 기존 관리자 알림
-- =============================================================================

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


-- =============================================================================
-- Trigger: 신청 수락 시 정원 도달 확인 → 관리자 알림
-- =============================================================================

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
      jsonb_build_object(
        'activity_id', v_activity_id,
        'kind', v_kind,
        'capacity', v_capacity
      )
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
-- 마감 임박 알림 (deadline_approaching)
-- =============================================================================
-- 시간 기반 알림은 DB 트리거로 처리 불가.
-- 아래 함수를 pg_cron이 매시간 실행함.
--

create or replace function public.process_deadline_approaching(p_hours integer)
returns void
language plpgsql
security definer
as $$
declare
  v_target timestamptz;
  v_notified jsonb;
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
    -- 전체 준회원/정회원에게 알림
    perform public.notify_all_members(
      'deadline_approaching',
      '마감이 ' || p_hours || '시간 남았습니다',
      '"' || r.title || '" ' || case when r.kind = 'volunteer' then '봉사활동' else '교육' end || '의 신청 마감이 ' || p_hours || '시간 남았습니다.',
      jsonb_build_object('activity_id', r.id, 'kind', r.kind, 'hours', p_hours)
    );

    -- 관리자에게 알림
    perform public.notify_all_admins(
      'deadline_approaching',
      '마감이 ' || p_hours || '시간 남았습니다',
      '"' || r.title || '" ' || case when r.kind = 'volunteer' then '봉사활동' else '교육' end || '의 신청 마감이 ' || p_hours || '시간 남았습니다.',
      jsonb_build_object('activity_id', r.id, 'kind', r.kind, 'hours', p_hours)
    );
  end loop;
end;
$$;


-- =============================================================================
-- Device Tokens (푸시 알림용)
-- =============================================================================

create table if not exists public.device_tokens (
  id                uuid                primary key default gen_random_uuid(),
  user_id           uuid                not null references public.users(id) on delete cascade,
  token             text                not null,
  platform          text                not null check (platform in ('web', 'ios', 'android')),
  created_at        timestamptz         not null default now(),
  updated_at        timestamptz         not null default now(),
  unique (user_id, token)
);

create index if not exists idx_device_tokens_user
  on public.device_tokens(user_id);

alter table public.device_tokens enable row level security;

create policy "device_tokens_select_own"
  on public.device_tokens for select
  using (auth.uid() = user_id);

create policy "device_tokens_insert_own"
  on public.device_tokens for insert
  with check (auth.uid() = user_id);

create policy "device_tokens_update_own"
  on public.device_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "device_tokens_delete_own"
  on public.device_tokens for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.device_tokens to authenticated;


-- =============================================================================
-- Realtime
-- =============================================================================

alter publication supabase_realtime add table public.notifications;


-- =============================================================================
-- pg_cron: 마감 임박 알림 스케줄 (매시간 정각 실행)
-- =============================================================================

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
