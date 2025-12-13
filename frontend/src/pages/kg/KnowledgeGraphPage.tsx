import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import cytoscape, { Core, ElementsDefinition } from "cytoscape";

import {
  diagnose,
  fetchKgGraph,
  fetchKgStats,
  searchKg,
  DiagnoseResponse,
  KgGraphResponse,
  KgNodeType,
} from "../../services/kgApi";

const KnowledgeGraphPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const resolvedProjectId = projectId || "p1";

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const [stats, setStats] = useState<any | null>(null);
  const [graph, setGraph] = useState<KgGraphResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchType, setSearchType] = useState<KgNodeType>("disease");
  const [searchText, setSearchText] = useState<string>("");
  const [searchItems, setSearchItems] = useState<any[]>([]);

  const [symptomInput, setSymptomInput] = useState<string>("");
  const [dx, setDx] = useState<DiagnoseResponse | null>(null);

  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const elements: ElementsDefinition = useMemo(() => {
    const nodes = (graph?.nodes || []).map((n) => ({
      data: {
        id: n.id,
        label: n.label,
        type: n.type,
        count: n.count || 0,
      },
    }));
    const edges = (graph?.edges || []).map((e) => ({
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        weight: e.weight || 1,
      },
    }));
    return { nodes, edges };
  }, [graph]);

  const loadGraph = async (center?: string) => {
    setLoading(true);
    setError(null);
    try {
      const g = await fetchKgGraph(resolvedProjectId, center ? { center, depth: 2, max_nodes: 180 } : undefined);
      setGraph(g);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "加载知识图谱失败，请检查后端接口是否可用。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const s = await fetchKgStats(resolvedProjectId);
        setStats(s);
      } catch (e) {
        // stats 失败不影响主流程
      }
      await loadGraph();
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedProjectId]);

  // init cytoscape
  useEffect(() => {
    if (!containerRef.current) return;
    if (cyRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      layout: { name: "cose", animate: false },
      wheelSensitivity: 0.2,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "font-size": 11,
            color: "#e5e7eb",
            "text-outline-width": 2,
            "text-outline-color": "#0b1020",
            "text-wrap": "wrap",
            "text-max-width": 90,
            "background-color": "#38bdf8",
            width: 26,
            height: 26,
          },
        },
        {
          selector: 'node[type = "symptom"]',
          style: {
            "background-color": "rgba(148,163,184,0.85)",
            width: 22,
            height: 22,
          },
        },
        {
          selector: "edge",
          style: {
            width: "mapData(weight, 1, 10, 1, 4)",
            "line-color": "rgba(148,163,184,0.55)",
            "target-arrow-color": "rgba(148,163,184,0.55)",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
        {
          selector: ".highlight",
          style: {
            "background-color": "#a855f7",
            "line-color": "rgba(56,189,248,0.85)",
            "target-arrow-color": "rgba(56,189,248,0.85)",
          },
        },
      ],
    });

    cy.on("tap", "node", (evt) => {
      const n = evt.target.data();
      setSelectedNode(n);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  // update elements & layout
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().remove();
    cy.add(elements);
    cy.layout({ name: "cose", animate: false }).run();
  }, [elements]);

  const runSearch = async () => {
    const q = searchText.trim();
    if (!q) {
      setSearchItems([]);
      return;
    }
    try {
      const res = await searchKg(resolvedProjectId, q, searchType);
      setSearchItems(res.items || []);
    } catch (e) {
      setSearchItems([]);
    }
  };

  const runDiagnose = async () => {
    const parts = symptomInput
      .split(/[,，\n\t]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) {
      setDx({ items: [] });
      return;
    }
    const res = await diagnose(resolvedProjectId, parts);
    setDx(res);
  };

  const highlightSymptoms = (symptoms: string[]) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass("highlight");
    symptoms.forEach((s) => {
      const n = cy.getElementById(s);
      if (n) n.addClass("highlight");
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div className="page-title">知识图谱</div>
          <div className="page-subtitle">
            疾病-症状关联图（MVP：从项目 jsonl 自动抽取 + 频次加权）。
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span className="pill">
            <span className="pill-dot" />
            疾病节点 {stats?.disease_nodes ?? "-"}
          </span>
          <span className="pill">
            <span className="pill-dot" />
            症状节点 {stats?.symptom_nodes ?? "-"}
          </span>
          <span className="pill">
            <span className="pill-dot" />
            边 {stats?.edges ?? "-"}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, marginTop: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card">
            <div className="card-title">搜索节点</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as KgNodeType)}
                style={{
                  background: "rgba(15,23,42,0.8)",
                  border: "1px solid rgba(148,163,184,0.35)",
                  color: "var(--text-primary)",
                  borderRadius: 10,
                  padding: "6px 8px",
                  fontSize: 12,
                }}
              >
                <option value="disease">疾病</option>
                <option value="symptom">症状</option>
              </select>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
                placeholder="输入关键词，例如：胸痛 / 糖尿病"
                style={{
                  flex: 1,
                  background: "rgba(2,6,23,0.35)",
                  border: "1px solid rgba(148,163,184,0.35)",
                  color: "var(--text-primary)",
                  borderRadius: 10,
                  padding: "6px 10px",
                  fontSize: 12,
                  outline: "none",
                }}
              />
              <button className="btn-ghost" onClick={runSearch}>
                🔎 搜索
              </button>
            </div>

            <div style={{ marginTop: 10, maxHeight: 260, overflow: "auto" }}>
              {searchItems.length === 0 ? (
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                  暂无结果。你也可以直接点击下方诊断结果加载子图。
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {searchItems.map((n) => (
                    <button
                      key={n.id}
                      className="btn-ghost"
                      style={{ justifyContent: "space-between" }}
                      onClick={() => {
                        setSelectedNode(n);
                        loadGraph(n.id);
                      }}
                    >
                      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span>{n.type === "disease" ? "🩺" : "🧩"}</span>
                        <span style={{ textAlign: "left" }}>{n.label}</span>
                      </span>
                      <span style={{ fontSize: 11, opacity: 0.85 }}>×{n.count || 0}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-title">症状 → 疾病判别</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
              输入多个症状（逗号/换行分隔），返回疾病 Top 排序（按关联边权加权）。
            </div>
            <textarea
              value={symptomInput}
              onChange={(e) => setSymptomInput(e.target.value)}
              placeholder="例如：胸痛，气促，咳嗽"
              style={{
                width: "100%",
                minHeight: 78,
                resize: "vertical",
                background: "rgba(2,6,23,0.35)",
                border: "1px solid rgba(148,163,184,0.35)",
                color: "var(--text-primary)",
                borderRadius: 12,
                padding: "8px 10px",
                fontSize: 12,
                outline: "none",
                lineHeight: 1.5,
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn-ghost" onClick={runDiagnose}>
                🧠 诊断
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  setDx(null);
                  highlightSymptoms([]);
                }}
              >
                清空结果
              </button>
            </div>

            {dx && (
              <div style={{ marginTop: 10 }}>
                {dx.items.length === 0 ? (
                  <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>没有匹配到疾病（可能是症状词不在当前图里）。</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {dx.items.slice(0, 10).map((it) => (
                      <div key={it.disease} style={{
                        border: "1px solid rgba(148,163,184,0.22)",
                        borderRadius: 14,
                        padding: "8px 10px",
                        background: "rgba(15,23,42,0.55)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <button
                            className="btn-ghost"
                            style={{ padding: 0, border: "none" }}
                            onClick={() => {
                              loadGraph(it.disease);
                              highlightSymptoms(it.hits.map((h) => h.symptom));
                            }}
                          >
                            🩺 {it.disease}
                          </button>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>score {it.score} · 命中 {it.hit_count}</span>
                        </div>
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {it.hits.slice(0, 6).map((h) => (
                            <span key={h.symptom} className="tag">
                              {h.symptom} · {h.weight}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">当前选中</div>
            {selectedNode ? (
              <div style={{ fontSize: 12, lineHeight: 1.65 }}>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>类型：</span>
                  {selectedNode.type === "symptom" ? "症状" : "疾病"}
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>名称：</span>
                  {selectedNode.label || selectedNode.id}
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>频次：</span>
                  {selectedNode.count ?? "-"}
                </div>
                <div style={{ marginTop: 8 }}>
                  <button className="btn-ghost" onClick={() => loadGraph(selectedNode.id)}>
                    🔗 加载子图
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>点击图谱中的节点查看详情。</div>
            )}
          </div>
        </div>

        <div className="card" style={{ minHeight: 620, position: "relative" }}>
          <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              图谱视图 {graph?.center ? `· 以「${graph.center}」为中心` : "· 热点概览"}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" onClick={() => loadGraph()}>
                🧭 回到概览
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  const cy = cyRef.current;
                  if (!cy) return;
                  cy.fit(undefined, 40);
                }}
              >
                🔍 适配视图
              </button>
            </div>
          </div>

          <div
            ref={containerRef}
            style={{
              width: "100%",
              height: 560,
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(2,6,23,0.28)",
              overflow: "hidden",
              marginTop: 10,
            }}
          />

          {loading && (
            <div
              style={{
                position: "absolute",
                left: 18,
                top: 58,
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.85)",
                border: "1px solid rgba(148,163,184,0.25)",
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              正在加载…
            </div>
          )}

          {error && (
            <div style={{ marginTop: 10, color: "#fb7185", fontSize: 12 }}>{error}</div>
          )}

          <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-secondary)" }}>
            说明：当前是 MVP 抽取（关键词/后缀+去否定+频次过滤）。你后续可以把“症状/体征/检查”改成平台内的结构化标注，图谱质量会显著提升。
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraphPage;
