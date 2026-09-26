-- Trade Compliance Tool: schema, row level security, signup trigger.
-- Rules are data: stages and checks live here, the app renders whatever is defined.
-- Note: the spec's `order` column is named `position` (ORDER is a reserved word).

-- ─── Tables ────────────────────────────────────────────────────────────────

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

create table public.rulesets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null default 'My ruleset',
  version    int  not null default 1 check (version >= 1),
  is_active  boolean not null default false,
  parent_id  uuid references public.rulesets (id) on delete set null,
  created_at timestamptz not null default now()
);
-- One active ruleset per user.
create unique index rulesets_one_active_per_user
  on public.rulesets (user_id) where is_active;
create index rulesets_user_id_idx on public.rulesets (user_id);

create table public.stages (
  id         uuid primary key default gen_random_uuid(),
  ruleset_id uuid not null references public.rulesets (id) on delete cascade,
  name       text not null,
  position   int  not null default 0,
  weight     numeric not null default 25 check (weight >= 0)
);
create index stages_ruleset_id_idx on public.stages (ruleset_id);

create table public.checks (
  id          uuid primary key default gen_random_uuid(),
  stage_id    uuid not null references public.stages (id) on delete cascade,
  label       text not null,
  description text,
  weight      int  not null default 5 check (weight between 1 and 10),
  is_critical boolean not null default false,
  position    int  not null default 0,
  input_type  text not null default 'tick' check (input_type in ('tick', 'text'))
);
create index checks_stage_id_idx on public.checks (stage_id);

create table public.trades (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  ruleset_id    uuid not null references public.rulesets (id) on delete restrict,
  pair          text,
  direction     text check (direction in ('long', 'short')),
  entry         numeric,
  stop          numeric,
  target        numeric,
  session       text,
  model_tag     text,
  opened_at     timestamptz,
  closed_at     timestamptz,
  result_r      numeric,
  status        text not null default 'draft' check (status in ('draft', 'submitted')),
  total_score   numeric check (total_score between 0 and 100),
  non_compliant boolean,
  created_at    timestamptz not null default now(),
  submitted_at  timestamptz
);
create index trades_user_id_idx on public.trades (user_id, created_at desc);
create index trades_ruleset_id_idx on public.trades (ruleset_id);

create table public.check_results (
  id          uuid primary key default gen_random_uuid(),
  trade_id    uuid not null references public.trades (id) on delete cascade,
  check_id    uuid not null references public.checks (id) on delete restrict,
  state       text not null default 'unanswered'
              check (state in ('met', 'not_met', 'unanswered')),
  text_value  text,
  answered_at timestamptz,
  unique (trade_id, check_id)
);
create index check_results_check_id_idx on public.check_results (check_id);

-- ─── Ownership helpers (used by RLS) ───────────────────────────────────────

create function public.owns_ruleset(rid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rulesets r
                 where r.id = rid and r.user_id = auth.uid());
$$;

create function public.owns_stage(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.stages s
                 join public.rulesets r on r.id = s.ruleset_id
                 where s.id = sid and r.user_id = auth.uid());
$$;

create function public.owns_check(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.checks c
                 join public.stages s on s.id = c.stage_id
                 join public.rulesets r on r.id = s.ruleset_id
                 where c.id = cid and r.user_id = auth.uid());
$$;

create function public.owns_trade(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trades t
                 where t.id = tid and t.user_id = auth.uid());
$$;

-- Submitted trades are locked.
create function public.trade_is_draft(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trades t
                 where t.id = tid and t.status = 'draft');
$$;

-- ─── Row level security ────────────────────────────────────────────────────

alter table public.profiles      enable row level security;
alter table public.rulesets      enable row level security;
alter table public.stages        enable row level security;
alter table public.checks        enable row level security;
alter table public.trades        enable row level security;
alter table public.check_results enable row level security;

create policy "own profile" on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

create policy "own rulesets" on public.rulesets for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
              and (parent_id is null or public.owns_ruleset(parent_id)));

