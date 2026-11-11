create table if not exists schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists orgs (
  id text primary key,
  name text not null,
  created_at timestamptz not null
);

create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  org_id text not null references orgs (id),
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null
);

create table if not exists sessions (
  id text primary key,
  token_hash text not null unique,
  user_id text not null references users (id),
  expires_at timestamptz not null
);

create table if not exists invites (
  id text primary key,
  code_hash text not null unique,
  org_id text not null references orgs (id),
  created_by text not null references users (id),
  expires_at timestamptz not null
);

create table if not exists projects (
  id text primary key,
  org_id text not null references orgs (id),
  name text not null,
  status text not null,
  release_name text not null,
  volume_path text not null,
  active_stream_id text,
  active_stream_started_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  last_error text
);
