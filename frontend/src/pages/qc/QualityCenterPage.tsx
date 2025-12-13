import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchQcSummary,
  fetchQcIssues,
  QcIssue,
  QcSummary,
  QcSeverity,
} from "../../services/qcApi";

const projectsOptions = [
  { id: "p1", name: "心血管病历结构化" },
  // 后面你可以根据需要再加其他项目
];

const severityBadge = (s: QcSeverity): React.CSSProperties => {
  const base: React.CSSProperties = {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.5)",
  };
  if (s === "low") {
    return { ...base, borderColor: "#22c55e", color: "#22c55e" };
  }
  if (s === "medium") {
    return { ...base, borderColor: "#facc15", color: "#facc15" };
  }
  return { ...base, borderColor: "#fb7185", color: "#fb7185" };
};

const statusText = (status: QcIssue["status"]) => {
  if (status === "pending") return "待处理";
  if (status === "confirmed") return "已确认问题";
  return "已忽略";
};

const QualityCenterPage: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState("p1");
  const [summary, setSummary] = useState<QcSummary | null>(null);
  const [issues, setIssues] = useState<QcIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, issuesRes] = await Promise.all([
          fetchQcSummary(selectedProjectId),
          fetchQcIssues(selectedProjectId),
        ]);
        setSummary(summaryRes);
        setIssues(issuesRes.items || []);
      } catch (err: any) {
        console.error("加载质检数据失败", err);
        setError(
          err?.message ||
            "加载质检数据失败，请检查 /qc/summary 与 /qc/issues 接口。"
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedProjectId]);

  const s: QcSummary = summary || {
    projectId: selectedProjectId,
    projectName:
      projectsOptions.find((p) => p.id === selectedProjectId)?.name ||
      "未知项目",
    totalSamples: 0,
    labeledSamples: 0,
    cotSamples: 0,
    avgCotTokens: 0,
    autoQcPassRate: 0,
    flaggedSamples: 0,
    humanReviewed: 0,
    interAnnotatorAgreement: 0,
  };

  const labeledRatio =
    s.totalSamples === 0 ? 0 : s.labeledSamples / s.totalSamples;
  const cotRatio =
    s.totalSamples === 0 ? 0 : s.cotSamples / s.totalSamples;
  const flaggedRatio =
    s.totalSamples === 0 ? 0 : s.flaggedSamples / s.totalSamples;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 顶部：标题 + 项目选择 */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
        }}
      >
        <div>
          <div className="page-title">质检中心 · Quality Center</div>
          <div className="page-subtitle">
            这里展示每个项目的标注 / COT / 自动质检关键指标，并给出疑似有问题的样本队列。
            当前数据来自 backend/data/projects/&lt;id&gt;/labeling 与 qc/qc_issues.jsonl。
          </div>
          {error && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "#fb7185",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
          }}
        >
          <span style={{ color: "var(--text-secondary)" }}>
            当前项目：
          </span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{
              borderRadius: 999,
              padding: "4px 10px",
              border: "1px solid rgba(148,163,184,0.6)",
              background: "rgba(15,23,42,0.95)",
              color: "var(--text-primary)",
              fontSize: 12,
              outline: "none",
            }}
          >
            {projectsOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* 第一行：关键质检指标 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <div className="card">
          <div className="card-title">标注完成度</div>
          <div className="card-main">
            <div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>
                {(labeledRatio * 100).toFixed(0)}%
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                {s.labeledSamples.toLocaleString()} /{" "}
                {s.totalSamples.toLocaleString()} 条样本已完成标签
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                textAlign: "right",
              }}
            >
              <div>项目：{s.projectName}</div>
              <div>总样本量：{s.totalSamples.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">COT 思维链覆盖</div>
          <div className="card-main">
            <div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>
                {(cotRatio * 100).toFixed(0)}%
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                {s.cotSamples.toLocaleString()} 条样本带 COT
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                textAlign: "right",
              }}
            >
              <div>平均 COT tokens：{s.avgCotTokens}</div>
              <div>质检重点：防止过短 / 空 COT</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">自动质检通过率</div>
          <div className="card-main">
            <div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>
                {(s.autoQcPassRate * 100).toFixed(1)}%
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                自动规则 / 模型未报问题的样本占比
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                textAlign: "right",
              }}
            >
              <div>
                已标记疑似问题样本：
                {s.flaggedSamples.toLocaleString()}
              </div>
              <div>
                占全部样本：{(flaggedRatio * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">标注员一致性</div>
          <div className="card-main">
            <div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>
                {s.interAnnotatorAgreement.toFixed(2)}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                例如可使用 Cohen&apos;s κ / Krippendorff&apos;s α 计算
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                textAlign: "right",
              }}
            >
              <div>
                已人工复核：{s.humanReviewed.toLocaleString()} 条
              </div>
              <div>建议目标：≥ 0.80</div>
            </div>
          </div>
        </div>
      </section>

      {/* 规则说明 + 分布占位（和之前一样，可以保留） */}
      {/* ……你可以保留之前那两个 card 的代码，这里略 */}

      {/* 问题样本队列 */}
      <section className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <div className="card-title">
            疑似问题样本队列 · {s.projectName}
          </div>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
            }}
          >
            点击行可以跳转到标注工作台复核
          </span>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>质检 ID</th>
              <th>样本 ID</th>
              <th>问题类型</th>
              <th>规则</th>
              <th>严重程度</th>
              <th>状态</th>
              <th>最近操作</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((i) => (
              <tr
                key={i.id}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  navigate(
                    `/projects/${s.projectId}/labeling?sample=${i.sampleId}&from=qc`
                  )
                }
              >
                <td>{i.id}</td>
                <td>{i.sampleId}</td>
                <td>{i.issueType}</td>
                <td>{i.ruleName}</td>
                <td>
                  <span style={severityBadge(i.severity)}>
                    {i.severity === "low"
                      ? "低"
                      : i.severity === "medium"
                      ? "中"
                      : "高"}
                  </span>
                </td>
                <td>{statusText(i.status)}</td>
                <td>
                  {i.createdAt}
                  {i.lastReviewer && ` · ${i.lastReviewer}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {issues.length === 0 && !loading && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              paddingTop: 8,
            }}
          >
            当前项目暂未检测到疑似问题样本。
          </div>
        )}
      </section>
    </div>
  );
};

export default QualityCenterPage;
