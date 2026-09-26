-- Signed-in users get table access; RLS policies still limit them to their own rows.
-- Anonymous visitors get nothing.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles, public.rulesets, public.stages,
  public.checks, public.trades, public.check_results
to authenticated;

grant execute on function
  public.owns_ruleset(uuid), public.owns_stage(uuid), public.owns_check(uuid),
  public.owns_trade(uuid), public.trade_is_draft(uuid)
to authenticated;
revoke execute on function
  public.owns_ruleset(uuid), public.owns_stage(uuid), public.owns_check(uuid),
  public.owns_trade(uuid), public.trade_is_draft(uuid), public.handle_new_user()
from anon, public;
