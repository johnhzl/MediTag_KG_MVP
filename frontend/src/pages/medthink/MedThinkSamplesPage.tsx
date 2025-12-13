import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchMedThinkSamples,
  fetchMedThinkSampleDetail,
  MedThinkSampleListItem,
  MedThinkSampleDetail,
} from "../../services/medthinkApi";

const MedThinkSamplesPage: React.FC = () => {
  // 目前 demo 固定 p1，后续可以从 URL / 全局设置里传
  const projectId = "p1";

  const [samples, setSamples] = useState<MedThinkSampleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [detail, setDetail] = useState<MedThinkSampleDetail | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // 加载列表
  useEffect(() => {
    const loadList = async () => {
      setLoadingList(true);
      setError(null);
      try {
        const res = await fetchMedThinkSamples(projectId, {
          limit: 100,
          offset: 0,
        });
        const items = res.items || [];
        setSamples(items);
        setTotal(res.total || items.length || 0);

        if (items.length > 0) {
          setSelectedId(items[0].sample_id);
        }
      } catch (err: any) {
        console.error("加载 MedThink 样本列表失败", err);
        setError(
          err?.message ||
            "加载 MedThink 样本列表失败，请检查后端 /medthink/samples 接口。"
        );
      } finally {
        setLoadingList(false);
      }
    };

    loadList();
  }, [projectId]);

  // 加载详情
  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedId) {
        setDetail(null);
        return;
      }
      setLoadingDetail(true);
      try {
        const res = await fetchMedThinkSampleDetail(selectedId, projectId);
        setDetail(res);

        if (res.diagnosis_list && res.diagnosis_list.length > 0) {
          setSelectedLabel(res.diagnosis_list[0]);
        } else {
          setSelectedLabel(null);
        }
      } catch (err: any) {
        console.error("加载 MedThink 样本详情失败", err);
      } finally {
        setLoadingDetail(false);
      }
    };

    loadDetail();
  }, [selectedId, projectId]);

  const currentThink =
    detail?.model_thinks.find((mt) => mt.label === selectedLabel) ||
    (detail?.model_thinks && detail.model_thinks[0]) ||
    null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 顶部标题 + 按钮 */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
        }}
      >
        <div>
          <div className="page-title">模型思维链样本库 · MedThink Samples</div>
          <div className="page-subtitle">
            这里展示从 <code>med_think_responses.jsonl</code>{" "}
            解析出的真实病历、诊断结论以及大模型生成的 COT
            思维链，方便你浏览、抽检和后续设计标注 / 质检策略。
          </div>
          {error && (
            <div style={{ marginTop: 6, fontSize: 11, color: "#fb7185" }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" onClick={() => navigate("/labeling")}>
            打开标注工作台
          </button>
        </div>
      </section>

      {/* 主体：左侧列表 + 右侧详情 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.9fr)",
          gap: 16,
        }}
      >
        {/* 左：样本列表 */}
        <div className="card">
          <div className="card-title">
            样本列表 · Samples{" "}
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              （共 {total} 条）
            </span>
          </div>

          {loadingList ? (
            <div className="card-main">
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  paddingTop: 12,
                }}
              >
                正在加载样本列表...
              </div>
            </div>
          ) : samples.length === 0 ? (
            <div className="card-main">
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  paddingTop: 12,
                }}
              >
                当前项目还没有 MedThink 数据，请确认
                <code>
                  backend/data/projects/{projectId}/raw/med_think_responses.jsonl
                </code>{" "}
                是否存在并有内容。
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 540,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {samples.map((s) => {
                const active = s.sample_id === selectedId;
                return (
                  <div
                    key={s.sample_id}
                    onClick={() => setSelectedId(s.sample_id)}
                    style={{
                      borderRadius: 12,
                      padding: "8px 10px",
                      border: active
                        ? "1px solid var(--accent)"
                        : "1px solid rgba(148,163,184,0.3)",
                      background: active
                        ? "rgba(56,189,248,0.1)"
                        : "rgba(15,23,42,0.9)",
                      cursor: "pointer",
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
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                        }}
                      >
                        样本 {s.sample_id}
                        {s.patient_id && ` · 患者 ${s.patient_id}`}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-secondary)",
                          textAlign: "right",
                        }}
                      >
                        诊断 {s.diagnosis_count} 个 · COT{" "}
                        {s.has_cot_for_all ? "完整" : "缺失"} · tokens{" "}
                        {s.total_cot_tokens}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        fontSize: 11,
                      }}
                    >
                      {s.diagnosis_list.map((d) => (
                        <span
                          key={d}
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: "1px solid rgba(148,163,184,0.4)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 右：病历 + 诊断 COT */}
        <div className="card">
          <div className="card-title">
            样本详情 · Detail
            {detail && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  color: "var(--text-secondary)",
                }}
              >
                （样本 {detail.sample_id} · 诊断 {detail.diagnosis_count} 个 ·
                总 COT tokens {detail.total_cot_tokens}）
              </span>
            )}
          </div>

          {!detail ? (
            <div className="card-main">
              {loadingDetail ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    paddingTop: 12,
                  }}
                >
                  正在加载样本详情...
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    paddingTop: 12,
                  }}
                >
                  请选择左侧任意一条样本查看对应病历与思维链内容。
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                marginTop: 8,
                display: "grid",
                gridTemplateRows: "minmax(0, 1.1fr) minmax(0, 1.1fr)",
                gap: 10,
                height: 540,
              }}
            >
              {/* 病历文本 */}
              <div
                style={{
                  borderRadius: 12,
                  padding: 10,
                  border: "1px solid rgba(148,163,184,0.35)",
                  background: "rgba(15,23,42,0.95)",
                  overflowY: "auto",
                  fontSize: 12,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {detail.emr_text || "暂无病历文本。"}
              </div>

              {/* 诊断 + COT */}
              <div
                style={{
                  borderRadius: 12,
                  padding: 10,
                  border: "1px solid rgba(148,163,184,0.35)",
                  background: "rgba(15,23,42,0.95)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 500 }}>
                    诊断结论 &amp; 对应思维链
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                    }}
                  >
                    点击诊断标签在下方切换对应的 COT 内容
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {detail.diagnosis_list.map((label) => {
                    const active = label === selectedLabel;
                    return (
                      <button
                        key={label}
                        onClick={() => setSelectedLabel(label)}
                        style={{
                          borderRadius: 999,
                          padding: "3px 10px",
                          border: active
                            ? "1px solid var(--accent)"
                            : "1px solid rgba(148,163,184,0.5)",
                          background: active
                            ? "rgba(56,189,248,0.12)"
                            : "transparent",
                          fontSize: 11,
                          color: active
                            ? "var(--accent)"
                            : "var(--text-secondary)",
                          cursor: "pointer",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    marginTop: 4,
                    flex: 1,
                    borderRadius: 8,
                    padding: 8,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(15,23,42,0.98)",
                    overflowY: "auto",
                    fontSize: 12,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {currentThink ? (
                    <>
                      <div
                        style={{
                          marginBottom: 6,
                          fontSize: 11,
                          color: "var(--text-secondary)",
                        }}
                      >
                        当前诊断：{currentThink.label} · COT tokens{" "}
                        {currentThink.tokens}
                      </div>
                      {currentThink.med_think || "暂无 COT 内容。"}
                    </>
                  ) : (
                    <span>该诊断暂未生成思维链内容。</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MedThinkSamplesPage;
