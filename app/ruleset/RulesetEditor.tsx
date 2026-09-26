"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { RulesetView } from "@/lib/trades/types";
import { saveRuleset, type EditableCheck, type EditableStage } from "./actions";

interface Version {
  id: string;
  name: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  tradeCount: number;
}

// Client-side keys so React tracks items through reorders.
type Keyed<T> = T & { key: string };
type DraftCheck = Keyed<EditableCheck>;
type DraftStage = Keyed<Omit<EditableStage, "checks"> & { checks: DraftCheck[] }>;

let seq = 0;
const newKey = () => `k${++seq}`;

function fromRuleset(r: RulesetView): DraftStage[] {
  return r.stages.map((s) => ({
    key: newKey(),
    name: s.name,
    weight: s.weight,
    checks: s.checks.map((c) => ({
      key: newKey(),
      label: c.label,
      description: c.description ?? "",
      weight: c.weight,
      isCritical: c.isCritical,
      inputType: c.inputType,
    })),
  }));
}

/** Comparable form without client keys, for dirty checking. */
const snapshot = (name: string, stages: DraftStage[]) =>
  JSON.stringify({
    name: name.trim(),
    stages: stages.map((s) => ({
      name: s.name.trim(),
      weight: Number(s.weight) || 0,
      checks: s.checks.map((c) => ({
        label: c.label.trim(),
        description: c.description.trim(),
        weight: c.weight,
        isCritical: c.isCritical,
        inputType: c.inputType,
      })),
    })),
  });

function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const input =
  "w-full rounded-md border border-border bg-black/20 px-3 py-2 text-sm outline-none transition placeholder:text-muted/50 focus:border-accent/50";

