-- 아바타 storage 정책 수정: 회원가입 시에도 업로드 가능하도록
-- (private.is_active_user()는 users 테이블 row가 필요하지만,
--  회원가입 시에는 createPendingProfile보다 uploadAvatar가 먼저 실행됨)

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
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  )
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );

drop policy if exists "Authenticated users can delete avatars bucket objects" on storage.objects;
create policy "Authenticated users can delete avatars bucket objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );
