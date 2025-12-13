import { http } from "./http";

export interface MedThinkSampleListItem {
  sample_id: string;
  patient_id?: string | null;
  visit_date?: string | null;
  diagnosis_count: number;
  diagnosis_list: string[];
  has_cot_for_all: boolean;
  total_cot_tokens: number;
}

export interface MedThinkSamplesListResponse {
  items: MedThinkSampleListItem[];
  total: number;
}

export interface MedThinkDiagnosisThink {
  label: string;
  med_think: string;
  tokens: number;
}

export interface MedThinkSampleDetail {
  sample_id: string;
  project_id: string;
  patient_id?: string | null;
  visit_date?: string | null;
  diagnosis_list: string[];
  diagnosis_count: number;
  emr_text: string;
  model_thinks: MedThinkDiagnosisThink[];
  total_cot_tokens: number;
  has_cot_for_all: boolean;
}

/**
 * 列表接口：/api/v1/projects/{projectId}/medthink/samples
 */
export async function fetchMedThinkSamples(
  projectId: string,
  params?: { limit?: number; offset?: number }
): Promise<MedThinkSamplesListResponse> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));

  const qs = search.toString();
  const url = `/api/v1/projects/${projectId}/medthink/samples${
    qs ? `?${qs}` : ""
  }`;

  return http<MedThinkSamplesListResponse>(url);
}

/**
 * 详情接口：/api/v1/medthink/samples/{sampleId}?project_id=p1
 */
export async function fetchMedThinkSampleDetail(
  sampleId: string,
  projectId?: string
): Promise<MedThinkSampleDetail> {
  const search = new URLSearchParams();
  if (projectId) search.set("project_id", projectId);
  const qs = search.toString();
  const url = `/api/v1/medthink/samples/${sampleId}${qs ? `?${qs}` : ""}`;
  return http<MedThinkSampleDetail>(url);
}
