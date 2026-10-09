-- OWNER REVIEW ONLY. Not an app migration and never executed by CI.
-- First reconcile actual Supabase migration history and back up the approved project.
-- This creates only private operator metadata; it does not certify any existing SQL.
begin;
create schema if not exists engjatra_ops;
revoke all on schema engjatra_ops from public, anon, authenticated;
create table if not exists engjatra_ops.migration_checksums (
  version text primary key check (version ~ '^[0-9]{12,14}$'),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  recorded_at timestamptz not null default now()
);
revoke all on engjatra_ops.migration_checksums from public, anon, authenticated;
commit;
-- After verifying each migration's original SQL/schema, an authorized operator
-- records its exact version/hash from the reviewed migration-manifest.json.
-- Never populate rows merely to make an audit green; never expose this schema in REST.
