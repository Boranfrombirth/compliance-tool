"use client";

import { useState } from "react";
import Background from "@/components/Background";
import CheckToggle from "@/components/CheckToggle";
import ProgressRing from "@/components/ProgressRing";
import { score, type Answers, type Ruleset } from "@/lib/scoring/score";

const DEMO: Ruleset = {
  stages: [
    {
      id: "pre",
      name: "Pre-trade setup",
      weight: 30,
      checks: [
        { id: "p1", label: "Higher timeframe bias defined", weight: 8, isCritical: false },
        { id: "p2", label: "Market conditions suitable", weight: 6, isCritical: false },
        { id: "p3", label: "Setup criteria all met", weight: 10, isCritical: false },
      ],
    },
    {
      id: "risk",
      name: "Risk placement",
      weight: 35,
      checks: [
        { id: "r1", label: "Stop loss placed", weight: 10, isCritical: true },
        { id: "r2", label: "Position size within limit", weight: 8, isCritical: true },
        { id: "r3", label: "Take profit at a valid level", weight: 5, isCritical: false },
        { id: "r4", label: "R:R meets minimum", weight: 2, isCritical: false },
      ],
    },
  ],
};

const SWATCHES = [
  ["--bg", "Background"],
  ["--surface", "Surface"],
  ["--border", "Border"],
  ["--text", "Text"],
  ["--muted", "Muted"],
  ["--accent", "Accent"],
  ["--amber", "Amber"],
  ["--neutral", "Neutral"],
] as const;

export default function DesignPlayground() {
  const [answers, setAnswers] = useState<Answers>({});
  const [manual, setManual] = useState(60);
  const result = score(DEMO, answers);

  return (
    <div className="relative min-h-screen px-4 py-12 sm:px-8">
      <Background />
      <div className="mx-auto flex max-w-4xl flex-col gap-12">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Phase 5 · scratch page</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Design system</h1>
          <p className="mt-3 max-w-prose text-sm text-muted">
            Tokens, type, rings and toggles in isolation. Tap the toggles to see scoring drive the rings.
          </p>
        </header>

        <section className="panel rounded-2xl p-6">
          <h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-muted">Palette</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SWATCHES.map(([token, name]) => (
              <div key={token} className="flex items-center gap-3">
                <span
                  className="h-9 w-9 shrink-0 rounded-md border border-border"
                  style={{ background: `var(${token})` }}
                />
                <div className="text-xs">
                  <div>{name}</div>
                  <div className="num text-muted">{token}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel rounded-2xl p-6">
          <h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-muted">Typography</h2>
          <p className="font-serif text-3xl">Cormorant Garamond for headings</p>
          <p className="mt-2 text-sm">Inter for body copy and labels, set in warm off white.</p>
          <p className="mt-1 text-sm text-muted">Muted Inter for secondary information.</p>
          <p className="num mt-3 text-2xl">
            86.0% <span className="text-muted">·</span> 1.5R <span className="text-muted">·</span> 0123456789
          </p>
        </section>

        <section className="panel rounded-2xl p-6">
          <h2 className="mb-6 text-xs uppercase tracking-[0.2em] text-muted">Progress rings</h2>
          <div className="flex flex-wrap items-end gap-8">
            <ProgressRing value={manual} size={40} label="Small" />
            <ProgressRing value={manual} size={64} label="Medium" />
            <ProgressRing value={manual} size={120} label="Large" />
            <ProgressRing value={manual} size={120} tone="amber" label="Non-compliant" />
          </div>
          <label className="mt-6 flex items-center gap-4 text-xs text-muted">
            Value
            <input
              type="range"
              min={0}
              max={100}
              value={manual}
              onChange={(e) => setManual(Number(e.target.value))}
              className="w-56 accent-[var(--accent)]"
            />
            <span className="num text-text">{manual}</span>
          </label>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="panel rounded-2xl p-6">
            <h2 className="mb-1 text-xs uppercase tracking-[0.2em] text-muted">Check toggles</h2>
            <p className="mb-5 text-xs text-muted">Tap to cycle: unanswered → met → not met → unanswered.</p>
            {DEMO.stages.map((stage, i) => (
              <div key={stage.id} className="mb-6 last:mb-0">
                <div className="mb-3 flex items-center gap-3">
                  <ProgressRing value={result.stages[i].score} size={32} label={stage.name} showValue={false} />
                  <h3 className="font-serif text-xl">{stage.name}</h3>
                  <span className="num ml-auto text-sm text-muted">{Math.round(result.stages[i].score)}%</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {stage.checks.map((c) => {
                    const state = answers[c.id] ?? "unanswered";
                    return (
                      <li key={c.id} className="flex items-center gap-4 rounded-lg px-2 py-2 hover:bg-white/[0.02]">
                        <CheckToggle
                          state={state}
                          label={c.label}
                          onChange={(next) => setAnswers((a) => ({ ...a, [c.id]: next }))}
                        />
                        <span className={`text-sm ${state === "not_met" ? "text-amber" : ""}`}>{c.label}</span>
                        {c.isCritical && (
                          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                            Critical
                          </span>
                        )}
                        <span className="num ml-auto text-xs text-muted">w{c.weight}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="panel flex flex-col items-center gap-3 self-start rounded-2xl p-6">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted">Live score</h2>
            <ProgressRing
              value={result.secured}
              size={136}
              tone={result.nonCompliant ? "amber" : "accent"}
              label="Secured"
            >
              <span className="num mt-1.5 text-[11px] text-muted">
                {result.running === null ? "—" : `${Math.round(result.running)}% running`}
              </span>
            </ProgressRing>
            {result.nonCompliant && (
              <p className="text-xs uppercase tracking-wider text-amber">Non-compliant</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
