// frontend/src/services/kgApi.ts

import { http } from "./http";

export type KgNodeType = "disease" | "symptom";

export interface KgNode {
  id: string;
  label: string;
  type: KgNodeType;
  count?: number;
}

export interface KgEdge {
  id: string;
  source: string;
  target: string;
  type: "HAS_SYMPTOM";
  weight?: number;
}

export interface KgStats {
  disease_nodes: number;
  symptom_nodes: number;
  edges: number;
  min_sym_freq: number;
}

export interface KgGraphResponse {
  center: string | null;
  nodes: KgNode[];
  edges: KgEdge[];
  stats: KgStats;
}

export interface KgSearchResponse {
  items: KgNode[];
}

export interface DiagnoseHit {
  symptom: string;
  weight: number;
}

export interface DiagnoseItem {
  disease: string;
  score: number;
  hit_count: number;
  hits: DiagnoseHit[];
}

export interface DiagnoseResponse {
  matched?: { input: string[]; mapped: Record<string, string> };
  items: DiagnoseItem[];
}

export function fetchKgStats(projectId: string) {
  return http<KgStats>(`/api/v1/projects/${projectId}/kg/stats`);
}

export function fetchKgGraph(projectId: string, params?: { center?: string; depth?: number; max_nodes?: number }) {
  const q = new URLSearchParams();
  if (params?.center) q.set("center", params.center);
  if (typeof params?.depth === "number") q.set("depth", String(params.depth));
  if (typeof params?.max_nodes === "number") q.set("max_nodes", String(params.max_nodes));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return http<KgGraphResponse>(`/api/v1/projects/${projectId}/kg/graph${suffix}`);
}

export function searchKg(projectId: string, q: string, type?: KgNodeType) {
  const qs = new URLSearchParams();
  qs.set("q", q);
  if (type) qs.set("type", type);
  return http<KgSearchResponse>(`/api/v1/projects/${projectId}/kg/search?${qs.toString()}`);
}

export function diagnose(projectId: string, symptoms: string[]) {
  return http<DiagnoseResponse>(`/api/v1/projects/${projectId}/kg/diagnose`, {
    method: "POST",
    body: JSON.stringify({ symptoms }),
  });
}
