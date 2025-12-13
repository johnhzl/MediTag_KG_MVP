// frontend/src/services/labelingApi.ts
import { http } from "./http";

export interface LabelingSampleListItem {
  sample_id: string;
  title: string;
  text_preview: string;
  has_cot: boolean;
  suggested_label: string;
  labels: string[];
}

export interface LabelingSampleListResponse {
  items: LabelingSampleListItem[];
  total: number;
}

export interface LabelingSampleDetail {
  sample_id: string;
  project_id: string;
  title: string;
  raw_text: string;
  labels: string[];
  current_label?: string | null;
  cot_text?: string | null;
  has_manual_cot?: boolean;
  updated_at?: string;
}

export interface SaveAnnotationBody {
  project_id: string;
  task_id: string;
  label: string;
  cot_text: string;
  source: "human" | "model" | "mixed";
  overwrite: boolean;
}

export interface GenerateCotBody {
  project_id: string;
  task_id: string;
  label?: string | null;
  model_id?: string;
  use_saved_llm_result?: boolean;
}

export interface GenerateCotResponse {
  cot_text: string;
  model_id?: string;
  from_cache?: boolean;
}

function buildQuery(params?: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        usp.set(k, String(v));
      }
    });
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

// 1) 获取样本列表
export async function fetchLabelingSamples(
  projectId: string,
  params?: { limit?: number; offset?: number }
): Promise<LabelingSampleListResponse> {
  const qs = buildQuery(params);
  return http<LabelingSampleListResponse>(
    `/api/v1/projects/${projectId}/labeling/samples${qs}`
  );
}

// 2) 获取单条样本详情
export async function fetchLabelingSampleDetail(
  sampleId: string
): Promise<LabelingSampleDetail> {
  return http<LabelingSampleDetail>(
    `/api/v1/labeling/samples/${sampleId}`
  );
}

// 3) 保存标注（标签 + COT）
export async function saveLabelingAnnotation(
  sampleId: string,
  body: SaveAnnotationBody
): Promise<LabelingSampleDetail> {
  return http<LabelingSampleDetail>(
    `/api/v1/labeling/samples/${sampleId}/annotation`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );
}

// 4) 调用模型生成 COT
export async function generateCotForSample(
  sampleId: string,
  body: GenerateCotBody
): Promise<GenerateCotResponse> {
  return http<GenerateCotResponse>(
    `/api/v1/labeling/samples/${sampleId}/cot/generate`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}
