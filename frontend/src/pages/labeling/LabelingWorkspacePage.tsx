// frontend/src/pages/labeling/LabelingWorkspacePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";


import {
  fetchLabelingSamples,
  fetchLabelingSampleDetail,
  saveLabelingAnnotation,
  generateCotForSample,
  LabelingSampleListItem,
  LabelingSampleDetail,
} from "../../services/labelingApi";

import {
  fetchMedThinkSampleDetail,
  MedThinkSampleDetail,
} from "../../services/medthinkApi";

const DEFAULT_LABEL_OPTIONS = [
  "稳定",
  "存在复发风险",
  "需要随访调整",
  "需紧急就诊",
  "转诊其他专科",
];

const resolveProjectName = (projectId?: string) => {
  if (!projectId) return "示例 · 心血管病历结构化";
  if (projectId === "p1") return "心血管病历结构化";
  if (projectId === "p2") return "糖尿病随访记录 COT 标注";
  if (projectId === "p3") return "放射报告问答数据集";
  return "示例项目 " + projectId;
};

const LabelingWorkspacePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();   // 新增

  const resolvedProjectId = projectId || "p1";
  const projectName = resolveProjectName(projectId);

  // 解析查询参数：sample & from
  const queryParams = new URLSearchParams(location.search);
  const querySampleId = queryParams.get("sample");       // 例如 EMR-0003
  const fromQc = queryParams.get("from") === "qc";       // 是否来自质检中心


  // 左侧样本列表
  const [samples, setSamples] = useState<LabelingSampleListItem[]>([]);
  const [samplesTotal, setSamplesTotal] = useState<number>(0);
  const [samplesLoading, setSamplesLoading] = useState<boolean>(false);
  const [samplesError, setSamplesError] = useState<string | null>(null);

  // 当前样本详情
  const [currentSample, setCurrentSample] =
    useState<LabelingSampleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  // MedThink 原始 COT（按诊断）
  const [medThinkDetail, setMedThinkDetail] =
    useState<MedThinkSampleDetail | null>(null);

  // 标注 & COT
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [cotText, setCotText] = useState<string>("");
    // 每个诊断维度单独的 COT 文本
  const [labelCotMap, setLabelCotMap] = useState<Record<string, string>>({});


  // 操作状态
  const [saving, setSaving] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  // -------------- 数据加载逻辑 --------------

  // 加载样本列表
  useEffect(() => {
  const loadSamples = async () => {
    setSamplesLoading(true);
    setSamplesError(null);
    try {
      const res = await fetchLabelingSamples(resolvedProjectId, {
        limit: 30,
        offset: 0,
      });
      const items = res.items || [];
      setSamples(items );
      setSamplesTotal(res.total || items.length || 0);

      // 优先使用 URL 里的 sample 参数，其次使用列表第一条
      const availableIds = items.map((i) => i.sample_id);
      let initialSampleId: string | null = null;
      if (querySampleId && availableIds.includes(querySampleId)) {
        initialSampleId = querySampleId;
      } else if (items.length > 0) {
        initialSampleId = items[0].sample_id;
      }

      if (initialSampleId) {
        await loadSampleDetail(initialSampleId);
      } else {
        setCurrentSample(null);
        setSelectedLabel(null);
        setCotText("");
      }
    } catch (err: any) {
      console.error("加载样本列表失败", err);
      setSamplesError(
        err?.message || "加载样本列表失败，请检查后端接口是否可用。"
      );
    } finally {
      setSamplesLoading(false);
    }
  };

  loadSamples();
}, [resolvedProjectId, querySampleId]);   // 依赖里加 querySampleId


  // 加载单条样本详情
  const loadSampleDetail = async (sampleId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const detail = await fetchLabelingSampleDetail(sampleId);
      setCurrentSample(detail);

      // 所有可选诊断标签：优先用接口返回的 labels，否则用默认选项
      const labels =
        detail.labels && detail.labels.length
          ? detail.labels
          : DEFAULT_LABEL_OPTIONS;

      // 尝试从后端的 per_label_cot（如果以后你加了这个字段）恢复
      const perLabelCot =
        (detail as any).per_label_cot as Record<string, string> | undefined;

      const initialMap: Record<string, string> = {};

      if (perLabelCot) {
        labels.forEach((lbl) => {
          if (perLabelCot[lbl]) {
            initialMap[lbl] = perLabelCot[lbl];
          }
        });
      }

      // 如果当前标签有统一的 cot_text，也作为当前标签的默认值
      if (detail.current_label && detail.cot_text) {
        initialMap[detail.current_label] =
          perLabelCot?.[detail.current_label] || detail.cot_text;
      }

      setLabelCotMap(initialMap);

      const firstLabel =
        detail.current_label ||
        (detail.labels && detail.labels.length > 0
          ? detail.labels[0]
          : null);
      setSelectedLabel(firstLabel);

      // 当前 textarea 展示当前标签的 COT（如果有），否则退回之前的 cot_text
      setCotText(
        (firstLabel && initialMap[firstLabel]) || detail.cot_text || ""
      );
    } catch (err: any) {
      console.error("加载样本详情失败", err);
      setDetailError(
        err?.message || "加载样本详情失败，请检查后端接口是否可用。"
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // 当点击左侧样本时
  const handleSelectSample = (sample: LabelingSampleListItem) => {
    loadSampleDetail(sample.sample_id);
  };

  const handleBackToProject = () => {
    if (projectId) {
      navigate("/projects");
    } else {
      navigate("/dashboard");
    }
  };

    // 加载当前样本对应的 MedThink 详情（如果有的话）
  const loadMedThinkDetail = async (sampleId: string) => {
    try {
      // project_id 用当前项目 ID，后端会从对应 raw/med_think_responses.jsonl 里找
      const detail = await fetchMedThinkSampleDetail(sampleId, resolvedProjectId);
      setMedThinkDetail(detail);
    } catch (err: any) {
      // 没有对应记录 / 404 等情况直接忽略，不影响标注主流程
      console.warn("当前样本没有找到 MedThink 数据，可以忽略。", err);
      setMedThinkDetail(null);
    }
  };
 // 当前样本可选标签：优先用接口返回的 labels，否则用默认选项
  const labelOptions: string[] = useMemo(() => {
    if (currentSample && currentSample.labels && currentSample.labels.length) {
      return currentSample.labels;
    }
    return DEFAULT_LABEL_OPTIONS;
  }, [currentSample]);

  // 当前标签对应的 MedThink 思维链（如果存在的话）
  const currentMedThink = useMemo(() => {
    if (!medThinkDetail) return null;
    // 优先用当前选中的标签；没有就用第一个诊断
    const label =
      selectedLabel ||
      medThinkDetail.diagnosis_list?.[0] ||
      null;
    if (!label) return null;
    return (
      medThinkDetail.model_thinks?.find((mt) => mt.label === label) || null
    );
  }, [medThinkDetail, selectedLabel]);

    // 当 textarea 变化时，同时更新当前诊断对应的 COT 文本
  const handleCotTextChange = (value: string) => {
    setCotText(value);
    if (selectedLabel) {
      setLabelCotMap((prev) => ({
        ...prev,
        [selectedLabel]: value,
      }));
    }
  };

  // -------------- 操作：保存标注 --------------
  const handleSaveAnnotation = async () => {
    if (!currentSample) return;
    if (!selectedLabel) {
      alert("请先选择一个标签再保存。");
      return;
    }

    setSaving(true);
    try {
      await saveLabelingAnnotation(currentSample.sample_id, {
        project_id: resolvedProjectId,
        task_id: "default", // 先写死，后面你可以接真实任务 ID
        // 注意：这里保存的是“当前诊断”对应的 COT 文本
        label: selectedLabel,
        cot_text: cotText,
        source: "human",
        overwrite: true,
      });
      // 简单提示一下，后续可以接通知系统 / toast
      console.log("标注已保存");
    } catch (err: any) {
      console.error("保存标注失败", err);
      alert(
        err?.message || "保存标注失败，请检查接口实现和服务器日志。"
      );
    } finally {
      setSaving(false);
    }
  };

  // 用 MedThink 原始 COT 填充编辑器
  const handleFillCotFromMedThink = () => {
    if (currentMedThink && currentMedThink.med_think) {
      setCotText(currentMedThink.med_think);
    }
  };

  // -------------- 操作：模型生成 COT --------------

  const handleGenerateCot = async () => {
    if (!currentSample) return;
    setGenerating(true);
    try {
      const res = await generateCotForSample(currentSample.sample_id, {
        project_id: resolvedProjectId,
        task_id: "default",
        label: selectedLabel || currentSample.current_label || undefined,
        model_id: "default-med-cot", // 可以在后端映射到具体模型或 offline jsonl
        use_saved_llm_result: true,
      });
      handleCotTextChange(res.cot_text || "");
    } catch (err: any) {
      console.error("生成 COT 失败", err);
      alert(
        err?.message ||
          "生成 COT 失败，请检查 /cot/generate 接口实现和模型配置。"
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleClearCot = () => {
    handleCotTextChange("");
  };

  // -------------- JSX：页面结构 --------------

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 顶部标题 */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
        }}
      >
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginBottom: 4,
            }}
          >
            {projectId && (
              <>
                <span
                  style={{ cursor: "pointer" }}
                  onClick={handleBackToProject}
                >
                  项目管理
                </span>
                <span style={{ opacity: 0.6 }}> / </span>
                <span>{projectName}</span>
                <span style={{ opacity: 0.6 }}> / </span>
              </>
            )}
            <span style={{ color: "var(--accent)" }}>标注工作台</span>
          </div>
        <div>
          <div className="page-title">
            标注工作台 · {projectName}
          </div>
          <div className="page-subtitle">
            左侧从后端拉取样本列表，中间对标签进行标注，右侧使用 COT
            编辑器撰写或由模型生成思维链。
          </div>

          {fromQc && currentSample && (
            <div 
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "var(--accent)",
              }}
            >
              来自质检中心：正在复核样本 {currentSample.sample_id}。如需返回，请点击左侧「质检中心」菜单。
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {/* 按钮 1：返回项目 / 总览 */}
          <button className="btn-ghost" onClick={handleBackToProject}>
            <span>📁</span>
            <span>{projectId ? "返回项目列表" : "返回总览"}</span>
          </button>

          {/* 按钮 2：打开思维链样本库 */}
          <button
            className="btn-ghost"
            onClick={() => navigate("/medthink")}
          >
            <span>🧠</span>
            <span>打开思维链样本库</span>
          </button>

          {/* 按钮 3：保存当前标注 */}
          <button
            className="btn-ghost"   // 想突出一点可以换成 btn-primary
            onClick={handleSaveAnnotation}
            disabled={saving || !currentSample}
          >
            <span>💾</span>
            <span>{saving ? "保存中..." : "保存当前标注"}</span>
          </button>
        </div>

      </section>

      {/* 主体三栏布局 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 1.2fr) minmax(0, 1.8fr) minmax(0, 1.7fr)",
          gap: 16,
        }}
      >
        {/* 左：样本列表 */}
        <div className="card" style={{ padding: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <div className="card-title">样本列表 · Samples</div>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              {samplesLoading
                ? "加载中..."
                : `共 ${samplesTotal} 条`}
            </span>
          </div>

          {samplesError && (
            <div
              style={{
                fontSize: 11,
                color: "#fb7185",
                marginBottom: 6,
              }}
            >
              {samplesError}
            </div>
          )}

          <div
            style={{
              marginTop: 4,
              maxHeight: 420,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {samples.map((s) => {
              const isActive =
                s.sample_id === currentSample?.sample_id;
              return (
                <div
                  key={s.sample_id}
                  onClick={() => handleSelectSample(s)}
                  style={{
                    borderRadius: 12,
                    padding: "8px 9px",
                    marginBottom: 6,
                    cursor: "pointer",
                    border: isActive
                      ? "1px solid rgba(56,189,248,0.9)"
                      : "1px solid rgba(148,163,184,0.45)",
                    background: isActive
                      ? "rgba(15,23,42,0.95)"
                      : "rgba(15,23,42,0.8)",
                    boxShadow: isActive
                      ? "0 14px 30px rgba(15,23,42,0.9)"
                      : "none",
                    transition:
                      "transform 0.12s ease-out, box-shadow 0.12s ease-out",
                    transform: isActive ? "translateY(-1px)" : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {s.sample_id}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: s.has_cot
                          ? "#22c55e"
                          : "var(--text-secondary)",
                      }}
                    >
                      {s.has_cot ? "已有 COT" : "待补充 COT"}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      marginBottom: 2,
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      maxHeight: 40,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {s.text_preview}
                  </div>
                </div>
              );
            })}

            {!samplesLoading && samples.length === 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  padding: "8px 4px",
                }}
              >
                暂无样本数据，请先在后端准备
                labeling_inputs.jsonl 或检查 /labeling/samples 接口。
              </div>
            )}
          </div>
        </div>

        {/* 中：病历文本 & 标签 */}
        <div className="card" style={{ padding: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <div>
              <div className="card-title">病历文本 · 主体</div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                }}
              >
                {detailLoading
                  ? "加载样本详情中..."
                  : currentSample
                  ? `当前样本：${currentSample.sample_id} · ${currentSample.title}`
                  : "尚未选择样本"}
              </div>
            </div>
            <span className="pill">
              <span className="pill-dot" />
              <span>接口驱动 · 实时拉取</span>
            </span>
          </div>

          <div
            style={{
              fontSize: 13,
              lineHeight: 1.7,
              color: "var(--text-primary)",
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.5)",
              background: "rgba(15,23,42,0.95)",
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {currentSample?.raw_text || "暂无文本内容。"}
          </div>

          {detailError && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "#fb7185",
              }}
            >
              {detailError}
            </div>
          )}

          {/* 标签选择 */}
          <div
            style={{
              marginTop: 12,
              borderTop: "1px solid rgba(148,163,184,0.25)",
              paddingTop: 8,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginBottom: 6,
              }}
            >
              请选择本条病历的标签（单选，来自后端 labels）：
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {labelOptions.map((label) => {
                const active = selectedLabel === label;
                const hasCot =
                  labelCotMap[label] && labelCotMap[label].trim().length > 0;

                return (
                  <button
                    key={label}
                    type="button"
                    className={
                      "label-pill" + (active ? " label-pill--active" : "")
                    }
                    onClick={() => {
                      setSelectedLabel(label);
                      // 切换诊断时加载该诊断对应的 COT 文本（可能为空）
                      setCotText(labelCotMap[label] || "");
                    }}
                  >
                    <span>{label}</span>
                    {hasCot && (
                      <span
                        style={{
                          marginLeft: 4,
                          fontSize: 10,
                          opacity: 0.75,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              提示：真实系统里，这些标签来自项目的 label config
              或任务配置，并与数据库的标注字段对应。
            </div>
          </div>
        </div>

        {/* 右：COT 编辑器 */}
        <div className="card" style={{ padding: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <div>
              <div className="card-title">COT 思维链标注 · Editor</div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                }}
              >
                右侧从 /cot/generate 拉取模型思维链，或手工编辑；保存时与标签一并写回 /annotation 接口。
              </div>
            </div>
            <span className="pill">
              <span className="pill-dot" />
              <span>模型接入预留</span>
            </span>
          </div>

                    <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            {/* 在线模型（/cot/generate） */}
            <button
              type="button"
              className="btn-ghost"
              onClick={handleGenerateCot}
              disabled={generating || !currentSample}
            >
              <span>🧠</span>
              <span>{generating ? "生成中..." : "从在线模型生成 COT"}</span>
            </button>

            {/* 离线 MedThink COT 填充（med_think_responses.jsonl） */}
            <button
              type="button"
              className="btn-ghost"
              onClick={handleFillCotFromMedThink}
              disabled={!currentMedThink}
            >
              <span>📥</span>
              <span>用离线 COT 填充</span>
            </button>

            {/* 清空 */}
            <button
              type="button"
              className="btn-ghost"
              onClick={handleClearCot}
            >
              <span>🧹</span>
              <span>清空当前 COT</span>
            </button>
          </div>

          <textarea
            className="textarea"
            value={cotText}
            onChange={(e) => handleCotTextChange(e.target.value)}
            placeholder="在这里撰写或编辑思维链，例如：\n1）先梳理患者基础危险因素...\n2）结合本次症状和检查结果...\n3）说明为什么选择当前标签而不是其他标签..."
          />
          {currentMedThink && (
            <div
              style={{
                marginTop: 8,
                borderRadius: 8,
                padding: 8,
                border: "1px dashed rgba(148,163,184,0.55)",
                background: "rgba(15,23,42,0.9)",
                fontSize: 11,
                color: "var(--text-secondary)",
                maxHeight: 120,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              <div
                style={{
                  marginBottom: 4,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                当前诊断「{currentMedThink.label}」的模型原始 COT（只读）：
              </div>
              {currentMedThink.med_think || "暂无模型 COT 内容。"}
            </div>
          )}

          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "var(--text-secondary)",
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span>
              建议风格：分步骤、结构化描述推理过程，有助于后续训练 COT
              模型。
            </span>
            <span>
              你可以在后端实现版本管理、多标注员协同等高级功能，而前端协议基本保持不变。
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LabelingWorkspacePage;
