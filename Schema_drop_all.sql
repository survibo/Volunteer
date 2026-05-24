-- =============================================================================
-- Nuclear Drop — 모든 사용자 객체 통째로 삭제
-- =============================================================================

drop schema if exists public cascade;
drop schema if exists private cascade;
drop extension if exists pg_cron cascade;

-- 스토리지 데이터는 Storage API로만 삭제 가능 (SQL Editor에서 직접 DELETE 불가)
-- 버킷은 Schema.sql에서 on conflict로 업데이트하므로 별도 삭제 불필요
