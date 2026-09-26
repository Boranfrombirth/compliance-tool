import { describe, expect, it } from "vitest";
import { score, scoreStage, type Answers, type Ruleset, type Stage } from "./score";

const check = (id: string, weight: number, isCritical = false) => ({
  id,
  label: `Check ${id}`,
  weight,
  isCritical,
});

// Mirrors the default ruleset: stage weights 30 / 35 / 20 / 15.
const ruleset: Ruleset = {
  stages: [
    { id: "pre", name: "Pre-trade setup", weight: 30, checks: [check("p1", 8), check("p2", 6), check("p3", 10)] },
    {
      id: "risk",
      name: "Risk placement",
      weight: 35,
      checks: [check("r1", 10, true), check("r2", 8, true), check("r3", 5), check("r4", 2)],
    },
    { id: "mgmt", name: "Trade management", weight: 20, checks: [check("m1", 5), check("m2", 5), check("m3", 8)] },
    { id: "post", name: "Post-trade notes", weight: 15, checks: [check("n1", 5), check("n2", 5)] },
  ],
};

const allIds = ruleset.stages.flatMap((s) => s.checks.map((c) => c.id));
const answerAll = (state: "met" | "not_met"): Answers =>
  Object.fromEntries(allIds.map((id) => [id, state]));

describe("score: empty answers", () => {
  const r = score(ruleset, {});

  it("scores zero with nothing answered", () => {
    expect(r.total).toBe(0);
    expect(r.secured).toBe(0);
    expect(r.running).toBeNull();
  });

  it("has no breaches and is compliant", () => {
    expect(r.breaches).toEqual([]);
    expect(r.nonCompliant).toBe(false);
  });

  it("marks every stage incomplete", () => {
    expect(r.complete).toBe(false);
    expect(r.stages.every((s) => !s.complete && s.score === 0 && s.running === null)).toBe(true);
  });
});

describe("score: all met", () => {
  const r = score(ruleset, answerAll("met"));

  it("scores 100 everywhere", () => {
    expect(r.total).toBeCloseTo(100);
    expect(r.secured).toBeCloseTo(100);
    expect(r.running).toBeCloseTo(100);
    r.stages.forEach((s) => expect(s.score).toBeCloseTo(100));
  });

  it("is complete and compliant", () => {
    expect(r.complete).toBe(true);
    expect(r.nonCompliant).toBe(false);
    expect(r.breaches).toEqual([]);
  });
});

describe("score: all amber", () => {
  const r = score(ruleset, answerAll("not_met"));

  it("scores zero but counts as complete", () => {
    expect(r.total).toBe(0);
    expect(r.running).toBe(0);
    expect(r.complete).toBe(true);
    expect(r.stages.every((s) => s.complete)).toBe(true);
  });

  it("lists every check as a breach, in stage order", () => {
    expect(r.breaches.map((b) => b.checkId)).toEqual(allIds);
    expect(r.breaches[0]).toMatchObject({ stageId: "pre", stageName: "Pre-trade setup" });
  });

  it("is non-compliant because critical checks failed", () => {
    expect(r.nonCompliant).toBe(true);
  });
});

describe("score: critical breach", () => {
  // Everything met except the critical stop-loss check.
  const r = score(ruleset, { ...answerAll("met"), r1: "not_met" });

  it("keeps a high percentage", () => {
    // Risk stage 15/25 = 60%; total = (30 + 35×0.6 + 20 + 15) / 100 = 86%.
    expect(r.stages[1].score).toBeCloseTo(60);
    expect(r.total).toBeCloseTo(86);
  });

  it("is labelled non-compliant regardless", () => {
    expect(r.nonCompliant).toBe(true);
    expect(r.breaches).toEqual([
      { stageId: "risk", stageName: "Risk placement", checkId: "r1", label: "Check r1", isCritical: true },
    ]);
  });

  it("a non-critical breach alone stays compliant", () => {
    expect(score(ruleset, { ...answerAll("met"), r3: "not_met" }).nonCompliant).toBe(false);
  });
});

describe("scoreStage: spec worked example", () => {
  // Weights 10, 8, 5, 2 (total 25). Met: 10 and 5 → 15 / 25 = 60%.
  const stage: Stage = ruleset.stages[1];
  const s = scoreStage(stage, { r1: "met", r2: "not_met", r3: "met", r4: "not_met" });

  it("is 60%", () => {
    expect(s.metWeight).toBe(15);
    expect(s.totalWeight).toBe(25);
    expect(s.score).toBeCloseTo(60);
  });

  it("normalises weights: doubling them all changes nothing", () => {
    const doubled = { ...stage, checks: stage.checks.map((c) => ({ ...c, weight: c.weight * 2 })) };
    expect(scoreStage(doubled, { r1: "met", r3: "met" }).score).toBeCloseTo(60);
  });
});

describe("score: live secured and running", () => {
  it("secured climbs from zero; running reflects only what is answered", () => {
    // Pre-trade fully answered: p1 met (8), p2 not met (6), p3 met (10). Nothing else answered.
    const r = score(ruleset, { p1: "met", p2: "not_met", p3: "met" });
    // Pre stage = 18/24 = 75%. Secured = 30 × 0.75 / 100 = 22.5%. Running = 75%.
    expect(r.stages[0].score).toBeCloseTo(75);
    expect(r.secured).toBeCloseTo(22.5);
    expect(r.running).toBeCloseTo(75);
    expect(r.stages[0].complete).toBe(true);
    expect(r.complete).toBe(false);
  });

  it("running weights answered checks by their stage weight", () => {
    // p3 met (pre, 10/24 of a 30 stage) and r1 not met (risk, 10/25 of a 35 stage).
    const r = score(ruleset, { p3: "met", r1: "not_met" });
    const met = 30 * (10 / 24);
    const answered = met + 35 * (10 / 25);
    expect(r.running).toBeCloseTo((met / answered) * 100);
  });

  it("treats explicit 'unanswered' like a missing answer", () => {
    expect(score(ruleset, { p1: "unanswered" })).toEqual(score(ruleset, {}));
  });
});

describe("score: edge cases", () => {
  it("skips stages without checks when totalling", () => {
    const withEmpty: Ruleset = {
      stages: [...ruleset.stages, { id: "empty", name: "Empty", weight: 50, checks: [] }],
    };
    const r = score(withEmpty, answerAll("met"));
    expect(r.total).toBeCloseTo(100);
    expect(r.stages[4]).toMatchObject({ score: 0, complete: true, checkCount: 0 });
  });

  it("returns zero for a ruleset with no stages", () => {
    const r = score({ stages: [] }, {});
    expect(r).toMatchObject({ total: 0, secured: 0, running: null, nonCompliant: false, complete: true });
  });

  it("ignores answers for checks not in the ruleset", () => {
    expect(score(ruleset, { ghost: "not_met" })).toEqual(score(ruleset, {}));
  });
});
