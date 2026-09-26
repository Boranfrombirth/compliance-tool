"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import CheckToggle from "@/components/CheckToggle";
import ScoreWidget from "@/components/ScoreWidget";
import StageRail from "@/components/StageRail";
import { score, type CheckState } from "@/lib/scoring/score";
import { createClient } from "@/lib/supabase/client";
import { toAnswers } from "@/lib/trades/load";
import type { ResultView, RulesetView, TradeDetails } from "@/lib/trades/types";
import { discardTrade, submitTrade } from "../actions";
import TradeDetailsPanel from "./TradeDetailsPanel";

interface StepperProps {
  tradeId: string;
  ruleset: RulesetView;
  initialResults: Record<string, ResultView>;
  initialDetails: TradeDetails;
}

type SaveStatus = "saved" | "saving" | "error";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Stepper({ tradeId, ruleset, initialResults, initialDetails }: StepperProps) {
  const supabase = useMemo(() => createClient(), []);
  const [results, setResults] = useState(initialResults);
  const [active, setActive] = useState(() => {
    // Resume at the first stage that still has unanswered checks.
    const first = ruleset.stages.findIndex((s) =>
      s.checks.some((c) => (initialResults[c.id]?.state ?? "unanswered") === "unanswered"),
    );
    return first === -1 ? Math.max(0, ruleset.stages.length - 1) : first;
  });
  const [direction, setDirection] = useState(1);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pending, startTransition] = useTransition();

  // Refs so handlers from a panel that is still animating out can't act on stale state.
  const resultsRef = useRef(results);
  const activeRef = useRef(active);

  const result = useMemo(() => score(ruleset, toAnswers(results)), [ruleset, results]);
  const completedStages = result.stages.filter((s) => s.complete && s.checkCount > 0).length;

  // ─── Autosave ────────────────────────────────────────────────────────────
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const inFlight = useRef(0);

  const persist = useCallback(
    async (checkId: string, r: ResultView) => {
      inFlight.current++;
      setStatus("saving");
      const { error } = await supabase.from("check_results").upsert(
        {
          trade_id: tradeId,
          check_id: checkId,
          state: r.state,
          text_value: r.text || null,
          answered_at: r.state === "unanswered" ? null : new Date().toISOString(),
        },
        { onConflict: "trade_id,check_id" },
      );
      inFlight.current--;
      if (error) setStatus("error");
      else if (inFlight.current === 0 && timers.current.size === 0) setStatus("saved");
    },
    [supabase, tradeId],
  );

  const queueSave = useCallback(
    (checkId: string, r: ResultView, delay: number) => {
      const existing = timers.current.get(checkId);
      if (existing) clearTimeout(existing);
      setStatus("saving");
      timers.current.set(
        checkId,
        setTimeout(() => {
          timers.current.delete(checkId);
          void persist(checkId, r);
        }, delay),
      );
    },
    [persist],
  );

  const flush = useCallback(async () => {
    const waiting = [...timers.current.keys()];
    waiting.forEach((id) => clearTimeout(timers.current.get(id)));
    timers.current.clear();
    await Promise.all(waiting.map((id) => persist(id, resultsRef.current[id])));
  }, [persist]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (timers.current.size > 0 || inFlight.current > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  function update(stageIndex: number, checkId: string, patch: Partial<ResultView>, delay: number) {
    if (stageIndex !== activeRef.current) return;
    const prev = resultsRef.current;
    const next: ResultView = { ...(prev[checkId] ?? { state: "unanswered", text: "" }), ...patch };
    resultsRef.current = { ...prev, [checkId]: next };
    setResults(resultsRef.current);
    queueSave(checkId, next, delay);
    setConfirmSubmit(false);
  }

  function onText(stageIndex: number, checkId: string, text: string) {
    const current = resultsRef.current[checkId] ?? { state: "unanswered" as CheckState, text: "" };
    // Writing a note marks it met; clearing it un-answers it. An explicit amber stays amber.
    let state = current.state;
    if (text.trim() && state === "unanswered") state = "met";
    if (!text.trim() && state === "met") state = "unanswered";
    update(stageIndex, checkId, { text, state }, 700);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────
  const canOpen = (i: number) => i <= active || result.stages.slice(0, i).every((s) => s.complete);

  function go(i: number) {
    if (i === active || !canOpen(i)) return;
    setDirection(i > active ? 1 : -1);
    activeRef.current = i;
    setActive(i);
    setConfirmSubmit(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const stage = ruleset.stages[active];
  const stageIndex = active;
  const stageResult = result.stages[active];
  const isLast = active === ruleset.stages.length - 1;

  function onSubmit() {
    if (!confirmSubmit) {
      setConfirmSubmit(true);
      return;
    }
    setSubmitError(null);
    startTransition(async () => {
      await flush();
      const res = await submitTrade(tradeId);
      if (res?.error) setSubmitError(res.error);
    });
  }

  if (!stage) {
    return <p className="text-sm text-amber">This ruleset has no stages. Add some in the ruleset editor.</p>;
  }

  return (
    <div className="pb-40 sm:pb-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">
            {ruleset.name} · v{ruleset.version}
          </p>
          <h1 className="font-serif text-3xl tracking-tight">New trade</h1>
        </div>
        <SaveIndicator status={status} />
      </div>

      <TradeDetailsPanel tradeId={tradeId} initial={initialDetails} onStatus={setStatus} />

      <div className="mt-8">
        <StageRail
          stages={result.stages.map((s) => ({
            id: s.id,
            name: s.name,
            score: s.score,
            complete: s.complete,
            hasBreach: s.breaches.length > 0,
          }))}
          active={active}
          canOpen={canOpen}
          onSelect={go}
        />
      </div>

      <div className="relative mt-8 sm:mr-44">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.section
            key={stage.id}
            custom={direction}
            initial={{ opacity: 0, x: 24 * direction }}
            animate={{ opacity: 1, x: 0 }}
            // The outgoing panel must not take clicks while it animates out.
            exit={{ opacity: 0, x: -24 * direction, pointerEvents: "none" }}
            transition={{ duration: 0.25, ease: EASE }}
            className="panel rounded-2xl p-5 sm:p-7"
            aria-labelledby="stage-heading"
          >
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <h2 id="stage-heading" className="font-serif text-2xl">
                {stage.name}
              </h2>
              <span className="num text-sm text-muted">{Math.round(stageResult.score)}%</span>
            </div>

            {stage.checks.length === 0 && (
              <p className="text-sm text-muted">No checks in this stage.</p>
            )}

            <ul className="flex flex-col gap-1">
              {stage.checks.map((c) => {
                const r = results[c.id] ?? { state: "unanswered" as CheckState, text: "" };
                return (
                  <li key={c.id} className="rounded-lg px-2 py-3 transition hover:bg-white/[0.02]">
                    <div className="flex items-start gap-4">
                      <div className="pt-0.5">
                        <CheckToggle
                          state={r.state}
                          label={c.label}
                          onChange={(state) => update(stageIndex, c.id, { state }, 0)}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm ${r.state === "not_met" ? "text-amber" : ""}`}>{c.label}</span>
                          {c.isCritical && (
                            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                              Critical
                            </span>
                          )}
                        </div>
                        {c.description && <p className="mt-0.5 text-xs text-muted">{c.description}</p>}
                        {c.inputType === "text" && (
                          <textarea
                            value={r.text}
                            onChange={(e) => onText(stageIndex, c.id, e.target.value)}
                            rows={3}
                            placeholder="Write here…"
                            aria-label={c.label}
                            className="mt-3 w-full resize-y rounded-md border border-border bg-black/20 px-3 py-2 text-sm outline-none transition placeholder:text-muted/50 focus:border-accent/50"
                          />
                        )}
                      </div>
                      <span className="num pt-1 text-[11px] text-muted">w{c.weight}</span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <button
                type="button"
                onClick={() => go(active - 1)}
                disabled={active === 0}
                className="text-sm text-muted transition hover:text-text disabled:invisible"
              >
                ← Back
              </button>

              <div className="flex items-center gap-3">
                {!stageResult.complete && (
                  <span className="text-xs text-muted">
                    {stageResult.checkCount - stageResult.answeredCount} left to answer
                  </span>
                )}
                {isLast ? (
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={!result.complete || pending}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:brightness-110 disabled:opacity-40"
                  >
                    {pending ? "Submitting…" : confirmSubmit ? "Confirm: lock this trade" : "Submit trade"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => go(active + 1)}
                    disabled={!stageResult.complete}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:brightness-110 disabled:opacity-40"
                  >
                    Complete stage →
                  </button>
                )}
              </div>
            </div>
            {isLast && !result.complete && (
              <p className="mt-3 text-right text-xs text-muted">Every stage must be complete to submit.</p>
            )}
            {confirmSubmit && !pending && (
              <p className="mt-3 text-right text-xs text-muted">Submitted trades can&apos;t be edited.</p>
            )}
            {submitError && <p className="mt-3 text-right text-xs text-amber">{submitError}</p>}
          </motion.section>
        </AnimatePresence>

        <div className="mt-6 text-right">
          {confirmDiscard ? (
            <span className="text-xs text-muted">
              Delete this draft?{" "}
              <button
                type="button"
                onClick={() => startTransition(() => discardTrade(tradeId))}
                className="text-amber underline-offset-2 hover:underline"
              >
                Delete
              </button>{" "}
              ·{" "}
              <button type="button" onClick={() => setConfirmDiscard(false)} className="hover:text-text">
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDiscard(true)}
              className="text-xs text-muted transition hover:text-text"
            >
              Discard draft
            </button>
          )}
        </div>
      </div>

      <ScoreWidget
        secured={result.secured}
        running={result.running}
        nonCompliant={result.nonCompliant}
        completedStages={completedStages}
      />
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const text = status === "saving" ? "Saving…" : status === "error" ? "Not saved — check connection" : "Draft saved";
  return (
    <span
      className={`text-xs transition ${status === "error" ? "text-amber" : "text-muted"}`}
      role="status"
    >
      {text}
    </span>
  );
}
