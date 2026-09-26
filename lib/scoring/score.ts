// Pure, deterministic compliance scoring. No I/O, no framework imports.
// score(ruleset, answers) → { stages, total, secured, running, nonCompliant, breaches }

export type CheckState = "met" | "not_met" | "unanswered";

export interface Check {
  id: string;
  label: string;
  /** 1 to 10, normalised within the stage. */
  weight: number;
  isCritical: boolean;
}

export interface Stage {
  id: string;
  name: string;
  /** Relative weight of the stage in the total (e.g. 30 / 35 / 20 / 15). */
  weight: number;
  checks: Check[];
}

export interface Ruleset {
  stages: Stage[];
}

/** Missing entries count as unanswered. */
export type Answers = Record<string, CheckState | undefined>;

export interface Breach {
  stageId: string;
  stageName: string;
  checkId: string;
  label: string;
  isCritical: boolean;
}

export interface StageScore {
  id: string;
  name: string;
  /** Met weight / total weight × 100. Unanswered counts as not met. */
  score: number;
  /** Met weight / answered weight × 100, or null when nothing is answered. */
  running: number | null;
  metWeight: number;
  answeredWeight: number;
  totalWeight: number;
  answeredCount: number;
  checkCount: number;
  /** True when every check is answered (met or not met). */
  complete: boolean;
  breaches: Breach[];
}

export interface ScoreResult {
  stages: StageScore[];
  /** Stage-weighted average of stage scores, 0 to 100. The final score once every check is answered. */
  total: number;
  /** Share of all possible weight already met, 0 to 100. Equals `total`; starts at 0 and only climbs. */
  secured: number;
  /** Share of answered weight that was met, 0 to 100, or null when nothing is answered. */
  running: number | null;
  /** True when any critical check is not met, regardless of percentage. */
  nonCompliant: boolean;
  breaches: Breach[];
  /** True when every check in every stage is answered. */
  complete: boolean;
}

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}

export function scoreStage(stage: Stage, answers: Answers): StageScore {
  let metWeight = 0;
  let answeredWeight = 0;
  let answeredCount = 0;
  const breaches: Breach[] = [];

  for (const check of stage.checks) {
    const state = answers[check.id] ?? "unanswered";
    if (state === "unanswered") continue;
    answeredCount++;
    answeredWeight += check.weight;
    if (state === "met") {
      metWeight += check.weight;
    } else {
      breaches.push({
        stageId: stage.id,
        stageName: stage.name,
        checkId: check.id,
        label: check.label,
        isCritical: check.isCritical,
      });
    }
  }

  const totalWeight = sum(stage.checks.map((c) => c.weight));

  return {
    id: stage.id,
    name: stage.name,
    score: totalWeight > 0 ? (metWeight / totalWeight) * 100 : 0,
    running: answeredWeight > 0 ? (metWeight / answeredWeight) * 100 : null,
    metWeight,
    answeredWeight,
    totalWeight,
    answeredCount,
    checkCount: stage.checks.length,
    complete: answeredCount === stage.checks.length,
    breaches,
  };
}

export function score(ruleset: Ruleset, answers: Answers): ScoreResult {
  const stages = ruleset.stages.map((s) => scoreStage(s, answers));

  // Stages without checks (or weightless ones) can't be scored and drop out of the total,
  // so their stage weight is shared among the rest.
  const scored = ruleset.stages
    .map((s, i) => ({ weight: s.weight, result: stages[i] }))
    .filter(({ weight, result }) => weight > 0 && result.totalWeight > 0);
  const stageWeightSum = sum(scored.map((s) => s.weight));

  // Each stage contributes stageWeight × (fraction of its check weight). Normalising by stage
  // weights keeps a heavy stage heavy even if it has few checks.
  const metShare = sum(scored.map((s) => s.weight * (s.result.metWeight / s.result.totalWeight)));
  const answeredShare = sum(
    scored.map((s) => s.weight * (s.result.answeredWeight / s.result.totalWeight)),
  );

  const total = stageWeightSum > 0 ? (metShare / stageWeightSum) * 100 : 0;
  const running = answeredShare > 0 ? (metShare / answeredShare) * 100 : null;

  const breaches = stages.flatMap((s) => s.breaches);

  return {
    stages,
    total,
    secured: total,
    running,
    nonCompliant: breaches.some((b) => b.isCritical),
    breaches,
    complete: stages.every((s) => s.complete),
  };
}
