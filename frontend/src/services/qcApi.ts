import { http } from "./http";

export type QcSeverity = "low" | "medium" | "high";

export interface QcSummary {
  projectId: string;
  projectName: string;
  totalSamples: number;
  labeledSamples: number;
  cotSamples: number;
  avgCotTokens: number;
  autoQcPassRate: number;          // 0~1
  flaggedSamples: number;
  humanReviewed: number;
  interAnnotatorAgreement: number; // 0~1
}

export interface QcIssue {
  id: string;
  sampleId: string;
  projectId: string;
  issueType: string;
  ruleName: string;
  severity: QcSeverity;
  status: "pending" | "confirmed" | "ignored";
  createdAt: string;
  lastReviewer?: string;
}

export interface QcIssuesResponse {
  items: QcIssue[];
  total: number;
}

export async function fetchQcSummary(
  projectId: string
): Promise<QcSummary> {
  return http<QcSummary>(`/api/v1/projects/${projectId}/qc/summary`);
}

export async function fetchQcIssues(
  projectId: string
): Promise<QcIssuesResponse> {
  return http<QcIssuesResponse>(`/api/v1/projects/${projectId}/qc/issues`);
}
