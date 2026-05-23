# Supabase Schema

## Current Scope

- Google OAuth login is handled by Supabase Auth.
- Application profile data is stored in `public.users` after the first OAuth login and registration form completion.
- Kakao OAuth is intentionally deferred.

## Environment Variables

Create `.env.local` from `.env.example`:

```env
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
```

Use a Supabase publishable key. Do not put a `service_role` or secret key in Vite environment variables.

## Tables

### `public.users`

Stores app-level profile and role information for authenticated Supabase users.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, references `auth.users(id)` |
| `name` | `text` | Required |
| `phone` | `text` | Required |
| `email` | `text` | Required |
| `address` | `text` | Required |
| `organization` | `text` | Required. Work place or school name |
| `license_number` | `text` | Optional |
| `role` | `text` | `associate`, `member`, or `admin`. Defaults to `associate` |
| `member_number` | `text` | Unique, format `YY-NNNN`, required only for `member` |
| `approved_at` | `timestamptz` | Required only for `member` |
| `created_at` | `timestamptz` | Defaults to `now()` |
| `updated_at` | `timestamptz` | Updated by trigger |

## RLS

- RLS is enabled on `public.users`.
- `authenticated` can `select` only their own profile.
- `authenticated` can `insert` only their own profile as `role = 'associate'`.
- `authenticated` cannot update or delete profile rows yet. This prevents client-side role escalation before the admin feature is built.
- Admin management policies will be added with the admin member-management feature.

## Migration

Migration file:

```text
supabase/migrations/20260523000000_create_users_profile.sql
```

Apply it with the Supabase SQL editor or Supabase CLI after the project is linked.

## Google OAuth Redirect URLs

Configure these in Supabase Auth URL settings and Google OAuth settings:

```text
http://localhost:5173/auth/callback
https://YOUR_VERCEL_DOMAIN/auth/callback
```

## Local Status

- Supabase MCP project access returned a permission error, so the remote database was not modified from this session.
- Supabase CLI is not installed on this machine, so the migration has been prepared locally instead.
