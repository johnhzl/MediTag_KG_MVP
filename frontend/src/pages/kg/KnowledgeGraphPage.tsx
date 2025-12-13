import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import cytoscape, { Core, ElementsDefinition } from "cytoscape";

import {
  diagnose,
  diagnoseFromText,
  fetchKgGraph,
  fetchKgStats,
  searchKg,
  DiagnoseResponse,
  DiagnoseFromTextResponse,
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

  // 原有：手动输入症状列表诊断
  const [symptomInput, setSymptomInput] = useState<string>("");
  const [dx, setDx] = useState<DiagnoseResponse | null>(null);

  // 新增：自然语言问诊 → 解析并判别
  const [nlText, setNlText] = useState<string>("");
  const [nlLoading, setNlLoading] = useState<boolean>(false);
  const [nlError, setNlError] = useState<string | null>(null);
  const [nlDx, setNlDx] = useState<DiagnoseFromTextResponse | null>(null);

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
      const depth = center ? 1 : 2;       // 概览稍浅；点中心病稍深，方便缩小看外围
      const max_nodes = center ? 120 : 220;

      const g = await fetchKgGraph(
        resolvedProjectId,
        center ? { center, depth, max_nodes } : undefined
      );
      setGraph(g);

      // 记录中心节点
      currentCenterRef.current = center || null;

      // 等待 setGraph 渲染进 cytoscape 后再计算 hop
      setTimeout(() => {
        try {
          const cy = cyRef.current;
          if (!cy) return;

          // 清掉旧中心样式
          cy.nodes().removeClass("center");

          if (center) {
            computeHopsFromCenter(center);

            // 设置新中心样式
            const c = cy.getElementById(center);
            if (c && !c.empty()) c.addClass("center");
          }

          bindZoomLOD();
          applyLODByZoom();

          // 视图居中到中心（更直观）
          const visible = cy.elements(":visible");
          if (visible && visible.length > 0) {
            cy.fit(visible, 60);
          } else {
            cy.fit(undefined, 40);
          }
          // ✅ 限制最大 zoom，避免出现图1/2那种巨大的文字
          const MAX_ZOOM = 2.0;
          const MIN_ZOOM = 0.75;
          if (cy.zoom() > MAX_ZOOM) cy.zoom(MAX_ZOOM);
          if (cy.zoom() < MIN_ZOOM) cy.zoom(MIN_ZOOM);
          cy.zoom(0.95);
          cy.center();
          showLabelsForCenterAndHop1();
        } catch (e) {
          console.error("LOD/center failed:", e);
        }
      }, 0);

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
            "text-max-width": "90px",
            "background-color": "#38bdf8",
            width: 26,
            height: 26,
          },
        },
        {
          selector: ".center",
          style: {
            "background-color": "#f97316",
            width: 42,
            height: 42,
            "font-size": 14,
            "text-outline-width": 3,
            "text-outline-color": "#0b1020",
            label: "data(label)",
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
        {
          selector: ".hidden",
          style: { display: "none" },
        },
        {
          selector: ".nolabel",
          style: { label: "" },
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


    const c = currentCenterRef.current;
    if (c) {
      try {
        computeHopsFromCenter(c);
        bindZoomLOD();
        applyLODByZoom();
      } catch (e) {
        console.error("LOD/compute hops failed:", e);
      }
    }
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

  const showLabelsForCenterAndHop1 = () => {
    const cy = cyRef.current;
    if (!cy) return;

    const centerId = currentCenterRef.current;

    cy.nodes().forEach((n) => {
      const hop = Number(n.data("hop") ?? 999);

      // ✅ 默认：中心和1跳显示文字
      const shouldLabel =
        centerId ? (n.id() === centerId || hop <= 1) : hop <= 1;

      n.toggleClass("nolabel", !shouldLabel);
    });
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
  const currentCenterRef = useRef<string | null>(null);
  const LOD_TOPK = 25; // 中心最多显示25个邻居（可调 10/20/30）
  const computeHopsFromCenter = (centerId: string) => {
    const cy = cyRef.current;
    if (!cy) return;

    // 先把所有节点 hop 设为很大（表示“很远/未知”）
    cy.nodes().forEach((n) => { n.data("hop", 999); });

    const root = cy.getElementById(centerId);
    if (!root || root.empty()) return;

    // root hop=0
    root.data("hop", 0);

    // 手写 BFS（无向图）
    const queue: any[] = [root];
    while (queue.length) {
      const cur = queue.shift();
      const curHop = Number(cur.data("hop") ?? 999);

      // 邻居节点（只取 node）
      cur.neighborhood("node").forEach((nb: any) => {
        const oldHop = Number(nb.data("hop") ?? 999);
        if (oldHop > curHop + 1) {
          nb.data("hop", curHop + 1);
          queue.push(nb);
        }
      });
    }
  };



  const applyTopKForCenter = (centerId: string) => {
    const cy = cyRef.current;
    if (!cy) return;

    const center = cy.getElementById(centerId);
    if (!center || center.empty()) return;

    // 找中心连接的边，按 weight 降序取 TopK
    const edges = center.connectedEdges().toArray();
    edges.sort((a: any, b: any) => (Number(b.data("weight") ?? 0) - Number(a.data("weight") ?? 0)));

    const keep = new Set<string>();
    edges.slice(0, LOD_TOPK).forEach((e: any) => {
      keep.add(e.id());
      keep.add(e.source().id());
      keep.add(e.target().id());
    });

    // 非TopK邻居先隐藏（但不影响后续缩小时展开更远层）
    cy.nodes().forEach((n) => {
      if (n.id() === centerId) return;
      const hop = Number(n.data("hop") ?? 999);
      if (hop === 1 && !keep.has(n.id())) {
        n.addClass("hidden");
      }
    });

    cy.edges().forEach((e) => {
      const hopS = Number(e.source().data("hop") ?? 999);
      const hopT = Number(e.target().data("hop") ?? 999);
      if ((hopS === 0 && hopT === 1) || (hopT === 0 && hopS === 1)) {
        if (!keep.has(e.id())) e.addClass("hidden");
      }
    });
  };

    const applyLODByZoom = () => {
    const cy = cyRef.current;
    if (!cy) return;

    const z = cy.zoom();
    const centerId = currentCenterRef.current;

    // 放大看近，缩小看远（节点显示范围）
    const maxHop = z >= 1.2 ? 1 : z >= 0.85 ? 2 : 3;

    // ✅ 概览模式才按 zoom 隐藏标签；中心模式不走这个规则
    const hideLabelInOverview = z < 0.6;

    cy.nodes().forEach((n) => {
      const hop = Number(n.data("hop") ?? 999);
      const shouldShow = hop === 999 || hop <= maxHop; // hop 未定义/不可达就当远

      n.toggleClass("hidden", !shouldShow);

      // ✅ 标签规则：
      // - 有中心：中心节点 + 1跳邻居 永远显示文字
      // - 无中心（概览）：缩小时隐藏文字
      if (centerId) {
        const shouldLabel = n.id() === centerId || hop <= 1;
        n.toggleClass("nolabel", !shouldLabel);
      } else {
        n.toggleClass("nolabel", hideLabelInOverview);
      }
    });

    cy.edges().forEach((e) => {
      const hidden = e.source().hasClass("hidden") || e.target().hasClass("hidden");
      e.toggleClass("hidden", hidden);
    });

    // 对中心1-hop再做TopK裁剪（只在 maxHop=1 时最需要）
    if (centerId && maxHop === 1) {
      applyTopKForCenter(centerId);
    }
  };


  const bindZoomLOD = () => {
    const cy = cyRef.current;
    if (!cy) return;

    let timer: any = null;
    cy.off("zoom"); // 避免重复绑定
    cy.on("zoom", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        applyLODByZoom();
      }, 80);
    });
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

  const runDiagnoseFromText = async () => {
    const text = nlText.trim();
    setNlError(null);

    if (!text) {
      setNlDx(null);
      return;
    }

    setNlLoading(true);
    try {
      const res = await diagnoseFromText(resolvedProjectId, text);
      setNlDx(res);

      // 自动加载 Top1 疾病子图 + 高亮命中症状节点
      const top1 = res.ranked_diseases?.[0];
      if (top1?.disease) {
        await loadGraph(top1.disease);
        const nodesToHighlight =
          res.used_symptom_nodes?.length
            ? res.used_symptom_nodes
            : (top1.evidence || []).map((x: any) => x.symptom);
        highlightSymptoms(nodesToHighlight || []);
      }
    } catch (err: any) {
      console.error(err);
      setNlError(
        err?.message ||
          "自然语言解析/判别失败：请确认后端 diagnose_from_text 接口已启动、且 ARK_API_KEY 已设置。"
      );
      setNlDx(null);
    } finally {
      setNlLoading(false);
    }
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
          {/* 新增：自然语言问诊 */}
          <div className="card">
            <div className="card-title">自然语言问诊 → 病症判别（LLM + KG）</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
              你可以输入患者口语描述。后端会先用大模型抽取症状，再映射到图谱节点，最后用图谱关联权重排序疾病，并返回依据与路径。
            </div>

            <textarea
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              placeholder="例如：我最近头痛，流鼻涕，然后还有点咳嗽"
              style={{
                width: "100%",
                minHeight: 84,
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

            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <button className="btn-ghost" onClick={runDiagnoseFromText} disabled={nlLoading}>
                {nlLoading ? "⏳ 解析中…" : "🗣️ 解析并判别"}
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  setNlText("");
                  setNlDx(null);
                  setNlError(null);
                  highlightSymptoms([]);
                }}
              >
                清空
              </button>
            </div>

            {nlError && (
              <div style={{ marginTop: 10, color: "#fb7185", fontSize: 12 }}>{nlError}</div>
            )}

            {nlDx && (
              <div style={{ marginTop: 10 }}>
                {/* 映射结果 */}
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                  解析与节点映射：
                </div>

                {(!nlDx.linked || nlDx.linked.length === 0) ? (
                  <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    未抽取到可用症状（或都被识别为否定/缺失）。你可以换种说法试试。
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {nlDx.linked.map((x, idx) => (
                      <div
                        key={`${x.raw}-${idx}`}
                        style={{
                          border: "1px solid rgba(148,163,184,0.18)",
                          borderRadius: 12,
                          padding: "8px 10px",
                          background: "rgba(15,23,42,0.45)",
                          fontSize: 12,
                          lineHeight: 1.6,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div>
                            <span style={{ color: "var(--text-secondary)" }}>原句：</span>
                            {x.raw}
                          </div>
                          <div style={{ color: "var(--text-secondary)" }}>
                            conf {Math.round((x.confidence || 0) * 100)}%
                          </div>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-secondary)" }}>映射节点：</span>
                          {x.node_id ? (
                            <button
                              className="btn-ghost"
                              style={{ padding: 0, border: "none", marginLeft: 6 }}
                              onClick={() => {
                                loadGraph(x.node_id!);
                                highlightSymptoms([x.node_id!]);
                              }}
                            >
                              🧩 {x.node_id}
                            </button>
                          ) : (
                            <span style={{ marginLeft: 6, color: "#fb7185" }}>未匹配到图谱症状节点</span>
                          )}
                        </div>

                        {x.candidates && x.candidates.length > 1 && (
                          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {x.candidates.slice(0, 5).map((c) => (
                              <span key={c} className="tag">
                                候选：{c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 疾病排名 + 依据路径 */}
                <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                  疾病候选（点击加载子图并高亮命中症状）：
                </div>

                {(!nlDx.ranked_diseases || nlDx.ranked_diseases.length === 0) ? (
                  <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    图谱未能根据当前症状组合给出候选（可能是映射不到节点、或该组合在图里稀疏）。
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {nlDx.ranked_diseases.slice(0, 10).map((it) => (
                      <div
                        key={it.disease}
                        style={{
                          border: "1px solid rgba(148,163,184,0.22)",
                          borderRadius: 14,
                          padding: "8px 10px",
                          background: "rgba(15,23,42,0.55)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <button
                            className="btn-ghost"
                            style={{ padding: 0, border: "none" }}
                            onClick={async () => {
                              await loadGraph(it.disease);
                              const hs = (it.evidence || []).map((x: any) => x.symptom);
                              highlightSymptoms(hs);
                            }}
                          >
                            🩺 {it.disease}
                          </button>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                            score {it.score} · 命中 {it.hit_count}
                          </span>
                        </div>

                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(it.evidence || []).slice(0, 6).map((h: any) => (
                            <span key={h.symptom} className="tag">
                              {h.symptom} · {h.weight}
                            </span>
                          ))}
                        </div>

                        {(it.paths || []).length > 0 && (
                          <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                            路径示例：
                            <div style={{ marginTop: 4 }}>
                              {(it.paths || []).slice(0, 3).map((p: any, i: number) => (
                                <div key={i}>
                                  {p?.[0]} → {p?.[1]} → {p?.[2]}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 原有：搜索节点 */}
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

            <div style={{ marginTop: 10, maxHeight: 220, overflow: "auto" }}>
              {searchItems.length === 0 ? (
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                  暂无结果。你也可以直接点击左侧判别结果加载子图。
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

          {/* 原有：症状 → 疾病判别 */}
          <div className="card">
            <div className="card-title">症状 → 疾病判别（手动输入）</div>
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
                  <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    没有匹配到疾病（可能是症状词不在当前图里）。
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {dx.items.slice(0, 10).map((it) => (
                      <div
                        key={it.disease}
                        style={{
                          border: "1px solid rgba(148,163,184,0.22)",
                          borderRadius: 14,
                          padding: "8px 10px",
                          background: "rgba(15,23,42,0.55)",
                        }}
                      >
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
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                            score {it.score} · 命中 {it.hit_count}
                          </span>
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

          {/* 原有：当前选中 */}
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
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                点击图谱中的节点查看详情。
              </div>
            )}
          </div>
        </div>

        {/* 右侧图谱 */}
        <div className="card" style={{ minHeight: 620, position: "relative" }}>
          <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              图谱视图 {graph?.center ? `· 以「${graph.center}」为中心` : "· 热点概览"}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-ghost"
                onClick={() => {
                  currentCenterRef.current = null;     // ✅ 清空中心
                  const cy = cyRef.current;
                  if (cy) cy.nodes().removeClass("center");
                  loadGraph();
                }}
              >
                🧭 回到概览
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  const cy = cyRef.current;
                  if (!cy) return;
                  const visible = cy.elements(":visible");
                  cy.fit(visible && visible.length ? visible : undefined, 40);
                  const MAX_ZOOM = 2.0;
                  const MIN_ZOOM = 0.75;
                  if (cy.zoom() > MAX_ZOOM) cy.zoom(MAX_ZOOM);
                  if (cy.zoom() < MIN_ZOOM) cy.zoom(MIN_ZOOM);
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

          {error && <div style={{ marginTop: 10, color: "#fb7185", fontSize: 12 }}>{error}</div>}

          <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-secondary)" }}>
            说明：当前图谱结构为 Disease-[:HAS_SYMPTOM]-&gt;Symptom。自然语言解析用于把口语症状映射为图谱节点，最终排序由图谱边权完成（可解释）。
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraphPage;
