import type { CheckState } from "@/lib/scoring/score";

export interface CheckView {
  id: string;
  label: string;
  description: string | null;
  weight: number;
  isCritical: boolean;
  inputType: "tick" | "text";
}

export interface StageView {
  id: string;
  name: string;
  weight: number;
  checks: CheckView[];
}

export interface RulesetView {
  id: string;
  name: string;
  version: number;
  stages: StageView[];
}

export interface ResultView {
  state: CheckState;
  text: string;
}

export interface TradeDetails {
  pair: string | null;
  direction: "long" | "short" | null;
  entry: number | null;
  stop: number | null;
  target: number | null;
  session: string | null;
  model_tag: string | null;
  opened_at: string | null;
  closed_at: string | null;
  result_r: number | null;
}

export const DETAIL_COLUMNS =
  "pair, direction, entry, stop, target, session, model_tag, opened_at, closed_at, result_r";