export default function RulesetEditor({
  ruleset,
  tradeCount,
  versions,
}: {
  ruleset: RulesetView;
  tradeCount: number;
  versions: Version[];
}) {
  const router = useRouter();
  const [name, setName] = useState(ruleset.name);
  const [stages, setStages] = useState(() => fromRuleset(ruleset));
  const [baseline, setBaseline] = useState(() => snapshot(ruleset.name, fromRuleset(ruleset)));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const dirty = snapshot(name, stages) !== baseline;
  const stageWeightSum = stages.reduce((a, s) => a + (Number(s.weight) || 0), 0);

  const problems = useMemo(() => {
    const p: string[] = [];
    if (!name.trim()) p.push("The ruleset needs a name.");
    if (stages.length === 0) p.push("Add at least one stage.");
    stages.forEach((s, i) => {
      if (!s.name.trim()) p.push(`Stage ${i + 1} needs a name.`);
      if (s.checks.some((c) => !c.label.trim())) p.push(`Every check in “${s.name || `stage ${i + 1}`}” needs a label.`);
    });
    if (stages.length && stageWeightSum <= 0) p.push("At least one stage needs a weight above 0.");
    return p;
  }, [name, stages, stageWeightSum]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // ─── Mutators ────────────────────────────────────────────────────────────
  const edit = (fn: (s: DraftStage[]) => DraftStage[]) => {
    setStages(fn);
    setNotice(null);
    setError(null);
  };
  const setStage = (si: number, patch: Partial<DraftStage>) =>
    edit((all) => all.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  const setCheck = (si: number, ci: number, patch: Partial<DraftCheck>) =>
    edit((all) =>
      all.map((s, i) => (i === si ? { ...s, checks: s.checks.map((c, j) => (j === ci ? { ...c, ...patch } : c)) } : s)),
    );
  const addCheck = (si: number) =>
    setStage(si, {
      checks: [
        ...stages[si].checks,
        { key: newKey(), label: "", description: "", weight: 5, isCritical: false, inputType: "tick" },
      ],
    });
  const addStage = () =>
    edit((all) => [...all, { key: newKey(), name: "", weight: 10, checks: [] }]);

  function save() {
    if (problems.length) {
      setError(problems[0]);
      return;
    }
    setError(null);
    startSaving(async () => {
      const res = await saveRuleset(ruleset.id, name, stages);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBaseline(snapshot(name, stages));
      setNotice(
        res.newVersion
          ? `Saved as version ${Math.max(...versions.map((v) => v.version)) + 1}. Past trades keep the rules they were graded under.`
          : "Saved.",
      );
      router.refresh();
    });
  }

  function discard() {
    const fresh = fromRuleset(ruleset);
    setName(ruleset.name);
    setStages(fresh);
    setBaseline(snapshot(ruleset.name, fresh));
    setError(null);
    setNotice(null);
  }

  return (
    <div className="pb-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Active ruleset · v{ruleset.version}</p>
          <h1 className="font-serif text-3xl tracking-tight">Ruleset</h1>
        </div>
      </div>

      <p className="mt-3 max-w-prose text-sm text-muted">
        {tradeCount > 0
          ? `${tradeCount} trade${tradeCount === 1 ? " is" : "s are"} graded on version ${ruleset.version}. Saving creates version ${
              Math.max(...versions.map((v) => v.version)) + 1
            }; past trades keep these rules. A trade in progress finishes on the version it started with.`
          : "No trades use this version yet, so changes apply in place."}
      </p>

      <label className="mt-8 flex max-w-md flex-col gap-1.5 text-[11px] uppercase tracking-wider text-muted">
        Ruleset name
        <input className={input} value={name} onChange={(e) => { setName(e.target.value); setNotice(null); }} />
      </label>

      <ol className="mt-8 flex flex-col gap-6">
        <AnimatePresence initial={false}>
          {stages.map((stage, si) => {
            const checkWeightSum = stage.checks.reduce((a, c) => a + c.weight, 0);
            const share = stageWeightSum > 0 ? ((Number(stage.weight) || 0) / stageWeightSum) * 100 : 0;
            return (
              <motion.li
                key={stage.key}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="panel rounded-2xl"
              >
                <div className="flex flex-wrap items-end gap-3 border-b border-border p-5">
                  <span className="num pb-2 text-xs text-muted">{si + 1}</span>
                  <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-[11px] uppercase tracking-wider text-muted">
                    Stage name
                    <input
                      className={`${input} font-serif text-lg normal-case tracking-normal text-text`}
                      value={stage.name}
                      placeholder="Stage name"
                      onChange={(e) => setStage(si, { name: e.target.value })}
                    />
                  </label>
                  <label className="flex w-28 flex-col gap-1.5 text-[11px] uppercase tracking-wider text-muted">
                    Weight
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      className={`${input} num`}
                      value={stage.weight}
                      onChange={(e) => setStage(si, { weight: e.target.value === "" ? 0 : Number(e.target.value) })}
                    />
                  </label>
                  <span className="num w-24 whitespace-nowrap pb-2 text-right text-xs text-muted" title="Share of the total score">
                    {Math.round(share)}% of total
                  </span>
                  <div className="flex items-center gap-1 pb-1">
                    <IconButton label={`Move ${stage.name || "stage"} up`} disabled={si === 0} onClick={() => edit((a) => move(a, si, si - 1))}>↑</IconButton>
                    <IconButton label={`Move ${stage.name || "stage"} down`} disabled={si === stages.length - 1} onClick={() => edit((a) => move(a, si, si + 1))}>↓</IconButton>
                    {confirmDelete === stage.key ? (
                      <span className="flex items-center gap-2 pl-2 text-xs">
                        <button type="button" className="text-amber hover:underline" onClick={() => { edit((a) => a.filter((_, i) => i !== si)); setConfirmDelete(null); }}>
                          Delete stage
                        </button>
                        <button type="button" className="text-muted hover:text-text" onClick={() => setConfirmDelete(null)}>
                          Keep
                        </button>
                      </span>
                    ) : (
                      <IconButton
                        label={`Delete ${stage.name || "stage"}`}
                        disabled={stages.length === 1}
                        onClick={() => (stage.checks.length ? setConfirmDelete(stage.key) : edit((a) => a.filter((_, i) => i !== si)))}
                      >
                        ×
                      </IconButton>
                    )}
                  </div>
                </div>

                <ul className="flex flex-col divide-y divide-border/60">
                  <AnimatePresence initial={false}>
                    {stage.checks.map((c, ci) => (
                      <motion.li
                        key={c.key}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]"
                      >
                        <div className="flex flex-col gap-2">
                          <input
                            className={input}
                            value={c.label}
                            placeholder="Check label, e.g. Stop loss placed"
                            aria-label="Check label"
                            onChange={(e) => setCheck(si, ci, { label: e.target.value })}
                          />
                          <input
                            className={`${input} text-xs text-muted`}
                            value={c.description}
                            placeholder="Description (optional)"
                            aria-label="Check description"
                            onChange={(e) => setCheck(si, ci, { description: e.target.value })}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-col sm:items-end">
                          <label className="flex items-center gap-2 text-xs text-muted">
                            Weight
                            <input
                              type="range"
                              min={1}
                              max={10}
                              value={c.weight}
                              onChange={(e) => setCheck(si, ci, { weight: Number(e.target.value) })}
                              className="w-24 accent-[var(--accent)]"
                              aria-label={`Weight for ${c.label || "check"}`}
                            />
                            <span className="num w-5 text-right text-text">{c.weight}</span>
                            <span className="num w-10 text-right" title="Share of this stage">
                              {checkWeightSum ? Math.round((c.weight / checkWeightSum) * 100) : 0}%
                            </span>
                          </label>
                          <div className="flex items-center gap-3 text-xs">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={c.isCritical}
                              onClick={() => setCheck(si, ci, { isCritical: !c.isCritical })}
                              className={`rounded border px-2 py-1 uppercase tracking-wider transition ${
                                c.isCritical ? "border-amber/60 text-amber" : "border-border text-muted hover:text-text"
                              }`}
                            >
                              Critical
                            </button>
                            <select
                              value={c.inputType}
                              onChange={(e) => setCheck(si, ci, { inputType: e.target.value as "tick" | "text" })}
                              className="rounded border border-border bg-black/20 px-2 py-1 text-muted outline-none focus:border-accent/50"
                              aria-label="Answer type"
                            >
                              <option value="tick">Tick</option>
                              <option value="text">Written note</option>
                            </select>
                            <span className="flex items-center gap-1">
                              <IconButton label="Move check up" disabled={ci === 0} onClick={() => setStage(si, { checks: move(stage.checks, ci, ci - 1) })}>↑</IconButton>
                              <IconButton label="Move check down" disabled={ci === stage.checks.length - 1} onClick={() => setStage(si, { checks: move(stage.checks, ci, ci + 1) })}>↓</IconButton>
                              <IconButton label={`Delete ${c.label || "check"}`} onClick={() => setStage(si, { checks: stage.checks.filter((_, j) => j !== ci) })}>×</IconButton>
                            </span>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                {stage.checks.length === 0 && (
                  <p className="px-5 pt-4 text-xs text-muted">No checks yet. An empty stage doesn&apos;t count towards the score.</p>
                )}
                <div className="p-5 pt-3">
                  <button type="button" onClick={() => addCheck(si)} className="text-sm text-accent transition hover:brightness-110">
                    + Add check
                  </button>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>

      <button
        type="button"
        onClick={addStage}
        className="mt-6 w-full rounded-2xl border border-dashed border-border py-4 text-sm text-muted transition hover:border-accent/40 hover:text-accent"
      >
        + Add stage
      </button>

      <p className="mt-4 text-xs text-muted">
        Check weights (1–10) are shares within their stage; stage weights set each stage&apos;s share of the total.
        Failing a critical check marks the trade non-compliant whatever its score.
      </p>

      {versions.length > 1 && (
        <section className="mt-12">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted">Version history</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between py-2.5">
                <span>
                  <span className="num text-muted">v{v.version}</span> <span className="ml-2">{v.name}</span>
                  {v.isActive && <span className="ml-2 text-[10px] uppercase tracking-wider text-accent">Active</span>}
                </span>
                <span className="num text-xs text-muted">
                  {v.tradeCount} trade{v.tradeCount === 1 ? "" : "s"} ·{" "}
                  {new Date(v.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Save bar */}
      <AnimatePresence>
        {(dirty || error || notice) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="panel fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3"
            style={{ background: "rgba(20,21,24,0.92)" }}
            role="status"
          >
            <span className={`text-sm ${error ? "text-amber" : dirty ? "text-text" : "text-accent"}`}>
              {error ?? (dirty ? "Unsaved changes" : notice)}
            </span>
            {dirty && (
              <span className="flex items-center gap-3">
                <button type="button" onClick={discard} disabled={saving} className="text-sm text-muted hover:text-text">
                  Discard
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:brightness-110 disabled:opacity-50"
                >
                  {saving ? "Saving…" : tradeCount > 0 ? `Save as v${Math.max(...versions.map((v) => v.version)) + 1}` : "Save"}
                </button>
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-white/[0.05] hover:text-text disabled:opacity-25 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
