-- Save an edited ruleset atomically.
-- If any trade (draft or submitted) points at the ruleset, the edit becomes a new version
-- (version + 1, parent_id set, made active) and the old version is left untouched, so past
-- trades stay graded against the rules live when they were taken. Otherwise it is edited in place.
--
-- p_stages: [{ "name", "weight", "checks": [{ "label", "description", "weight", "is_critical", "input_type" }] }]
-- Order in the arrays is the display order. Runs as the caller, so RLS applies throughout.

create function public.save_ruleset(p_ruleset_id uuid, p_name text, p_stages jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old       public.rulesets%rowtype;
  v_target    uuid;
  v_stage     jsonb;
  v_check     jsonb;
  v_stage_id  uuid;
  v_s_pos     int := 0;
  v_c_pos     int;
begin
  select * into v_old from public.rulesets where id = p_ruleset_id and user_id = auth.uid();
  if not found then
    raise exception 'Ruleset not found' using errcode = 'P0002';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Ruleset name is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_stages) <> 'array' or jsonb_array_length(p_stages) = 0 then
    raise exception 'A ruleset needs at least one stage' using errcode = '22023';
  end if;

  if exists (select 1 from public.trades where ruleset_id = p_ruleset_id) then
    -- New version. Deactivate first: only one active ruleset per user is allowed.
    update public.rulesets set is_active = false where id = p_ruleset_id;
    insert into public.rulesets (user_id, name, version, is_active, parent_id)
    values (
      auth.uid(),
      trim(p_name),
      (select max(version) + 1 from public.rulesets where user_id = auth.uid()),
      true,
      p_ruleset_id
    )
    returning id into v_target;
  else
    -- No trades use it: edit in place by replacing its stages and checks.
    v_target := p_ruleset_id;
    update public.rulesets set name = trim(p_name) where id = v_target;
    delete from public.stages where ruleset_id = v_target;
  end if;

  for v_stage in select * from jsonb_array_elements(p_stages) loop
    v_s_pos := v_s_pos + 1;
    if coalesce(trim(v_stage ->> 'name'), '') = '' then
      raise exception 'Every stage needs a name' using errcode = '22023';
    end if;

    insert into public.stages (ruleset_id, name, position, weight)
    values (v_target, trim(v_stage ->> 'name'), v_s_pos, (v_stage ->> 'weight')::numeric)
    returning id into v_stage_id;

    v_c_pos := 0;
    for v_check in select * from jsonb_array_elements(coalesce(v_stage -> 'checks', '[]'::jsonb)) loop
      v_c_pos := v_c_pos + 1;
      if coalesce(trim(v_check ->> 'label'), '') = '' then
        raise exception 'Every check needs a label' using errcode = '22023';
      end if;
      insert into public.checks
        (stage_id, label, description, weight, is_critical, position, input_type)
      values (
        v_stage_id,
        trim(v_check ->> 'label'),
        nullif(trim(coalesce(v_check ->> 'description', '')), ''),
        (v_check ->> 'weight')::int,
        coalesce((v_check ->> 'is_critical')::boolean, false),
        v_c_pos,
        coalesce(v_check ->> 'input_type', 'tick')
      );
    end loop;
  end loop;

  return v_target;
end;
$$;

revoke execute on function public.save_ruleset(uuid, text, jsonb) from anon, public;
grant execute on function public.save_ruleset(uuid, text, jsonb) to authenticated;