create policy "own stages" on public.stages for all
  using (public.owns_ruleset(ruleset_id))
  with check (public.owns_ruleset(ruleset_id));

create policy "own checks" on public.checks for all
  using (public.owns_stage(stage_id))
  with check (public.owns_stage(stage_id));

create policy "own trades: read" on public.trades for select
  using (user_id = auth.uid());
create policy "own trades: insert" on public.trades for insert
  with check (user_id = auth.uid() and public.owns_ruleset(ruleset_id));
-- Only drafts can be edited (this is how submit + lock works: set status in the same update).
create policy "own trades: update drafts" on public.trades for update
  using (user_id = auth.uid() and status = 'draft')
  with check (user_id = auth.uid() and public.owns_ruleset(ruleset_id));
create policy "own trades: delete" on public.trades for delete
  using (user_id = auth.uid());

create policy "own results: read" on public.check_results for select
  using (public.owns_trade(trade_id));
create policy "own results: insert" on public.check_results for insert
  with check (public.owns_trade(trade_id) and public.trade_is_draft(trade_id)
              and public.owns_check(check_id));
create policy "own results: update" on public.check_results for update
  using (public.owns_trade(trade_id) and public.trade_is_draft(trade_id))
  with check (public.owns_check(check_id));
create policy "own results: delete" on public.check_results for delete
  using (public.owns_trade(trade_id) and public.trade_is_draft(trade_id));

-- ─── Signup trigger: profile + active v1 ruleset + default stages/checks ───

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  rs  uuid;
  s1  uuid; s2 uuid; s3 uuid; s4 uuid;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name',
                           split_part(new.email, '@', 1)));

  insert into public.rulesets (user_id, name, version, is_active)
  values (new.id, 'My ruleset', 1, true)
  returning id into rs;

  insert into public.stages (ruleset_id, name, position, weight) values
    (rs, 'Pre-trade setup',               1, 30) returning id into s1;
  insert into public.stages (ruleset_id, name, position, weight) values
    (rs, 'Risk placement',                2, 35) returning id into s2;
  insert into public.stages (ruleset_id, name, position, weight) values
    (rs, 'Trade management',              3, 20) returning id into s3;
  insert into public.stages (ruleset_id, name, position, weight) values
    (rs, 'Post-trade notes and feedback', 4, 15) returning id into s4;

  insert into public.checks
    (stage_id, label, description, weight, is_critical, position, input_type) values
    (s1, 'Higher timeframe bias defined',  'Directional bias set before looking for entries', 8, false, 1, 'tick'),
    (s1, 'Market conditions suitable',     'Session, volatility and news checked',            6, false, 2, 'tick'),
    (s1, 'Setup criteria all met',         'Every entry criterion of the model is present',    10, false, 3, 'tick'),

    (s2, 'Stop loss placed',               'Stop at a valid level before or at entry',          10, true,  1, 'tick'),
    (s2, 'Position size within limit',     'Risk per trade within your maximum',                 8, true,  2, 'tick'),
    (s2, 'Take profit at a valid level',   'Target at a logical level or array',                 5, false, 3, 'tick'),
    (s2, 'R:R meets minimum',              'Reward to risk at or above your minimum',            5, false, 4, 'tick'),

    (s3, 'Partials taken per plan',        null,                                                 5, false, 1, 'tick'),
    (s3, 'Stop adjusted per plan',         null,                                                 5, false, 2, 'tick'),
    (s3, 'No unplanned intervention',      'No early close or moved stop outside the plan',      8, false, 3, 'tick'),

    (s4, 'Notes taken at placement',       null,                                                 5, false, 1, 'tick'),
    (s4, 'Notes taken at close',           null,                                                 5, false, 2, 'tick'),
    (s4, 'Trade notes',                    'What happened and why',                              3, false, 3, 'text'),
    (s4, 'Self review',                    'What you would repeat or change',                    3, false, 4, 'text');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
