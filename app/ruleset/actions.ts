"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/require-user";

export interface EditableCheck {
  label: string;
  description: string;
  weight: number;
  isCritical: boolean;
  inputType: "tick" | "text";
}

export interface EditableStage {
  name: string;
  weight: number;
  checks: EditableCheck[];
}

export type SaveResult = { ok: true; newVersion: boolean } | { ok: false; error: string };

export async function saveRuleset(
  rulesetId: string,
  name: string,
  stages: EditableStage[],
): Promise<SaveResult> {
  const { supabase } = await requireUser();

  const payload = stages.map((s) => ({
    name: s.name,
    weight: Math.max(0, Number(s.weight) || 0),
    checks: s.checks.map((c) => ({
      label: c.label,
      description: c.description,
      weight: Math.min(10, Math.max(1, Math.round(Number(c.weight) || 1))),
      is_critical: c.isCritical,
      input_type: c.inputType === "text" ? "text" : "tick",
    })),
  }));

  const { data, error } = await supabase.rpc("save_ruleset", {
    p_ruleset_id: rulesetId,
    p_name: name,
    p_stages: payload,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/ruleset");
  revalidatePath("/trades");
  return { ok: true, newVersion: data !== rulesetId };
}
