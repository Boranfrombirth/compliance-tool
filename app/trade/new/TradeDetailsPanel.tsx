"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TradeDetails } from "@/lib/trades/types";

type Status = "saved" | "saving" | "error";

const NUMERIC = new Set<keyof TradeDetails>(["entry", "stop", "target", "result_r"]);

// Optional trade metadata, autosaved to the trade row.
export default function TradeDetailsPanel({
  tradeId,
  initial,
  onStatus,
}: {
  tradeId: string;
  initial: TradeDetails;
  onStatus: (s: Status) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [values, setValues] = useState(initial);
  const pending = useRef<Partial<TradeDetails>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function set<K extends keyof TradeDetails>(key: K, raw: string) {
    let value: TradeDetails[K];
    if (NUMERIC.has(key)) {
      const n = raw.trim() === "" ? null : Number(raw);
      value = (n === null || Number.isFinite(n) ? n : values[key]) as TradeDetails[K];
    } else if (key === "pair") {
      value = (raw.toUpperCase() || null) as TradeDetails[K];
    } else {
      value = (raw || null) as TradeDetails[K];
    }
    setValues((v) => ({ ...v, [key]: value }));
    pending.current[key] = value;
    onStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const patch = pending.current;
      pending.current = {};
      timer.current = null;
      const { error } = await supabase.from("trades").update(patch).eq("id", tradeId);
      onStatus(error ? "error" : "saved");
    }, 700);
  }

  const input =
    "w-full rounded-md border border-border bg-black/20 px-3 py-2 text-sm outline-none transition placeholder:text-muted/50 focus:border-accent/50";
  const label = "flex flex-col gap-1.5 text-[11px] uppercase tracking-wider text-muted";

  const summary = [values.pair, values.direction].filter(Boolean).join(" · ") || "Add pair, direction and levels";

  return (
    <details className="panel group rounded-2xl">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm">
        <span>
          <span className="text-muted">Trade details</span>
          <span className="num ml-3">{summary}</span>
        </span>
        <span className="text-muted transition group-open:rotate-180" aria-hidden>
          ⌄
        </span>
      </summary>
      <div className="grid grid-cols-2 gap-4 border-t border-border px-5 py-5 sm:grid-cols-4">
        <label className={label}>
          Pair
          <input className={`${input} num`} value={values.pair ?? ""} onChange={(e) => set("pair", e.target.value)} placeholder="EURUSD" />
        </label>
        <label className={label}>
          Direction
          <select
            className={input}
            value={values.direction ?? ""}
            onChange={(e) => set("direction", e.target.value)}
          >
            <option value="">—</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </label>
        <label className={label}>
          Session
          <input className={input} value={values.session ?? ""} onChange={(e) => set("session", e.target.value)} placeholder="London" />
        </label>
        <label className={label}>
          Model tag
          <input className={input} value={values.model_tag ?? ""} onChange={(e) => set("model_tag", e.target.value)} />
        </label>
        {(["entry", "stop", "target", "result_r"] as const).map((k) => (
          <label key={k} className={label}>
            {k === "result_r" ? "Result (R)" : k}
            <input
              className={`${input} num`}
              type="number"
              step="any"
              inputMode="decimal"
              defaultValue={values[k] ?? ""}
              onChange={(e) => set(k, e.target.value)}
            />
          </label>
        ))}
      </div>
    </details>
  );
}
